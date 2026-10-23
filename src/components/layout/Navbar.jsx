import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  ShieldAlert,
  LogOut,
  User,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthProvider';
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

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

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

  const handleSignOut = async () => {
    setShowUserDropdown(false);
    await logout();
    addToast('You have been signed out.', 'info');
    navigate('/login', { replace: true });
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

        {/* Right: Backend Status & Actions & User Profile */}
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

          {/* User Profile Menu or Sign In CTA */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                aria-label="User account menu"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0) || 'U'
                  )}
                </div>
                <div className="text-left hidden sm:block pr-1">
                  <span className="text-xs font-bold text-slate-900 block leading-tight max-w-[110px] truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-purple-700 font-medium block leading-tight truncate">
                    {user.role || 'Member'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>

              {showUserDropdown && (
                <div
                  className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in-50 duration-150"
                  onClick={() => setShowUserDropdown(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[10px]">
                      {user.role}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/settings"
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      Settings & Thresholds
                    </Link>
                    <Link
                      to="/data-sources"
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Data Sources & Sync
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="primary">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
