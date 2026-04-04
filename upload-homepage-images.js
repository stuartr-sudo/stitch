import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const images = [
  // Scroll images (20)
  { name: 'scroll-01-cinematic-product.webp', url: 'https://v3b.fal.media/files/b/0a943811/3Ca-NQwM4xk_Bl3LFHvlb_kPaE0Bae.webp' },
  { name: 'scroll-02-claymation-foodtruck.webp', url: 'https://v3b.fal.media/files/b/0a943813/Fmb1eSq29HrJr-_zJq_iX_NKjNt3bc.webp' },
  { name: 'scroll-03-anime-cyberpunk.webp', url: 'https://v3b.fal.media/files/b/0a943816/U-5nJLXIW1a_y_VO1u4mO_Pr0nV5g9.webp' },
  { name: 'scroll-04-watercolour-venice.webp', url: 'https://v3b.fal.media/files/b/0a943817/dWJpYpgeurQcG_RKF2sm8_VbZXw8ha.webp' },
  { name: 'scroll-05-noir-detective.webp', url: 'https://v3b.fal.media/files/b/0a943819/qriR7QMw6WWsTWDCjAhp-_pdBrvp13.webp' },
  { name: 'scroll-06-retro-disco.webp', url: 'https://v3b.fal.media/files/b/0a94381c/Im2EyI34Tg2_lyW7G8J64_XMcRxCI1.webp' },
  { name: 'scroll-07-3dcgi-car.webp', url: 'https://v3b.fal.media/files/b/0a94381e/KEhpgl_LWSPYmjYL4jZxn_XyDEvKRn.webp' },
  { name: 'scroll-08-pixelart-castle.webp', url: 'https://v3b.fal.media/files/b/0a943820/HFjjVH91TyxarseX6wmU1_rl0UXhbF.webp' },
  { name: 'scroll-09-papercut-forest.webp', url: 'https://v3b.fal.media/files/b/0a943822/GsjMMyOkqvXlkYe8kpZIi_r9wz2aix.webp' },
  { name: 'scroll-10-synthwave.webp', url: 'https://v3b.fal.media/files/b/0a943823/me8uW9k2Kcthh1lkF8ppT_4XK2K6Kx.webp' },
  { name: 'scroll-11-isometric-city.webp', url: 'https://v3b.fal.media/files/b/0a943827/BmUkxkg2dnROf4PHc-uIS_OoFLz2Un.webp' },
  { name: 'scroll-12-charcoal-musician.webp', url: 'https://v3b.fal.media/files/b/0a943828/aByAQl544h5sVr5hc4TOh_7vAGhs4H.webp' },
  { name: 'scroll-13-stainedglass-phoenix.webp', url: 'https://v3b.fal.media/files/b/0a94382b/UjL23yoRjy3JeUrcQLGAg_JJloqBvd.webp' },
  { name: 'scroll-14-woodblock-wave.webp', url: 'https://v3b.fal.media/files/b/0a94382c/sl4u0-arPofA1rLUNFk8z_2TBZOdeD.webp' },
  { name: 'scroll-15-comic-superhero.webp', url: 'https://v3b.fal.media/files/b/0a94382f/DD4d8hb3dd5O_sDtge6n6_J6bZgyGa.webp' },
  { name: 'scroll-16-oilpainting-flowers.webp', url: 'https://v3b.fal.media/files/b/0a943831/0eE_PRfNisqDlGkpA8Ig9_A3cbIj6M.webp' },
  { name: 'scroll-17-lowpoly-deer.webp', url: 'https://v3b.fal.media/files/b/0a943834/-Zcs5uvSU9hmyxc6D6W9a_LQMPfv0j.webp' },
  { name: 'scroll-18-cinematic-coastal.webp', url: 'https://v3b.fal.media/files/b/0a943837/LKkt_JS30KY5dz8aiSo4m_yGD4AGXM.webp' },
  { name: 'scroll-19-claymation-underwater.webp', url: 'https://v3b.fal.media/files/b/0a94383a/oYSzc_qbduiPl7J6I3l-3_vELtsPRi.webp' },
  { name: 'scroll-20-anime-mecha.webp', url: 'https://v3b.fal.media/files/b/0a94383c/yW89OyaM2TxY0o5yhsnAz_dCQQV8wa.webp' },
  // Portal + phones
  { name: 'portal-dashboard.webp', url: 'https://v3b.fal.media/files/b/0a94383f/eGSCfxiD2jkI5aXGT5WNx_Vi9sXQCy.webp' },
  { name: 'phones-shorts.webp', url: 'https://v3b.fal.media/files/b/0a943841/4HsSyky_AAaGUVkXcAdtF_YBt4wF3W.webp' },
];

async function upload() {
  const results = [];
  for (const img of images) {
    const resp = await fetch(img.url);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const path = `homepage/${img.name}`;
    const { error } = await supabase.storage.from('media').upload(path, buffer, { contentType: 'image/webp', upsert: true });
    if (error) {
      console.error(`FAIL: ${img.name}`, error.message);
    } else {
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      console.log(`OK: ${img.name}`);
      results.push({ name: img.name, url: pub.publicUrl });
    }
  }
  console.log('\nAll URLs:');
  results.forEach(r => console.log(`${r.name}: ${r.url}`));
}

upload();
