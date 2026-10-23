import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { DEMO_TEAMS } from '../services/demoData';
import { useAuth } from '../auth/AuthProvider';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [teams, setTeams] = useState([
    {
      id: 'team-alpha',
      name: 'Workspace — Repository',
      repo_name: 'No Repository Connected',
      academic_term: 'Active Project',
      is_configured: false,
      members_count: 0
    }
  ]);
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    return localStorage.getItem('squadsync_selected_team') || 'team-bcab3190';
  });
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [isDemoMode, setIsDemoMode] = useState(false); // Default to live mode!
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSetSelectedTeamId = useCallback((id) => {
    setSelectedTeamId(id);
    if (id) {
      localStorage.setItem('squadsync_selected_team', id);
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    try {
      const res = await apiService.getTeams(false);
      if (res && res.data && res.data.length > 0) {
        setTeams(res.data);
        setSelectedTeamId(prev => {
          if (res.data.some(t => t.id === prev)) {
            localStorage.setItem('squadsync_selected_team', prev);
            return prev;
          }
          const saved = localStorage.getItem('squadsync_selected_team');
          if (saved && res.data.some(t => t.id === saved)) {
            return saved;
          }
          const squadsync = res.data.find(t => t.id === 'team-bcab3190');
          const chosen = squadsync ? squadsync.id : res.data[0].id;
          localStorage.setItem('squadsync_selected_team', chosen);
          return chosen;
        });
      }
    } catch {
      // keep existing
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus('checking');
    try {
      await apiService.getHealth();
      setBackendStatus('online');
      if (isAuthenticated) {
        await refreshTeams();
      }
    } catch {
      setBackendStatus('offline');
    }
  }, [refreshTeams, isAuthenticated]);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  // Synchronize teams whenever authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshTeams();
    }
  }, [isAuthenticated, user?.id, refreshTeams]);

  useEffect(() => {
    if (isDemoMode) {
      setTeams(DEMO_TEAMS);
    } else if (isAuthenticated) {
      refreshTeams();
    }
  }, [isDemoMode, isAuthenticated, refreshTeams]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || {
    id: 'team-alpha',
    name: 'Workspace — Repository',
    repo_name: 'No Repository Connected'
  };

  const value = {
    teams,
    selectedTeamId,
    selectedTeam,
    setSelectedTeamId: handleSetSelectedTeamId,
    backendStatus,
    isDemoMode,
    setIsDemoMode,
    apiBaseUrl: apiService.getBaseUrl(),
    checkBackendHealth,
    refreshTeams,
    toasts,
    addToast,
    removeToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
