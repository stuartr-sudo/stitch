import React from 'react';
import { Clock, Hammer, CheckCircle, Send } from 'lucide-react';

export default function StatsBar({ stats }) {
  const items = stats?.items || {};

  const cards = [
    {
      label: 'Pending Review', value: items.pending_review || 0, icon: Clock,
      bg: 'bg-rose-50 border-rose-200', iconColor: 'text-rose-500', valueColor: 'text-rose-600', labelColor: 'text-rose-400',
    },
    {
      label: 'Building', value: items.building || 0, icon: Hammer,
      bg: 'bg-indigo-50 border-indigo-200', iconColor: 'text-indigo-500', valueColor: 'text-indigo-600', labelColor: 'text-indigo-400',
    },
    {
      label: 'Approved', value: items.approved || 0, icon: CheckCircle,
      bg: 'bg-teal-50 border-teal-200', iconColor: 'text-teal-500', valueColor: 'text-teal-600', labelColor: 'text-teal-400',
    },
    {
      label: 'Published', value: items.published || 0, icon: Send,
      bg: 'bg-slate-50 border-slate-200', iconColor: 'text-slate-400', valueColor: 'text-slate-500', labelColor: 'text-slate-400',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, bg, iconColor, valueColor, labelColor }) => (
        <div key={label} className={`${bg} rounded-xl p-4 border`}>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className={`text-xs uppercase tracking-wide font-medium ${labelColor}`}>{label}</span>
          </div>
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}
