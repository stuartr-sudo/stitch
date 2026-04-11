# YouTube Publishing Integration — Design Spec

## Overview

Add per-brand YouTube publishing to Stitch. Users connect their YouTube channel to a brand via OAuth in Brand Kit, then publish ready video drafts directly to YouTube with a review-and-edit step.

## Scope

- YouTube only (TikTok, Instagram, etc. are future work)
- Per-brand OAuth connection (one YouTube channel per brand)
- Review & edit modal before publishing (title, description, tags, visibility)
- Auto-refresh of expired OAuth tokens

## Architecture

### New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/youtube/auth` | GET | Initiates OAuth flow — redirects to Google consent screen |
| `/api/youtube/callback` | GET | Handles Google redirect — exchanges code for tokens, stores them |
| `/api/youtube/upload` | POST | Uploads a video to the brand's connected YouTube channel |
| `/api/youtube/disconnect` | POST | Removes stored tokens for a brand |
| `/api/youtube/status` | GET | Returns connection status for a brand (channel name or not connected) |

### New Database Table

**`brand_youtube_tokens`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, default gen_random_uuid() |
| `brand_username` | text | Unique — one connection per brand |
| `user_id` | uuid | References auth.users |
| `access_token` | text | Google OAuth access token |
| `refresh_token` | text | Google OAuth refresh token (long-lived) |
| `expires_at` | timestamptz | When access_token expires |
| `channel_id` | text | YouTube channel ID |
| `channel_title` | text | YouTube channel display name |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Default now() |

RLS enabled. Policy: users can only read/modify rows where `user_id` matches their auth ID. Server-side operations use service role key.

Note: A `platform_connections` table exists in the schema but is unused. This new table is YouTube-specific and simpler. `platform_connections` can be revisited if multi-platform OAuth is added later.

### Database Migration: `ad_drafts`

Add column: `ALTER TABLE ad_drafts ADD COLUMN youtube_video_id text;`

### Environment Variables

```
GOOGLE_CLIENT_ID=<in .env>
GOOGLE_CLIENT_SECRET=<in .env>
YOUTUBE_REDIRECT_URI=https://stitchstudios.app/api/youtube/callback
```

## Data Flow

### OAuth Connection (Brand Kit)

1. User clicks "Connect YouTube" in Brand Kit modal for a brand
2. Frontend navigates to `GET /api/youtube/auth?brand_username=xyz`
3. Server constructs Google OAuth URL:
   - Scopes: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly`
   - State parameter: JSON `{ brand_username, user_id, nonce }` base64-encoded. Nonce is a random string stored temporarily in DB (`youtube_oauth_state` table or short-lived row) to verify on callback.
   - `access_type=offline` (to get refresh_token)
   - `prompt=consent` (force consent to always get refresh_token)
4. User authorizes on Google
5. Google redirects to `/api/youtube/callback?code=...&state=...`
6. Server:
   - Decodes state, verifies nonce exists in DB (prevents CSRF), deletes nonce
   - Verifies `user_id` in state matches authenticated session
   - Exchanges authorization code for access_token + refresh_token
   - Fetches channel info via YouTube Data API (`channels.list?mine=true`)
   - Upserts into `brand_youtube_tokens`
   - Redirects to `/?youtube_connected=1&brand=xyz` (frontend shows success toast)

### Video Upload (Publish Flow)

1. User clicks publish on a ready draft, selects YouTube channel
2. PublishModal receives `draftId` and `brandUsername` as props (passed from CampaignsPage)
3. Frontend calls `GET /api/youtube/status?brand_username=xyz` to check connection
4. If not connected: show message to connect in Brand Kit
5. If connected: show edit form pre-filled with:
   - **Title**: campaign name (truncated to 100 chars)
   - **Description**: first 200 chars of script/article content + "\n\nMade with Stitch Studios"
   - **Tags**: niche keywords if available, empty otherwise
   - **Visibility**: "unlisted" default (dropdown: public, unlisted, private)
6. User reviews, clicks "Publish to YouTube"
7. Frontend sets draft status to `'publishing'` optimistically, calls `POST /api/youtube/upload`:
   ```json
   {
     "draft_id": "uuid",
     "brand_username": "xyz",
     "title": "...",
     "description": "...",
     "tags": ["tag1", "tag2"],
     "privacy": "unlisted"
   }
   ```
8. Server:
   - Sets `publish_status` to `'publishing'` in DB (prevents duplicate uploads)
   - Loads brand's YouTube tokens
   - Refreshes access_token if expired
   - Resolves video URL: looks at `assets_json` on the draft for the final video URL
   - Downloads video from Supabase storage URL
   - Uploads to YouTube using resumable upload API
   - For Shorts (vertical, ≤60s): prepends `#Shorts` to title if not present
   - Stores YouTube video ID on `ad_drafts.youtube_video_id`
   - Updates `publish_status` to `'published'`
9. Returns `{ success: true, youtube_video_id, youtube_url }`
10. On failure: sets `publish_status` back to `'ready'`, returns error

### Token Refresh

Before each upload:
1. Check if `expires_at < now()`
2. If expired, POST to `https://oauth2.googleapis.com/token` with `grant_type=refresh_token`
3. Update `access_token` and `expires_at` in database
4. If refresh fails (token revoked), delete the token row and return error prompting re-auth

### Brand Resolution

The upload request includes `brand_username`. The frontend knows the brand because:
- `CampaignsPage` loads campaigns which have `brand_username`
- The selected campaign's `brand_username` is passed through to PublishModal

## Frontend Changes

### Brand Kit Modal (`BrandKitModal.jsx`)

Add a "YouTube" section after existing brand settings:

- **Not connected**: "Connect YouTube Channel" button → navigates to `/api/youtube/auth?brand_username=...`
- **Connected**: Shows channel name, "Disconnect" button (with confirmation)
- Connection status fetched via `GET /api/youtube/status?brand_username=...`

### Publish Modal (`PublishModal.jsx`)

Update props to receive `draftId`, `brandUsername`, and draft data.

When YouTube is selected from the channel grid:

- Check connection status for the selected brand
- If connected: render YouTube publish form (title, description, tags input, visibility dropdown, "Upload to YouTube" button)
- If not connected: render message with link to Brand Kit
- Show upload progress state (idle → uploading → success/error)
- Disable "Upload" button while uploading to prevent double-submit

### Ad Drafts Display (`CampaignsPage.jsx`)

- If a draft has `youtube_video_id`, show a small YouTube icon linking to `https://youtube.com/watch?v={id}`

## Error Handling

| Scenario | Behavior |
|----------|----------|
| OAuth denied by user | Redirect back with error param, show toast |
| Token refresh fails | Delete stored tokens, return 401 with re-auth prompt |
| Upload fails (network) | Return 500, set draft back to "ready", show error toast |
| Upload fails (quota) | Return error with YouTube's message |
| No video URL on draft | Return 400 "No video to upload" |
| Brand not connected | Return 400 "YouTube not connected for this brand" |
| Draft already publishing | Return 409 "Upload already in progress" |
| Video too large (>256GB) | Return 400 with size limit message (unlikely for shorts) |

## Security

- OAuth tokens stored server-side only (never sent to frontend)
- Frontend only sees connection status (connected/not, channel name) via `/api/youtube/status`
- State parameter includes a random nonce verified on callback (CSRF protection)
- `user_id` in state is verified against the authenticated user on callback
- RLS on `brand_youtube_tokens` restricts access to token owner
- Disconnect requires authenticated user who owns the brand
- Tokens stored as plain text in DB (acceptable for single-user app; encryption at rest is out of scope)

## Google Cloud Setup Notes

- App is in "Testing" mode — only whitelisted test users can authorize
- Add your Gmail as a test user in OAuth consent screen settings
- No Google verification review needed for personal use
- Authorized redirect URI: `https://stitchstudios.app/api/youtube/callback`

## Out of Scope

- TikTok, Instagram, X publishing (future work)
- YouTube Analytics/reporting
- Scheduled YouTube publishing (YouTube's own scheduling)
- Multiple YouTube channels per brand
- Token encryption at rest
