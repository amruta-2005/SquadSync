import React from 'react';
import { Info, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Button from './Button';

export default function DemoDataBanner() {
  const { isDemoMode, setIsDemoMode, backendStatus, checkBackendHealth } = useApp();

  if (!isDemoMode && backendStatus === 'online') {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 font-semibold bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
          Demo Data
        </span>
        <span className="text-amber-800">
          Showing simulated student development metrics for demonstration. Data does not reflect a live repository.
        </span>
      </div>

      <div className="flex items-center gap-2">
        {backendStatus === 'online' ? (
          <Button
            size="sm"
            variant="secondary"
            className="!py-1 !text-xs !bg-white hover:!bg-amber-100/50"
            onClick={() => setIsDemoMode(false)}
          >
            <Wifi className="w-3.5 h-3.5 text-emerald-600 mr-1" />
            Switch to Live Backend
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-amber-700/80 flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              Backend Offline (Port 8000)
            </span>
            <button
              onClick={checkBackendHealth}
              className="text-amber-900 underline hover:text-amber-950 flex items-center gap-1"
              title="Ping http://localhost:8000/api/v1/health"
            >
              <RefreshCw className="w-3 h-3" />
              Re-check
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
