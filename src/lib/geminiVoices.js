// src/lib/geminiVoices.js
// Frontend mirror of Gemini TTS voices (backend list in api/lib/voiceoverGenerator.js)
export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', description: 'Strong, firm female' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat, lively male' },
  { id: 'Charon', label: 'Charon', description: 'Calm, professional male' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright, clear female' },
  { id: 'Aoede', label: 'Aoede', description: 'Warm, melodic female' },
  { id: 'Achernar', label: 'Achernar', description: 'Deep, resonant' },
  { id: 'Achird', label: 'Achird', description: 'Gentle, measured' },
  { id: 'Algenib', label: 'Algenib', description: 'Energetic, bright' },
  { id: 'Algieba', label: 'Algieba', description: 'Warm, conversational' },
  { id: 'Alnilam', label: 'Alnilam', description: 'Steady, authoritative' },
  { id: 'Autonoe', label: 'Autonoe', description: 'Soft, thoughtful' },
  { id: 'Callirrhoe', label: 'Callirrhoe', description: 'Clear, articulate' },
  { id: 'Despina', label: 'Despina', description: 'Light, airy' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Rich, dramatic' },
  { id: 'Erinome', label: 'Erinome', description: 'Crisp, professional' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Bold, commanding' },
  { id: 'Gacrux', label: 'Gacrux', description: 'Smooth, reassuring' },
  { id: 'Iapetus', label: 'Iapetus', description: 'Neutral, versatile' },
  { id: 'Laomedeia', label: 'Laomedeia', description: 'Melodious, flowing' },
  { id: 'Leda', label: 'Leda', description: 'Quiet, intimate' },
  { id: 'Orus', label: 'Orus', description: 'Strong, grounded' },
  { id: 'Pulcherrima', label: 'Pulcherrima', description: 'Elegant, refined' },
  { id: 'Rasalgethi', label: 'Rasalgethi', description: 'Deep, sonorous' },
  { id: 'Sadachbia', label: 'Sadachbia', description: 'Cheerful, warm' },
  { id: 'Sadaltager', label: 'Sadaltager', description: 'Measured, precise' },
  { id: 'Schedar', label: 'Schedar', description: 'Bright, enthusiastic' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Calm, soothing' },
  { id: 'Umbriel', label: 'Umbriel', description: 'Low, mysterious' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Clear, confident' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Animated, expressive' },
];

// Popular voices shown first in the picker
export const FEATURED_VOICES = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Aoede'];
