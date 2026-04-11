# Review Widget & Autonomous Bug/Feature Processor — Replication Guide

**Last Updated:** 2026-04-07
**Source App:** Stitch (stitchstudios.app)
**Tested On:** FastAPI + Jinja2 (Tarakta), React + Express (Stitch), Next.js (Sonder)

---

## What This System Does

A floating in-app widget for logging bugs, questions, feature requests, and improvement ideas — targeted at specific tools and their model/API endpoints. Two autonomous Claude Code scheduled tasks process requests hourly:

1. **Review Processor** — fixes bugs, answers questions, audits prompts, updates docs
2. **Feature Builder** — builds new features, never just writes proposals

Both commit, push, deploy, and verify via Firecrawl browser. Nothing gets lost — multi-item requests are decomposed into individual queued items.

---

## Architecture Overview

```
User submits via widget
        |
        v
  review_requests table (Supabase)
        |
        +---[type = bug/question/prompt_review/etc]---> Review Processor (hourly :00)
        |                                                    |
        |                                                    +-- fix code, commit, push, deploy
        |                                                    +-- verify via Firecrawl browser
        |                                                    +-- write comment with findings
        |                                                    +-- mark resolved
        |                                                    +-- create new feature requests if mixed
        |
        +---[type = feature/change_request/improvement]---> Feature Builder (hourly :30)
                                                                |
                                                                +-- implement feature, commit, push, deploy
                                                                +-- verify via Firecrawl browser
                                                                +-- write comment with what was built
                                                                +-- mark resolved
                                                                +-- create follow-up requests if too large
```

---

## 1. Database Schema

### Table: `review_requests`

```sql
CREATE TABLE review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,              -- adapt type to your auth system (uuid for Supabase Auth, text for basic auth)
  tool text NOT NULL,                 -- subsystem name from hardcoded list
  endpoint text,                      -- specific model/API (optional)
  type text NOT NULL CHECK (type IN (
    'bug', 'question', 'feature', 'console_error',
    'change_request', 'learn_screenshot', 'prompt_review', 'claude_md_update'
  )),
  title text NOT NULL,
  description text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'resolved', 'needs_info', 'closed'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES review_requests(id) ON DELETE CASCADE NOT NULL,
  author text NOT NULL CHECK (author IN ('user', 'claude')),
  content text NOT NULL,
  commit_hash text,
  created_at timestamptz DEFAULT now()
);

-- Auto-update trigger (create function if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_review_requests_status ON review_requests(status);
CREATE INDEX idx_review_requests_user ON review_requests(user_id);
CREATE INDEX idx_review_comments_request ON review_comments(request_id);
```

**RLS:** Enable if using Supabase Auth (filter by `auth.uid() = user_id`). Skip if using server-side auth.

**resolved_at rule:** Set to `now()` when status -> resolved/closed. Clear to `null` when status -> pending (re-open).

---

## 2. Request Types

Adapt these to your app. The defaults are:

| Type | Label | Description |
|------|-------|-------------|
| `bug` | Bug | Something broken |
| `question` | Question | How/why does X work |
| `feature` | Feature | New functionality |
| `console_error` | Console Error | Paste error + stack trace |
| `change_request` | Change Request | Modify existing behavior |
| `learn_screenshot` | Learn Screenshot | Screenshot for training/docs page |
| `prompt_review` | Prompt Review | Audit AI prompt construction for cohesion vs concatenation |
| `claude_md_update` | CLAUDE.md Update | Update project documentation |

**For trading apps (Tarakta):** Replace `learn_screenshot` with `strategy_review` (audit trading logic). Replace `feature` with `improvement`.

---

## 3. Tool -> Endpoint Map

Create a data file mapping every tool/subsystem to its specific model/API endpoints. This powers the two-level dropdown in the widget.

**Format:**
```javascript
export const TOOL_CATEGORIES = {
  'Category Name': ['Tool A', 'Tool B'],
};

export const TOOL_ENDPOINTS = {
  'Tool A': ['Model 1', 'Model 2', 'API Endpoint'],
  'Tool B': ['Model 3'],
};

export const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat().sort();
```

Enumerate EVERY tool and EVERY model/API endpoint in your app. Be exhaustive. This is what makes bug reports actionable — "Imagineer -> Nano Banana 2 -> Bug" is infinitely more useful than "Image generation broken".

---

## 4. API Endpoints

6-8 endpoints depending on your needs:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/reviews` | Create request |
| GET | `/api/reviews` | List requests (optional `?status=` filter) |
| GET | `/api/reviews/:id` | Get request + comments |
| PATCH | `/api/reviews/:id` | Update status/priority |
| POST | `/api/reviews/:id/comments` | Add comment |
| POST | `/api/reviews/upload` | Upload screenshot |
| GET | `/api/reviews/pending` | Get oldest pending (for manual testing) |
| PATCH | `/api/reviews/:id/resolve` | Mark resolved + optional comment |

**Key implementation details:**
- All endpoints require authentication
- Upload uses multipart form data (formidable/multer), 5MB max, image/* only
- List endpoint returns all requests, frontend sorts by priority (high > medium > low) then oldest first
- The CRON tasks bypass the API and use Supabase directly via MCP

---

## 5. Widget UI

### Floating Button (bottom-left)
- Position: `fixed bottom-6 left-6 z-50` (or equivalent CSS `position: fixed; bottom: 24px; left: 24px; z-index: 9999`)
- Size: 56px circle
- Styling: Match your app's design system. Stitch uses navy background + blue neon ring. Tarakta uses `var(--bg-deep)` + teal glow.
- Icon: Pencil/PenLine (white)
- Badge: Red circle showing pending + needs_info count, hidden if 0
- Click: toggles submit form

### Submit Form (popup above button)
- ~350px wide card
- Fields:
  1. **Tool** dropdown (required) — from ALL_TOOLS
  2. **Endpoint** dropdown (optional) — filters by TOOL_ENDPOINTS[selectedTool], hidden if no tool selected
  3. **Type** dropdown (required) — 8 types
  4. **Priority** segmented pills — Low / Medium (default) / High
  5. **Title** input (required)
  6. **Description** textarea
  7. **Screenshot** — file upload + clipboard paste, immediate upload, thumbnail preview
  8. **Submit** button
- "View All" link in header opens dashboard panel

### Dashboard Panel (slide-over from left)
- ~600px wide, slides in from left
- Filter chips: All / Pending / In Progress / Needs Info / Resolved / Closed (with counts)
- Request cards: status badge, type, tool+endpoint tags, title, relative time
- Expanded view: full description (monospace for logs), screenshot, comment thread, status action buttons
- Comment thread: user comments left-aligned, Claude comments right-aligned with accent color
- Status actions vary by current status (pending->close, resolved->reopen+close, etc.)

---

## 6. Scheduled Tasks

### Task 1: Review Processor

**Schedule:** `0 7-23 * * *` (hourly, 7am-11pm local time)
**Handles:** bugs, questions, console errors, prompt reviews, docs updates
**Does NOT handle:** features, change requests, improvements (those go to Feature Builder)

**SKILL.md frontmatter:**
```yaml
---
name: review-processor
description: Process bugs, questions, and prompt reviews
model: claude-opus-4-6
---
```

**Critical rules in the prompt:**
1. ALWAYS commit, push, deploy after code changes
2. For mixed requests (bugs + features): fix bugs, create NEW pending feature requests for each feature item
3. NEVER say "out of scope" — either fix it or queue it
4. MUST verify via Firecrawl browser after deploying
5. Atomic claim query prevents double-processing:
```sql
UPDATE review_requests SET status = 'in_progress'
WHERE id = (
  SELECT id FROM review_requests
  WHERE status = 'pending'
  AND type NOT IN ('feature', 'change_request', 'improvement')
  ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
  created_at ASC LIMIT 1
) RETURNING *
```

### Task 2: Feature Builder

**Schedule:** `30 7-23 * * *` (hourly at :30, staggered from review processor to avoid git conflicts)
**Handles:** features, change requests, improvements ONLY

**SKILL.md frontmatter:**
```yaml
---
name: feature-builder
description: Build features and improvements — implements actual code
model: claude-opus-4-6
---
```

**Critical rules in the prompt:**
1. MUST write actual code — NEVER just a plan or proposal
2. ALWAYS npm run build, fix errors, then push + deploy
3. Read CLAUDE.md before starting any work
4. MUST verify via Firecrawl browser after deploying
5. If feature is too large: implement core, create follow-up requests for polish
6. Atomic claim:
```sql
UPDATE review_requests SET status = 'in_progress'
WHERE id = (
  SELECT id FROM review_requests
  WHERE status = 'pending'
  AND type IN ('feature', 'change_request', 'improvement')
  ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
  created_at ASC LIMIT 1
) RETURNING *
```

---

## 7. Firecrawl Verification (both tasks)

Every code change MUST be verified in the live app. Include this exact pattern in both task prompts:

```
## CREDENTIALS
Email: {YOUR_LOGIN_EMAIL}
Password: {YOUR_LOGIN_PASSWORD}

## VERIFY — MANDATORY, NEVER SKIP

Step 1 — Create browser session:
firecrawl_browser_create with profile { name: "{app-name}-admin", saveChanges: true }

Step 2 — Navigate and log in:
firecrawl_browser_execute with language: "python"

await page.goto('{YOUR_APP_URL}/login')
await page.wait_for_timeout(2000)
if '/dashboard' in page.url or '/studio' in page.url:
    print('Already logged in')
else:
    await page.fill('input[type="email"]', '{EMAIL}')
    await page.fill('input[type="password"]', '{PASSWORD}')
    await page.click('button[type="submit"]')
    await page.wait_for_timeout(3000)

Step 3 — Navigate to the relevant page and test.
Step 4 — Take snapshot/screenshot as proof.
Step 5 — Delete browser session.

If verification FAILS, fix code, rebuild, redeploy, re-verify.
Do NOT mark resolved until verified working.
```

---

## 8. Required Permissions

Add to `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(npm run build:*)",
      "Bash(curl:*)",
      "Bash(fly deploy:*)",
      "Bash(fly status:*)",
      "mcp__firecrawl-mcp__firecrawl_browser_create",
      "mcp__firecrawl-mcp__firecrawl_browser_execute",
      "mcp__firecrawl-mcp__firecrawl_browser_delete",
      "mcp__firecrawl-mcp__firecrawl_browser_list"
    ]
  }
}
```

**Important:** After creating both scheduled tasks, you MUST "Run now" each one while watching to pre-approve all tools. Tool approvals are stored per-task and auto-applied to future runs.

---

## 9. Adapt Per Framework

| Aspect | React + Express (Stitch) | FastAPI + Jinja2 (Tarakta) | Next.js (Sonder) |
|--------|--------------------------|---------------------------|------------------|
| Widget | React component (JSX) | Jinja2 partial + vanilla JS | React component (TSX) |
| Panel | Radix Dialog (custom left-side) | CSS transform slide-over | Radix Dialog or headless UI |
| API | Express routes in server.js | FastAPI router | Next.js App Router (route.ts) |
| Auth | Supabase JWT (RLS) | Basic auth + session cookies | Supabase Auth (RLS) |
| user_id | uuid FK auth.users | text (username) | uuid FK auth.users |
| Deploy | `fly deploy` | `fly deploy --depot=false --remote-only` | `git push` (Vercel auto-deploy) |
| Build | `npm run build` (Vite) | N/A (Python) | `npm run build` (Next.js) |
| Styling | Tailwind + Radix | CSS variables (--teal, --magenta) | Tailwind + shadcn |

---

## 10. Known Issues & Lessons Learned

### Model override doesn't work reliably
The `model: claude-opus-4-6` frontmatter in SKILL.md is supposed to force Opus but scheduled tasks often revert to Sonnet. The model dropdown in the Claude Code UI overrides it. **Workaround:** Set your default model to Opus before running tasks. Report this at github.com/anthropics/claude-code/issues.

### Never call `update_scheduled_task` after setting model
The `update_scheduled_task` MCP tool **strips the `model` field** from the SKILL.md frontmatter every time it's called. Only use the Edit/Write tool to modify SKILL.md files directly.

### Sonnet skips features
Sonnet tends to mark feature requests as "flagged for later" instead of implementing them. The two-bot architecture (Review Processor + Feature Builder) mitigates this by separating concerns, but the model issue means features may still get shallow treatment if Sonnet runs instead of Opus.

### Atomic claim prevents double-processing
If you manually trigger "Run now" twice rapidly, both runs could grab the same request. The `UPDATE ... WHERE id = (SELECT ... LIMIT 1) RETURNING *` pattern prevents this — the second run gets zero rows and exits.

### Deploy step is critical
Without explicit `git push && fly deploy` (or equivalent) in the prompt, the CRON will commit fixes that never go live. For Fly.io apps, always include the full deploy command. For Vercel apps, `git push` is sufficient (auto-deploy).

### Firecrawl credits
Firecrawl browser sessions consume credits. If credits are exhausted, verification falls back to code inspection only. Budget for ~50 browser sessions/month for a moderately active review queue.

---

## 11. Checklist for New App

- [ ] Run the migration SQL against your Supabase project
- [ ] Create the tool -> endpoint map data file (enumerate EVERY tool and model)
- [ ] Build the API endpoints (6-8 routes)
- [ ] Build the floating widget (button + form)
- [ ] Build the slide-over dashboard (filters, cards, comments, status controls)
- [ ] Wire widget into your app's root layout/template
- [ ] Create Review Processor scheduled task (bugs/questions)
- [ ] Create Feature Builder scheduled task (features/improvements)
- [ ] Add permissions to `.claude/settings.local.json`
- [ ] "Run now" both tasks to pre-approve tools
- [ ] Test: submit a bug, verify CRON picks it up, fixes it, deploys, writes comment
- [ ] Test: submit a feature, verify Feature Builder implements it
- [ ] Update CLAUDE.md with the new subsystem documentation
- [ ] Add a /learn guide for the widget
