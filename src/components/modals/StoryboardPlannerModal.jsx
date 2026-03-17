import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  Play,
  Loader2,
  Sparkles,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Video,
  Image as ImageIcon,
  Clapperboard,
  Send,
  Pause,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { extractLastFrame } from '@/lib/frameExtractor';
import { supabase } from '@/lib/supabase';

// Reuse model list from JumpStart — subset that supports image-to-video
const STORYBOARD_MODELS = [
  { id: 'kling-r2v-pro', label: 'Kling O3 Pro (R2V)', description: 'Best character consistency', supportsRefs: true },
  { id: 'kling-r2v-standard', label: 'Kling O3 Standard (R2V)', description: 'Faster, lower cost', supportsRefs: true },
  { id: 'seedance-pro', label: 'Seedance 1.5 Pro', description: 'High quality, audio support' },
  { id: 'veo3-fast', label: 'Veo 3.1 Fast', description: 'Google, flexible duration' },
  { id: 'grok-imagine', label: 'Grok Imagine (xAI)', description: 'Good quality with audio' },
  { id: 'kling-video', label: 'Kling 2.5 Turbo Pro', description: 'Cinematic motion' },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN 2.2', description: 'Fast generation' },
];

// Thumbnail URLs for style preview grid (generated via Seedream v4)
const T = {
  cinematic: 'https://v3b.fal.media/files/b/0a928438/3YmB8mqvPYXjLkVcJu5_C_7e184560008c472ca9b8779f641c909b.png',
  anime: 'https://v3b.fal.media/files/b/0a928439/4DYodY5XDUMZFlwPDjTAp_91ceab72c33a4a13980e1f32da25fd95.png',
  '3d_animation': 'https://v3b.fal.media/files/b/0a92843a/zNOOlG6yv3o14LJMiq1gR_1d710032d61a429d81ae3f062320c083.png',
  realistic: 'https://v3b.fal.media/files/b/0a92843b/sokoJe-Z5sBzj6R0Xbcci_cb99387fbddb43e498fcb1bbdcc6274e.png',
  noir: 'https://v3b.fal.media/files/b/0a92843c/AsbEaRIhkVOkwgpUN7LjR_bb8957ec20e14abcbbb60223967f9dd3.png',
  watercolor: 'https://v3b.fal.media/files/b/0a92843d/06p5thnNZXJV8PulOdcMx_2b168931d7b7411faa0bed68735ebbbf.png',
  cyberpunk: 'https://v3b.fal.media/files/b/0a92843d/BGZq8m5MkQa_B-bCqk-yB_77404753663a4c3db5712405039e9337.png',
  fantasy: 'https://v3b.fal.media/files/b/0a92843e/tYCcnoZvup8i7oI03Oh2w_de384dd1f94f44d887da737949cbaa4f.png',
  stop_motion: 'https://v3b.fal.media/files/b/0a928443/EK22qFgeprmc7Z_FW6fx9_e273324adb3b4664a560934dbc352a0a.png',
  pixel_art: 'https://v3b.fal.media/files/b/0a928444/e2rvrwLA3ZBUdYISs9eQi_cc566ac0e51f478680a6949952ba8527.png',
  ghibli: 'https://v3b.fal.media/files/b/0a928445/rmzPbRr_VDDrosSAjCFRf_a30a20bb6b204c7fac0a22126049abe4.png',
  oil_painting: 'https://v3b.fal.media/files/b/0a928446/-q1oMZax5mm4VbHm8qRRW_efb561ff83794291a123cd62fa18a5ca.png',
  steampunk: 'https://v3b.fal.media/files/b/0a928447/8eUWStccbwz6a04WVKksC_ee170e46a1cb42fea8957e15c186432c.png',
  vaporwave: 'https://v3b.fal.media/files/b/0a928448/KePW6j40_CMuiu8IYN-04_22ddfd4be24f433d81ce74172775b3b6.png',
  vintage: 'https://v3b.fal.media/files/b/0a928449/RIYKsEPgvqx5Jlc9v1770_260a9b58c0144311babb3818437dc3b9.png',
  comic: 'https://v3b.fal.media/files/b/0a92844a/qazFLaQYdvhv9Os33VQRB_4f9fd64f503944ef8e4b99cb4641c684.png',
  gothic: 'https://v3b.fal.media/files/b/0a92844b/LcyqV5FImljARPnCcJ-YS_edc8019fd35b49c281eab0da97daf68c.png',
  impressionist: 'https://v3b.fal.media/files/b/0a92844c/nORbLMVZAm4fXs79XMHnB_fd9b85ff8e994ea4933c957261832da6.png',
  pop_art: 'https://v3b.fal.media/files/b/0a92844e/pO-wO633aX9zjIex4b_8f_9a5f31c9c34b4dda9443f79818a983f0.png',
  minimalist: 'https://v3b.fal.media/files/b/0a92844e/T2w643BVfV2tH1ciHBIYb_66c3b346bd064731827684357d9dd9a7.png',
  sci_fi: 'https://v3b.fal.media/files/b/0a928450/J11ZEP9YumVVx3p1rbZcK_0f57e510b7c7401497d1cb688ff09d1f.png',
  horror: 'https://v3b.fal.media/files/b/0a928451/vgn1H3EQl73p9VwV7nH_k_d4e8f4a2823a46b88561ce1554d6099f.png',
  neon: 'https://v3b.fal.media/files/b/0a928452/MphHaGCNpHGX7RPNfS5rm_2579fee652dd41dd85ad9da58eab761c.png',
  manga: 'https://v3b.fal.media/files/b/0a928453/RJ4gRxOgZu6swcYCjMGsF_219ef0a8edc049c1af56a577613f1db6.png',
  charcoal: 'https://v3b.fal.media/files/b/0a92845b/l8Ud9mSQlmh9va4Kxzy_s_080cc79165be476d9567fe62dab96180.png',
  art_deco: 'https://v3b.fal.media/files/b/0a92845c/MfwyuQWkKsfi1hTBW8sfr_06411bf6999643eda8c6fefbaca370cd.png',
  surrealist: 'https://v3b.fal.media/files/b/0a92845d/F0cufWrYYVmTBbrWnq6nW_411fa7e6309f4574ae08de92a10e1e2f.png',
  ukiyo_e: 'https://v3b.fal.media/files/b/0a92845f/V5vE1u5tz9JV6Ln1EQLbT_a5032a9062504fc191fbffc742e8584d.png',
  synthwave: 'https://v3b.fal.media/files/b/0a92845f/BQpwMgqtcEJ09j8IBwQMK_e73d86e815eb40c081459b14d6d58727.png',
  cottagecore: 'https://v3b.fal.media/files/b/0a928460/GVEh1hgghm1RlCNppYaXx_44ce9ad0302d4deabc54a1700930e4b2.png',
  tilt_shift: 'https://v3b.fal.media/files/b/0a928461/KlUp2yqcIzZSfsuI-1MLb_7892b1f22baf4d3fbb65a53ec8e44204.png',
  glitch: 'https://v3b.fal.media/files/b/0a928463/VsDPro3E6bYt99VTc_Y0K_1e476cb7b5b64cce97d04764ff7ee6a3.png',
  western: 'https://v3b.fal.media/files/b/0a928467/fPFb_kAs_JSio9wRSKmsa_5cbc69338dd448d9af0b6e89676dbdbc.png',
  golden_hour: 'https://v3b.fal.media/files/b/0a928467/Wb9FY71CF85b3cdZnnxk3_8ad097fb3ef64bc394028d47cc8920d8.png',
  storybook: 'https://v3b.fal.media/files/b/0a928468/JagKbZnYj0sJXkVEINhpk_34a53f9d5f1d4900bf3d26764bea3b90.png',
  drone: 'https://v3b.fal.media/files/b/0a928469/1sPw-Jqv4i9KTCVFJyMOO_e12f137dda274027924320186bbf5493.png',
  dark_academia: 'https://v3b.fal.media/files/b/0a92846b/qlhdh9pHKuSN6BY5X61pk_0dc0438c7816453d880ff40030cb6e94.png',
  solarpunk: 'https://v3b.fal.media/files/b/0a92846c/qb9e1noRXHPyEKeNKKF-M_f92e9c3ceea34d64b73a88db787980db.png',
  fairy_tale: 'https://v3b.fal.media/files/b/0a92846d/Q3ulCHaePSizsulbwO2uw_2921d7025c3c40b29bff562159c18d3d.png',
  lo_fi: 'https://v3b.fal.media/files/b/0a92846d/i1VOXdQHVAeEEbYhAudwJ_551e6896f3d84983a20c88f6e9eb190e.png',
  '2d_animation': 'https://v3b.fal.media/files/b/0a928470/DsFoYkOitNGyEv9OZFqGt_1a1fa5860dfa47198c0881be7a1413f0.png',
  claymation: 'https://v3b.fal.media/files/b/0a928470/8kHaQHQ2qlHNZ1YH1jWdc_b4657450edc041b0a433a766a8f298fb.png',
  pencil: 'https://v3b.fal.media/files/b/0a928471/6mi5OCTTANf3JSyuTMCjP_19fe0968c61c4c3ab3eb4296ab57e275.png',
  stained_glass: 'https://v3b.fal.media/files/b/0a928472/SOy4ICI7j0Y2oSntwUUdl_9b65dacc6303401cacaa00eb2337a3e6.png',
  vhs: 'https://v3b.fal.media/files/b/0a928474/fVVkWqt4iNzplL3UjXLK5_e5232b6b8bd94f238758e0f72d3a4848.png',
  dreamcore: 'https://v3b.fal.media/files/b/0a928475/NkcdrNQFormwSq9qVUAvl_5cc8d778132c43469fb38fb3bc033b1e.png',
  space_opera: 'https://v3b.fal.media/files/b/0a928476/32Sd90me_LyAVh8PicAKi_1c57ce6d1e6b419b93a3c8c9082aaed4.png',
  fashion: 'https://v3b.fal.media/files/b/0a928477/cjpXmPuXgkvJYR120msMW_b383b32b948a488880cd9961df40c4bf.png',
  kids_educational: 'https://v3b.fal.media/files/b/0a929018/ZArkWRP0IyTCSVkAUo9jH_94e598bc38e34fc4a43ae6d6670836b9.png',
  flat_vector_kids: 'https://v3b.fal.media/files/b/0a929019/XKUeY0F_asadSw7wMm7lq_b5cff714fe274b4a9a9cd3437b262cef.png',
  puppet_show: 'https://v3b.fal.media/files/b/0a92901a/F8bC9ZGuqw-yBJcHdRPJS_c262cc51ae86430b9283381d51b8de34.png',
  whiteboard: 'https://v3b.fal.media/files/b/0a92901b/ubTRBU1HaMVBTLUjUJo-n_cfd13a3c79574eeb98ce1cd2f2e8f2a2.png',
  preschool_cartoon: 'https://v3b.fal.media/files/b/0a92901d/KAP0PAAJwcr6_rkQwsBVG_9f42dc5333a04de6bfc78357aacf450d.png',
  paper_craft: 'https://v3b.fal.media/files/b/0a92901e/Oc-ZCsF0lqnSp41qUDU8D_06abc59a57964188b366cc5c106075ba.png',
  kawaii: 'https://v3b.fal.media/files/b/0a92901f/h_4paBuko6GNU-aQld2pp_16345c8f85844c54a43c059d1bfe21f2.png',
  kids_action: 'https://v3b.fal.media/files/b/0a929020/ZauLYSoSezyq6RS4jw1FV_5c3957fee62a45068895c1f56e7c1950.png',
};

// Style categories with thumbnail mappings
const STYLE_CATEGORIES = [
  { label: 'Cinematic', styles: [
    { id: 'cinematic', label: 'Cinematic', thumb: T.cinematic },
    { id: 'cinematic noir', label: 'Cinematic Noir', thumb: T.noir },
    { id: 'cinematic epic', label: 'Cinematic Epic', thumb: T.cinematic },
    { id: 'cinematic intimate', label: 'Cinematic Intimate', thumb: T.lo_fi },
  ]},
  { label: 'Animation', styles: [
    { id: 'anime', label: 'Anime', thumb: T.anime },
    { id: '3D animation', label: '3D Animation', thumb: T['3d_animation'] },
    { id: '2D animation', label: '2D Animation', thumb: T['2d_animation'] },
    { id: 'stop motion', label: 'Stop Motion', thumb: T.stop_motion },
    { id: 'claymation', label: 'Claymation', thumb: T.claymation },
    { id: 'pixel art', label: 'Pixel Art', thumb: T.pixel_art },
    { id: 'studio ghibli', label: 'Studio Ghibli', thumb: T.ghibli },
    { id: 'disney pixar', label: 'Disney Pixar', thumb: T['3d_animation'] },
    { id: 'cel-shaded', label: 'Cel-Shaded', thumb: T.anime },
  ]},
  { label: 'Realistic', styles: [
    { id: 'realistic', label: 'Realistic', thumb: T.realistic },
    { id: 'hyper-realistic', label: 'Hyper-Realistic', thumb: T.realistic },
    { id: 'documentary', label: 'Documentary', thumb: T.realistic },
    { id: 'golden hour', label: 'Golden Hour', thumb: T.golden_hour },
    { id: 'drone aerial', label: 'Drone Aerial', thumb: T.drone },
    { id: 'fashion editorial', label: 'Fashion Editorial', thumb: T.fashion },
  ]},
  { label: 'Art Styles', styles: [
    { id: 'watercolor', label: 'Watercolor', thumb: T.watercolor },
    { id: 'oil painting', label: 'Oil Painting', thumb: T.oil_painting },
    { id: 'charcoal sketch', label: 'Charcoal Sketch', thumb: T.charcoal },
    { id: 'pencil drawing', label: 'Pencil Drawing', thumb: T.pencil },
    { id: 'impressionist', label: 'Impressionist', thumb: T.impressionist },
    { id: 'art deco', label: 'Art Deco', thumb: T.art_deco },
    { id: 'pop art', label: 'Pop Art', thumb: T.pop_art },
    { id: 'surrealist', label: 'Surrealist', thumb: T.surrealist },
    { id: 'ukiyo-e', label: 'Ukiyo-e', thumb: T.ukiyo_e },
    { id: 'stained glass', label: 'Stained Glass', thumb: T.stained_glass },
  ]},
  { label: 'Genre', styles: [
    { id: 'noir', label: 'Noir', thumb: T.noir },
    { id: 'gothic', label: 'Gothic', thumb: T.gothic },
    { id: 'cyberpunk', label: 'Cyberpunk', thumb: T.cyberpunk },
    { id: 'steampunk', label: 'Steampunk', thumb: T.steampunk },
    { id: 'solarpunk', label: 'Solarpunk', thumb: T.solarpunk },
    { id: 'vaporwave', label: 'Vaporwave', thumb: T.vaporwave },
    { id: 'synthwave', label: 'Synthwave', thumb: T.synthwave },
    { id: 'lo-fi', label: 'Lo-Fi', thumb: T.lo_fi },
    { id: 'fantasy', label: 'Fantasy', thumb: T.fantasy },
    { id: 'dark fantasy', label: 'Dark Fantasy', thumb: T.gothic },
    { id: 'fairy tale', label: 'Fairy Tale', thumb: T.fairy_tale },
    { id: 'sci-fi', label: 'Sci-Fi', thumb: T.sci_fi },
    { id: 'space opera', label: 'Space Opera', thumb: T.space_opera },
    { id: 'horror', label: 'Horror', thumb: T.horror },
    { id: 'western', label: 'Western', thumb: T.western },
  ]},
  { label: 'Period / Aesthetic', styles: [
    { id: 'vintage', label: 'Vintage', thumb: T.vintage },
    { id: 'vintage 8mm film', label: 'Vintage 8mm', thumb: T.vintage },
    { id: '1980s VHS', label: '1980s VHS', thumb: T.vhs },
    { id: 'neon', label: 'Neon', thumb: T.neon },
    { id: 'neon noir', label: 'Neon Noir', thumb: T.neon },
    { id: 'pastel dreamcore', label: 'Pastel Dreamcore', thumb: T.dreamcore },
    { id: 'cottagecore', label: 'Cottagecore', thumb: T.cottagecore },
    { id: 'dark academia', label: 'Dark Academia', thumb: T.dark_academia },
  ]},
  { label: 'Techniques', styles: [
    { id: 'minimalist', label: 'Minimalist', thumb: T.minimalist },
    { id: 'tilt-shift miniature', label: 'Tilt-Shift', thumb: T.tilt_shift },
    { id: 'glitch art', label: 'Glitch Art', thumb: T.glitch },
  ]},
  { label: 'Comics', styles: [
    { id: 'comic book', label: 'Comic Book', thumb: T.comic },
    { id: 'manga', label: 'Manga', thumb: T.manga },
    { id: "children's storybook", label: 'Storybook', thumb: T.storybook },
  ]},
  { label: 'Kids & Education', styles: [
    { id: 'kids educational cartoon', label: 'Kids Educational', thumb: T.kids_educational },
    { id: 'flat vector kids illustration', label: 'Flat Vector Kids', thumb: T.flat_vector_kids },
    { id: 'preschool cartoon', label: 'Preschool Cartoon', thumb: T.preschool_cartoon },
    { id: 'puppet show', label: 'Puppet Show', thumb: T.puppet_show },
    { id: 'whiteboard animation', label: 'Whiteboard', thumb: T.whiteboard },
    { id: 'paper craft collage', label: 'Paper Craft', thumb: T.paper_craft },
    { id: 'kawaii', label: 'Kawaii', thumb: T.kawaii },
    { id: 'kids action cartoon', label: 'Kids Action', thumb: T.kids_action },
  ]},
];

const CAMERA_ANGLES = [
  'wide', 'medium', 'close-up', 'extreme close-up', 'bird-eye',
  'low-angle', 'over-shoulder', 'tracking', 'dutch angle', 'POV',
];

const STEPS = ['setup', 'scenes', 'generating', 'review'];

export default function StoryboardPlannerModal({ isOpen, onClose, onScenesComplete }) {
  // Step state
  const [step, setStep] = useState('setup');

  // Setup state
  const [description, setDescription] = useState('');
  const [numScenes, setNumScenes] = useState(4);
  const [style, setStyle] = useState('cinematic');
  const [defaultDuration, setDefaultDuration] = useState(5);
  const [model, setModel] = useState('kling-r2v-pro');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [characterDescription, setCharacterDescription] = useState('');
  const [characterRefs, setCharacterRefs] = useState([]); // URLs
  const [frontalIndex, setFrontalIndex] = useState(0); // which ref is the frontal image for R2V

  const [analyzingCharacter, setAnalyzingCharacter] = useState(false);

  // Library browser for character refs
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryFolders, setLibraryFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [libraryLoading, setLibraryLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Scene cards state
  const [scenes, setScenes] = useState([]);
  const [storyboardTitle, setStoryboardTitle] = useState('');
  const [generatingScenes, setGeneratingScenes] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationCancelled, setGenerationCancelled] = useState(false);
  const cancelRef = useRef(false);

  // Polling state for async models
  const [pollingScene, setPollingScene] = useState(null);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('setup');
      setDescription('');
      setNumScenes(4);
      setStyle('cinematic');
      setDefaultDuration(5);
      setCharacterDescription('');
      setCharacterRefs([]);
      setAnalyzingCharacter(false);
      setScenes([]);
      setStoryboardTitle('');
      setGenerating(false);
      setGenerationCancelled(false);
      cancelRef.current = false;
    }
  }, [isOpen]);

  // ── Library browser ──
  const loadLibrary = async () => {
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('image_library_items')
        .select('id, url, title, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLibraryItems(data || []);
      const folders = [...new Set(
        (data || []).map(i => i.title?.match(/^\[([^\]]+)\]/)?.[1]).filter(Boolean)
      )];
      setLibraryFolders(folders);
    } catch (err) {
      toast.error('Failed to load library');
    } finally {
      setLibraryLoading(false);
    }
  };

  const openLibrary = () => {
    setShowLibrary(true);
    setSelectedIds(new Set());
    setSelectedFolder(null);
    loadLibrary();
  };

  // Auto-describe character from image (same as turnaround)
  const describeCharacterFromImage = async (imageUrl) => {
    if (!imageUrl || analyzingCharacter) return;
    setAnalyzingCharacter(true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setCharacterDescription(data.description);
        toast.success('Character description generated from image');
      } else {
        toast.error(data.error || 'Could not describe character');
      }
    } catch (err) {
      toast.error('Character analysis failed: ' + err.message);
    } finally {
      setAnalyzingCharacter(false);
    }
  };

  const importFromLibrary = () => {
    const selected = libraryItems.filter(i => selectedIds.has(i.id));
    const urls = selected.map(i => i.url);
    const isFirstRef = characterRefs.length === 0;
    setCharacterRefs(prev => [...prev, ...urls]);
    setShowLibrary(false);
    toast.success(`Added ${urls.length} reference image(s)`);
    // Auto-describe from first imported image if no description yet
    if (isFirstRef && urls.length > 0 && !characterDescription) {
      describeCharacterFromImage(urls[0]);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const isFirstRef = characterRefs.length === 0;
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        setCharacterRefs(prev => {
          const updated = [...prev, reader.result];
          // Auto-describe from the first image if no description yet
          if (isFirstRef && prev.length === 0 && !characterDescription) {
            describeCharacterFromImage(reader.result);
          }
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // ── AI Scene Generation ──
  const generateSceneBreakdown = async () => {
    if (!description.trim()) {
      toast.error('Please describe your story concept');
      return;
    }
    setGeneratingScenes(true);
    try {
      const res = await apiFetch('/api/storyboard/generate-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          numScenes,
          style,
          defaultDuration,
          characterDescription,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate scenes');

      setStoryboardTitle(data.title);
      setScenes(data.scenes.map((s, i) => ({
        ...s,
        id: `scene-${Date.now()}-${i}`,
        status: 'pending',
        videoUrl: null,
        lastFrameUrl: null,
        startFrameUrl: null,
      })));
      setStep('scenes');
      toast.success(`Generated ${data.scenes.length} scenes`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGeneratingScenes(false);
    }
  };

  // ── Scene editing helpers ──
  const updateScene = (id, updates) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeScene = (id) => {
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const addScene = () => {
    setScenes(prev => [...prev, {
      id: `scene-${Date.now()}`,
      sceneNumber: prev.length + 1,
      visualPrompt: '',
      motionPrompt: '',
      durationSeconds: defaultDuration,
      cameraAngle: 'medium',
      narrativeNote: '',
      status: 'pending',
      videoUrl: null,
      lastFrameUrl: null,
      startFrameUrl: null,
    }]);
  };

  const moveScene = (index, direction) => {
    const newScenes = [...scenes];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newScenes.length) return;
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    newScenes.forEach((s, i) => s.sceneNumber = i + 1);
    setScenes(newScenes);
  };

  // ── Video Generation (sequential with frame chaining) ──
  const pollForResult = async (requestId, modelId) => {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      if (cancelRef.current) throw new Error('Cancelled');
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await apiFetch('/api/jumpstart/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, model: modelId }),
        });
        const data = await res.json();
        if (data.videoUrl) return data.videoUrl;
        if (data.status === 'failed' || data.error) throw new Error(data.error || 'Generation failed');
      } catch (err) {
        if (err.message === 'Cancelled') throw err;
        // Continue polling on network errors
      }
    }
    throw new Error('Generation timed out');
  };

  const generateSingleScene = async (scene, startFrameUrl) => {
    const selectedModel = STORYBOARD_MODELS.find(m => m.id === model);
    const isR2V = selectedModel?.supportsRefs && characterRefs.length > 0;

    // Build prompt — insert @Element for R2V if character refs exist
    let prompt = scene.visualPrompt;
    if (scene.motionPrompt) {
      prompt += `. Camera: ${scene.motionPrompt}`;
    }
    if (style && style !== 'cinematic') {
      prompt += `. Style: ${style}`;
    }

    // Build FormData matching JumpStart's expected format
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('model', model);
    formData.append('duration', String(scene.durationSeconds));
    formData.append('aspectRatio', aspectRatio);
    formData.append('resolution', '720p');

    // We need an image file — use start frame or first character ref
    const imageUrl = startFrameUrl || characterRefs[0] || null;
    if (!imageUrl) {
      throw new Error('No start image available. Add a character reference image or generate from the first scene.');
    }

    // Convert URL/dataURL to a blob for the image field
    let imageBlob;
    if (imageUrl.startsWith('data:')) {
      const resp = await fetch(imageUrl);
      imageBlob = await resp.blob();
    } else {
      const resp = await fetch(imageUrl);
      imageBlob = await resp.blob();
    }
    formData.append('image', imageBlob, 'frame.jpg');

    // R2V: pass reference images and frontal image URL
    if (isR2V && characterRefs.length > 0) {
      formData.append('referenceImages', JSON.stringify(characterRefs));
      formData.append('frontalImageUrl', characterRefs[frontalIndex] || characterRefs[0]);
    }

    // End frame not used for storyboard chaining (start frame is sufficient)
    formData.append('negativePrompt', 'blur, distort, low quality, text, watermark');

    const res = await apiFetch('/api/jumpstart/generate', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (data.videoUrl) return data.videoUrl;
    if (data.requestId) {
      setPollingScene(scene.id);
      const videoUrl = await pollForResult(data.requestId, data.model || model);
      setPollingScene(null);
      return videoUrl;
    }
    throw new Error(data.error || 'Generation failed');
  };

  const generateAllScenes = async () => {
    setStep('generating');
    setGenerating(true);
    cancelRef.current = false;
    setGenerationCancelled(false);

    let previousFrameUrl = null;

    for (let i = 0; i < scenes.length; i++) {
      if (cancelRef.current) {
        toast('Generation cancelled');
        break;
      }

      const scene = scenes[i];
      updateScene(scene.id, { status: 'generating', startFrameUrl: previousFrameUrl });

      try {
        const videoUrl = await generateSingleScene(scene, previousFrameUrl);

        // Extract last frame for chaining to next scene
        let lastFrame = null;
        try {
          lastFrame = await extractLastFrame(videoUrl);
        } catch (err) {
          console.warn(`[Storyboard] Could not extract last frame from scene ${i + 1}:`, err.message);
        }

        updateScene(scene.id, {
          status: 'done',
          videoUrl,
          lastFrameUrl: lastFrame,
        });

        previousFrameUrl = lastFrame || previousFrameUrl;

        // Save video to library
        apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: videoUrl,
            type: 'video',
            title: `[Storyboard] Scene ${i + 1} - ${storyboardTitle}`,
            source: 'storyboard',
          }),
        }).catch(err => console.warn('Failed to save to library:', err));

      } catch (err) {
        if (err.message === 'Cancelled') break;
        updateScene(scene.id, { status: 'error' });
        toast.error(`Scene ${i + 1} failed: ${err.message}`);
      }
    }

    setGenerating(false);
    setStep('review');
  };

  const cancelGeneration = () => {
    cancelRef.current = true;
    setGenerationCancelled(true);
  };

  // Re-generate a single scene in review
  const regenerateScene = async (sceneId) => {
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex < 0) return;

    const scene = scenes[sceneIndex];
    updateScene(sceneId, { status: 'generating' });

    try {
      // Use previous scene's last frame as start frame
      let startFrame = null;
      if (sceneIndex > 0) {
        const prev = scenes[sceneIndex - 1];
        startFrame = prev.lastFrameUrl || null;
      }

      const videoUrl = await generateSingleScene(scene, startFrame);

      let lastFrame = null;
      try {
        lastFrame = await extractLastFrame(videoUrl);
      } catch (err) {
        console.warn('[Storyboard] Frame extraction failed:', err.message);
      }

      updateScene(sceneId, { status: 'done', videoUrl, lastFrameUrl: lastFrame });
      toast.success(`Scene ${sceneIndex + 1} regenerated`);
    } catch (err) {
      updateScene(sceneId, { status: 'error' });
      toast.error(`Regeneration failed: ${err.message}`);
    }
  };

  // Send completed scenes to timeline
  const sendToTimeline = () => {
    const completedScenes = scenes.filter(s => s.status === 'done' && s.videoUrl);
    if (!completedScenes.length) {
      toast.error('No completed scenes to add');
      return;
    }
    if (onScenesComplete) {
      onScenesComplete(completedScenes.map(s => ({
        videoUrl: s.videoUrl,
        title: `Scene ${s.sceneNumber} - ${storyboardTitle}`,
        durationSeconds: s.durationSeconds,
      })));
    }
    toast.success(`${completedScenes.length} scenes sent to timeline`);
    onClose();
  };

  const filteredLibrary = selectedFolder === null
    ? libraryItems
    : libraryItems.filter(i => i.title?.startsWith(`[${selectedFolder}]`));

  const stepIndex = STEPS.indexOf(step);
  const completedScenes = scenes.filter(s => s.status === 'done').length;
  const failedScenes = scenes.filter(s => s.status === 'error').length;

  return (
    <SlideOverPanel
      open={isOpen}
      onClose={onClose}
      title="Storyboard Planner"
      description="Create multi-scene video sequences with AI"
      size="xl"
    >
      <SlideOverBody className="p-6 bg-gray-50">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                i === stepIndex ? 'text-[#2C666E]' : i < stepIndex ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === stepIndex ? 'bg-[#2C666E] text-white' : i < stepIndex ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="hidden sm:inline capitalize">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Setup ── */}
        {step === 'setup' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Concept</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your story... e.g., 'A young explorer discovers a hidden portal in an ancient forest, steps through, and finds herself in a floating city above the clouds'"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#2C666E] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Number of Scenes</label>
                <select
                  value={numScenes}
                  onChange={(e) => setNumScenes(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} scenes</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration per Scene</label>
                <select
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n} seconds</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {['16:9', '9:16', '1:1', '4:3'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Style visual grid */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Style</label>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-3">
                {STYLE_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">{cat.label}</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {cat.styles.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStyle(s.id)}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                            style === s.id
                              ? 'border-[#2C666E] ring-1 ring-[#2C666E] scale-[1.02]'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={s.thumb}
                            alt={s.label}
                            className="w-full aspect-square object-cover"
                            loading="lazy"
                          />
                          <div className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] font-medium text-center leading-tight ${
                            style === s.id
                              ? 'bg-[#2C666E] text-white'
                              : 'bg-black/60 text-white'
                          }`}>
                            {s.label}
                          </div>
                          {style === s.id && (
                            <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2C666E] rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Video Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {STORYBOARD_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
                ))}
              </select>
            </div>

            {/* Character description for @Element */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">
                  Character Description <span className="text-gray-400">(optional — used as @Element in prompts)</span>
                </label>
                {characterRefs.length > 0 && (
                  <button
                    onClick={() => describeCharacterFromImage(characterRefs[0])}
                    disabled={analyzingCharacter}
                    className="flex items-center gap-1 text-[10px] font-medium text-[#2C666E] hover:text-[#07393C] disabled:opacity-50"
                  >
                    {analyzingCharacter
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                      : <><Sparkles className="w-3 h-3" /> Describe from image</>}
                  </button>
                )}
              </div>
              <textarea
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                placeholder={analyzingCharacter ? 'Analyzing character from image...' : "e.g., 'A young woman with red hair, green eyes, wearing a brown leather jacket and hiking boots'"}
                className={`w-full h-16 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#2C666E] focus:border-transparent ${analyzingCharacter ? 'bg-gray-50 animate-pulse' : ''}`}
              />
            </div>

            {/* Character reference images */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Character Reference Images <span className="text-gray-400">(for R2V models)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" /> Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openLibrary}
                  className="text-xs"
                >
                  <FolderOpen className="w-3 h-3 mr-1" /> Library
                </Button>
              </div>
              {characterRefs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {characterRefs.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt={`ref ${i + 1}`}
                        onClick={() => setFrontalIndex(i)}
                        title={i === frontalIndex ? 'Frontal image (used for R2V)' : 'Click to set as frontal image'}
                        className={`w-16 h-16 rounded-lg object-cover cursor-pointer transition-all ${
                          i === frontalIndex
                            ? 'border-2 border-[#2C666E] ring-2 ring-[#2C666E]/30'
                            : 'border border-gray-200 hover:border-gray-400'
                        }`}
                      />
                      {i === frontalIndex && (
                        <span className="absolute -top-1 -left-1 w-4 h-4 bg-[#2C666E] text-white rounded-full text-[8px] flex items-center justify-center font-bold">F</span>
                      )}
                      <button
                        onClick={() => {
                          setCharacterRefs(prev => prev.filter((_, j) => j !== i));
                          if (frontalIndex >= characterRefs.length - 1) setFrontalIndex(0);
                          else if (i < frontalIndex) setFrontalIndex(prev => prev - 1);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {characterRefs.length > 1 && (
                    <p className="w-full text-[10px] text-gray-400 mt-0.5">Click an image to set it as the frontal reference (marked with F)</p>
                  )}
                </div>
              )}
            </div>

            {/* Library browser overlay */}
            {showLibrary && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Select from Library</span>
                  <button onClick={() => setShowLibrary(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {libraryFolders.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className={`px-2 py-0.5 rounded text-xs ${selectedFolder === null ? 'bg-[#2C666E] text-white' : 'bg-white border text-gray-600'}`}
                    >
                      All
                    </button>
                    {libraryFolders.map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFolder(f)}
                        className={`px-2 py-0.5 rounded text-xs ${selectedFolder === f ? 'bg-[#2C666E] text-white' : 'bg-white border text-gray-600'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                {!libraryLoading && filteredLibrary.length > 0 && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const allIds = filteredLibrary.map(i => i.id);
                        const allSelected = allIds.every(id => selectedIds.has(id));
                        if (allSelected) {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            allIds.forEach(id => next.delete(id));
                            return next;
                          });
                        } else {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            allIds.forEach(id => next.add(id));
                            return next;
                          });
                        }
                      }}
                      className="text-xs text-[#2C666E] hover:underline font-medium"
                    >
                      {filteredLibrary.every(i => selectedIds.has(i.id)) ? 'Deselect All' : `Select All (${filteredLibrary.length})`}
                    </button>
                    {selectedIds.size > 0 && (
                      <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
                    )}
                  </div>
                )}
                {libraryLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
                    {filteredLibrary.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        })}
                        className={`relative cursor-pointer rounded border-2 overflow-hidden ${
                          selectedIds.has(item.id) ? 'border-[#2C666E]' : 'border-transparent'
                        }`}
                      >
                        <img src={item.url} alt="" className="w-full aspect-square object-cover" />
                        {selectedIds.has(item.id) && (
                          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2C666E] rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedIds.size > 0 && (
                  <Button size="sm" onClick={importFromLibrary} className="w-full text-xs bg-[#2C666E] text-white">
                    Import {selectedIds.size} image(s)
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Scene Cards ── */}
        {step === 'scenes' && (
          <div className="space-y-3">
            {storyboardTitle && (
              <h3 className="text-sm font-semibold text-gray-800">{storyboardTitle}</h3>
            )}
            {scenes.map((scene, i) => (
              <div key={scene.id} className="border rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2C666E]">Scene {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveScene(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeScene(scene.id)} className="p-0.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wide">Visual Prompt</label>
                  <textarea
                    value={scene.visualPrompt}
                    onChange={(e) => updateScene(scene.id, { visualPrompt: e.target.value })}
                    className="w-full h-16 px-2 py-1 border border-gray-200 rounded text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide">Motion</label>
                    <input
                      value={scene.motionPrompt}
                      onChange={(e) => updateScene(scene.id, { motionPrompt: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                      placeholder="Camera motion..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide">Duration</label>
                    <select
                      value={scene.durationSeconds}
                      onChange={(e) => updateScene(scene.id, { durationSeconds: parseInt(e.target.value) })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    >
                      {[3, 4, 5, 6, 8, 10].map(n => (
                        <option key={n} value={n}>{n}s</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide">Camera</label>
                    <select
                      value={scene.cameraAngle}
                      onChange={(e) => updateScene(scene.id, { cameraAngle: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs"
                    >
                      {CAMERA_ANGLES.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {scene.narrativeNote && (
                  <p className="text-[10px] text-gray-400 italic">{scene.narrativeNote}</p>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addScene} className="w-full text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add Scene
            </Button>
          </div>
        )}

        {/* ── STEP 3: Generation Progress ── */}
        {step === 'generating' && (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Generating {scenes.length} Scenes</h3>
              <p className="text-xs text-gray-500 mt-1">
                {completedScenes} / {scenes.length} complete
                {failedScenes > 0 && ` (${failedScenes} failed)`}
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-2">
                <div
                  className="h-full bg-[#2C666E] rounded-full transition-all"
                  style={{ width: `${(completedScenes / scenes.length) * 100}%` }}
                />
              </div>
            </div>

            {scenes.map((scene, i) => (
              <div key={scene.id} className={`flex items-center gap-3 p-2 rounded-lg border ${
                scene.status === 'generating' ? 'border-[#2C666E] bg-blue-50' :
                scene.status === 'done' ? 'border-green-200 bg-green-50' :
                scene.status === 'error' ? 'border-red-200 bg-red-50' :
                'border-gray-200'
              }`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  {scene.status === 'generating' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#2C666E]" />
                  ) : scene.status === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : scene.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">Scene {i + 1}</p>
                  <p className="text-[10px] text-gray-400 truncate">{scene.narrativeNote || scene.visualPrompt.substring(0, 60)}</p>
                </div>
                {scene.status === 'done' && scene.videoUrl && (
                  <video src={scene.videoUrl} className="w-12 h-8 rounded object-cover" muted />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 'review' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                {storyboardTitle} — {completedScenes}/{scenes.length} scenes
              </h3>
            </div>

            {scenes.map((scene, i) => (
              <div key={scene.id} className="border rounded-lg overflow-hidden">
                {scene.status === 'done' && scene.videoUrl ? (
                  <video
                    src={scene.videoUrl}
                    controls
                    className="w-full aspect-video bg-black"
                    muted
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                    {scene.status === 'error' ? (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    ) : scene.status === 'generating' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      <Video className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                )}
                <div className="p-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Scene {i + 1}</p>
                    <p className="text-[10px] text-gray-400">{scene.durationSeconds}s — {scene.cameraAngle}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => moveScene(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateScene(scene.id)}
                      disabled={scene.status === 'generating'}
                      className="text-[10px] h-6 px-2"
                    >
                      {scene.status === 'generating' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <><RefreshCw className="w-3 h-3 mr-0.5" /> Redo</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex items-center justify-between w-full">
          {/* Back button */}
          <div>
            {step === 'scenes' && (
              <Button variant="outline" size="sm" onClick={() => setStep('setup')}>
                <ChevronLeft className="w-3 h-3 mr-1" /> Back
              </Button>
            )}
            {step === 'review' && (
              <Button variant="outline" size="sm" onClick={() => setStep('scenes')}>
                <ChevronLeft className="w-3 h-3 mr-1" /> Edit Scenes
              </Button>
            )}
          </div>

          {/* Action button */}
          <div className="flex gap-2">
            {step === 'setup' && (
              <Button
                onClick={generateSceneBreakdown}
                disabled={generatingScenes || !description.trim()}
                className="bg-[#2C666E] text-white text-sm"
              >
                {generatingScenes ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1" /> Generate Scenes</>
                )}
              </Button>
            )}

            {step === 'scenes' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSceneBreakdown}
                  disabled={generatingScenes}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Regenerate
                </Button>
                <Button
                  onClick={generateAllScenes}
                  disabled={scenes.length === 0}
                  className="bg-[#2C666E] text-white text-sm"
                >
                  <Play className="w-4 h-4 mr-1" /> Generate All Videos
                </Button>
              </>
            )}

            {step === 'generating' && (
              <Button
                variant="outline"
                onClick={cancelGeneration}
                disabled={!generating}
                className="text-red-600 border-red-300"
              >
                <Pause className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}

            {step === 'review' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAllScenes}
                  disabled={generating}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Regenerate All
                </Button>
                <Button
                  onClick={sendToTimeline}
                  disabled={completedScenes === 0}
                  className="bg-[#2C666E] text-white text-sm"
                >
                  <Send className="w-4 h-4 mr-1" /> Send to Timeline ({completedScenes})
                </Button>
              </>
            )}
          </div>
        </div>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
