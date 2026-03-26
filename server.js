import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { pollScheduledPublications } from './api/lib/scheduledPublisher.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware - verify Supabase JWT and attach user to request
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server auth not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dynamic API route loading
const loadApiRoute = async (routePath) => {
  try {
    const module = await import(join(__dirname, 'api', routePath));
    return module.default;
  } catch (error) {
    console.error(`Failed to load API route: ${routePath}`, error);
    return null;
  }
};

// JumpStart routes (with auth)
app.post('/api/jumpstart/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/save-video', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/save-video.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/edit', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/edit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/extend', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/extend.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/erase', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jumpstart/erase.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Trip route (with auth)
app.post('/api/trip/restyle', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('trip/restyle.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Animate routes (with auth)
app.post('/api/animate/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('animate/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/animate/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('animate/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Imagineer routes (with auth)
app.post('/api/imagineer/generate', authenticateToken, async (req, res) => {
  try {
    const handler = await loadApiRoute('imagineer/generate.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/imagineer/generate] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

app.post('/api/imagineer/edit', authenticateToken, async (req, res) => {
  try {
    const handler = await loadApiRoute('imagineer/edit.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/imagineer/edit] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

app.post('/api/imagineer/describe-character', authenticateToken, async (req, res) => {
  try {
    const handler = await loadApiRoute('imagineer/describe-character.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/imagineer/describe-character] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

app.post('/api/imagineer/turnaround', authenticateToken, async (req, res) => {
  // Edit endpoints run synchronously and can take 60-120s
  req.setTimeout(180000);
  res.setTimeout(180000);
  try {
    const handler = await loadApiRoute('imagineer/turnaround.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/imagineer/turnaround] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

app.post('/api/imagineer/result', authenticateToken, async (req, res) => {
  try {
    const handler = await loadApiRoute('imagineer/result.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/imagineer/result] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

// Prompt builder (with auth)
app.post('/api/prompt/build-cohesive', authenticateToken, async (req, res) => {
  try {
    const handler = await loadApiRoute('prompt/build-cohesive.js');
    if (handler) return await handler(req, res);
    res.status(500).json({ error: 'Handler not found' });
  } catch (error) {
    console.error('[Route/prompt/build-cohesive] Unhandled error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
});

// Image utilities (with auth)
app.post('/api/images/search', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('images/search.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/import-url', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('images/import-url.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/edit', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('images/edit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/inpaint', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('images/inpaint.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Video frame extraction (with auth)
app.post('/api/video/extract-frame', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('video/extract-frame.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Lens route (with auth)
app.post('/api/lens/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lens/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Smoosh route (with auth)
app.post('/api/smoosh/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('smoosh/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Try Style routes (with auth)
app.post('/api/trystyle/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('trystyle/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/trystyle/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('trystyle/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Library routes (with auth)
app.post('/api/library/save', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('library/save.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/library/update-thumbnail', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('library/update-thumbnail.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Tag management — specific paths BEFORE the catch-all /api/library/tags
app.use('/api/library/tags/auto-tag', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-auto.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-auto]', e); return res.status(500).json({ error: e.message }); }
});
app.post('/api/library/tags/assign', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-assign.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-assign]', e); return res.status(500).json({ error: e.message }); }
});
app.delete('/api/library/tags/unassign', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags-assign.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags-unassign]', e); return res.status(500).json({ error: e.message }); }
});
app.use('/api/library/tags', authenticateToken, async (req, res) => {
  try { return (await loadApiRoute('library/tags.js'))(req, res); }
  catch (e) { console.error('[Route/library/tags]', e); return res.status(500).json({ error: e.message }); }
});

// Brand Kit routes (with auth)
app.post('/api/brand/kit', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/kit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/brand/kit', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/kit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.delete('/api/brand/kit', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/kit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// PDF brand guidelines extraction (with auth)
app.post('/api/brand/extract-pdf', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/extract-pdf.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Background removal (with auth)
app.post('/api/brand/remove-bg', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/remove-bg.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// LoRA training routes (with auth)
app.post('/api/lora/train', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lora/train.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/lora/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lora/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Webhook - Blog to Ad (NO auth - uses webhook secret)
app.post('/api/webhooks/content', async (req, res) => {
  const handler = await loadApiRoute('webhooks/content.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Article → Video autonomous pipeline (NO auth - webhook secret + brand_username)
app.post('/api/article/from-url', async (req, res) => {
  const handler = await loadApiRoute('article/from-url.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Public job status poll (no auth — for Doubleclicker to poll pipeline progress)
app.get('/api/jobs/public-status', async (req, res) => {
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  const { createClient: sbCreate } = await import('@supabase/supabase-js');
  const sb = sbCreate(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb.from('jobs')
    .select('id, status, current_step, total_steps, completed_steps, output_json, error')
    .eq('id', jobId).single();
  if (error || !data) return res.status(404).json({ error: 'Job not found' });
  return res.json({ success: true, job: data });
});

// Jobs status (with auth)
app.post('/api/jobs/status', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jobs/status.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Job polling (GET, with auth — used by Shorts wizard)
app.get('/api/jobs/poll', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jobs/poll.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Audio routes (with auth)
app.post('/api/audio/voiceover', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('audio/voiceover.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/audio/music', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('audio/music.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/audio/captions', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('audio/captions.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/audio/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('audio/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/audio/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('audio/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Storyboard routes (with auth)
app.post('/api/storyboard/generate-scenes', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/generate-scenes.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/storyboard/describe-scene', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/describe-scene.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/storyboard/assemble', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/assemble.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Storyboard presets (GET, POST, DELETE all on same route)
app.get('/api/storyboard/presets', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/presets.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.post('/api/storyboard/presets', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/presets.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.delete('/api/storyboard/presets', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/presets.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/campaigns/research', authenticateToken, (await import('./api/campaigns/research.js')).default);
app.post('/api/campaigns/preview-script', authenticateToken, (await import('./api/campaigns/preview-script.js')).default);
app.post('/api/campaigns/preview-image', authenticateToken, (await import('./api/campaigns/preview-image.js')).default);
app.post('/api/campaigns/topics', authenticateToken, (await import('./api/campaigns/topics.js')).default);

// ─── LinkedIn ───────────────────────────────────────────────────
app.get('/api/linkedin/config', authenticateToken, (await import('./api/linkedin/get-config.js')).default);
app.put('/api/linkedin/config', authenticateToken, (await import('./api/linkedin/update-config.js')).default);
app.post('/api/linkedin/search', authenticateToken, (await import('./api/linkedin/search.js')).default);
app.post('/api/linkedin/search-keyword', authenticateToken, (await import('./api/linkedin/search-keyword.js')).default);
app.post('/api/linkedin/add-topic', authenticateToken, (await import('./api/linkedin/add-topic.js')).default);
app.post('/api/linkedin/add-search-result', authenticateToken, (await import('./api/linkedin/add-search-result.js')).default);
app.get('/api/linkedin/topics', authenticateToken, (await import('./api/linkedin/topics.js')).default);
app.patch('/api/linkedin/topics/:id', authenticateToken, (await import('./api/linkedin/update-topic.js')).default);
app.post('/api/linkedin/generate', authenticateToken, (await import('./api/linkedin/generate-posts.js')).default);
app.get('/api/linkedin/posts', authenticateToken, (await import('./api/linkedin/posts.js')).default);
app.patch('/api/linkedin/posts/:id', authenticateToken, (await import('./api/linkedin/update-post.js')).default);
app.post('/api/linkedin/posts/:id/regenerate', authenticateToken, (await import('./api/linkedin/regenerate-post.js')).default);
app.post('/api/linkedin/posts/:id/publish', authenticateToken, (await import('./api/linkedin/publish.js')).default);

// Style/voice list routes (with auth)
app.get('/api/styles/visual', authenticateToken, (await import('./api/styles/visual.js')).default);
app.get('/api/styles/video', authenticateToken, (await import('./api/styles/video.js')).default);
app.get('/api/styles/frameworks', authenticateToken, async (req, res) => {
  const { listFrameworks, getFrameworksForNiche } = await import('./api/lib/videoStyleFrameworks.js');
  const { niche } = req.query;
  const frameworks = niche ? getFrameworksForNiche(niche) : listFrameworks();
  res.json({ frameworks });
});
app.get('/api/styles/captions', authenticateToken, async (req, res) => {
  const { CAPTION_STYLES } = await import('./api/lib/captionBurner.js');
  res.json({ presets: CAPTION_STYLES });
});
app.get('/api/voices/library', authenticateToken, (await import('./api/voices/library.js')).default);

// Shorts repair & reassemble (with auth)
app.post('/api/shorts/repair-scene', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('shorts/repair-scene.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
app.post('/api/shorts/reassemble', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('shorts/reassemble.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Template routes (with auth)
app.get('/api/templates/list', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('templates/list.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/templates/analyze', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('templates/analyze.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/templates/save', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('templates/save.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/templates/assign', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('templates/assign.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('templates/delete.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Brand usernames route (with auth)
app.get('/api/brand/usernames', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/usernames.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Brand guidelines (SEWO connection — reads shared brand_guidelines + brand_image_styles)
app.get('/api/brand/guidelines', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/guidelines.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Brand avatar routes (with auth)
app.get('/api/brand/avatars', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/avatars.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/brand/avatars', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/avatars.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.delete('/api/brand/avatars/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/avatars.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Pre-built LoRA library (with auth)
app.get('/api/lora/library', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lora/library.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Voice preview (ElevenLabs TTS sample)
app.post('/api/voice/preview', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('voice/preview.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// YouTube OAuth & Publishing
app.get('/api/youtube/auth', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/auth.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/youtube/callback', async (req, res) => {
  // No auth — redirect from Google, user_id verified from state parameter
  const handler = await loadApiRoute('youtube/callback.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/youtube/status', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/status.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/youtube/upload', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/upload.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/youtube/disconnect', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('youtube/disconnect.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Visual subject LoRA training (with auth)
app.post('/api/brand/avatars/:id/train', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('brand/train-avatar.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Campaigns list (with auth)
app.get('/api/campaigns/list', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/list.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Campaign detail with full draft assets (with auth)
app.get('/api/campaigns/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/detail.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Publish / Schedule a draft (with auth)
app.post('/api/campaigns/publish', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/publish.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Create campaign manually (with auth)
app.post('/api/campaigns/regenerate-scene', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/regenerate-scene.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/campaigns/create', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/create.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/campaigns/export', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/export.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.get('/api/campaigns/download-subtitles', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/download-subtitles.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/campaigns/generate-captions', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/generate-captions.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/campaigns/generate-thumbnails', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/generate-thumbnails.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/campaigns/score-consistency', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('campaigns/score-consistency.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Cost dashboard (with auth)
app.get('/api/costs/summary', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('costs/summary.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// OpenAI balance check (with auth)
app.get('/api/openai/balance', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('openai/balance.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Provider health check (all 3 providers)
app.get('/api/providers/health', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('providers/health.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Jobs pause/resume/retry (with auth)
app.post('/api/jobs/pause', authenticateToken, async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { WorkflowEngine } = await import('./api/lib/workflowEngine.js');
  const wf = new WorkflowEngine(jobId, sb);
  await wf.loadState();
  await wf.pause();
  res.json({ success: true, message: 'Job paused' });
});

app.post('/api/jobs/resume', authenticateToken, async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { WorkflowEngine } = await import('./api/lib/workflowEngine.js');
  const wf = new WorkflowEngine(jobId, sb);
  await wf.loadState();
  await wf.resume();
  res.json({ success: true, message: 'Job resumed' });
});

app.post('/api/jobs/retry', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('jobs/retry.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Bulk article processing (NO auth — webhook secret)
app.post('/api/article/bulk', async (req, res) => {
  const handler = await loadApiRoute('article/bulk.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Autonomous pipeline (NO auth — webhook secret)
app.post('/api/article/autonomous', async (req, res) => {
  const handler = await loadApiRoute('article/autonomous.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// AI Director pipeline (NO auth middleware — handler does dual auth: webhook secret OR JWT)
app.post('/api/article/ai-director', async (req, res) => {
  const handler = await loadApiRoute('article/ai-director.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Batch status (no auth — for external polling)
app.get('/api/jobs/batch-status', async (req, res) => {
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'Missing batchId' });
  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await sb.from('job_batches').select('*').eq('id', batchId).single();
  if (error || !data) return res.status(404).json({ error: 'Batch not found' });
  return res.json({ success: true, batch: data });
});

// Autonomous config (with auth)
app.get('/api/autonomous/config', authenticateToken, async (req, res) => {
  const { brand_username } = req.query;
  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { data } = await sb.from('autonomous_configs').select('*').eq('user_id', req.user.id).eq('brand_username', brand_username).maybeSingle();
  res.json({ success: true, config: data || null });
});

app.post('/api/autonomous/config', authenticateToken, async (req, res) => {
  const sb = createClient(supabaseUrl, supabaseServiceKey);
  const { brand_username, ...settings } = req.body;
  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  const { data, error } = await sb.from('autonomous_configs').upsert({
    user_id: req.user.id, brand_username, ...settings,
  }, { onConflict: 'user_id,brand_username' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, config: data });
});

// ── Stitch Queue Poller ──────────────────────────────────────────────────────
// Polls stitch_queue for pending items and routes them by payload type.
const QUEUE_POLL_INTERVAL_MS = parseInt(process.env.QUEUE_POLL_MS || '43200000', 10); // 12 hours (twice a day)

// ── brand_setup handler: auto-create brand_kit from provision data ──────────
async function handleBrandSetup(supabase, item) {
  const p = item.payload || {};
  const brandUsername = item.brand_username;

  // Find the user who owns this brand via user_profiles.assigned_usernames
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .contains('assigned_usernames', [brandUsername])
    .limit(1)
    .maybeSingle();

  if (!profile?.id) {
    throw new Error(`No user found with brand "${brandUsername}" in assigned_usernames`);
  }

  // Upsert brand_kit — idempotent, won't fail if already exists
  const { error: upsertErr } = await supabase
    .from('brand_kit')
    .upsert({
      user_id: profile.id,
      brand_name: p.display_name || brandUsername,
      brand_username: brandUsername,
      colors: p.primary_color ? [p.primary_color] : [],
      logo_url: p.logo_url || null,
      voice_style: p.brand_voice_tone || 'professional',
    }, { onConflict: 'brand_username' });

  if (upsertErr) throw new Error(`brand_kit upsert failed: ${upsertErr.message}`);

  console.log(`[queue/brand_setup] brand_kit created for "${brandUsername}" (user: ${profile.id})`);
  return { success: true, brand_username: brandUsername };
}

// ── article handler: feed into from-url pipeline ────────────────────────────
async function handleArticle(supabase, item) {
  const handler = await loadApiRoute('article/from-url.js');
  if (!handler) throw new Error('article/from-url handler not found');

  const fakeReq = {
    method: 'POST',
    headers: { 'x-webhook-secret': process.env.WEBHOOK_SECRET || '' },
    body: {
      content: item.article_content,
      brand_username: item.brand_username,
      writing_structure: item.writing_structure,
      article_title: item.article_title,
      ...(item.payload || {}),
    },
  };

  let responseData = null;
  const fakeRes = {
    status(code) { this._status = code; return this; },
    json(data) { responseData = data; return this; },
  };

  await handler(fakeReq, fakeRes);

  if (fakeRes._status >= 400 || !responseData?.success) {
    throw new Error(responseData?.error || `HTTP ${fakeRes._status}`);
  }

  return { success: true, jobId: responseData.jobId, templates_matched: responseData.templates_matched };
}

// ── Main poll loop ──────────────────────────────────────────────────────────
async function pollStitchQueue() {
  if (!supabaseUrl || !supabaseServiceKey) return;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Claim one pending item (oldest first)
    const { data: items, error: fetchErr } = await supabase
      .from('stitch_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchErr || !items?.length) return;
    const item = items[0];

    const { error: claimErr } = await supabase
      .from('stitch_queue')
      .update({ status: 'processing', picked_up_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('status', 'pending');

    if (claimErr) return;

    // Per-brand concurrency lock: skip if another item for the same brand is already processing
    const { count: processingCount } = await supabase
      .from('stitch_queue')
      .select('id', { count: 'exact', head: true })
      .eq('brand_username', item.brand_username)
      .eq('status', 'processing')
      .neq('id', item.id);

    if (processingCount > 0) {
      // Release the item back to pending so it gets picked up later
      await supabase.from('stitch_queue')
        .update({ status: 'pending', picked_up_at: null })
        .eq('id', item.id);
      console.log(`[queue] Released ${item.id} — brand "${item.brand_username}" already has a processing item`);
      return;
    }

    const payloadType = item.payload?.type || 'article';
    console.log(`[queue] Processing ${item.id} — type: ${payloadType}, brand: ${item.brand_username}`);

    try {
      let result;
      if (payloadType === 'brand_setup') {
        result = await handleBrandSetup(supabase, item);
      } else {
        result = await handleArticle(supabase, item);
      }

      await supabase.from('stitch_queue').update({
        status: 'completed',
        payload: { ...item.payload, ...result },
        completed_at: new Date().toISOString(),
      }).eq('id', item.id);
      console.log(`[queue] Completed ${item.id}`);

      // Update batch progress if this item belongs to a batch
      if (item.payload?.batch_id) {
        await supabase.rpc('increment_batch_completed_jobs', { p_batch_id: item.payload.batch_id });
      }

    } catch (handlerErr) {
      await supabase.from('stitch_queue').update({
        status: 'failed',
        error: handlerErr.message,
        completed_at: new Date().toISOString(),
      }).eq('id', item.id);
      console.warn(`[queue] Failed ${item.id}: ${handlerErr.message}`);

      // Update batch failure count if this item belongs to a batch
      if (item.payload?.batch_id) {
        await supabase.rpc('increment_batch_failed_jobs', { p_batch_id: item.payload.batch_id });
      }
    }
  } catch (err) {
    console.error('[queue] Poll error:', err.message);
    throw err; // propagate so backoff wrapper can track consecutive failures
  }
}

// Dynamic queue poller with exponential backoff
let consecutiveQueueErrors = 0;
const MIN_POLL_MS = QUEUE_POLL_INTERVAL_MS; // 12 hours
const MAX_POLL_MS = 86400000; // 24 hours

async function pollWithBackoff() {
  try {
    await pollStitchQueue();
    consecutiveQueueErrors = 0;
  } catch {
    consecutiveQueueErrors++;
  }

  const nextDelay = consecutiveQueueErrors === 0
    ? MIN_POLL_MS
    : Math.min(MIN_POLL_MS * Math.pow(2, consecutiveQueueErrors), MAX_POLL_MS);
  setTimeout(pollWithBackoff, nextDelay);
}

// Proposal media routes
app.get('/api/proposals/:slug/media', async (req, res) => {
  const handler = await loadApiRoute('proposals/media.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/proposals/:slug/media', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('proposals/media.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.delete('/api/proposals/:slug/media/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('proposals/media-item.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.patch('/api/proposals/:slug/media/:id', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('proposals/media-item.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Proposal pages — server-rendered with dynamic media from database
// Static HTML template in public/proposal/ gets media grids injected server-side
// Works without JS (for networks that block it), edit mode requires auth + JS
app.get('/proposal/:slug', async (req, res) => {
  try {
    const handler = await loadApiRoute('proposals/render.js');
    if (handler) return handler(req, res);
    res.status(500).send('Handler not found');
  } catch (err) {
    console.error('[proposal] render error:', err.message);
    // Fallback to static file
    res.sendFile(join(__dirname, 'dist', 'proposal', 'hamilton-city-council.html'));
  }
});

// Serve Vite build output
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback for client-side routing
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);

  // Start queue poller
  if (supabaseUrl && supabaseServiceKey) {
    pollWithBackoff(); // self-scheduling with exponential backoff on errors
    console.log(`[queue] Polling every ${QUEUE_POLL_INTERVAL_MS / 1000}s (with backoff on errors)`);

    // Start scheduled post publisher (polls every 30s)
    setInterval(pollScheduledPublications, 30000);
    pollScheduledPublications();
    console.log('[scheduled-publisher] Polling every 30s');
  }
});
