export default async function handler(req, res) {
  return res.status(501).json({ error: 'Audio generation endpoint not yet implemented. Use /api/audio/music or /api/audio/voiceover instead.' });
}
