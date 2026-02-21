import { getSupabaseServiceRoleClient } from '../../lib/supabase';
import { getUserKeys } from '../../lib/getUserKeys';
import { pollForResult } from '../../lib/fal-client';

export default async function handleAudioGenerate(req, res) {
  const { model, prompt } = req.body;
  const userId = req.user.id;

  if (!model || !prompt) {
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: userKeys, error: userKeysError } = await getUserKeys(supabase, userId);

  if (userKeysError || !userKeys) {
    console.error('Error fetching user keys:', userKeysError);
    return res.status(500).json({ error: 'Failed to retrieve user API keys.' });
  }

  let falAiKey;
  if (model === 'elevenlabs-tts') {
    falAiKey = userKeys.ELEVENLABS_API_KEY;
  } else if (model === 'suno-music') {
    falAiKey = userKeys.SUNO_API_KEY;
  } else if (model === 'stable-audio') {
    falAiKey = userKeys.STABLE_AUDIO_API_KEY;
  } else if (model === 'foley-gen') {
    falAiKey = userKeys.AUDIOGEN_API_KEY;
  }

  if (!falAiKey) {
    return res.status(400).json({ error: `API key for ${model} is not configured.` });
  }

  // Mock Fal.ai request for now
  console.log(`[AudioGenerate] Mocking generation for model: ${model}, prompt: ${prompt}`);

  // Simulate a request ID and a potential direct audioUrl for immediate results
  const requestId = `audio-req-${Date.now()}`;
  const mockAudioUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-110855.mp3';

  if (model === 'elevenlabs-tts') {
    // For ElevenLabs, simulate a direct audio URL more often
    return res.status(200).json({ audioUrl: mockAudioUrl });
  } else {
    // For other models, simulate an async process with a request ID
    return res.status(202).json({ requestId });
  }
}
