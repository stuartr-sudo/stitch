import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasKeys, setHasKeys] = useState(null); // null = unknown, true/false after check
  const [onboardingComplete, setOnboardingComplete] = useState(null); // null = unknown

  const checkUserKeys = async (userId) => {
    if (!userId || !supabase) { setHasKeys(false); return; }
    try {
      // Use server endpoint which accounts for owner env-var fallback
      const resp = await apiFetch('/api/auth/check-keys');
      const data = await resp.json();
      setHasKeys(!!data?.hasKeys);
    } catch {
      // Fallback to direct DB check if API unavailable (dev startup race)
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
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const resp = await apiFetch('/api/onboarding/status');
      const data = await resp.json();
      setOnboardingComplete(!!data?.onboarding_complete);
    } catch {
      // If API unavailable, don't block — assume complete to avoid trapping user
      setOnboardingComplete(true);
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
        checkUserKeys(session.user.id).then(async () => {
          await checkOnboardingStatus();
          setLoading(false);
        });
      } else {
        setHasKeys(false);
        setOnboardingComplete(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserKeys(session.user.id);
        checkOnboardingStatus();
      } else {
        setHasKeys(false);
        setOnboardingComplete(null);
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
    <AuthContext.Provider value={{
      user, session, loading, hasKeys, onboardingComplete,
      refreshKeys: () => checkUserKeys(user?.id),
      refreshOnboarding: checkOnboardingStatus,
      signUp, signIn, signOut,
    }}>
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
