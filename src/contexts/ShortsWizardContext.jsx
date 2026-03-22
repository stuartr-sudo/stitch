import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ShortsWizardContext = createContext(null);

const STORAGE_KEY = 'stitch_shorts_wizard';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const DEFAULT_STATE = {
  niche: '',
  visualStyle: '',
  topics: [],
  primaryTopic: '',
  videoLengthPreset: 60,
  script: null,
  videoModel: 'wavespeed_wan',
  motionStyle: 'subtle',
  voiceId: '',
  musicMood: '',
  captionStyle: 'dynamic',
  previewImage: null,
};

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._savedAt && Date.now() - parsed._savedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const { _savedAt, ...state } = parsed;
    return state;
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, _savedAt: Date.now() }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function ShortsWizardProvider({ children }) {
  const [state, setState] = useState(() => {
    const persisted = loadPersistedState();
    return persisted ? { ...DEFAULT_STATE, ...persisted } : { ...DEFAULT_STATE };
  });

  // Persist on every state change
  useEffect(() => {
    persistState(state);
  }, [state]);

  const updateField = useCallback((field, value) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetWizard = useCallback(() => {
    setState({ ...DEFAULT_STATE });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ShortsWizardContext.Provider value={{ ...state, updateField, updateFields, resetWizard }}>
      {children}
    </ShortsWizardContext.Provider>
  );
}

export function useShortsWizard() {
  const ctx = useContext(ShortsWizardContext);
  if (!ctx) throw new Error('useShortsWizard must be used within ShortsWizardProvider');
  return ctx;
}
