import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Serve Vite build output
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback for client-side routing
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
