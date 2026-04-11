# Quick Start - Audio Library Feature

## ⚡ 2-Minute Setup

### Step 1: Run Database Migration (2 minutes)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to SQL Editor
4. Create new query
5. Copy entire content of `supabase-migration-v3.sql`
6. Click "Run"
7. Wait for "Success" message

### Step 2: Restart Dev Server (30 seconds)
```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

### Step 3: Test the Feature (1 minute)
1. Open app in browser
2. Go to Audio Studio (Music/Lyria 2/etc)
3. Enter prompt: "Happy upbeat music"
4. Click "Generate Audio"
5. Wait for generation
6. Click "Add to Timeline"
7. See toast: "Audio saved to library!"
8. Open Library modal
9. Filter: "Audio Only"
10. See your generated audio

---

## 📋 Files to Review

### Must Read
- `QUICK_START_AUDIO_LIBRARY.md` ← You are here
- `AUDIO_LIBRARY_CHECKLIST.md` ← Verification steps

### Reference
- `IMPLEMENTATION_GUIDE_AUDIO_LIBRARY.md` ← Complete guide
- `CODE_CHANGES_SUMMARY.md` ← What code changed
- `AUDIO_LIBRARY_SETUP.md` ← Feature overview

### Database
- `supabase-migration-v3.sql` ← SQL to run

---

## 🎯 Features at a Glance

### Generate & Save
```
Audio Studio Modal
  ↓ Generate audio
  ↓ Click "Add to Timeline"
  ↓ Auto-saves to generated_audio table
  ↓ Shows "Audio saved to library!" toast
  ↓ Appears in timeline AND library
```

### Browse & Play
```
Library Modal
  ↓ Shows all generated audio
  ↓ Play/pause controls
  ↓ Volume control
  ↓ Can search and filter
  ↓ Can delete
```

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Audio generates in Audio Studio
- [ ] "Add to Timeline" button shows
- [ ] Toast says "Audio saved to library!"
- [ ] Library modal opens without errors
- [ ] "Audio Only" filter exists
- [ ] Generated audio appears in library
- [ ] Play button works
- [ ] Pause button works
- [ ] Volume button works
- [ ] Can delete audio
- [ ] Deleted audio disappears
- [ ] Can search for audio
- [ ] Multiple audio files show

---

## 🐛 Common Issues

### Audio not appearing in library?
**Solution**: 
1. Refresh the library modal (Ctrl+Shift+R)
2. Check Supabase migration ran without errors
3. Check browser console for errors (F12)

### Play button does nothing?
**Solution**:
1. Check if audio URL is valid
2. Try different browser (test CORS issues)
3. Check Supabase storage URLs are accessible

### "Audio saved to library!" not showing?
**Solution**:
1. Check user is logged in
2. Check Supabase connection (look for errors)
3. Check console for error messages

### Audio not generating?
**Solution**: 
- This is separate from library feature
- Check `/api/audio/music` endpoint
- Check FAL API keys are configured

---

## 🔑 Key Code Changes

### AudioStudioModal.jsx
```javascript
// Import added
import { supabase } from '@/lib/supabase';

// handleInsert() now saves to database
await supabase.from('generated_audio').insert({
  user_id: user.id,
  title: audioItem.title,
  prompt: prompt,
  negative_prompt: negativePrompt,
  model: model,
  audio_url: generatedUrl,
  duration_seconds: duration,
  refinement: refinement,
  creativity: creativity,
  seed: seed
});
```

### LibraryModal.jsx
```javascript
// Load audio from database
const { data: audio } = await supabase
  .from('generated_audio')
  .select('*');

// Display audio with player
{isAudio && (
  <audio ref={audioRef} src={mediaUrl} />
)}
```

---

## 📊 Database Table

```sql
CREATE TABLE generated_audio (
  id uuid PRIMARY KEY,
  user_id uuid (RLS enabled),
  title text,
  prompt text,
  negative_prompt text,
  model text,
  audio_url text,
  duration_seconds float,
  refinement integer,
  creativity float,
  seed integer,
  created_at timestamp,
  updated_at timestamp
);
```

---

## 🚀 What's Next?

1. **Immediate**: Run the migration, test features
2. **Today**: Verify all functionality works
3. **This Week**: Add to user documentation
4. **Future**: Consider advanced features like:
   - Export with metadata
   - Audio waveform preview
   - Batch delete
   - Favorites/tagging

---

## 💬 Questions?

Refer to the full implementation guide:
- See `IMPLEMENTATION_GUIDE_AUDIO_LIBRARY.md` for deep dive
- Check `CODE_CHANGES_SUMMARY.md` for exact code changes
- Use `AUDIO_LIBRARY_CHECKLIST.md` for troubleshooting

---

## ⏱️ Time Estimate

- **Setup**: ~5 minutes (SQL migration + restart)
- **Testing**: ~10 minutes (generate audio, browse library)
- **Learning**: ~30 minutes (read implementation guide)
- **Total**: ~45 minutes to full deployment

---

**Status**: ✅ Ready to deploy
**Database**: ✅ Migration provided
**Frontend**: ✅ Code complete
**Documentation**: ✅ Comprehensive

Good to go! 🎉
