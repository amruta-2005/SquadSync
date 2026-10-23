import React from 'react';
import { AlertTriangle, RefreshCw, ServerCrash, ExternalLink } from 'lucide-react';
import Button from './Button';
import { useApp } from '../../context/AppContext';

export default function ErrorState({
  title = 'Unable to Load Data',
  message,
  error,
  onRetry,
  className = ''
}) {
  const { isDemoMode, setIsDemoMode, apiBaseUrl } = useApp();

  const isConnectionError = error?.isConnectionError || (error?.message && error.message.includes('fetch'));
  const displayTitle = isConnectionError ? 'FastAPI Backend Offline' : title;
  const displayMessage = message || error?.message || 'An unexpected error occurred while communicating with the server.';

  return (
    <div className={`bg-white rounded-xl border border-rose-200 p-8 text-center max-w-xl mx-auto my-8 shadow-sm ${className}`}>
      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
        {isConnectionError ? <ServerCrash className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{displayTitle}</h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">{displayMessage}</p>

      {isConnectionError && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-6 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Connection Details:</p>
          <p>Target API: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-800">{apiBaseUrl}</code></p>
          <p className="text-slate-500">Run the FastAPI backend with: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-purple-700">uvicorn main:app --reload --port 8000</code></p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button variant="primary" icon={RefreshCw} onClick={onRetry}>
            Retry Request
          </Button>
        )}
        {!isDemoMode && (
          <Button
            variant="secondary"
            onClick={() => {
              setIsDemoMode(true);
              if (onRetry) onRetry();
            }}
          >
            Explore with Demo Data
          </Button>
        )}
      </div>
    </div>
  );
}
