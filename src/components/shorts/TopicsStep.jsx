import React, { useState } from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const LENGTH_PRESETS = [
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
  { value: 90, label: '90s' },
];

export default function TopicsStep() {
  const { niche, topics, primaryTopic, videoLengthPreset, updateField, updateFields } = useShortsWizard();
  const [loading, setLoading] = useState(false);
  const [generatedTopics, setGeneratedTopics] = useState([]);

  const generateTopics = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/topics', {
        method: 'POST',
        body: JSON.stringify({ niche }),
      });
      const data = await res.json();
      const topicList = data.topics || data || [];
      setGeneratedTopics(topicList);
      // Clear previous selections when regenerating
      updateFields({ topics: [], primaryTopic: '' });
    } catch (err) {
      console.error('Failed to generate topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topic) => {
    const current = topics || [];
    const next = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    updateField('topics', next);
    // If we removed the primary, clear it
    if (primaryTopic === topic && !next.includes(topic)) {
      updateField('primaryTopic', '');
    }
  };

  const setPrimary = (topic) => {
    // Must be selected first
    if (!(topics || []).includes(topic)) {
      updateFields({ topics: [...(topics || []), topic], primaryTopic: topic });
    } else {
      updateField('primaryTopic', topic);
    }
  };

  const allTopics = generatedTopics.length > 0 ? generatedTopics : [];

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Topics & Length</h2>
      <p className="text-sm text-slate-500 mb-6">Generate topic ideas, pick your favorites, and choose video length.</p>

      {/* Video length */}
      <div className="mb-6">
        <label className="text-sm font-medium text-slate-700 mb-2 block">Video Length</label>
        <div className="flex gap-2">
          {LENGTH_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => updateField('videoLengthPreset', p.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                videoLengthPreset === p.value
                  ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={generateTopics}
        disabled={loading || !niche}
        className="mb-6 bg-[#2C666E] hover:bg-[#24555c] text-white"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Generate Topics</>
        )}
      </Button>

      {!niche && (
        <p className="text-sm text-amber-600 mb-4">Please select a niche first.</p>
      )}

      {/* Topic list */}
      {allTopics.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">
            Check topics to include. Click the star to set as primary topic.
          </p>
          {allTopics.map((topic, i) => {
            const label = typeof topic === 'string' ? topic : topic.title || topic.topic || '';
            const isSelected = (topics || []).includes(label);
            const isPrimary = primaryTopic === label;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                  isSelected ? 'border-[#2C666E]/40 bg-[#2C666E]/5' : 'border-slate-200 bg-white',
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTopic(label)}
                  className="w-4 h-4 rounded border-slate-300 text-[#2C666E] focus:ring-[#2C666E]"
                />
                <span className="flex-1 text-sm text-slate-700">{label}</span>
                <button
                  type="button"
                  onClick={() => setPrimary(label)}
                  title="Set as primary topic"
                  className={cn(
                    'p-1 rounded transition-colors',
                    isPrimary
                      ? 'text-amber-500'
                      : 'text-slate-300 hover:text-amber-400',
                  )}
                >
                  <Star className={cn('w-4 h-4', isPrimary && 'fill-current')} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
