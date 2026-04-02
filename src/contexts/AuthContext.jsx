import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasKeys, setHasKeys] = useState(null); // null = unknown, true/false after check

  const checkUserKeys = async (userId) => {
    if (!userId || !supabase) { setHasKeys(false); return; }
    try {
      const { data } = await supabase
        .from('user_api_keys')
        .select('fal_key, openai_key')
        .eq('user_id', userId)
        .maybeSingle();
      setHasKeys(!!(data?.fal_key && data?.openai_key));
    } catch {
      setHasKeys(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserKeys(session.user.id).then(() => setLoading(false));
      } else {
        setHasKeys(false);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserKeys(session.user.id);
      } else {
        setHasKeys(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, hasKeys, refreshKeys: () => checkUserKeys(user?.id), signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
