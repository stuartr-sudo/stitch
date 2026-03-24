# Turnaround Multi-Axis Variation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend TurnaroundSheetWizard to generate character sheets across multiple characters, styles, and pose set presets, with a library-wide tag system for organization.

**Architecture:** Extend the existing 6-step wizard — Step 1 (Character) gets multi-character support, Step 2 (Style & Model) gets a pose set card picker. Generation computes `characters × styles × poseSets` cartesian product with concurrency-limited parallel dispatch. A new tag system (2 Supabase tables + 4 API endpoints) provides library-wide image organization with auto-tagging on turnaround saves.

**Tech Stack:** React 18, Express, Supabase (Postgres + RLS), FAL.ai, Tailwind + Radix UI (shadcn patterns)

**Spec:** `docs/superpowers/specs/2026-03-25-turnaround-multi-axis-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `api/lib/turnaroundPoseSets.js` | 5 pose set preset definitions with `getPoseSetById()` and `listPoseSets()` |
| `src/lib/turnaroundPoseSets.js` | Frontend mirror of pose set data (duplicated, sync comment) |
| `api/library/tags.js` | GET/POST for tag CRUD |
| `api/library/tags-assign.js` | POST assign / DELETE unassign |
| `api/library/tags-auto.js` | POST atomic auto-tag (create-if-not-exists + assign) |
| `supabase-migration-tags.sql` | Migration for `image_tags` + `image_tag_links` tables |
| `public/assets/pose-sets/` | 5 placeholder thumbnail images |

### Modified Files
| File | Changes |
|------|---------|
| `server.js` | Register 4 new tag routes (~lines 269-279) |
| `api/imagineer/turnaround.js` | `buildTurnaroundPrompt` dynamic rows from pose set; handler accepts `poseSet` + `characterName`; auto-tag on save (~lines 22-111, 218-228) |
| `src/components/modals/TurnaroundSheetWizard.jsx` | Multi-character state, pose set selector, cartesian product generation, concurrency limit, grouped results, filter bar, retry failed, dynamic cell labels (~lines 33-40, 184-195, 212, 469-544) |
| `src/components/modals/LibraryModal.jsx` | Tag filter bar, tag pills on cards, tag assignment popover, search integration (~lines 291-336, 370, 627) |

---

## Task 1: Supabase Migration — Tag Tables

**Files:**
- Create: `supabase-migration-tags.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- image_tags: user-scoped tag definitions
CREATE TABLE IF NOT EXISTS image_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- image_tag_links: junction table
CREATE TABLE IF NOT EXISTS image_tag_links (
  image_id uuid NOT NULL REFERENCES image_library_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES image_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (image_id, tag_id)
);

-- RLS policies
ALTER TABLE image_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tags"
  ON image_tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own tag links"
  ON image_tag_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM image_library_items
      WHERE image_library_items.id = image_tag_links.image_id
      AND image_library_items.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM image_library_items
      WHERE image_library_items.id = image_tag_links.image_id
      AND image_library_items.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_image_tags_user_id ON image_tags(user_id);
CREATE INDEX idx_image_tag_links_image_id ON image_tag_links(image_id);
CREATE INDEX idx_image_tag_links_tag_id ON image_tag_links(tag_id);

-- Helper view: get tags with usage count and last-used date per user
CREATE OR REPLACE FUNCTION get_user_tags_with_counts(p_user_id uuid)
RETURNS TABLE(id uuid, name text, created_at timestamptz, count bigint, last_used timestamptz)
LANGUAGE sql STABLE
AS $$
  SELECT
    t.id,
    t.name,
    t.created_at,
    COUNT(l.image_id) AS count,
    MAX(i.created_at) AS last_used
  FROM image_tags t
  LEFT JOIN image_tag_links l ON l.tag_id = t.id
  LEFT JOIN image_library_items i ON i.id = l.image_id
  WHERE t.user_id = p_user_id
  GROUP BY t.id, t.name, t.created_at
  ORDER BY last_used DESC NULLS LAST, t.created_at DESC;
$$;
```

- [ ] **Step 2: Run the migration against Supabase**

Run the migration via the Supabase dashboard SQL editor or `psql`. Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'image_tag%';
```
Expected: `image_tags`, `image_tag_links`

- [ ] **Step 3: Commit**

```bash
git add supabase-migration-tags.sql
git commit -m "feat: add image_tags and image_tag_links tables with RLS"
```

---

## Task 2: Tag API Endpoints

**Files:**
- Create: `api/library/tags.js`
- Create: `api/library/tags-assign.js`
- Create: `api/library/tags-auto.js`
- Modify: `server.js:269-279` (add routes after existing library routes)

- [ ] **Step 1: Create `api/library/tags.js`**

Handles GET (list user's tags with counts) and POST (create new tag).

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Get all tags for user with usage count and last used date
    const { data, error } = await supabase.rpc('get_user_tags_with_counts', { p_user_id: userId });

    if (error) {
      // Fallback to simple query if RPC not available
      const { data: tags, error: tagErr } = await supabase
        .from('image_tags')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tagErr) return res.status(500).json({ error: tagErr.message });

      // Get counts + last_used per tag
      const tagsWithCounts = await Promise.all(tags.map(async (tag) => {
        const { count } = await supabase
          .from('image_tag_links')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);
        // Get most recent linked image's created_at as last_used
        const { data: latest } = await supabase
          .from('image_tag_links')
          .select('image_id, image_library_items(created_at)')
          .eq('tag_id', tag.id)
          .order('image_library_items(created_at)', { ascending: false })
          .limit(1)
          .maybeSingle();
        const last_used = latest?.image_library_items?.created_at || null;
        return { ...tag, count: count || 0, last_used };
      }));

      // Sort by last_used descending (null last)
      tagsWithCounts.sort((a, b) => {
        if (!a.last_used && !b.last_used) return 0;
        if (!a.last_used) return 1;
        if (!b.last_used) return -1;
        return new Date(b.last_used) - new Date(a.last_used);
      });

      return res.json({ tags: tagsWithCounts });
    }

    return res.json({ tags: data });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tag name required' });

    const trimmed = name.trim();

    // Check for existing tag (case-insensitive)
    const { data: existing } = await supabase
      .from('image_tags')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) return res.json({ tag: existing });

    // Create new tag
    const { data: tag, error } = await supabase
      .from('image_tags')
      .insert({ user_id: userId, name: trimmed })
      .select('id, name')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ tag });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

- [ ] **Step 2: Create `api/library/tags-assign.js`**

Handles POST (bulk assign) and DELETE (unassign).

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const { imageIds, tagIds } = req.body;
    if (!imageIds?.length || !tagIds?.length) {
      return res.status(400).json({ error: 'imageIds and tagIds required' });
    }

    // Verify images belong to user
    const { data: owned } = await supabase
      .from('image_library_items')
      .select('id')
      .eq('user_id', userId)
      .in('id', imageIds);

    const ownedIds = new Set((owned || []).map(r => r.id));

    // Build link rows (only for owned images)
    const rows = [];
    for (const imageId of imageIds) {
      if (!ownedIds.has(imageId)) continue;
      for (const tagId of tagIds) {
        rows.push({ image_id: imageId, tag_id: tagId });
      }
    }

    if (rows.length === 0) return res.status(400).json({ error: 'No valid image/tag pairs' });

    const { error } = await supabase
      .from('image_tag_links')
      .upsert(rows, { onConflict: 'image_id,tag_id', ignoreDuplicates: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { imageId, tagId } = req.body;
    if (!imageId || !tagId) return res.status(400).json({ error: 'imageId and tagId required' });

    const { error } = await supabase
      .from('image_tag_links')
      .delete()
      .eq('image_id', imageId)
      .eq('tag_id', tagId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

- [ ] **Step 3: Create `api/library/tags-auto.js`**

Atomic create-if-not-exists + assign in one call.

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { imageId, tagNames } = req.body;
  if (!imageId || !tagNames?.length) {
    return res.status(400).json({ error: 'imageId and tagNames required' });
  }

  // Verify image belongs to user
  const { data: img } = await supabase
    .from('image_library_items')
    .select('id')
    .eq('id', imageId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!img) return res.status(404).json({ error: 'Image not found' });

  const tags = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;

    // Find or create tag
    const { data: existing } = await supabase
      .from('image_tags')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) {
      tags.push(existing);
    } else {
      const { data: created, error } = await supabase
        .from('image_tags')
        .insert({ user_id: userId, name: trimmed })
        .select('id, name')
        .single();

      if (error) {
        console.error('[AutoTag] Failed to create tag:', trimmed, error.message);
        continue;
      }
      tags.push(created);
    }
  }

  // Bulk assign all tags to image
  if (tags.length > 0) {
    const rows = tags.map(t => ({ image_id: imageId, tag_id: t.id }));
    const { error } = await supabase
      .from('image_tag_links')
      .upsert(rows, { onConflict: 'image_id,tag_id', ignoreDuplicates: true });

    if (error) {
      console.error('[AutoTag] Failed to assign tags:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.json({ success: true, tags });
}
```

- [ ] **Step 4: Register routes in `server.js`**

Add after the existing library routes (~line 279):

```js
// Tag management — specific paths BEFORE the catch-all /api/library/tags
app.use('/api/library/tags/auto-tag', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-auto.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-auto]', e); return res.status(500).json({ error: e.message }); }
});
app.post('/api/library/tags/assign', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-assign.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-assign]', e); return res.status(500).json({ error: e.message }); }
});
app.delete('/api/library/tags/unassign', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-assign.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-unassign]', e); return res.status(500).json({ error: e.message }); }
});
app.use('/api/library/tags', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags]', e); return res.status(500).json({ error: e.message }); }
});
```

Note: `/api/library/tags/auto-tag`, `/assign`, and `/unassign` must be registered BEFORE `/api/library/tags` so the more specific paths match first. The assign handler (`tags-assign.js`) handles both POST (assign) and DELETE (unassign) via method checking.

- [ ] **Step 5: Verify endpoints work**

Start server with `npm run server`. Test with curl:
```bash
# Create a tag (requires valid JWT — use browser devtools to grab one)
curl -X POST http://localhost:3003/api/library/tags \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{"name": "test-tag"}'

# List tags
curl http://localhost:3003/api/library/tags \
  -H "Authorization: Bearer <JWT>"
```

- [ ] **Step 6: Commit**

```bash
git add api/library/tags.js api/library/tags-assign.js api/library/tags-auto.js server.js
git commit -m "feat: add tag CRUD, assign, and auto-tag API endpoints"
```

---

## Task 3: Pose Set Presets Data Files

**Files:**
- Create: `api/lib/turnaroundPoseSets.js`
- Create: `src/lib/turnaroundPoseSets.js`
- Create: `public/assets/pose-sets/` (placeholder thumbnails)

- [ ] **Step 1: Create `api/lib/turnaroundPoseSets.js`**

Follow the pattern from `api/lib/videoStylePresets.js`. Each cell has `prompt` (for generation) and `shortLabel` (for UI).

```js
/**
 * Turnaround Pose Set Presets
 *
 * SYNC NOTE: Frontend mirror at src/lib/turnaroundPoseSets.js must stay in sync.
 *
 * Each preset defines a 4×6 grid (24 cells) with:
 *   - prompt: descriptive text injected into the generation prompt
 *   - shortLabel: compact label for grid overlay, cell editor, and library titles
 */

export const POSE_SETS = [
  {
    id: 'standard-24',
    name: 'Standard 24',
    description: 'Classic turnaround with expressions, walk cycles, action, and detail views',
    thumbnail: '/assets/pose-sets/standard-24.png',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Expressions & Alternative Back',
        cells: [
          { prompt: 'three-quarter back view', shortLabel: '3/4 Back' },
          { prompt: 'neutral expression close-up', shortLabel: 'Neutral' },
          { prompt: 'determined expression', shortLabel: 'Determined' },
          { prompt: 'joyful laughing expression', shortLabel: 'Joyful' },
        ],
      },
      {
        label: 'Walk Cycles',
        cells: [
          { prompt: 'walk cycle pose A (left foot forward)', shortLabel: 'Walk A' },
          { prompt: 'walk cycle pose B (right foot forward)', shortLabel: 'Walk B' },
          { prompt: 'walking toward viewer', shortLabel: 'Walk Toward' },
          { prompt: 'walking away', shortLabel: 'Walk Away' },
        ],
      },
      {
        label: 'Dynamic & Action',
        cells: [
          { prompt: 'running side view', shortLabel: 'Running' },
          { prompt: 'jumping with arms raised', shortLabel: 'Jumping' },
          { prompt: 'dynamic hero landing pose', shortLabel: 'Hero Land' },
          { prompt: 'fighting/action stance', shortLabel: 'Fight Stance' },
        ],
      },
      {
        label: 'Still Poses & Interaction',
        cells: [
          { prompt: 'sitting cross-legged', shortLabel: 'Sitting' },
          { prompt: 'reaching hand outward', shortLabel: 'Reaching' },
          { prompt: 'carrying an object', shortLabel: 'Carrying' },
          { prompt: 'leaning against wall casually', shortLabel: 'Leaning' },
        ],
      },
      {
        label: 'Special Views & Details',
        cells: [
          { prompt: 'face close-up head and shoulders', shortLabel: 'Face Detail' },
          { prompt: 'hand and accessory detail close-up', shortLabel: 'Hand Detail' },
          { prompt: 'bird\'s-eye view from above', shortLabel: 'Top-Down' },
          { prompt: 'dramatic low angle from below', shortLabel: 'Low Angle' },
        ],
      },
    ],
  },
  {
    id: 'expressions-focus',
    name: 'Expressions Focus',
    description: 'Heavy on facial emotion — 16 expression cells plus turnaround and detail',
    thumbnail: '/assets/pose-sets/expressions-focus.png',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Core Expressions',
        cells: [
          { prompt: 'happy smiling expression', shortLabel: 'Happy' },
          { prompt: 'sad melancholic expression', shortLabel: 'Sad' },
          { prompt: 'angry furious expression', shortLabel: 'Angry' },
          { prompt: 'surprised shocked expression', shortLabel: 'Surprised' },
        ],
      },
      {
        label: 'Complex Expressions',
        cells: [
          { prompt: 'scared frightened expression', shortLabel: 'Scared' },
          { prompt: 'disgusted repulsed expression', shortLabel: 'Disgusted' },
          { prompt: 'smug self-satisfied expression', shortLabel: 'Smug' },
          { prompt: 'crying with tears expression', shortLabel: 'Crying' },
        ],
      },
      {
        label: 'Subtle Expressions',
        cells: [
          { prompt: 'bored uninterested expression', shortLabel: 'Bored' },
          { prompt: 'curious intrigued expression', shortLabel: 'Curious' },
          { prompt: 'suspicious doubtful expression', shortLabel: 'Suspicious' },
          { prompt: 'embarrassed blushing expression', shortLabel: 'Embarrassed' },
        ],
      },
      {
        label: 'Interaction Expressions',
        cells: [
          { prompt: 'laughing with someone expression', shortLabel: 'Laughing' },
          { prompt: 'whispering secretive expression', shortLabel: 'Whispering' },
          { prompt: 'shouting yelling expression', shortLabel: 'Shouting' },
          { prompt: 'eye-roll annoyed expression', shortLabel: 'Eye-Roll' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'face close-up front view', shortLabel: 'Face Front' },
          { prompt: 'face close-up three-quarter view', shortLabel: 'Face 3/4' },
          { prompt: 'eyes extreme close-up', shortLabel: 'Eyes Detail' },
          { prompt: 'mouth and chin detail close-up', shortLabel: 'Mouth Detail' },
        ],
      },
    ],
  },
  {
    id: 'action-heavy',
    name: 'Action Heavy',
    description: 'Combat, dynamic movement, and power poses for action characters',
    thumbnail: '/assets/pose-sets/action-heavy.png',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Combat Stances',
        cells: [
          { prompt: 'sword swing attack pose', shortLabel: 'Sword Swing' },
          { prompt: 'dodge roll evasion pose', shortLabel: 'Dodge Roll' },
          { prompt: 'shield block defensive pose', shortLabel: 'Shield Block' },
          { prompt: 'high kick attack pose', shortLabel: 'Kick' },
        ],
      },
      {
        label: 'Movement',
        cells: [
          { prompt: 'full sprint running pose', shortLabel: 'Sprint' },
          { prompt: 'crouching stealth pose', shortLabel: 'Crouch' },
          { prompt: 'climbing wall pose', shortLabel: 'Climb' },
          { prompt: 'backflip mid-air pose', shortLabel: 'Backflip' },
        ],
      },
      {
        label: 'Power Moves',
        cells: [
          { prompt: 'dual-wield attack pose', shortLabel: 'Dual-Wield' },
          { prompt: 'power-up energy charge pose', shortLabel: 'Power-Up' },
          { prompt: 'ground slam impact pose', shortLabel: 'Ground Slam' },
          { prompt: 'aerial strike diving attack pose', shortLabel: 'Aerial Strike' },
        ],
      },
      {
        label: 'States',
        cells: [
          { prompt: 'injured kneeling pose', shortLabel: 'Injured' },
          { prompt: 'victory celebration pose', shortLabel: 'Victory' },
          { prompt: 'defeated fallen pose', shortLabel: 'Defeated' },
          { prompt: 'battle-ready stance', shortLabel: 'Battle-Ready' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'face with battle expression close-up', shortLabel: 'Battle Face' },
          { prompt: 'weapon grip detail close-up', shortLabel: 'Weapon Grip' },
          { prompt: 'dynamic low angle action shot', shortLabel: 'Low Angle' },
          { prompt: 'impact moment freeze frame', shortLabel: 'Impact' },
        ],
      },
    ],
  },
  {
    id: 'fashion-outfit',
    name: 'Fashion / Outfit',
    description: 'Clothing variations, seasonal outfits, accessory details, and styling poses',
    thumbnail: '/assets/pose-sets/fashion-outfit.png',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Outfit Variations',
        cells: [
          { prompt: 'casual everyday wear outfit', shortLabel: 'Casual' },
          { prompt: 'formal elegant wear outfit', shortLabel: 'Formal' },
          { prompt: 'sleepwear pajamas outfit', shortLabel: 'Sleepwear' },
          { prompt: 'athletic sportswear outfit', shortLabel: 'Athletic' },
        ],
      },
      {
        label: 'Seasonal',
        cells: [
          { prompt: 'winter coat and warm clothing outfit', shortLabel: 'Winter' },
          { prompt: 'summer light clothing outfit', shortLabel: 'Summer' },
          { prompt: 'rain gear umbrella outfit', shortLabel: 'Rain Gear' },
          { prompt: 'evening gala formal dress outfit', shortLabel: 'Evening' },
        ],
      },
      {
        label: 'Accessory Focus',
        cells: [
          { prompt: 'hat and headwear accessories close-up', shortLabel: 'Headwear' },
          { prompt: 'bag and backpack accessories', shortLabel: 'Bags' },
          { prompt: 'jewelry and accessories close-up', shortLabel: 'Jewelry' },
          { prompt: 'shoe and footwear detail close-up', shortLabel: 'Shoes' },
        ],
      },
      {
        label: 'Fabric & Fit',
        cells: [
          { prompt: 'back detail showing closure and stitching', shortLabel: 'Back Detail' },
          { prompt: 'fabric texture detail close-up', shortLabel: 'Texture' },
          { prompt: 'layered outfit showing all layers', shortLabel: 'Layered' },
          { prompt: 'outfit silhouette outline', shortLabel: 'Silhouette' },
        ],
      },
      {
        label: 'Styling Poses',
        cells: [
          { prompt: 'runway walk modeling pose', shortLabel: 'Runway' },
          { prompt: 'seated elegant pose', shortLabel: 'Seated' },
          { prompt: 'windswept dramatic pose', shortLabel: 'Windswept' },
          { prompt: 'mirror reflection full body', shortLabel: 'Mirror' },
        ],
      },
    ],
  },
  {
    id: 'creature-non-human',
    name: 'Creature / Non-Human',
    description: 'Animals, monsters, and mechs — creature-specific poses and anatomy details',
    thumbnail: '/assets/pose-sets/creature-non-human.png',
    rows: [
      {
        label: 'Turnaround (Neutral Standing)',
        cells: [
          { prompt: 'front view', shortLabel: 'Front' },
          { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
          { prompt: 'side profile view', shortLabel: 'Side' },
          { prompt: 'back view', shortLabel: 'Back' },
        ],
      },
      {
        label: 'Creature Features',
        cells: [
          { prompt: 'wings spread extended pose', shortLabel: 'Wing Spread' },
          { prompt: 'coiled resting pose', shortLabel: 'Resting' },
          { prompt: 'roar threat display pose', shortLabel: 'Roar' },
          { prompt: 'tail poses various positions', shortLabel: 'Tail Poses' },
        ],
      },
      {
        label: 'Movement',
        cells: [
          { prompt: 'flight hover mid-air pose', shortLabel: 'Flight' },
          { prompt: 'swimming underwater pose', shortLabel: 'Swimming' },
          { prompt: 'burrowing digging pose', shortLabel: 'Burrowing' },
          { prompt: 'pounce leap attack pose', shortLabel: 'Pounce' },
        ],
      },
      {
        label: 'Interaction',
        cells: [
          { prompt: 'pack formation group pose', shortLabel: 'Pack' },
          { prompt: 'hunting stalking pose', shortLabel: 'Hunting' },
          { prompt: 'feeding eating pose', shortLabel: 'Feeding' },
          { prompt: 'playful friendly pose', shortLabel: 'Playful' },
        ],
      },
      {
        label: 'Detail Close-ups',
        cells: [
          { prompt: 'eye detail extreme close-up', shortLabel: 'Eye Detail' },
          { prompt: 'paw claw talon detail close-up', shortLabel: 'Claw Detail' },
          { prompt: 'scale fur feather texture close-up', shortLabel: 'Texture' },
          { prompt: 'teeth beak horn detail close-up', shortLabel: 'Teeth/Horn' },
        ],
      },
      {
        label: 'Special Views',
        cells: [
          { prompt: 'size comparison standing next to human', shortLabel: 'Size Compare' },
          { prompt: 'skeletal anatomy overlay view', shortLabel: 'Skeleton' },
          { prompt: 'baby juvenile version of creature', shortLabel: 'Baby' },
          { prompt: 'battle armored variant', shortLabel: 'Armored' },
        ],
      },
    ],
  },
];

export function getPoseSetById(id) {
  return POSE_SETS.find(p => p.id === id) || POSE_SETS[0];
}

export function listPoseSets() {
  return POSE_SETS.map(({ id, name, description, thumbnail }) => ({ id, name, description, thumbnail }));
}
```

- [ ] **Step 2: Create `src/lib/turnaroundPoseSets.js`**

Copy the file from `api/lib/turnaroundPoseSets.js` with a sync comment at the top:

```js
/**
 * Turnaround Pose Set Presets — Frontend Mirror
 *
 * SYNC NOTE: Must stay in sync with api/lib/turnaroundPoseSets.js
 * If you update one, update the other.
 */

// ... exact same POSE_SETS, getPoseSetById, listPoseSets exports
```

- [ ] **Step 3: Create placeholder pose set thumbnails**

```bash
mkdir -p public/assets/pose-sets
```

Create 5 placeholder PNGs (200×200, simple colored squares with text labels) at:
- `public/assets/pose-sets/standard-24.png`
- `public/assets/pose-sets/expressions-focus.png`
- `public/assets/pose-sets/action-heavy.png`
- `public/assets/pose-sets/fashion-outfit.png`
- `public/assets/pose-sets/creature-non-human.png`

These will be replaced with proper AI-generated thumbnails later.

- [ ] **Step 4: Commit**

```bash
git add api/lib/turnaroundPoseSets.js src/lib/turnaroundPoseSets.js public/assets/pose-sets/
git commit -m "feat: add 5 turnaround pose set presets with frontend mirror"
```

---

## Task 4: Backend — Dynamic Pose Sets in Prompt Builder

**Files:**
- Modify: `api/imagineer/turnaround.js:22-111` (buildTurnaroundPrompt)
- Modify: `api/imagineer/turnaround.js:218-228` (handler body destructuring)

- [ ] **Step 1: Import pose set helpers**

Add at the top of `api/imagineer/turnaround.js`:

```js
import { getPoseSetById } from '../lib/turnaroundPoseSets.js';
```

- [ ] **Step 2: Update `buildTurnaroundPrompt` for dynamic rows**

The function signature adds `poseSet`:

```js
function buildTurnaroundPrompt({ characterDescription, style, hasReference, props, negativePrompt, brandStyleGuide, poseSet }) {
```

Replace the hardcoded Row 1–6 block (lines 84–89) with dynamic row generation:

```js
  // Dynamic rows from pose set
  const poseSetData = getPoseSetById(poseSet || 'standard-24');
  const rowLines = poseSetData.rows.map((row, i) =>
    `Row ${i + 1} — ${row.label}: ${row.cells.map(c => c.prompt).join(', ')}`
  );
  parts.push(...rowLines);
```

- [ ] **Step 3: Scope expression conflict resolution to standard-24 only**

Wrap the existing expression conflict logic (lines 38-67) in a conditional:

```js
  // Expression conflict resolution — only applies to standard-24 which has Row 2 expression cells
  let expressionCells = ['determined expression', 'joyful laughing expression'];
  if ((poseSet || 'standard-24') === 'standard-24' && negativePrompt) {
    // ... existing conflict resolution logic unchanged ...
  }
```

For non-standard pose sets, the expressions array is unused since the rows come from the pose set data.

- [ ] **Step 4: Update handler to accept `poseSet` and `characterName`**

In the handler's body destructuring (~line 218), add:

```js
  const {
    referenceImageUrl,
    characterDescription,
    style = 'concept-art',
    model = 'nano-banana-2-edit',
    loraUrl,
    loras,
    negativePrompt,
    props,
    brandStyleGuide,
    poseSet,         // NEW
    characterName,   // NEW — for auto-tagging
  } = req.body;
```

Pass `poseSet` to `buildTurnaroundPrompt`:

```js
  const prompt = buildTurnaroundPrompt({
    characterDescription,
    style,
    hasReference: !!referenceImageUrl,
    props,
    negativePrompt,
    brandStyleGuide,
    poseSet,  // NEW
  });
```

- [ ] **Step 5: Verify the backend still works with default pose set**

Start server: `npm run server`. Send a test request to `/api/imagineer/turnaround` with no `poseSet` field — should use `standard-24` and produce identical output to before.

- [ ] **Step 6: Commit**

```bash
git add api/imagineer/turnaround.js
git commit -m "feat: dynamic pose set rows in turnaround prompt builder"
```

---

## Task 5: Frontend — Multi-Character State (Wizard Step 1)

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx:212` (state), `~1000-1100` (Step 1 UI)

- [ ] **Step 1: Replace single character state with array**

Replace the existing state declarations:
```js
const [characterDescription, setCharacterDescription] = useState('');
const [referenceImageUrl, setReferenceImageUrl] = useState('');
```

With:
```js
const [characters, setCharacters] = useState([
  { id: `char-${Date.now()}`, name: '', description: '', referenceImageUrl: '' }
]);
```

Add helper functions:

```js
const updateCharacter = (id, field, value) => {
  setCharacters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
};

const addCharacter = () => {
  setCharacters(prev => [...prev, { id: `char-${Date.now()}`, name: '', description: '', referenceImageUrl: '' }]);
};

const removeCharacter = (id) => {
  if (characters.length <= 1) return;
  setCharacters(prev => prev.filter(c => c.id !== id));
};
```

- [ ] **Step 2: Update the Character step UI**

Replace the single character description textarea and reference image picker with a mapped list of character cards. Each card contains:
- Name input (short text)
- Description textarea (rows=4)
- Reference image upload/library picker
- Analyze button (calls `describeCharacter` scoped to this character)
- Remove button (disabled if only 1 character)

Add "Add Character" button below the list.

- [ ] **Step 3: Update `describeCharacter` to scope per character**

Update the function to accept a character ID and update only that character's description:

```js
const describeCharacter = async (charId, hostedUrl) => {
  // ... existing GPT-4 vision call ...
  updateCharacter(charId, 'description', data.description);
};
```

- [ ] **Step 4: Update validation**

Update `canGenerate` check to verify all characters have `name` and `description`:

```js
const canGenerate = characters.every(c => c.name.trim() && c.description.trim())
  && selectedStyles.length > 0
  && selectedPoseSets.length > 0;
```

- [ ] **Step 5: Verify the wizard still works with a single character**

Run `npm run dev`, open the turnaround wizard, fill in one character + one style. Confirm it reaches the generate button.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: multi-character support in turnaround wizard step 1"
```

---

## Task 6: Frontend — Pose Set Selector (Wizard Step 2)

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx:212` (state), `~1102-1160` (Step 2 UI)

- [ ] **Step 1: Add pose set state and import**

```js
import { POSE_SETS, getPoseSetById } from '@/lib/turnaroundPoseSets';

// In component state:
const [selectedPoseSets, setSelectedPoseSets] = useState(['standard-24']);
```

- [ ] **Step 2: Add pose set card grid to Step 2**

Below the existing StyleGrid and above the Model dropdown, add a section "Pose Sets" with selectable cards. Each card shows the pose set's `name`, `description`, and `thumbnail`. Multi-select toggle pattern (same as styles):

```jsx
<div className="space-y-2">
  <label className="text-sm font-medium text-zinc-300">Pose Sets</label>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {POSE_SETS.map(ps => {
      const selected = selectedPoseSets.includes(ps.id);
      return (
        <button
          key={ps.id}
          onClick={() => {
            setSelectedPoseSets(prev => {
              if (prev.includes(ps.id)) {
                // Enforce minimum 1 selected
                if (prev.length <= 1) { toast.info('At least one pose set required'); return prev; }
                return prev.filter(id => id !== ps.id);
              }
              return [...prev, ps.id];
            });
          }}
          className={`relative rounded-lg border-2 p-3 text-left transition-all ${
            selected ? 'border-teal-500 bg-teal-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
          }`}
        >
          <img src={ps.thumbnail} alt={ps.name} className="w-full h-20 object-cover rounded mb-2" />
          <p className="text-sm font-medium text-zinc-200">{ps.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{ps.description}</p>
        </button>
      );
    })}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: pose set selector cards in turnaround wizard step 2"
```

---

## Task 7: Frontend — Cartesian Product Generation with Concurrency

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx:469-544` (handleGenerate)

- [ ] **Step 1: Update `handleGenerate` to compute cartesian product**

Replace the current `selectedStyles.map(...)` with a triple nested loop:

```js
const handleGenerate = async () => {
  if (!characters.every(c => c.name.trim() && c.description.trim())) {
    toast.error("Every character needs a name and description.");
    return;
  }
  if (selectedStyles.length === 0) { toast.error("Select at least one style."); return; }
  if (selectedPoseSets.length === 0) { toast.error("Select at least one pose set."); return; }

  // Cartesian product: characters × styles × poseSets
  const newSheets = [];
  let idx = 0;
  for (const char of characters) {
    for (const style of selectedStyles) {
      for (const psId of selectedPoseSets) {
        const ps = getPoseSetById(psId);
        newSheets.push({
          id: `${Date.now()}-${idx++}`,
          character: { ...char },
          style,
          styleText: getPromptText(style),
          poseSet: psId,
          poseSetName: ps.name,
          generating: true,
          requestId: null,
          pollModel: null,
          imageUrl: null,
          error: null,
        });
      }
    }
  }

  // Soft warning if >10 sheets
  if (newSheets.length > 10) {
    const confirmed = window.confirm(
      `This will generate ${newSheets.length} sheets (${characters.length} character${characters.length > 1 ? 's' : ''} × ${selectedStyles.length} style${selectedStyles.length > 1 ? 's' : ''} × ${selectedPoseSets.length} pose set${selectedPoseSets.length > 1 ? 's' : ''}). Continue?`
    );
    if (!confirmed) return;
  }

  setSheets(newSheets);
  setActiveSheetId(null);
  setSelectedCells(new Set());
  setCellImages([]);
  setEditingCellIndex(null);

  markCompleted('character');
  markCompleted('style-model');
  markCompleted('props');
  markCompleted('refinements');
  setWizardStep('results');

  // Fire with concurrency limit of 4
  const MAX_CONCURRENT = 4;
  let running = 0;
  const queue = [...newSheets];

  const processNext = () => {
    while (running < MAX_CONCURRENT && queue.length > 0) {
      const sheet = queue.shift();
      running++;
      fireSheet(sheet).finally(() => {
        running--;
        processNext();
      });
    }
  };

  const fireSheet = async (sheet) => {
    try {
      const response = await apiFetch('/api/imagineer/turnaround', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterDescription: sheet.character.description.trim(),
          referenceImageUrl: sheet.character.referenceImageUrl?.trim() || undefined,
          style: sheet.styleText.trim(),
          poseSet: sheet.poseSet,
          characterName: sheet.character.name.trim(),
          props: propsLabels.length > 0 ? propsLabels : undefined,
          model: selectedModel,
          negativePrompt: combinedNegativePrompt,
          brandStyleGuide: extractBrandStyleData(selectedBrand),
        }),
      });

      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch {
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 200)}`);
      }
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      if (data.imageUrl) {
        setSheets(prev => prev.map(s => s.id === sheet.id
          ? { ...s, imageUrl: data.imageUrl, generating: false }
          : s
        ));
        toast.success(`Sheet ready: ${sheet.character.name} / ${sheet.styleText}`);
      } else if (data.requestId) {
        setSheets(prev => prev.map(s => s.id === sheet.id
          ? { ...s, requestId: data.requestId, pollModel: data.model || selectedModel }
          : s
        ));
        startPolling(sheet.id, data.requestId, data.model || selectedModel);
      } else throw new Error('Unexpected response');
    } catch (error) {
      console.error(`[Turnaround] Error for ${sheet.character.name}/${sheet.style}:`, error);
      setSheets(prev => prev.map(s => s.id === sheet.id
        ? { ...s, generating: false, error: error.message }
        : s
      ));
      toast.error(`${sheet.character.name} / ${sheet.styleText}: ${error.message}`);
    }
  };

  processNext();
};
```

- [ ] **Step 2: Add retry logic**

Add `retrySheet` and `retryAllFailed` functions:

```js
const retrySheet = (sheetId) => {
  const sheet = sheets.find(s => s.id === sheetId);
  if (!sheet?.error) return;
  setSheets(prev => prev.map(s => s.id === sheetId
    ? { ...s, generating: true, error: null, requestId: null, imageUrl: null }
    : s
  ));
  // Re-fire with same concurrency logic
  fireSheet(sheet);
};

const retryAllFailed = () => {
  const failed = sheets.filter(s => s.error);
  if (failed.length === 0) return;
  setSheets(prev => prev.map(s => s.error
    ? { ...s, generating: true, error: null, requestId: null, imageUrl: null }
    : s
  ));
  const queue = [...failed];
  let running = 0;
  const processNext = () => {
    while (running < MAX_CONCURRENT && queue.length > 0) {
      const sheet = queue.shift();
      running++;
      fireSheet(sheet).finally(() => { running--; processNext(); });
    }
  };
  processNext();
};
```

**Important: `fireSheet` scoping.** `fireSheet` must be defined at component scope (not inside `handleGenerate`) so `retrySheet` can call it. It closes over: `propsLabels`, `combinedNegativePrompt`, `selectedModel`, `selectedBrand`, `startPolling`, `setSheets`. Use a `useRef` for the concurrency queue state:

```js
const MAX_CONCURRENT = 4;
const concurrencyRef = useRef({ running: 0, queue: [] });

const fireSheet = async (sheet) => {
  // ... same body as above, using current values from state/memo ...
};

const enqueueSheets = (sheetsToFire) => {
  const ref = concurrencyRef.current;
  ref.queue.push(...sheetsToFire);
  const processNext = () => {
    while (ref.running < MAX_CONCURRENT && ref.queue.length > 0) {
      const s = ref.queue.shift();
      ref.running++;
      fireSheet(s).finally(() => { ref.running--; processNext(); });
    }
  };
  processNext();
};
```

Then `handleGenerate` calls `enqueueSheets(newSheets)`, and `retryAllFailed` calls `enqueueSheets(failed)`.

- [ ] **Step 3: Commit cartesian product + concurrency**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: cartesian product generation with concurrency limit"
```

- [ ] **Step 4: Commit retry logic**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: retry failed turnaround sheets individually or in batch"
```

---

## Task 8: Frontend — Grouped Results Gallery with Filters

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx:~1272-1410` (Results step UI)

- [ ] **Step 1: Add filter state**

```js
const [filterCharacter, setFilterCharacter] = useState(new Set());
const [filterStyle, setFilterStyle] = useState(new Set());
const [filterPoseSet, setFilterPoseSet] = useState(new Set());
```

- [ ] **Step 2: Compute filtered and grouped sheets**

```js
const filteredSheets = sheets.filter(s => {
  if (filterCharacter.size > 0 && !filterCharacter.has(s.character.name)) return false;
  if (filterStyle.size > 0 && !filterStyle.has(s.style)) return false;
  if (filterPoseSet.size > 0 && !filterPoseSet.has(s.poseSet)) return false;
  return true;
});

const groupedByCharacter = {};
for (const sheet of filteredSheets) {
  const name = sheet.character.name;
  if (!groupedByCharacter[name]) groupedByCharacter[name] = [];
  groupedByCharacter[name].push(sheet);
}
```

- [ ] **Step 3: Render filter bar**

Horizontal pill row with toggle buttons for each unique character name, style, and pose set. Use OR-within-category toggling.

Add the toggle helper:

```js
const toggleFilter = (current, setter, value) => {
  setter(prev => {
    const next = new Set(prev);
    next.has(value) ? next.delete(value) : next.add(value);
    return next;
  });
};
```

```jsx
<div className="flex flex-wrap gap-2 mb-4">
  {/* Character filters */}
  {[...new Set(sheets.map(s => s.character.name))].map(name => (
    <button key={name} onClick={() => toggleFilter(filterCharacter, setFilterCharacter, name)}
      className={`px-3 py-1 rounded-full text-xs ${filterCharacter.has(name) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
      {name}
    </button>
  ))}
  {/* Style filters — same pattern */}
  {/* Pose set filters — same pattern */}
  {sheets.some(s => s.error) && (
    <button onClick={retryAllFailed} className="px-3 py-1 rounded-full text-xs bg-red-600 text-white">
      Retry All Failed
    </button>
  )}
</div>
```

- [ ] **Step 4: Render grouped sections**

```jsx
{Object.entries(groupedByCharacter).map(([charName, charSheets]) => {
  const complete = charSheets.filter(s => s.imageUrl).length;
  const total = charSheets.length;
  return (
    <div key={charName} className="mb-6">
      <h3 className="text-sm font-medium text-zinc-300 mb-2">
        {charName} ({complete}/{total} complete)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {charSheets.map(sheet => (
          <div key={sheet.id} onClick={() => !sheet.generating && sheet.imageUrl && setActiveSheetId(sheet.id)}
            className="relative rounded-lg overflow-hidden border border-zinc-700 cursor-pointer hover:border-zinc-500">
            {sheet.generating ? (
              <div className="aspect-[2/3] flex items-center justify-center bg-zinc-800">
                <Loader2 className="animate-spin w-6 h-6 text-teal-400" />
              </div>
            ) : sheet.error ? (
              <div className="aspect-[2/3] flex flex-col items-center justify-center bg-zinc-800 p-2">
                <p className="text-xs text-red-400 text-center mb-2">{sheet.error}</p>
                <button onClick={(e) => { e.stopPropagation(); retrySheet(sheet.id); }}
                  className="text-xs text-teal-400 hover:underline">Retry</button>
              </div>
            ) : (
              <img src={sheet.imageUrl} alt="" className="w-full aspect-[2/3] object-cover" />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
              <p className="text-[10px] text-zinc-300 truncate">{sheet.styleText}</p>
              <p className="text-[10px] text-zinc-500 truncate">{sheet.poseSetName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
})}
```

- [ ] **Step 5: Make CELL_LABELS dynamic**

Replace the constant `CELL_LABELS` array (lines 188-195) with a derived value based on the active sheet's pose set:

```js
const getCellLabels = (poseSetId) => {
  const ps = getPoseSetById(poseSetId || 'standard-24');
  return ps.rows.flatMap(r => r.cells.map(c => c.shortLabel));
};
```

Update all references to `CELL_LABELS` to call `getCellLabels(activeSheet?.poseSet)` instead.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: grouped results gallery with filters, retry, and dynamic cell labels"
```

---

## Task 9: Library Modal — Tag UI

**Files:**
- Modify: `src/components/modals/LibraryModal.jsx:291-336` (MediaGrid filter), `~370` (search state), `~627` (search bar area)

- [ ] **Step 1: Add tag state and fetch**

In the `LibraryModal` component, add:

```js
const [tags, setTags] = useState([]);
const [activeTags, setActiveTags] = useState(new Set());
const [tagSearch, setTagSearch] = useState('');

useEffect(() => {
  if (!open) return;
  apiFetch('/api/library/tags').then(res => res.json()).then(data => {
    if (data.tags) setTags(data.tags);
  }).catch(() => {});
}, [open]);
```

- [ ] **Step 2: Add tag filter bar below search**

After the existing search bar (~line 627), add a horizontal scrollable row of tag pills:

```jsx
{tags.length > 0 && (
  <div className="flex gap-1.5 overflow-x-auto pb-1 mt-2">
    {tags
      .filter(t => !tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))
      .map(tag => (
        <button key={tag.id}
          onClick={() => setActiveTags(prev => {
            const next = new Set(prev);
            next.has(tag.id) ? next.delete(tag.id) : next.add(tag.id);
            return next;
          })}
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
            activeTags.has(tag.id) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
          }`}>
          {tag.name} <span className="text-zinc-400 ml-1">{tag.count}</span>
        </button>
      ))}
  </div>
)}
```

- [ ] **Step 3: Integrate tag filtering into MediaGrid**

In the `MediaGrid` `filtered` computation (~line 294), add tag-based filtering:

```js
const filtered = items.filter(item => {
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    // existing title/alt search + add tag name search
    const matchesTitle = /* existing logic */;
    const matchesTag = item._tags?.some(t => t.name.toLowerCase().includes(q));
    if (!matchesTitle && !matchesTag) return false;
  }
  if (activeTags.size > 0) {
    const itemTagIds = new Set((item._tags || []).map(t => t.id));
    if (![...activeTags].some(tid => itemTagIds.has(tid))) return false;
  }
  return true;
});
```

**Loading tag data onto items:** After fetching library items from Supabase, batch-fetch their tags:

```js
// After items are loaded (in the existing fetchItems or useEffect):
const loadTagsForItems = async (items) => {
  if (items.length === 0) return items;
  const ids = items.map(i => i.id);
  const { data: links } = await supabase
    .from('image_tag_links')
    .select('image_id, tag_id, image_tags(id, name)')
    .in('image_id', ids);

  // Group by image_id
  const tagMap = {};
  for (const link of (links || [])) {
    if (!tagMap[link.image_id]) tagMap[link.image_id] = [];
    if (link.image_tags) tagMap[link.image_id].push(link.image_tags);
  }

  return items.map(item => ({ ...item, _tags: tagMap[item.id] || [] }));
};
```

Call `loadTagsForItems(items)` after the existing Supabase query returns, then set the enriched items into state. This keeps it as a single additional query rather than N+1.

- [ ] **Step 4: Add tag assignment popover to image cards**

On each `MediaCard`, add a small "+" button that opens a popover for adding/removing tags. The popover shows:
- Search field
- Existing tags as toggleable pills
- "Create new" at the bottom

```jsx
const TagPopover = ({ item, tags, onAssign, onUnassign, onCreate }) => {
  const [search, setSearch] = useState('');
  const itemTagIds = new Set((item._tags || []).map(t => t.id));
  const filtered = tags.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-2 space-y-2 w-48">
      <Input placeholder="Search tags..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs" />
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
        {filtered.map(tag => (
          <button key={tag.id}
            onClick={() => itemTagIds.has(tag.id) ? onUnassign(item.id, tag.id) : onAssign([item.id], [tag.id])}
            className={`px-2 py-0.5 rounded text-xs ${itemTagIds.has(tag.id) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
            {tag.name}
          </button>
        ))}
      </div>
      {search && !tags.some(t => t.name.toLowerCase() === search.toLowerCase()) && (
        <button onClick={() => onCreate(search)} className="text-xs text-teal-400 hover:underline">
          Create "{search}"
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Wire up tag CRUD calls**

```js
const handleAssignTags = async (imageIds, tagIds) => {
  try {
    const res = await apiFetch('/api/library/tags/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageIds, tagIds }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { toast.error('Failed to assign tags'); return; }
    // Refresh tags list + re-fetch item tags
    await refreshTags();
  } catch (err) {
    toast.error('Failed to assign tags: ' + err.message);
  }
};

const handleUnassignTag = async (imageId, tagId) => {
  try {
    const res = await apiFetch('/api/library/tags/unassign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, tagId }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { toast.error('Failed to remove tag'); return; }
    await refreshTags();
  } catch (err) {
    toast.error('Failed to remove tag: ' + err.message);
  }
};

const handleCreateTag = async (name) => {
  const res = await apiFetch('/api/library/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (data.tag) setTags(prev => [data.tag, ...prev]);
  return data.tag;
};
```

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/LibraryModal.jsx
git commit -m "feat: tag filter bar, assignment popover, and search in library modal"
```

---

## Task 10: Integration — Auto-Tagging on Turnaround Save

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx` (after sheet save, call auto-tag)

- [ ] **Step 1: Add auto-tag call after library save**

When a completed sheet is saved to the library (in the existing save flow or when the user explicitly saves), call the auto-tag endpoint:

```js
const autoTagSheet = async (imageId, sheet) => {
  try {
    await apiFetch('/api/library/tags/auto-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageId,
        tagNames: [
          sheet.character.name,
          'turnaround',
          sheet.styleText,
          sheet.poseSetName,
        ].filter(Boolean),
      }),
    });
  } catch (err) {
    console.warn('[Turnaround] Auto-tag failed:', err.message);
    // Non-blocking — don't fail the save
  }
};
```

Call this after the library save succeeds (in `handleSaveCellsForLora`, `handleReassembleAndSave`, or wherever the save happens).

- [ ] **Step 2: Verify end-to-end flow**

1. Open turnaround wizard
2. Add 1 character with name "TestChar"
3. Select 1 style, 1 pose set
4. Generate
5. Slice into cells
6. Save cells
7. Open library — verify image appears with tags: "TestChar", "turnaround", style name, pose set name

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: auto-tag turnaround sheets on library save"
```

---

## Task 11: Final Integration & Polish

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx` (various)

- [ ] **Step 1: Update backward compat**

Ensure that when only 1 character, 1 style, and 1 pose set (`standard-24`) are selected, the behavior is identical to the original flow. The `fireSheet` function should produce the same API call as the old `handleGenerate`.

- [ ] **Step 2: Add "Pick from Library" to character cards**

Wire the "Pick from Library" button on each character card to open `LibraryModal` in select mode with tag filtering. On selection, populate the character's `referenceImageUrl` and optionally `description`.

- [ ] **Step 3: Verify multi-character + multi-style + multi-pose-set generation**

Test: 2 characters × 2 styles × 2 pose sets = 8 sheets. Verify:
- All 8 fire (4 concurrent, 4 queued)
- Results grouped by character
- Filters work
- Retry works on failed sheets
- Slicing uses correct cell labels per pose set

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: library picker for characters + final integration polish"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Supabase migration for tag tables | `supabase-migration-tags.sql` |
| 2 | Tag API endpoints (CRUD + auto-tag) | `api/library/tags.js`, `tags-assign.js`, `tags-auto.js`, `server.js` |
| 3 | Pose set presets data files | `api/lib/turnaroundPoseSets.js`, `src/lib/turnaroundPoseSets.js` |
| 4 | Backend dynamic pose sets in prompt builder | `api/imagineer/turnaround.js` |
| 5 | Multi-character state (Step 1) | `TurnaroundSheetWizard.jsx` |
| 6 | Pose set selector (Step 2) | `TurnaroundSheetWizard.jsx` |
| 7 | Cartesian product generation + concurrency | `TurnaroundSheetWizard.jsx` |
| 8 | Grouped results gallery + filters + retry | `TurnaroundSheetWizard.jsx` |
| 9 | Library modal tag UI | `LibraryModal.jsx` |
| 10 | Auto-tagging on turnaround save | `TurnaroundSheetWizard.jsx` |
| 11 | Final integration + backward compat | `TurnaroundSheetWizard.jsx` |
