import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handleAudioGenerate(req, res) {
  try {
    const { model, prompt } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!model || !prompt) {
      return res.status(400).json({ error: 'Model and prompt are required.' });
    }

    const userKeys = await getUserKeys(userId, userEmail);

    if (!userKeys) {
      return res.status(500).json({ error: 'Failed to retrieve user API keys.' });
    }

    let apiKey;
    if (model === 'elevenlabs-tts') {
      apiKey = userKeys.elevenlabsKey;
    } else if (model === 'suno-music') {
      apiKey = userKeys.falKey; // Suno often uses Fal.ai or its own key
    } else if (model === 'stable-audio') {
      apiKey = userKeys.falKey;
    } else if (model === 'foley-gen') {
      apiKey = userKeys.falKey;
    }

    // If model-specific key is missing, check falKey as fallback for Fal-hosted models
    if (!apiKey && model !== 'elevenlabs-tts') {
      apiKey = userKeys.falKey;
    }

    if (!apiKey) {
      return res.status(400).json({ error: `API key for ${model} is not configured. Please add it in API Keys settings.` });
    }

    console.log(`[AudioGenerate] Mocking generation for model: ${model}, prompt: ${prompt}`);

    // In a real implementation, we would call the respective API here.
    // For now, we will return a mock response to allow the frontend to work.
    
    // Simulate a request ID for async models
    const requestId = `audio-req-${Date.now()}`;
    const mockAudioUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-110855.mp3';

    if (model === 'elevenlabs-tts') {
      // For ElevenLabs, we'll return a direct URL for this mock
      return res.status(200).json({ audioUrl: mockAudioUrl });
    } else {
      // For other models, return a request ID to simulate polling
      return res.status(200).json({ requestId });
    }
  } catch (error) {
    console.error('[API/audio/generate] Unhandled error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
