import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function ResearchSidePanel({ researchSessionId }) {
  const [session, setSession] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!researchSessionId) return;
    // Fetch research session data — we can use the campaign endpoint which includes it
    // For now, show what we have from the session data
    setLoading(false);
  }, [researchSessionId]);

  if (!researchSessionId) return null;

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} className="w-8 border-l bg-gray-50 flex items-center justify-center hover:bg-gray-100">
        <ChevronLeft className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="w-72 border-l bg-gray-50 p-4 space-y-4 shrink-0">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-indigo-600">Research</h3>
        <button onClick={() => setCollapsed(true)} className="p-1 hover:bg-gray-200 rounded">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 text-xs">
        <div className="text-indigo-600 font-semibold">Research-powered campaign</div>
        <div className="text-gray-600 mt-1">This campaign was created from competitive intelligence.</div>
      </div>

      <div className="text-xs text-gray-400">
        Research session ID: {researchSessionId}
      </div>
    </div>
  );
}
