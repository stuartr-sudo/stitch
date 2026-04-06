import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Film, FileText, LayoutGrid, Megaphone, BookOpen } from 'lucide-react';

const TYPE_ICONS = { short: Film, linkedin_post: FileText, carousel: LayoutGrid, ad_set: Megaphone, storyboard: BookOpen };

const PLATFORM_COLORS = {
  youtube: 'bg-red-600',
  tiktok: 'bg-slate-900',
  linkedin: 'bg-blue-700',
  instagram: 'bg-gradient-to-r from-purple-600 to-pink-500',
  facebook: 'bg-blue-600',
  meta: 'bg-blue-500'
};

export default function CalendarView({ items }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { days, weekLabel } = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    const ds = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        key: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      };
    });

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const label = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return { days: ds, weekLabel: label };
  }, [weekOffset]);

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = {};
    for (const item of (items || [])) {
      if (!item.scheduled_at) continue;
      const key = new Date(item.scheduled_at).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-slate-700 text-sm font-medium">{weekLabel}</div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayItems = itemsByDate[day.key] || [];

          return (
            <div
              key={day.key}
              className={`rounded-xl border min-h-[140px] p-2
                ${day.isToday ? 'border-teal-400 bg-teal-50/50' : 'border-gray-200 bg-white'}
                ${day.isWeekend ? 'opacity-60' : ''}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs ${day.isToday ? 'text-teal-700 font-semibold' : 'text-slate-400'}`}>
                  {day.dayName}
                </span>
                <span className={`text-sm font-medium ${day.isToday ? 'text-white bg-[#2C666E] w-6 h-6 rounded-full flex items-center justify-center text-[11px]' : 'text-slate-400'}`}>
                  {day.dayNum}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1">
                {dayItems.map(item => {
                  const Icon = TYPE_ICONS[item.type] || BookOpen;
                  const platformColor = PLATFORM_COLORS[item.platform] || 'bg-slate-600';
                  const time = new Date(item.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

                  return (
                    <div key={item.id} className={`${platformColor} rounded-md px-2 py-1.5 text-white`}>
                      <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[10px] font-medium truncate">
                          {item.platform || item.type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[9px] opacity-75 mt-0.5">{time}</div>
                    </div>
                  );
                })}

                {dayItems.length === 0 && (
                  <div className="text-slate-300 text-[10px] text-center mt-4">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
