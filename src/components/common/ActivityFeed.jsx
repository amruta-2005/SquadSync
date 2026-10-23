import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertOctagon,
  RefreshCw,
  Calendar,
  Layers
} from 'lucide-react';
import apiService from '../../services/api';
import Card from './Card';
import { useApp } from '../../context/AppContext';

export default function ActivityFeed({ teamId, taskId = null, limit = 10, title = "Recent Team Activity" }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await apiService.getTeamActivities(teamId, taskId);
      setActivities((res.data || []).slice(0, limit));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [teamId, taskId, limit]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const formatTs = (ts) => {
    if (!ts) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - ts);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getActionBadgeColor = (action) => {
    switch (action) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'status_change': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'assigned':
      case 'reassigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'blocked': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'created': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
            <p className="text-[10px] text-slate-400">Verifiable SQLite Event Log</p>
          </div>
        </div>
        <button
          onClick={loadActivities}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          title="Refresh activity feed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading audit events...</div>
      ) : activities.length === 0 ? (
        <div className="py-6 text-center text-slate-400 text-xs italic">
          No team activities recorded yet. Actions like task assignments, status updates, and completions will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-2.5 text-xs hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                {act.user_name ? act.user_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 truncate">
                    {act.user_name}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatTs(act.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  {act.details}
                </p>
                {(act.previous_value || act.new_value) && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    {act.previous_value && <span className="line-through text-slate-400">{act.previous_value}</span>}
                    {act.previous_value && act.new_value && <span>→</span>}
                    {act.new_value && <span className="font-semibold text-purple-700">{act.new_value}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
