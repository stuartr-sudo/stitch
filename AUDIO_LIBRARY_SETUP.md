# Audio Library Implementation

## Overview
Generated audio files are now automatically saved to the library and can be browsed/managed alongside images and videos.

## What Changed

### 1. Database Schema (supabase-migration-v3.sql)
Created new `generated_audio` table with the following fields:
- `id` - UUID primary key
- `user_id` - References auth.users for RLS
- `title` - Audio title/name
- `prompt` - Original generation prompt
- `negative_prompt` - Negative prompt used
- `model` - Which model generated it (beatoven/music-generation, etc)
- `audio_url` - URL to the audio file in Supabase storage
- `duration_seconds` - Length of audio
- `refinement` - Refinement level used
- `creativity` - Creativity level used
- `seed` - Random seed (if specified)
- `created_at` / `updated_at` - Timestamps

**RLS Policies**: Users can only view/insert/delete their own audio files

**Indexes**: Indexed by user_id and model for faster queries

### 2. AudioStudioModal Updates
When audio is generated and "Add to Timeline" is clicked:

1. **Automatic Saving**: Audio automatically saves to `generated_audio` table with:
   - All generation parameters (prompt, negative_prompt, duration, refinement, creativity, seed)
   - Audio URL from Supabase storage
   - Model used for generation
   - Timestamp

2. **Error Handling**: If save fails, audio still gets added to timeline but shows warning toast

3. **State Management**: After insertion, form fields are cleared for next generation

### 3. LibraryModal Updates
Library now displays audio files alongside images and videos:

- **Audio Display**: Compact player (24px height) with play/pause and mute controls
- **Type Badge**: Purple badge with music icon for audio files
- **Filter Support**: New "Audio Only" filter option
- **Search**: Searches audio by title and prompt
- **Playback**: Full audio controls with play/pause and volume
- **Management**: Can delete audio from library
- **Selection**: Can select audio to add to editor

### 4. Database Migration Required
Run this SQL in Supabase SQL Editor:
```sql
-- See supabase-migration-v3.sql
```

## Usage Flow

1. **Generate Audio**:
   - User opens Audio Studio modal
   - Selects model and enters parameters
   - Clicks "Generate Audio"
   - Receives confirmation toast

2. **Add to Timeline**:
   - Generated audio auto-saves to library
   - Shows "Audio saved to library!" toast
   - User clicks "Add to Timeline"
   - Audio appears on timeline AND in library

3. **Browse Library**:
   - User opens Library modal
   - Can filter to "Audio Only"
   - Sees all generated audio with play controls
   - Can play, delete, or add to editor

## API Integration

### `/api/audio/music` Endpoint
Unchanged behavior - returns audio URL after generation

### Database Inserts
AudioStudioModal now calls:
```javascript
supabase.from('generated_audio').insert({
  user_id,
  title,
  prompt,
  negative_prompt,
  model,
  audio_url,
  duration_seconds,
  refinement,
  creativity,
  seed
})
```

## Supported Models
All audio generation models save to library:
- Beatoven Music Generation
- Beatoven Sound Effects
- MiniMax Music v2
- ElevenLabs Music

## Future Enhancements
- Export audio with metadata
- Audio waveform preview
- Batch operations
- Favorites/tagging system
