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
        { id: 'n1', type: 'stitch', position: { x: 50, y: 300 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Topic', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 400, y: 300 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '60' } } },
        { id: 'n3', type: 'stitch', position: { x: 800, y: 50 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '16:9' } } },
        { id: 'n4', type: 'stitch', position: { x: 800, y: 330 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 800, y: 610 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n6', type: 'stitch', position: { x: 1200, y: 50 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
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
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'captions' }, config: { style: 'word_pop' } } },
        { id: 'n4', type: 'stitch', position: { x: 1250, y: 150 }, data: { nodeType: { id: 'youtube-upload' }, config: { privacy: 'private' } } },
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
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'turnaround-sheet' }, config: { model: 'nano-banana-2', pose_set: 'standard-24' } } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
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
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
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
        { id: 'n1', type: 'stitch', position: { x: 50, y: 450 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '30' } } },
        { id: 'n2', type: 'stitch', position: { x: 500, y: 50 }, data: { nodeType: { id: 'facebook-post' }, config: {} } },
        { id: 'n3', type: 'stitch', position: { x: 500, y: 330 }, data: { nodeType: { id: 'instagram-post' }, config: {} } },
        { id: 'n4', type: 'stitch', position: { x: 500, y: 610 }, data: { nodeType: { id: 'tiktok-publish' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 500, y: 890 }, data: { nodeType: { id: 'youtube-upload' }, config: { privacy: 'public' } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'script', target: 'n2', targetPort: 'text' },
        { id: 'e2', source: 'n1', sourcePort: 'script', target: 'n3', targetPort: 'caption' },
        { id: 'e3', source: 'n1', sourcePort: 'script', target: 'n4', targetPort: 'video' },
        { id: 'e4', source: 'n1', sourcePort: 'script', target: 'n5', targetPort: 'title' },
      ]
    }
  },

  // ── 5 New Workflow Pattern Templates ──

  {
    name: 'Research → Create → Publish',
    description: 'Research competitor visuals, create branded alternative, build ad campaign',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Competitor / Topic', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'image-search' }, config: {} } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '16:9' } } },
        { id: 'n4', type: 'stitch', position: { x: 1250, y: 150 }, data: { nodeType: { id: 'ads-generate' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 1650, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'query' },
        { id: 'e2', source: 'n2', sourcePort: 'image_url', target: 'n3', targetPort: 'prompt' },
        { id: 'e3', source: 'n3', sourcePort: 'image_url', target: 'n4', targetPort: 'product_description' },
        { id: 'e4', source: 'n4', sourcePort: 'campaign_id', target: 'n5', targetPort: 'url' },
      ]
    }
  },
  {
    name: 'Character Pipeline',
    description: 'Build a consistent character: portrait → turnaround sheet → animate → save',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 200 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Character Description', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 450, y: 200 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '1:1' } } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 200 }, data: { nodeType: { id: 'turnaround-sheet' }, config: { pose_set: 'standard-24' } } },
        { id: 'n4', type: 'stitch', position: { x: 1250, y: 50 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 1250, y: 380 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
        { id: 'n6', type: 'stitch', position: { x: 1650, y: 380 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'prompt' },
        { id: 'e2', source: 'n2', sourcePort: 'image_url', target: 'n3', targetPort: 'prompt' },
        { id: 'e3', source: 'n3', sourcePort: 'image_url', target: 'n4', targetPort: 'url' },
        { id: 'e4', source: 'n2', sourcePort: 'image_url', target: 'n5', targetPort: 'image' },
        { id: 'e5', source: 'n5', sourcePort: 'video_url', target: 'n6', targetPort: 'url' },
      ]
    }
  },
  {
    name: 'Content Repurposing',
    description: 'One topic → Short + Carousel + LinkedIn Post + Ad Set',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 500 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Topic + Brand', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 450, y: 500 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '60' } } },
        { id: 'n3', type: 'stitch', position: { x: 900, y: 50 }, data: { nodeType: { id: 'shorts-create' }, config: {} } },
        { id: 'n4', type: 'stitch', position: { x: 900, y: 330 }, data: { nodeType: { id: 'carousel-create' }, config: {} } },
        { id: 'n5', type: 'stitch', position: { x: 900, y: 610 }, data: { nodeType: { id: 'linkedin-post' }, config: {} } },
        { id: 'n6', type: 'stitch', position: { x: 900, y: 890 }, data: { nodeType: { id: 'ads-generate' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'topic' },
        { id: 'e2', source: 'n2', sourcePort: 'script', target: 'n3', targetPort: 'topic' },
        { id: 'e3', source: 'n2', sourcePort: 'script', target: 'n4', targetPort: 'topic' },
        { id: 'e4', source: 'n2', sourcePort: 'script', target: 'n5', targetPort: 'text' },
        { id: 'e5', source: 'n2', sourcePort: 'script', target: 'n6', targetPort: 'product_description' },
      ]
    }
  },
  {
    name: 'Video Production Pipeline',
    description: 'Full pipeline: script → images → video → captions → YouTube',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Video Concept', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'script-generator' }, config: { duration: '60' } } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n4', type: 'stitch', position: { x: 1250, y: 150 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '16:9' } } },
        { id: 'n5', type: 'stitch', position: { x: 1650, y: 150 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
        { id: 'n6', type: 'stitch', position: { x: 2050, y: 150 }, data: { nodeType: { id: 'captions' }, config: { style: 'word_pop' } } },
        { id: 'n7', type: 'stitch', position: { x: 2450, y: 150 }, data: { nodeType: { id: 'youtube-upload' }, config: { privacy: 'private' } } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'topic' },
        { id: 'e2', source: 'n2', sourcePort: 'script', target: 'n3', targetPort: 'description' },
        { id: 'e3', source: 'n3', sourcePort: 'prompt', target: 'n4', targetPort: 'prompt' },
        { id: 'e4', source: 'n4', sourcePort: 'image_url', target: 'n5', targetPort: 'image' },
        { id: 'e5', source: 'n5', sourcePort: 'video_url', target: 'n6', targetPort: 'video' },
        { id: 'e6', source: 'n6', sourcePort: 'video_url', target: 'n7', targetPort: 'video' },
      ]
    }
  },
  {
    name: 'Competitor Clone',
    description: 'Analyze competitor ad → recreate with your brand → add captions → save',
    graph_json: {
      nodes: [
        { id: 'n1', type: 'stitch', position: { x: 50, y: 150 }, data: { nodeType: { id: 'manual-input' }, config: { label: 'Competitor Ad Description', inputType: 'string' } } },
        { id: 'n2', type: 'stitch', position: { x: 450, y: 150 }, data: { nodeType: { id: 'text-transform' }, config: { instruction: 'Rewrite this ad concept for a different brand. Keep the structure but change all brand-specific elements.' } } },
        { id: 'n3', type: 'stitch', position: { x: 850, y: 150 }, data: { nodeType: { id: 'prompt-builder' }, config: {} } },
        { id: 'n4', type: 'stitch', position: { x: 1250, y: 150 }, data: { nodeType: { id: 'imagineer-generate' }, config: { model: 'nano-banana-2', aspect_ratio: '16:9' } } },
        { id: 'n5', type: 'stitch', position: { x: 1650, y: 150 }, data: { nodeType: { id: 'jumpstart-animate' }, config: { model: 'kling-2.0-master', duration: '5' } } },
        { id: 'n6', type: 'stitch', position: { x: 2050, y: 150 }, data: { nodeType: { id: 'captions' }, config: { style: 'word_pop' } } },
        { id: 'n7', type: 'stitch', position: { x: 2450, y: 150 }, data: { nodeType: { id: 'save-to-library' }, config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', sourcePort: 'value', target: 'n2', targetPort: 'text' },
        { id: 'e2', source: 'n2', sourcePort: 'text', target: 'n3', targetPort: 'description' },
        { id: 'e3', source: 'n3', sourcePort: 'prompt', target: 'n4', targetPort: 'prompt' },
        { id: 'e4', source: 'n4', sourcePort: 'image_url', target: 'n5', targetPort: 'image' },
        { id: 'e5', source: 'n5', sourcePort: 'video_url', target: 'n6', targetPort: 'video' },
        { id: 'e6', source: 'n6', sourcePort: 'video_url', target: 'n7', targetPort: 'url' },
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
