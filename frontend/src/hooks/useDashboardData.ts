import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardService } from '../services/dashboardService';
import { getApiErrorMessage } from '../lib/apiClient';
import type { DashboardData } from '../types/dashboard';

const AUTO_REFRESH_MS = 5 * 60 * 1000;

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const load = useCallback(async () => {
    if (isFirstLoad.current) setIsLoading(true);
    try {
      const result = await dashboardService.get();
      setData(result);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load dashboard data'));
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  return { data, isLoading, error, refresh: load };
};
