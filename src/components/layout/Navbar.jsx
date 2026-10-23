import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GitPullRequest,
  RefreshCw,
  Wifi,
  WifiOff,
  ChevronDown,
  Layers,
  Menu,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';
import Badge from '../common/Badge';
import apiService from '../../services/api';

export default function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen }) {
  const {
    teams,
    selectedTeamId,
    selectedTeam,
    setSelectedTeamId,
    backendStatus,
    isDemoMode,
    setIsDemoMode,
    checkBackendHealth,
    addToast
  } = useApp();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const location = useLocation();

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiService.triggerSync(selectedTeamId, isDemoMode);
      addToast(res.message || 'Data synchronization triggered successfully!', 'success');
    } catch (err) {
      addToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-purple-700 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
                SquadSync
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                  Analytics
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block leading-none">
                Git & Task Imbalance Spotter
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Team Selector */}
        <div className="relative">
          <button
            onClick={() => setShowTeamDropdown(!showTeamDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <span className="text-slate-400">Team:</span>
            <span className="text-slate-900 font-semibold max-w-[140px] sm:max-w-[200px] truncate">
              {selectedTeam?.name || 'Select Team'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showTeamDropdown && (
            <div
              className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in-50 duration-150"
              onClick={() => setShowTeamDropdown(false)}
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Monitored Teams
              </div>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 transition-colors flex items-center justify-between ${
                    team.id === selectedTeamId ? 'bg-purple-50/70 font-semibold text-purple-900' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{team.name}</span>
                  {team.id === selectedTeamId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Backend Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Backend Status indicator */}
          <div className="hidden md:flex items-center gap-2">
            {backendStatus === 'online' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Backend Online
              </span>
            ) : backendStatus === 'checking' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                Checking API...
              </span>
            ) : (
              <button
                onClick={checkBackendHealth}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition-colors"
                title="Click to re-ping FastAPI backend"
              >
                <WifiOff className="w-3 h-3 text-amber-600" />
                Backend Offline
              </button>
            )}
          </div>

          {/* Sync Trigger button */}
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            loading={isSyncing}
            onClick={handleTriggerSync}
            title="Trigger analysis sync for current team"
            className="hidden sm:inline-flex"
          >
            Sync Data
          </Button>

          {/* Connect Repo CTA shortcut */}
          <Link to="/data-sources">
            <Button size="sm" variant="primary">
              Connect Repo
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
