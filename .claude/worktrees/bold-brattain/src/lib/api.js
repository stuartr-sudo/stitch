import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper that attaches the Supabase JWT
 * to every API request as a Bearer token.
 */
export async function apiFetch(url, options = {}) {
  const headers = { ...options.headers };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return fetch(url, { ...options, headers });
}
