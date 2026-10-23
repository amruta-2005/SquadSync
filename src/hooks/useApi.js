import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Custom hook to fetch data using an apiService method.
 * Handles loading, error, retry, and demo mode flags automatically.
 *
 * @param {Function} fetchFn - Function returning a promise: (teamId, isDemoMode) => Promise<{ data, isDemo }>
 * @param {Array} deps - Additional dependencies to trigger refetch
 */
export function useApi(fetchFn, deps = []) {
  const { selectedTeamId, isDemoMode } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemo, setIsDemo] = useState(isDemoMode);

  const execute = useCallback(async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(selectedTeamId, isDemoMode);
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err) {
      console.error('API Error in useApi:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, isDemoMode, fetchFn, ...deps]);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    isDemo,
    reload: execute
  };
}
