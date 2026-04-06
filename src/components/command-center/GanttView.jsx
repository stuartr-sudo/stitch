import React, { useMemo } from 'react';

const STATUS_COLORS = {
  queued: 'bg-slate-600',
  building: 'bg-indigo-500',
  ready: 'bg-amber-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  published: 'bg-slate-500',
  failed: 'bg-red-600'
};

export default function GanttView({ campaigns }) {
  // Generate 14 days starting from the most recent Monday
  const days = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Most recent Monday
    monday.setHours(0, 0, 0, 0);

    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        isToday: d.toDateString() === new Date().toDateString(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      };
    });
  }, []);

  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;

  // Map items to their day positions
  const getDayIndex = (dateStr) => {
    if (!dateStr) return -1;
    const d = new Date(dateStr);
    const diff = Math.floor((d - startDate) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < 14 ? diff : -1;
  };

  if (!campaigns?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 text-sm">No campaigns to display on the timeline.</p>
        <p className="text-slate-600 text-xs mt-1">Create a campaign using the chat bubble to see it here.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: '900px' }}>
        {/* Day headers */}
        <div className="grid gap-0" style={{ gridTemplateColumns: '200px repeat(14, 1fr)' }}>
          <div className="text-slate-500 text-xs font-semibold px-2 py-2">Campaign / Item</div>
          {days.map((day, i) => (
            <div
              key={i}
              className={`text-center py-2 text-xs border-l border-slate-800
                ${day.isToday ? 'bg-indigo-950/20 text-white font-semibold' : day.isWeekend ? 'text-slate-600' : 'text-slate-500'}`}
            >
              <div>{day.label}</div>
              <div className="text-[10px]">{day.month} {day.dayNum}</div>
            </div>
          ))}
        </div>

        {/* Campaign rows */}
        {campaigns.map(campaign => (
          <div key={campaign.id}>
            {/* Campaign header row */}
            <div
              className="grid gap-0 mt-2"
              style={{ gridTemplateColumns: '200px repeat(14, 1fr)' }}
            >
              <div className="bg-slate-800 rounded-l-lg px-3 py-2">
                <span className="text-white text-xs font-semibold truncate block">{campaign.name}</span>
                <span className="text-slate-500 text-[10px]">{campaign.items?.length || 0} items</span>
              </div>
              <div className="col-span-14 bg-slate-800 rounded-r-lg h-full" />
            </div>

            {/* Item rows */}
            {(campaign.items || []).map(item => {
              const createdIdx = getDayIndex(item.created_at);
              const scheduledIdx = getDayIndex(item.scheduled_at);

              return (
                <div
                  key={item.id}
                  className="grid gap-0 items-center"
                  style={{ gridTemplateColumns: '200px repeat(14, 1fr)', minHeight: '32px' }}
                >
                  <div className="text-slate-400 text-[11px] px-3 pl-6 truncate">
                    {item.type === 'short' ? '🎬' : item.type === 'linkedin_post' ? '💼' : item.type === 'carousel' ? '📊' : item.type === 'ad_set' ? '📣' : '📋'}
                    {' '}{item.type?.replace('_', ' ')}
                    {item.platform ? ` (${item.platform})` : ''}
                  </div>
                  {days.map((day, dayIdx) => {
                    const isCreated = dayIdx === createdIdx;
                    const isScheduled = dayIdx === scheduledIdx;

                    return (
                      <div key={dayIdx} className={`border-l border-slate-800/50 px-0.5 py-0.5 ${day.isToday ? 'bg-indigo-950/10' : ''}`}>
                        {isCreated && (
                          <div className={`${STATUS_COLORS[item.status]} rounded text-white text-[9px] text-center py-0.5 px-1 truncate`}>
                            {item.status}
                          </div>
                        )}
                        {isScheduled && !isCreated && (
                          <div className="bg-slate-700 border border-slate-600 rounded text-slate-300 text-[9px] text-center py-0.5 px-1 truncate">
                            Publish
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
