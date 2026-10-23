import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import { DEMO_TEAMS } from '../services/demoData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [teams, setTeams] = useState(DEMO_TEAMS);
  const [selectedTeamId, setSelectedTeamId] = useState('team-alpha');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  const [isDemoMode, setIsDemoMode] = useState(true); // Default to true if offline, switchable
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

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus('checking');
    try {
      await apiService.getHealth();
      setBackendStatus('online');
      // If backend is online and we haven't manually locked demo mode, fetch real teams
      try {
        const res = await apiService.getTeams(false);
        if (res && res.data && res.data.length > 0) {
          setTeams(res.data);
          if (!res.data.find(t => t.id === selectedTeamId)) {
            setSelectedTeamId(res.data[0].id);
          }
        }
      } catch {
        // keep demo teams
      }
    } catch {
      setBackendStatus('offline');
      // When backend is offline, default to demo mode so user can see real functionality
      setIsDemoMode(true);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const selectedTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || {
    id: 'team-alpha',
    name: 'Team Alpha — DevPulse (Senior Capstone)',
    repo_name: 'squadsync-org/devpulse-capstone'
  };

  const value = {
    teams,
    selectedTeamId,
    selectedTeam,
    setSelectedTeamId,
    backendStatus,
    isDemoMode,
    setIsDemoMode,
    apiBaseUrl: apiService.getBaseUrl(),
    checkBackendHealth,
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
