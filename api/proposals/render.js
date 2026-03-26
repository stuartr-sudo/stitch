import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  const slug = req.params.slug;
  if (slug !== 'hamilton-city-council') {
    return res.status(404).send('Not found');
  }

  // Read the static HTML template
  const templatePath = join(__dirname, '..', '..', 'public', 'proposal', `${slug}.html`);
  let html;
  try {
    html = await readFile(templatePath, 'utf-8');
  } catch {
    return res.status(404).send('Proposal not found');
  }

  // Fetch media from database
  let videos = [];
  let images = [];
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from('proposal_media')
        .select('id, media_type, media_url, thumbnail_url, caption, sort_order')
        .eq('proposal_slug', slug)
        .order('sort_order', { ascending: true });

      if (data) {
        videos = data.filter(item => item.media_type === 'video');
        images = data.filter(item => item.media_type === 'image');
      }
    } catch (err) {
      console.error('[proposal render] DB error:', err.message);
    }
  }

  // Build video grid HTML
  let videoGridHtml = '';
  if (videos.length > 0) {
    const videoCards = videos.map(v => {
      const caption = v.caption ? `<p class="caption">${escapeHtml(v.caption)}</p>` : '';
      return `<div class="video-card" data-media-id="${v.id}"><video controls src="${escapeHtml(v.media_url)}"${v.thumbnail_url ? ` poster="${escapeHtml(v.thumbnail_url)}"` : ''}></video>${caption}</div>`;
    }).join('\n        ');
    videoGridHtml = `<div class="grid-3">\n        ${videoCards}\n      </div>`;
  }

  // Build image grid HTML
  let imageSectionHtml = '';
  if (images.length > 0) {
    const imageCards = images.map(img => {
      const caption = img.caption ? `<p class="caption">${escapeHtml(img.caption)}</p>` : '';
      return `<div class="image-card" data-media-id="${img.id}"><img src="${escapeHtml(img.media_url)}" alt="${escapeHtml(img.caption || '')}" loading="lazy" />${caption}</div>`;
    }).join('\n        ');
    imageSectionHtml = `
  <!-- Images Section (server-rendered) -->
  <section class="section animate-on-scroll">
    <div class="container">
      <h2>Images</h2>
      <p class="subtitle">Visual concepts and stills from our pipeline</p>
      <div class="grid-3">
        ${imageCards}
      </div>
    </div>
  </section>`;
  }

  // Replace the Sample Work section with server-rendered content
  const sampleWorkRegex = /<!-- Section 4: Sample Work -->[\s\S]*?<\/section>/;
  const newSampleWork = `<!-- Section 4: Sample Work -->
  <section class="section animate-on-scroll" id="sample-work">
    <div class="container">
      <h2>Sample Work</h2>
      <p class="subtitle">Examples from our animation pipeline</p>
      ${videoGridHtml || '<p class="text-muted text-center">No videos yet</p>'}
    </div>
  </section>${imageSectionHtml}`;

  html = html.replace(sampleWorkRegex, newSampleWork);

  // Inject Supabase credentials for edit mode (auth check in browser)
  const supabasePublicUrl = process.env.VITE_SUPABASE_URL || supabaseUrl;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const configScript = `<script>window.__PROPOSAL_CONFIG__={supabaseUrl:"${supabasePublicUrl}",supabaseAnonKey:"${supabaseAnonKey}",slug:"${slug}"};</script>`;
  html = html.replace('</head>', `${configScript}\n</head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
