import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, Circle, ArrowRight, Video, Image, LayoutList, Pen } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const SUGGESTED_ACTIONS = [
  {
    title: 'Create your first Short',
    description: 'AI-powered short-form video creation',
    route: '/shorts/workbench',
    icon: Video,
  },
  {
    title: 'Generate a product image',
    description: 'Text-to-image and image editing',
    route: '/studio',
    icon: Image,
  },
  {
    title: 'Plan a video storyboard',
    description: 'Script and scene planning',
    route: '/storyboards',
    icon: LayoutList,
  },
  {
    title: 'Write a LinkedIn post',
    description: 'AI-generated thought leadership',
    route: '/linkedin',
    icon: Pen,
  },
];

export default function OnboardingChecklist() {
  const navigate = useNavigate();
  const { refreshOnboarding } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await apiFetch('/api/onboarding/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ brand_kit_created: false, platforms_prompted: false, connected_platforms: [] });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoToStudio() {
    setCompleting(true);
    try {
      await apiFetch('/api/onboarding/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_complete: true }),
      });
      await refreshOnboarding();
      navigate('/studio', { replace: true });
    } catch {
      navigate('/studio', { replace: true });
    }
  }

  async function handleGoToAction(route) {
    // Mark onboarding complete first so they don't get redirected back
    try {
      await apiFetch('/api/onboarding/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_complete: true }),
      });
      await refreshOnboarding();
    } catch {
      // Continue anyway
    }
    navigate(route);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Status */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Setup Status</h3>
        <div className="space-y-2">
          <StatusRow done label="API Keys configured" />
          <StatusRow done={status?.brand_kit_created} label="Brand Kit" note={status?.brand_kit_created ? 'Configured' : 'Not set up yet'} />
          <StatusRow
            done={status?.connected_platforms?.length > 0}
            label="Platform Connections"
            note={status?.connected_platforms?.length > 0
              ? `${status.connected_platforms.length} connected`
              : 'None connected yet'
            }
          />
        </div>
      </div>

      {/* Suggested First Actions */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Get Started</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {SUGGESTED_ACTIONS.map(action => (
            <button
              key={action.route}
              onClick={() => handleGoToAction(action.route)}
              className="text-left p-3.5 rounded-xl border border-gray-200 bg-white hover:border-[#2C666E]/40 hover:bg-[#2C666E]/5 transition-colors group"
            >
              <action.icon className="w-5 h-5 text-[#2C666E] mb-2" />
              <p className="text-sm font-medium text-gray-900">{action.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Go to Studio */}
      <Button
        onClick={handleGoToStudio}
        disabled={completing}
        className="w-full h-12 bg-[#2C666E] hover:bg-[#07393C] text-white text-base"
      >
        {completing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>Go to Studio <ArrowRight className="w-5 h-5 ml-2" /></>
        )}
      </Button>
    </div>
  );
}

function StatusRow({ done, label, note }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-gray-300 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-900">{label}</span>
        {note && <span className="text-xs text-gray-500 ml-2">{note}</span>}
      </div>
    </div>
  );
}
