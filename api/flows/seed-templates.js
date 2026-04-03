import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const templates = [
  {
    name: 'Blog to Multi-Platform',
    description: 'One topic becomes image, carousel, LinkedIn post, and video',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 200 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Topic', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 300, y: 200 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '60' } } },
        { id: 'n3', type: 'stitch', position: { x: 550, y: 50 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '16:9' } } },
        { id: 'n4', type: 'stitch', position: { x: 550, y: 200 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 550, y: 350 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n6', type: 'stitch', position: { x: 800, y: 200 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'topic' },
        { id: 'e2', source: 'n2', sourcePort: 'script', target: 'n3', targetPort: 'prompt' },
        { id: 'e3', source: 'n2', sourcePort: 'script', target: 'n4', targetPort: 'description' },
        { id: 'e4', source: 'n2', sourcePort: 'script', target: 'n5', targetPort: 'description' },
        { id: 'e5', source: 'n3', sourcePort: 'image_url', target: 'n6', targetPort: 'image' },
      ]
    }
  },
  {
    name: 'Image to Short Video',
    description: 'Generate image, animate, add captions, publish to YouTube',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '9:16' } } },
        { id: 'n2', type: 'stitch', position: { x: 300, y: 150 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
        { id: 'n3', type: 'stitch', position: { x: 550, y: 150 }, data: { nodeType: { id: 'captions' }, config: { style: 'word_pop' } } },
        { id: 'n4', type: 'stitch', position: { x: 800, y: 150 }, data: { nodeType: { id: 'youtube-upload' }, config: { privacy: 'private' } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'image_url', target: 'n2', targetPort: 'image' },
        { id: 'e2', source: 'n2', sourcePort: 'video_url', target: 'n3', targetPort: 'video' },
        { id: 'e3', source: 'n3', sourcePort: 'video_url', target: 'n4', targetPort: 'video' },
      ]
    }
  },
  {
    name: 'Character Sheet Pipeline',
    description: 'Create character and turnaround sheet, save to library',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '1:1' } } },
        { id: 'n2', type: 'stitch', position: { x: 300, y: 150 }, data: { nodeType: { id: 'turnaround-sheet' }, config: { model: 'nano-banana-2', pose_set: 'standard-24' } } },
        { id: 'n3', type: 'stitch', position: { x: 550, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'image_url', target: 'n2', targetPort: 'prompt' },
        { id: 'e2', source: 'n2', sourcePort: 'image_url', target: 'n3', targetPort: 'url' },
      ]
    }
  },
  {
    name: 'Carousel + Slideshow',
    description: 'Generate carousel content and save',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '60' } } },
        { id: 'n2', type: 'stitch', position: { x: 300, y: 150 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n3', type: 'stitch', position: { x: 550, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'script', target: 'n2', targetPort: 'description' },
        { id: 'e2', source: 'n2', sourcePort: 'prompt', target: 'n3', targetPort: 'url' },
      ]
    }
  },
  {
    name: 'Social Media Blast',
    description: 'One script published across all platforms',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 200 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '30' } } },
        { id: 'n2', type: 'stitch', position: { x: 350, y: 50 }, data: { nodeType: { id: 'facebook-post' }, config: {} } },
        { id: 'n3', type: 'stitch', position: { x: 350, y: 150 }, data: { nodeType: { id: 'instagram-post' }, config: {} } },
        { id: 'n4', type: 'stitch', position: { x: 350, y: 250 }, data: { nodeType: { id: 'tiktok-publish' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 350, y: 350 }, data: { nodeType: { id: 'youtube-upload' }, config: { privacy: 'public' } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'script', target: 'n2', targetPort: 'text' },
        { id: 'e2', source: 'n1', sourcePort: 'script', target: 'n3', targetPort: 'caption' },
        { id: 'e3', source: 'n1', sourcePort: 'script', target: 'n4', targetPort: 'video' },
        { id: 'e4', source: 'n1', sourcePort: 'script', target: 'n5', targetPort: 'title' },
      ]
    }
  }
];

async function seed() {
  console.log('Seeding flow templates...');

  // Delete existing templates first
  await supabase.from('automation_flows').delete().eq('is_template', true);

  for (const template of templates) {
    const { error } = await supabase.from('automation_flows').insert({
      name: template.name,
      description: template.description,
      graph_json: template.graph_json,
      is_template: true,
      user_id: null,
      trigger_type: 'manual'
    });
    if (error) {
      console.error(`Failed to seed "${template.name}":`, error.message);
    } else {
      console.log(`  ✓ ${template.name}`);
    }
  }
  console.log('Done!');
}

seed();
