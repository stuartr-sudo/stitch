# YouTube Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-brand YouTube OAuth connection and video upload to Stitch, enabling users to publish ready campaign drafts directly to YouTube with a review-and-edit step.

**Architecture:** Four new Express API routes handle OAuth flow and video upload. A new Supabase table stores per-brand YouTube tokens. The BrandKitModal gets a YouTube connection section, and CampaignsPage gets a YouTube publish modal that replaces the current one-click publish for YouTube uploads.

**Tech Stack:** Express.js, Google OAuth 2.0, YouTube Data API v3 (resumable upload), Supabase (Postgres + storage), React (Vite)

**Spec:** `docs/superpowers/specs/2026-03-21-youtube-publishing-design.md`

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/20260321_youtube_tokens.sql` | Migration: brand_youtube_tokens table + ad_drafts.youtube_video_id |
| Create | `api/youtube/auth.js` | OAuth initiation — redirect to Google |
| Create | `api/youtube/callback.js` | OAuth callback — exchange code, store tokens |
| Create | `api/youtube/upload.js` | Video upload to YouTube |
| Create | `api/youtube/status.js` | Check YouTube connection status for a brand |
| Create | `api/youtube/disconnect.js` | Remove stored tokens for a brand |
| Create | `api/lib/youtubeTokens.js` | Shared helper: load tokens, refresh if expired |
| Modify | `server.js` | Register 5 new YouTube routes |
| Modify | `.env` | Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI |
| Modify | `.env.example` | Add placeholder env vars |
| Create | `src/components/modals/YouTubePublishModal.jsx` | YouTube publish form (title, desc, tags, visibility) |
| Modify | `src/components/modals/BrandKitModal.jsx` | Add YouTube connection section to identity tab |
| Modify | `src/pages/CampaignsPage.jsx` | Add YouTube publish button + modal to DraftCard |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260321_youtube_tokens.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- YouTube OAuth tokens per brand
CREATE TABLE IF NOT EXISTS brand_youtube_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_username text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  channel_id text,
  channel_title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_brand_youtube_tokens_updated_at
  BEFORE UPDATE ON brand_youtube_tokens FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE brand_youtube_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own YouTube tokens"
  ON brand_youtube_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add youtube_video_id to ad_drafts
ALTER TABLE ad_drafts ADD COLUMN IF NOT EXISTS youtube_video_id text;
```

Save to `supabase/migrations/20260321_youtube_tokens.sql`.

- [ ] **Step 2: Apply migration**

Run the migration against the Supabase project. Use the Supabase MCP `apply_migration` tool or apply via dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260321_youtube_tokens.sql
git commit -m "feat: add brand_youtube_tokens table and ad_drafts.youtube_video_id column"
```

---

## Task 2: Environment Variables

**Files:**
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Add to `.env`**

Append these three lines to `.env` (get values from Google Cloud Console):
```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
YOUTUBE_REDIRECT_URI=https://stitchstudios.app/api/youtube/callback
```

- [ ] **Step 2: Add placeholders to `.env.example`**

Append to `.env.example`:
```
GOOGLE_CLIENT_ID=               # Google OAuth client ID for YouTube publishing
GOOGLE_CLIENT_SECRET=           # Google OAuth client secret
YOUTUBE_REDIRECT_URI=https://stitchstudios.app/api/youtube/callback
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add YouTube OAuth env var placeholders"
```

**Do NOT commit `.env`.**

---

## Task 3: YouTube Token Helper

**Files:**
- Create: `api/lib/youtubeTokens.js`

- [ ] **Step 1: Write the token helper**

This module handles loading tokens from DB and refreshing expired ones. Used by upload.js and status.js.

```javascript
/**
 * YouTube OAuth token management.
 *
 * loadTokens(brandUsername, supabase) — Load and auto-refresh tokens for a brand.
 * Returns { access_token, refresh_token, channel_id, channel_title } or null.
 */

export async function loadTokens(brandUsername, supabase) {
  const { data: tokens, error } = await supabase
    .from('brand_youtube_tokens')
    .select('*')
    .eq('brand_username', brandUsername)
    .maybeSingle();

  if (error || !tokens) return null;

  // Check if access token is expired (with 5 min buffer)
  const expiresAt = new Date(tokens.expires_at);
  const now = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt <= now) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (!refreshed) {
      // Token revoked — delete and return null
      await supabase.from('brand_youtube_tokens').delete().eq('id', tokens.id);
      return null;
    }

    // Update tokens in DB
    await supabase
      .from('brand_youtube_tokens')
      .update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('id', tokens.id);

    return {
      ...tokens,
      access_token: refreshed.access_token,
    };
  }

  return tokens;
}

async function refreshAccessToken(refreshToken) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/youtubeTokens.js
git commit -m "feat: add YouTube token load/refresh helper"
```

---

## Task 4: OAuth Auth Endpoint

**Files:**
- Create: `api/youtube/auth.js`

- [ ] **Step 1: Write the auth handler**

```javascript
/**
 * GET /api/youtube/auth?brand_username=xyz
 *
 * Redirects to Google OAuth consent screen.
 * Stores a nonce in brand_youtube_tokens (temporary) for CSRF verification.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.query;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const nonce = crypto.randomBytes(16).toString('hex');

  // Store nonce temporarily in DB for verification on callback
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('youtube_oauth_nonces').upsert({
    nonce,
    user_id: req.user.id,
    brand_username,
    created_at: new Date().toISOString(),
  });

  const state = Buffer.from(JSON.stringify({
    brand_username,
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add api/youtube/auth.js
git commit -m "feat: add YouTube OAuth auth initiation endpoint"
```

---

## Task 5: OAuth Callback Endpoint

**Files:**
- Create: `api/youtube/callback.js`

- [ ] **Step 1: Write the callback handler**

```javascript
/**
 * GET /api/youtube/callback?code=...&state=...
 *
 * Handles Google OAuth redirect. Exchanges code for tokens,
 * fetches channel info, stores in brand_youtube_tokens.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect('/?youtube_error=' + encodeURIComponent(oauthError));
  }

  if (!code || !state) {
    return res.redirect('/?youtube_error=missing_params');
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return res.redirect('/?youtube_error=invalid_state');
  }

  const { brand_username, user_id, nonce } = stateData;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify nonce
  const { data: nonceRow } = await supabase
    .from('youtube_oauth_nonces')
    .select('*')
    .eq('nonce', nonce)
    .eq('user_id', user_id)
    .maybeSingle();

  if (!nonceRow) {
    return res.redirect('/?youtube_error=invalid_nonce');
  }

  // Delete used nonce
  await supabase.from('youtube_oauth_nonces').delete().eq('nonce', nonce);

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[youtube/callback] Token exchange failed:', errText);
    return res.redirect('/?youtube_error=token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  if (!refresh_token) {
    console.error('[youtube/callback] No refresh_token returned');
    return res.redirect('/?youtube_error=no_refresh_token');
  }

  // Fetch channel info
  let channelId = null;
  let channelTitle = null;

  try {
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const channelData = await channelRes.json();
    if (channelData.items?.length) {
      channelId = channelData.items[0].id;
      channelTitle = channelData.items[0].snippet?.title;
    }
  } catch (err) {
    console.error('[youtube/callback] Channel fetch failed:', err);
  }

  // Upsert tokens
  const { error: upsertError } = await supabase
    .from('brand_youtube_tokens')
    .upsert({
      brand_username,
      user_id,
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      channel_id: channelId,
      channel_title: channelTitle,
    }, { onConflict: 'brand_username' });

  if (upsertError) {
    console.error('[youtube/callback] Upsert error:', upsertError);
    return res.redirect('/?youtube_error=save_failed');
  }

  console.log(`[youtube/callback] Connected ${brand_username} → ${channelTitle || channelId}`);
  return res.redirect(`/?youtube_connected=1&brand=${encodeURIComponent(brand_username)}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add api/youtube/callback.js
git commit -m "feat: add YouTube OAuth callback endpoint"
```

---

## Task 6: Status & Disconnect Endpoints

**Files:**
- Create: `api/youtube/status.js`
- Create: `api/youtube/disconnect.js`

- [ ] **Step 1: Write status endpoint**

```javascript
/**
 * GET /api/youtube/status?brand_username=xyz
 *
 * Returns YouTube connection status for a brand.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.query;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data } = await supabase
    .from('brand_youtube_tokens')
    .select('channel_id, channel_title')
    .eq('brand_username', brand_username)
    .eq('user_id', req.user.id)
    .maybeSingle();

  return res.json({
    connected: !!data,
    channel_id: data?.channel_id || null,
    channel_title: data?.channel_title || null,
  });
}
```

- [ ] **Step 2: Write disconnect endpoint**

```javascript
/**
 * POST /api/youtube/disconnect
 *
 * Removes YouTube connection for a brand.
 * Body: { brand_username }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.body;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('brand_youtube_tokens')
    .delete()
    .eq('brand_username', brand_username)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add api/youtube/status.js api/youtube/disconnect.js
git commit -m "feat: add YouTube status and disconnect endpoints"
```

---

## Task 7: Upload Endpoint

**Files:**
- Create: `api/youtube/upload.js`

- [ ] **Step 1: Write upload handler**

```javascript
/**
 * POST /api/youtube/upload
 *
 * Uploads a campaign draft's video to YouTube.
 * Body: { draft_id, brand_username, title, description, tags, privacy }
 */

import { createClient } from '@supabase/supabase-js';
import { loadTokens } from '../lib/youtubeTokens.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, brand_username, title, description, tags = [], privacy = 'unlisted' } = req.body;

  if (!draft_id || !brand_username || !title) {
    return res.status(400).json({ error: 'draft_id, brand_username, and title are required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Load draft
  const { data: draft, error: draftError } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draft_id)
    .maybeSingle();

  if (draftError || !draft) return res.status(404).json({ error: 'Draft not found' });

  // Prevent duplicate uploads
  if (draft.publish_status === 'publishing') {
    return res.status(409).json({ error: 'Upload already in progress' });
  }

  // Find video URL from assets_json
  const assets = draft.assets_json || {};
  const videoUrl = assets.final_video_url || assets.video_url || assets.assembled_url;
  if (!videoUrl) return res.status(400).json({ error: 'No video URL found on this draft' });

  // Load and refresh YouTube tokens
  const tokens = await loadTokens(brand_username, supabase);
  if (!tokens) {
    return res.status(401).json({ error: 'YouTube not connected for this brand. Connect in Brand Kit.' });
  }

  // Set publishing status
  await supabase.from('ad_drafts').update({ publish_status: 'publishing' }).eq('id', draft_id);

  try {
    // Download video from Supabase storage
    console.log(`[youtube/upload] Downloading video: ${videoUrl}`);
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const contentLength = videoBuffer.length;

    // Prepare YouTube metadata
    const finalTitle = title.slice(0, 100);
    const metadata = {
      snippet: {
        title: finalTitle,
        description: description || '',
        tags: tags.length > 0 ? tags : undefined,
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: privacy, // public, unlisted, private
        selfDeclaredMadeForKids: false,
      },
    };

    // Step 1: Initiate resumable upload
    console.log(`[youtube/upload] Initiating resumable upload (${contentLength} bytes)`);
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': contentLength,
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      throw new Error(`YouTube upload init failed (${initRes.status}): ${errText}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned from YouTube');

    // Step 2: Upload video bytes
    console.log(`[youtube/upload] Uploading video bytes...`);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': contentLength,
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`YouTube upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const youtubeVideoId = uploadData.id;

    console.log(`[youtube/upload] Success! Video ID: ${youtubeVideoId}`);

    // Update draft with YouTube video ID and publish status
    await supabase
      .from('ad_drafts')
      .update({
        youtube_video_id: youtubeVideoId,
        publish_status: 'published',
      })
      .eq('id', draft_id);

    return res.json({
      success: true,
      youtube_video_id: youtubeVideoId,
      youtube_url: `https://youtube.com/watch?v=${youtubeVideoId}`,
    });
  } catch (err) {
    console.error('[youtube/upload] Error:', err);
    // Revert to ready on failure
    await supabase.from('ad_drafts').update({ publish_status: 'ready' }).eq('id', draft_id);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/youtube/upload.js
git commit -m "feat: add YouTube video upload endpoint with resumable upload"
```

---

## Task 8: Register Routes in server.js

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add all 5 YouTube routes**

Find the voice preview route block (around line 515) and add after it:

```javascript
// YouTube OAuth & Publishing
app.get('/api/youtube/auth', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/auth.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/youtube/callback', async (req, res) => {
  // No auth — this is a redirect from Google, user is not authenticated via JWT
  const handler = await loadApiRoute('youtube/callback.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/youtube/status', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/status.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/youtube/upload', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/upload.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/youtube/disconnect', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/disconnect.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

**Important:** The callback route has NO `authenticateToken` middleware because it's a redirect from Google — the user doesn't have a JWT header. The user_id is verified from the state parameter instead.

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "feat: register YouTube OAuth and upload routes"
```

---

## Task 9: Nonce Migration

**Files:**
- Modify: `supabase/migrations/20260321_youtube_tokens.sql`

- [ ] **Step 1: Add nonce table to existing migration**

Append to the migration file:

```sql
-- Temporary nonces for YouTube OAuth CSRF protection
CREATE TABLE IF NOT EXISTS youtube_oauth_nonces (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL,
  brand_username text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Auto-cleanup: nonces older than 10 minutes are stale
CREATE INDEX IF NOT EXISTS idx_youtube_nonces_created
  ON youtube_oauth_nonces(created_at);
```

- [ ] **Step 2: Apply updated migration**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260321_youtube_tokens.sql
git commit -m "feat: add youtube_oauth_nonces table for CSRF protection"
```

---

## Task 10: YouTube Publish Modal (Frontend)

**Files:**
- Create: `src/components/modals/YouTubePublishModal.jsx`

- [ ] **Step 1: Write the modal component**

```jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Youtube, Loader2, Upload, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function YouTubePublishModal({ draftId, brandUsername, campaignName, scriptText, onClose, onPublished }) {
  const [ytStatus, setYtStatus] = useState(null); // null = loading, object = loaded
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [title, setTitle] = useState((campaignName || '').slice(0, 100));
  const [description, setDescription] = useState(
    (scriptText || '').slice(0, 200) + (scriptText?.length > 200 ? '...' : '') + '\n\nMade with Stitch Studios'
  );
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState('unlisted');

  useEffect(() => {
    if (!brandUsername) { setLoading(false); return; }
    apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(brandUsername)}`)
      .then(r => r.json())
      .then(d => { setYtStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brandUsername]);

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      const res = await apiFetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          brand_username: brandUsername,
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          privacy,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Uploaded to YouTube!');
      if (data.youtube_url) {
        toast.info(`Video: ${data.youtube_url}`, { duration: 8000 });
      }
      onPublished?.(data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'YouTube upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Publish to YouTube</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : !ytStatus?.connected ? (
          <div className="p-6 text-center space-y-3">
            <Youtube className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600">YouTube not connected for this brand.</p>
            <p className="text-xs text-slate-400">Connect your YouTube channel in Brand Kit first.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500">
              Publishing to <strong>{ytStatus.channel_title || ytStatus.channel_id}</strong>
            </p>

            <div>
              <Label className="text-sm text-slate-700">Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                placeholder="Video title"
                className="mt-1"
                maxLength={100}
              />
              <p className="text-[10px] text-slate-400 mt-0.5 text-right">{title.length}/100</p>
            </div>

            <div>
              <Label className="text-sm text-slate-700">Description</Label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Video description..."
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-24 resize-none"
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700">Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="ai, tech, news"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700">Visibility</Label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {ytStatus?.connected && (
            <Button
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload to YouTube'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/YouTubePublishModal.jsx
git commit -m "feat: add YouTubePublishModal with title/desc/tags/visibility form"
```

---

## Task 11: Add YouTube Button to CampaignsPage DraftCard

**Files:**
- Modify: `src/pages/CampaignsPage.jsx`

- [ ] **Step 1: Add import for YouTubePublishModal**

Add to imports at top of file:
```javascript
import YouTubePublishModal from '@/components/modals/YouTubePublishModal';
```

Add `Youtube` to the lucide-react imports.

- [ ] **Step 2: Add state and button to DraftCard component**

In the DraftCard component (the inner component that renders each draft), find the state declarations (around line 220) and add:

```javascript
const [showYouTubePublish, setShowYouTubePublish] = useState(false);
```

In the action buttons area (after the existing "Publish" button, around line 331), add a YouTube button:

```jsx
<Button size="sm" variant="outline" onClick={() => setShowYouTubePublish(true)}
  className="text-xs h-8" title="Publish to YouTube">
  <Youtube className="w-3.5 h-3.5 text-red-600" />
</Button>
```

At the bottom of the DraftCard return, before the closing `</>`, add the modal:

```jsx
{showYouTubePublish && (
  <YouTubePublishModal
    draftId={draft.id}
    brandUsername={typeof campaign?.brand_username === 'object' ? campaign?.brand_username?.username : (campaign?.brand_username || '')}
    campaignName={campaign?.name || ''}
    scriptText={draft.storyboard_json?.script || ''}
    onClose={() => setShowYouTubePublish(false)}
    onPublished={() => { setShowYouTubePublish(false); onUpdated({ ...draft, publish_status: 'published' }); }}
  />
)}
```

**Note:** DraftCard needs access to the `campaign` object for `brand_username` and `name`. If DraftCard doesn't currently receive `campaign` as a prop, pass it from the parent where DraftCard is rendered.

- [ ] **Step 3: Add YouTube link for published drafts**

Where the "Published" badge is shown (around line 334), add a YouTube link if `youtube_video_id` exists:

```jsx
{draft.publish_status === 'published' && (
  <span className="text-xs text-emerald-600 flex items-center gap-1 flex-shrink-0">
    <CheckCircle2 className="w-3.5 h-3.5" /> Published
    {draft.youtube_video_id && (
      <a href={`https://youtube.com/watch?v=${draft.youtube_video_id}`}
        target="_blank" rel="noopener noreferrer"
        className="ml-1 text-red-600 hover:text-red-700"
        onClick={e => e.stopPropagation()}
        title="View on YouTube">
        <Youtube className="w-3.5 h-3.5" />
      </a>
    )}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/CampaignsPage.jsx
git commit -m "feat: add YouTube publish button and link to campaign draft cards"
```

---

## Task 12: Add YouTube Section to BrandKitModal

**Files:**
- Modify: `src/components/modals/BrandKitModal.jsx`

- [ ] **Step 1: Add YouTube connection state**

In the component's state declarations, add:

```javascript
const [ytStatus, setYtStatus] = useState(null);
const [ytLoading, setYtLoading] = useState(false);
```

- [ ] **Step 2: Add YouTube status fetch function**

Add a function to load YouTube status when a brand is selected:

```javascript
const loadYouTubeStatus = async (username) => {
  if (!username) return;
  setYtLoading(true);
  try {
    const res = await apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(username)}`);
    const data = await res.json();
    setYtStatus(data);
  } catch {
    setYtStatus(null);
  }
  setYtLoading(false);
};
```

Call this inside the existing brand loading logic (when a brand is selected/loaded).

- [ ] **Step 3: Add YouTube section to the identity tab**

At the bottom of the identity tab content (before the closing `</TabsContent>` for identity), add:

```jsx
{/* YouTube Connection */}
<div className="border-t pt-4 mt-4">
  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
    <Youtube className="w-4 h-4 text-red-600" /> YouTube Channel
  </h3>
  {ytLoading ? (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 className="w-3 h-3 animate-spin" /> Checking connection...
    </div>
  ) : ytStatus?.connected ? (
    <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 border border-green-200">
      <div>
        <p className="text-sm font-medium text-green-800">Connected</p>
        <p className="text-xs text-green-600">{ytStatus.channel_title || ytStatus.channel_id}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          if (!confirm('Disconnect YouTube channel?')) return;
          await apiFetch('/api/youtube/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand_username: form.username }),
          });
          setYtStatus({ connected: false });
          toast.success('YouTube disconnected');
        }}
        className="text-xs text-red-600 border-red-200 hover:bg-red-50"
      >
        Disconnect
      </Button>
    </div>
  ) : (
    <Button
      variant="outline"
      onClick={() => {
        window.location.href = `/api/youtube/auth?brand_username=${encodeURIComponent(form.username)}`;
      }}
      className="text-sm"
    >
      <Youtube className="w-4 h-4 mr-2 text-red-600" /> Connect YouTube Channel
    </Button>
  )}
</div>
```

Import `Youtube` from lucide-react at the top of the file.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/BrandKitModal.jsx
git commit -m "feat: add YouTube connection section to Brand Kit modal"
```

---

## Task 13: Handle OAuth Redirect Toast

**Files:**
- Modify: `src/App.jsx` or main layout component

- [ ] **Step 1: Add URL param handler**

In the app's root component or layout, add a `useEffect` that checks for `youtube_connected` or `youtube_error` URL params on mount and shows the appropriate toast:

```javascript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('youtube_connected') === '1') {
    toast.success(`YouTube connected for ${params.get('brand') || 'brand'}!`);
    window.history.replaceState({}, '', window.location.pathname);
  }
  if (params.get('youtube_error')) {
    toast.error(`YouTube connection failed: ${params.get('youtube_error')}`);
    window.history.replaceState({}, '', window.location.pathname);
  }
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: handle YouTube OAuth redirect toasts"
```

---

## Task 14: Build & Verify

- [ ] **Step 1: Run build**

```bash
npx vite build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Verify all files exist**

```bash
ls api/youtube/
ls api/lib/youtubeTokens.js
ls src/components/modals/YouTubePublishModal.jsx
ls supabase/migrations/20260321_youtube_tokens.sql
```

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add -A && git status
```
