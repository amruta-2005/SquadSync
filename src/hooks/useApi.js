import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Custom hook to fetch data using an apiService method.
 * Handles loading, error, retry, and demo mode flags automatically.
 * Uses a ref for fetchFn to prevent infinite re-render loops when inline functions are passed.
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

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const execute = useCallback(async () => {
    if (!selectedTeamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFnRef.current(selectedTeamId, isDemoMode);
      setData(res.data);
      setIsDemo(!!res.isDemo);
    } catch (err) {
      console.error('API Error in useApi:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, isDemoMode, ...deps]);

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
