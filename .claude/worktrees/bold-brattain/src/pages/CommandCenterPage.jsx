import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, BarChart3, Calendar, Plus, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useCommandCenter } from '@/contexts/CommandCenterContext';
import StatsBar from '@/components/command-center/StatsBar';
import CampaignCard from '@/components/command-center/CampaignCard';
import GanttView from '@/components/command-center/GanttView';
import CalendarView from '@/components/command-center/CalendarView';

const TABS = [
  { id: 'campaigns', label: 'Campaigns', icon: LayoutGrid },
  { id: 'gantt', label: 'Gantt', icon: BarChart3 },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

export default function CommandCenterPage() {
  const navigate = useNavigate();
  const { toggle: toggleChat } = useCommandCenter();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, campaignsRes, calendarRes] = await Promise.all([
        apiFetch('/api/command-center/stats'),
        apiFetch('/api/command-center/campaigns'),
        apiFetch('/api/command-center/calendar')
      ]);

      const [statsData, campaignsData, calData] = await Promise.all([
        statsRes.json(),
        campaignsRes.json(),
        calendarRes.json()
      ]);

      setStats(statsData);
      setCampaigns(campaignsData.campaigns || []);
      setCalendarData(calData);
    } catch (err) {
      console.error('Failed to load Command Center data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll for updates every 10s while building campaigns exist
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Collect all scheduled items for calendar view
  const allScheduledItems = campaigns.flatMap(c =>
    (c.items || []).filter(i => i.scheduled_at)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/studio')}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Studio
            </button>
            <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {stats?.total_campaigns || 0} campaigns · {stats?.total_items || 0} items
            </p>
          </div>
          <button
            onClick={toggleChat}
            className="flex items-center gap-2 bg-[#2C666E] hover:bg-[#3a7a83] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Braindump
          </button>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-200/50 rounded-xl p-1 w-fit mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'campaigns' && (
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200/50">
                <LayoutGrid className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No campaigns yet</p>
                <p className="text-slate-400 text-xs mt-1">Click the chat bubble to braindump your first campaign idea.</p>
              </div>
            ) : (
              campaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onUpdate={fetchData}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'gantt' && (
          <div className="bg-white rounded-xl border border-slate-200/50 p-4">
            <GanttView campaigns={campaigns} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="bg-white rounded-xl border border-slate-200/50 p-4">
            <CalendarView items={allScheduledItems} />
          </div>
        )}
      </div>
    </div>
  );
}
