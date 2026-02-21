export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(501).json({
    error: 'Voiceover generation is not yet available. Coming soon.',
    message: 'We are working on integrating a reliable voiceover service. Check back soon!'
  });
}
