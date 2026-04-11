# Scheduled Publishing UX — Design Spec

## Goal

Enable users to schedule completed Shorts (and other video drafts) for publishing to connected platforms (YouTube, TikTok, Instagram, Facebook, LinkedIn) with per-platform metadata overrides, a visual publish queue, and batch scheduling support.

## Context

The infrastructure for platform publishing partially exists: OAuth token management via `tokenManager.js`, connected accounts settings UI, and a 30-second poller in `scheduledPublisher.js`. However, the current scheduler only flips `ad_drafts.publish_status` without calling any platform publisher, and the existing platform publishers are image/text-oriented — video publishing functions need to be built or extracted for most platforms. There is no scheduling UI and no queue management view. This feature closes those gaps.

### Publisher Readiness

| Platform | Existing Publisher | Video Support | Work Needed |
|---|---|---|---|
| YouTube | `api/youtube/upload.js` (Express handler) | Yes (resumable upload) | Extract upload logic into reusable `publishVideoToYouTube()` function in `api/lib/youtubePublisher.js`. Current handler uses legacy `youtubeTokens.js` — new function uses `tokenManager.loadTokens()`. |
| TikTok | `tiktokPublisher.publishVideoToTikTok()` | Yes | None — ready to use |
| Instagram | `instagramPublisher.js` | No (image/carousel only) | Add `publishReelToInstagram()` using Meta Graph API Reels endpoint (`/me/media` with `media_type=REELS`, `video_url`) |
| Facebook | `facebookPublisher.js` | No (image posts only) | Add `publishVideoToFacebookPage()` using Graph API video upload (`/{page-id}/videos`) |
| LinkedIn | `linkedinPublisher.js` | No (image posts only) | Add `publishVideoToLinkedIn()` using LinkedIn video upload API (initialize upload → PUT binary → create post with video URN) |

## Architecture

A new `publish_queue` table stores one row per platform per draft. When a user schedules a draft to YouTube + TikTok, two rows are created. The existing `scheduledPublisher.js` poller is rewired to query `publish_queue` instead of `ad_drafts`, calling the appropriate platform publisher for each due item independently. Per-platform success/failure tracking allows partial success (YouTube publishes, TikTok fails) with retry support.

Entry points: (1) the Shorts draft review page for individual scheduling, (2) a new Publish Queue page at `/publish` for queue management, and (3) the Batch Queue results page for bulk scheduling.

## Data Model

### New table: `publish_queue`

```sql
CREATE TABLE publish_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draft_id        uuid REFERENCES ad_drafts(id) ON DELETE CASCADE NOT NULL,
  platform        text NOT NULL,
  status          text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed')),
  scheduled_for   timestamptz NOT NULL,
  title           text NOT NULL,
  description     text DEFAULT '',
  privacy         text DEFAULT 'public',
  published_id    text,
  published_url   text,
  error           text,
  attempts        int DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE publish_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue items" ON publish_queue
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own queue items" ON publish_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue items" ON publish_queue
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own queue items" ON publish_queue
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on publish_queue" ON publish_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_publish_queue_scheduled ON publish_queue(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX idx_publish_queue_user ON publish_queue(user_id, status);
```

**Column notes:**
- `platform`: one of `'youtube'`, `'tiktok'`, `'instagram'`, `'facebook'`, `'linkedin'`
- `privacy`: platform-specific values — YouTube (`public`, `unlisted`, `private`), TikTok (`public`, `friends`, `private`), Facebook (`public`, `friends`, `only_me`), Instagram and LinkedIn (`public` only)
- `published_id`: the platform's post/video ID after successful publish (e.g. YouTube video ID)
- `published_url`: direct link to the published content on the platform
- `attempts`: incremented on each publish attempt, max 3 before permanent failure

No changes to `ad_drafts`. The existing `publish_status` and `scheduled_for` columns on `ad_drafts` are left as-is for backward compatibility but are not used by this new flow.

## API Endpoints

### `POST /api/publish/schedule`

Schedule a draft for publishing to one or more platforms.

**Request body:**
```json
{
  "draft_id": "uuid",
  "platforms": [
    {
      "platform": "youtube",
      "title": "My Short Title",
      "description": "Description text",
      "privacy": "public"
    },
    {
      "platform": "tiktok",
      "title": "My Short Title",
      "description": "",
      "privacy": "public"
    }
  ],
  "scheduled_for": "2026-04-03T14:00:00Z"
}
```

**Validation:**
- Draft exists, belongs to user, and has a final video URL (precedence: `captioned_video_url` → `assets_json.final_video_url` → `assets_json.video_url`)
- All specified platforms are connected (check `platform_connections` for user)
- `scheduled_for` is in the future, or omitted/null for publish-now
- At least one platform specified

**Behavior:**
- Inserts one `publish_queue` row per platform
- If `scheduled_for` is omitted or null (publish now): sets `scheduled_for` to `now()` — the poller picks it up within 30 seconds. The frontend shows a "Publishing..." state and polls the queue item status every 5 seconds until all items transition to `published` or `failed`.

**Response:** `{ queue_ids: ["uuid", ...], scheduled_for: "ISO" }`

### `GET /api/publish/queue`

List the user's publish queue.

**Query params:**
- `status` (optional): comma-separated filter, e.g. `?status=scheduled,failed`
- `limit` (optional): default 50

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "draft_id": "uuid",
      "platform": "youtube",
      "status": "scheduled",
      "scheduled_for": "ISO",
      "title": "...",
      "description": "...",
      "privacy": "public",
      "published_id": null,
      "published_url": null,
      "error": null,
      "attempts": 0,
      "created_at": "ISO",
      "draft_title": "...",
      "draft_video_url": "..."
    }
  ]
}
```

Joins `ad_drafts` → `campaigns` to get `draft_title` (from `campaigns.name`) and `draft_video_url` (from `ad_drafts.captioned_video_url` or `assets_json.final_video_url`).

### `POST /api/publish/retry`

Retry a failed publish.

**Request body:** `{ "queue_id": "uuid" }`

**Validation:** Item belongs to user, status is `'failed'`.

**Behavior:** Resets status to `'scheduled'`, sets `scheduled_for` to `now()`, resets `attempts` to 0, clears `error`.

**Response:** `{ success: true }`

### `POST /api/publish/cancel`

Cancel a scheduled publish.

**Request body:** `{ "queue_id": "uuid" }`

**Validation:** Item belongs to user, status is `'scheduled'`.

**Behavior:** Deletes the row.

**Response:** `{ success: true }`

## Scheduler Modifications

**File:** `api/lib/scheduledPublisher.js`

The existing poller is rewired to query `publish_queue` instead of `ad_drafts`.

**Poll query:**
```sql
SELECT * FROM publish_queue
WHERE status = 'scheduled'
  AND scheduled_for <= NOW()
  AND attempts < 3
ORDER BY scheduled_for ASC
LIMIT 5
```

**Per-item processing:**
1. Set status to `'publishing'`, increment `attempts`
2. Load the draft's final video URL from `ad_drafts`
3. Load platform tokens via `tokenManager.loadTokens(userId, platform, supabase)`
4. Call the appropriate publisher:
   - YouTube: `youtubePublisher.publishVideoToYouTube()` (new reusable function, resumable upload, auto-appends `#Shorts` for vertical video < 60s, sets `containsSyntheticMedia: true`)
   - TikTok: `tiktokPublisher.publishVideoToTikTok()`
   - Instagram: `instagramPublisher.publishReelToInstagram()` (new function, Meta Graph API Reels)
   - Facebook: `facebookPublisher.publishVideoToFacebookPage()` (new function, Graph API video upload)
   - LinkedIn: `linkedinPublisher.publishVideoToLinkedIn()` (new function, LinkedIn video upload API)
5. On success: set status to `'published'`, store `published_id` and `published_url`, set `updated_at`
6. On failure: set status to `'failed'`, store error message, set `updated_at`

Each item is processed independently — one failure does not block others.

**Max 3 attempts:** After 3 failed attempts, the item stays as `'failed'` and is no longer picked up by the poller. `POST /api/publish/retry` resets `attempts` to 0, status to `'scheduled'`, and `scheduled_for` to now. This gives 3 fresh auto-attempts per manual retry.

**Stale publishing recovery:** On each poll cycle, before processing new items, reset any items stuck in `'publishing'` status for more than 10 minutes back to `'scheduled'` (without incrementing attempts). This handles server restarts or crashes mid-publish.

```sql
UPDATE publish_queue
SET status = 'scheduled', updated_at = now()
WHERE status = 'publishing'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

## Frontend: Draft Page Schedule Entry Point

**File:** `src/pages/ShortsDraftPage.jsx`

A "Publish" section appears below the video preview when the draft has a final video (`captioned_video_url` or `assets_json.final_video_url`).

**"Publish Now" UX flow:** After clicking "Publish Now", the button transitions to a spinner with "Publishing..." text. The frontend polls `GET /api/publish/queue?status=publishing,published,failed` every 5 seconds, showing per-platform status chips (spinner → checkmark → error icon). Once all items have resolved, the section shows the final results with "View on [Platform]" links for successes and "Retry" for failures.

**Components:**
1. **Platform checkboxes** — one per platform. Connected platforms are selectable; unconnected ones show greyed out with "Connect" link to `/settings/accounts`. Fetches connections via `GET /api/accounts/connections`.
2. **Default metadata fields** — title (pre-filled from draft/campaign name), description (empty), privacy dropdown (`public` default).
3. **Per-platform overrides** — collapsible "Customize per platform" section. When expanded, shows title/description/privacy fields for each selected platform, pre-filled from defaults. Only shown fields that differ per platform (e.g. privacy options vary).
4. **Schedule picker** — radio toggle: "Publish Now" vs "Schedule". If schedule selected, shows `<input type="datetime-local">`.
5. **Action button** — "Publish Now to N platforms" or "Schedule for [date]". Calls `POST /api/publish/schedule`.
6. **Confirmation banner** — after scheduling, shows success message with link to Publish Queue page.

**Privacy options per platform:**
- YouTube: Public, Unlisted, Private
- TikTok: Public, Friends, Private
- Instagram: Public (only option, selector hidden)
- Facebook: Public, Friends, Only Me
- LinkedIn: Public (only option, selector hidden)

## Frontend: Publish Queue Page

**Route:** `/publish` — protected route.

**Nav entry:** Added to VideoAdvertCreator sidebar nav panel as "Publish Queue" with `Calendar` lucide icon.

### Timeline Strip (top)

A horizontal 14-day strip spanning today through 13 days ahead.

- Each day is a column with a date label
- Scheduled items appear as small colored dots, color-coded by platform:
  - YouTube: red (`#FF0000`)
  - TikTok: dark (`#010101`)
  - Instagram: pink (`#E1306C`)
  - Facebook: blue (`#1877F2`)
  - LinkedIn: blue (`#0A66C2`)
- Hover on a dot shows tooltip: draft title + scheduled time
- Click on a dot scrolls the list below to that item
- "Today" column is highlighted with a subtle background
- Days with no scheduled items show just the date tick

### List View (below)

**Filter tabs:** All | Scheduled | Published | Failed — defaults to "All".

**Items grouped by date** (today, tomorrow, specific dates, then "Past").

Each item row shows:
- Platform icon (colored) + draft title
- Scheduled time (or "Published at [time]" / "Failed" with truncated error)
- Small video thumbnail from the draft
- Status badge: Scheduled (blue), Publishing (amber with spinner), Published (green), Failed (red)
- Actions:
  - Scheduled: "Cancel" button
  - Failed: "Retry" button + error tooltip
  - Published: "View" link (opens `published_url` in new tab)

**Empty state:** "No scheduled publishes yet. Create a Short and schedule it from the draft page."

**Polling:** Refreshes every 10 seconds while there are items with status `'scheduled'` or `'publishing'`.

## Frontend: Batch Queue Integration

**File:** `src/pages/BatchQueuePage.jsx`

When a batch is completed (`batch.status === 'completed'`), a "Schedule All" section appears in the summary banner.

**Components:**
1. **Platform checkboxes** — same connected-platform logic as draft page
2. **Title template** — text input with `{topic}` placeholder, default: `"{topic}"`. Expanded per draft using the job's topic.
3. **Shared description** — text field, applied to all
4. **Shared privacy** — dropdown, applied to all
5. **Schedule options** — "Publish Now" or date/time picker
6. **Stagger toggle** — checkbox: "Space publishes 1 hour apart". When enabled, each *draft's* `scheduled_for` is offset by 1 hour from the previous (first draft at selected time, second at +1h, third at +2h, etc.). All platforms for a single draft share the same time — stagger is per-draft, not per-platform.
7. **"Schedule N Videos" button** — calls `POST /api/publish/schedule` once per completed draft

Individual completed jobs in the batch results also get a small "Schedule" link that navigates to `/shorts/draft/:draftId`.

## Files Changed / Created

**New files:**
- `supabase-migration-publish-queue.sql` — migration
- `api/publish/schedule.js` — POST /api/publish/schedule
- `api/publish/queue.js` — GET /api/publish/queue
- `api/publish/retry.js` — POST /api/publish/retry
- `api/publish/cancel.js` — POST /api/publish/cancel
- `api/lib/youtubePublisher.js` — reusable `publishVideoToYouTube()` extracted from `api/youtube/upload.js`
- `src/pages/PublishQueuePage.jsx` — Publish Queue page

**Modified files:**
- `api/lib/scheduledPublisher.js` — rewire to poll `publish_queue`, call platform publishers
- `api/lib/instagramPublisher.js` — add `publishReelToInstagram()`
- `api/lib/facebookPublisher.js` — add `publishVideoToFacebookPage()`
- `api/lib/linkedinPublisher.js` — add `publishVideoToLinkedIn()`
- `src/pages/ShortsDraftPage.jsx` — add Publish section
- `src/pages/BatchQueuePage.jsx` — add Schedule All section
- `src/pages/VideoAdvertCreator.jsx` — add Publish Queue nav card
- `src/App.jsx` — add `/publish` route
- `server.js` — register 4 new API routes

## Out of Scope

- Publishing analytics/reporting (view counts, engagement)
- Auto-scheduling (autonomous pipeline integration) — existing `AutonomousConfigModal` handles this separately
- Platform-specific content adaptation (aspect ratio, watermarks)
- Draft editing from the Publish Queue page (user goes to draft page for edits)
- Publish notifications (email, push)
