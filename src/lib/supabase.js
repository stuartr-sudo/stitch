import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Helper to check if URL is valid
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('your_') || url === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Create client only if credentials are valid URLs
let supabase = null;

if (isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.includes('your_')) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.warn('Supabase credentials not configured. Storage features will be disabled.');
}

export { supabase };

export const getCurrentUser = async () => {
  if (!supabase) return null;
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return null;
    }
    
    return {
      id: session.user.id,
      email: session.user.email,
    };
  } catch (err) {
    console.error('getCurrentUser exception:', err);
    return null;
  }
};
