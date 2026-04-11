import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const images = [
  // Watercolour × Kinetic
  { name: 'combo-watercolour-kinetic-1.webp', url: 'https://v3b.fal.media/files/b/0a944706/D1xWwh-9nnuhOAqIDIEfw_humhOxnL.webp' },
  { name: 'combo-watercolour-kinetic-2.webp', url: 'https://v3b.fal.media/files/b/0a94470c/X1WRBqMhT2pWlfdI-Z3N__X3c0TSX3.webp' },
  { name: 'combo-watercolour-kinetic-3.webp', url: 'https://v3b.fal.media/files/b/0a944711/39Dw9sOflt15kAgGo-2MN_3xw9XiwO.webp' },
  // Watercolour × Liquid
  { name: 'combo-watercolour-liquid-1.webp', url: 'https://v3b.fal.media/files/b/0a944713/MwRML0fTzZKiHukfdXamq_5DTce77u.webp' },
  { name: 'combo-watercolour-liquid-2.webp', url: 'https://v3b.fal.media/files/b/0a944715/mgBPwV2XbkMxJewdUwrF6_CpGOLVPN.webp' },
  { name: 'combo-watercolour-liquid-3.webp', url: 'https://v3b.fal.media/files/b/0a944717/gktb1A2VXvmy1zk2HgjBy_PCuJ2Ahi.webp' },
  // Watercolour × Particle
  { name: 'combo-watercolour-particle-1.webp', url: 'https://v3b.fal.media/files/b/0a944727/Y_8YQy58m79H3Nmi63wlY_jaTutJVY.webp' },
  { name: 'combo-watercolour-particle-2.webp', url: 'https://v3b.fal.media/files/b/0a94472a/qOTcTwzMU_Dd51HhhfR0o_kGm53pBo.webp' },
  { name: 'combo-watercolour-particle-3.webp', url: 'https://v3b.fal.media/files/b/0a94472d/ifn3d9ZzSnSmr3vRbLVeh_YW958jtZ.webp' },
  // Noir × Kinetic
  { name: 'combo-noir-kinetic-1.webp', url: 'https://v3b.fal.media/files/b/0a944730/xiEs1q2KoEs3nBPpjAXbr_pXpTVVKq.webp' },
  { name: 'combo-noir-kinetic-2.webp', url: 'https://v3b.fal.media/files/b/0a944734/X3n-X5z73_6JXYK57jJwn_j3O6E1PK.webp' },
  { name: 'combo-noir-kinetic-3.webp', url: 'https://v3b.fal.media/files/b/0a944736/sQooz-Tzewk1289RLMUaQ_wMbLkvEK.webp' },
  // Noir × Liquid
  { name: 'combo-noir-liquid-1.webp', url: 'https://v3b.fal.media/files/b/0a944743/qqs3tTu7p4MzPHBwgBRep_Sg7SsWP5.webp' },
  { name: 'combo-noir-liquid-2.webp', url: 'https://v3b.fal.media/files/b/0a944745/1cfhKvCQ6wsK87dK3Bddq_Bj9s6zi0.webp' },
  { name: 'combo-noir-liquid-3.webp', url: 'https://v3b.fal.media/files/b/0a944747/9W4ZsYm0NpYBEEyy01g_c_QKrGXO3e.webp' },
  // Noir × Particle
  { name: 'combo-noir-particle-1.webp', url: 'https://v3b.fal.media/files/b/0a94475a/SPR9jWqRTVhGanv5qzPGs_tfRavJuO.webp' },
  { name: 'combo-noir-particle-2.webp', url: 'https://v3b.fal.media/files/b/0a94475d/Mc0umCD6CKkPS08OxS0AU_pSwaX0rU.webp' },
  { name: 'combo-noir-particle-3.webp', url: 'https://v3b.fal.media/files/b/0a944761/kf5TUb4ZmkfQqSZmg7xZJ_5bXZdcRq.webp' },
  // Retro × Kinetic
  { name: 'combo-retro-kinetic-1.webp', url: 'https://v3b.fal.media/files/b/0a944764/v8G8qgT3SmRZbWN4qoMtw_f3oObkxc.webp' },
  { name: 'combo-retro-kinetic-2.webp', url: 'https://v3b.fal.media/files/b/0a944766/Ogk0xmTaGbWZBjzHRhGEU_rKpnXWuK.webp' },
  { name: 'combo-retro-kinetic-3.webp', url: 'https://v3b.fal.media/files/b/0a944769/RHrT4mFLowYNKvJ2RfByM_EZJnYuxr.webp' },
  // Retro × Liquid
  { name: 'combo-retro-liquid-1.webp', url: 'https://v3b.fal.media/files/b/0a94476b/03AieW9HXDrGAyY9zWw_s_gpyFwsz5.webp' },
  { name: 'combo-retro-liquid-2.webp', url: 'https://v3b.fal.media/files/b/0a94476e/qCXeqmXCYZE-0mTGH2l73_6DECPqKW.webp' },
  { name: 'combo-retro-liquid-3.webp', url: 'https://v3b.fal.media/files/b/0a944770/ggNsN0S9ceXsmaEhJobbq_UN9DH8J5.webp' },
  // Retro × Particle
  { name: 'combo-retro-particle-1.webp', url: 'https://v3b.fal.media/files/b/0a944772/R7pjIvckdGe4qiukhUm2O_x0L6DJeQ.webp' },
  { name: 'combo-retro-particle-2.webp', url: 'https://v3b.fal.media/files/b/0a944774/mL45N3zTWyyILVQzIyX2u_Aau2LgyE.webp' },
  { name: 'combo-retro-particle-3.webp', url: 'https://v3b.fal.media/files/b/0a944778/B5uhap74eygFZusaXxQ0C_fs8wOmrX.webp' },
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
  console.log(`\nDone: ${results.length}/${images.length} uploaded`);
}

upload();
