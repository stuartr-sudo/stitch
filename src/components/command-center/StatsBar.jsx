import React from 'react';
import { Clock, Hammer, CheckCircle, Send } from 'lucide-react';

export default function StatsBar({ stats }) {
  const items = stats?.items || {};

  const cards = [
    { label: 'Pending Review', value: items.pending_review || 0, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/30' },
    { label: 'Building', value: items.building || 0, icon: Hammer, color: 'text-indigo-400', bg: 'bg-indigo-950/30' },
    { label: 'Approved', value: items.approved || 0, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-950/30' },
    { label: 'Published', value: items.published || 0, icon: Send, color: 'text-slate-400', bg: 'bg-slate-800/50' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`${bg} rounded-xl p-4 border border-slate-700/30`}>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-slate-500 text-xs uppercase tracking-wide">{label}</span>
          </div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
