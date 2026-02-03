import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
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

// JumpStart routes
app.post('/api/jumpstart/generate', async (req, res) => {
  const handler = await loadApiRoute('jumpstart/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/result', async (req, res) => {
  const handler = await loadApiRoute('jumpstart/result.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/save-video', async (req, res) => {
  const handler = await loadApiRoute('jumpstart/save-video.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/edit', async (req, res) => {
  const handler = await loadApiRoute('jumpstart/edit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/jumpstart/extend', async (req, res) => {
  const handler = await loadApiRoute('jumpstart/extend.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Trip route
app.post('/api/trip/restyle', async (req, res) => {
  const handler = await loadApiRoute('trip/restyle.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Imagineer route
app.post('/api/imagineer/generate', async (req, res) => {
  const handler = await loadApiRoute('imagineer/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Image utilities
app.post('/api/images/search', async (req, res) => {
  const handler = await loadApiRoute('images/search.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/import-url', async (req, res) => {
  const handler = await loadApiRoute('images/import-url.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/edit', async (req, res) => {
  const handler = await loadApiRoute('images/edit.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.post('/api/images/inpaint', async (req, res) => {
  const handler = await loadApiRoute('images/inpaint.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Lens route
app.post('/api/lens/generate', async (req, res) => {
  const handler = await loadApiRoute('lens/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

// Smoosh route
app.post('/api/smoosh/generate', async (req, res) => {
  const handler = await loadApiRoute('smoosh/generate.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
});
