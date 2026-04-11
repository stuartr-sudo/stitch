// Tool categories for grouped display in the dropdown
export const TOOL_CATEGORIES = {
  'Image Tools': ['Imagineer', 'Edit Image', 'Smoosh', 'Lens', '3D Viewer', 'Try Style', 'Turnaround', 'Library'],
  'Video Tools': ['JumpStart', 'JumpStart Extend', 'Video Studio', 'Trip', 'Animate', 'Motion Transfer', 'Storyboards', 'Video Analyzer', 'Clone Ad'],
  'Audio Tools': ['Audio Studio'],
  'Social Tools': ['Command Center', 'Ads Manager', 'Ad Intelligence', 'Shorts Workbench', 'LinkedIn', 'Carousels', 'Queue / Publish'],
  'Brand & Setup': ['Brand Kit', 'LoRA Training', 'Settings'],
  'Other': ['Learn Page', 'Proposal Pages', 'Flows', 'General'],
};

// Tool → endpoint mapping (endpoints are optional, shown when a tool is selected)
export const TOOL_ENDPOINTS = {
  'Imagineer': [
    'Nano Banana 2', 'Flux 2', 'Flux 2 Klein 4B', 'Flux 2 Klein 9B', 'Wan 2.2 T2I',
    'SeedDream v4.5', 'Imagen 4', 'Kling Image v3', 'Grok Imagine', 'Ideogram v2',
    'Wavespeed Nano', 'Topaz Upscale', 'GPT-4.1-mini (prompt builder)',
    'Nano Banana 2 Edit', 'SeedDream Edit', 'Wavespeed Nano Ultra Edit', 'Qwen Image Edit',
  ],
  'Edit Image': ['Inpaint', 'Erase'],
  'Smoosh': ['Image Blending'],
  'Lens': ['Multi-angle Generation'],
  '3D Viewer': ['Hunyuan 3D Pro', 'Topaz Upscale'],
  'Try Style': ['Virtual Try-on'],
  'Turnaround': ['All image models', 'Topaz Upscale', 'GPT-4.1-mini (prompt builder)'],
  'Library': ['Image Library', 'Tags', 'Save/Import'],
  'JumpStart': [
    'Veo 3.1', 'Veo 3.1 Lite', 'Veo 3.1 R2V', 'Veo 3.1 FLF', 'Veo 3.1 Lite FLF',
    'Kling 2.0 Master', 'Kling V3 Pro', 'Kling O3 Pro', 'Kling O3 R2V', 'Kling O3 V2V',
    'PixVerse V6', 'PixVerse v4.5', 'Wan 2.5', 'Wan Pro', 'Hailuo',
    'Grok I2V', 'Grok R2V', 'Wavespeed WAN', 'Seedance',
  ],
  'JumpStart Extend': ['Seedance Extend', 'Veo 3.1 Extend', 'Grok Extend'],
  'Video Studio': ['Modal UI'],
  'Trip': ['Video Restyle'],
  'Animate': ['Image-to-Video'],
  'Motion Transfer': ['Modal UI'],
  'Storyboards': [
    'GPT-4.1-mini (narrative)', 'GPT-4.1-mini (visual director)',
    'All image models', 'All video models', 'PDF Export', 'Review/Share',
  ],
  'Video Analyzer': ['Analysis'],
  'Clone Ad': ['Clone'],
  'Audio Studio': [
    'Gemini TTS', 'ElevenLabs TTS', 'ElevenLabs Music',
    'MiniMax Music v2', 'Lyria 2', 'Suno V4', 'ElevenLabs SFX', 'Auto-Subtitle',
  ],
  'Command Center': ['GPT-4.1 (chat)', 'SerpAPI', 'Exa', 'Firecrawl', 'Supabase RAG'],
  'Ads Manager': [
    'GPT-4.1 (copy gen)', 'GPT-4.1-mini (regen)', 'Nano Banana 2',
    'All image models', 'Google Ads OAuth',
  ],
  'Ad Intelligence': ['SerpAPI', 'Exa', 'Firecrawl', 'GPT-4.1'],
  'Shorts Workbench': [
    'GPT-5-mini (topics)', 'GPT-4.1-mini (script)', 'Gemini TTS', 'Whisper',
    'ElevenLabs Music', 'All image models', 'All video models (FLF + I2V)',
    'FFmpeg Compose', 'Auto-Subtitle', 'Scene Repair',
  ],
  'LinkedIn': ['GPT-4.1 (post gen)', 'Nano Banana 2', 'Satori Compositor', 'Exa API', 'LinkedIn OAuth'],
  'Carousels': [
    'GPT-4.1 (content gen)', 'Nano Banana 2', 'Satori Compositor',
    'ElevenLabs TTS (slideshow)', 'FFmpeg Compose', 'Multi-platform publish',
  ],
  'Queue / Publish': ['YouTube Upload', 'Scheduled Publishing'],
  'Brand Kit': ['Firecrawl (URL extract)', 'GPT-4.1-mini (PDF extract)', 'SEWO Connect', 'Background Removal'],
  'LoRA Training': ['GPT-4o-mini (captioning)'],
  'Settings': ['Connected Accounts', 'API Keys'],
  'Learn Page': ['Guides', 'Screenshots'],
  'Proposal Pages': ['Content', 'Password Gate'],
  'Flows': ['Automation Workflows'],
  'General': ['Auth', 'Navigation', 'Deploy', 'Performance', 'UI/Layout', 'Sidebar', 'Routing'],
};

// Request types
export const REQUEST_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'question', label: 'Question' },
  { value: 'feature', label: 'Feature' },
  { value: 'console_error', label: 'Console Error' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'learn_screenshot', label: 'Learn Screenshot' },
  { value: 'prompt_review', label: 'Prompt Review' },
  { value: 'claude_md_update', label: 'CLAUDE.md Update' },
];

// Status config for badges
export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  needs_info: { label: 'Needs Info', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// Flat alphabetical tool list for the dropdown
export const ALL_TOOLS = Object.values(TOOL_CATEGORIES).flat().sort();
