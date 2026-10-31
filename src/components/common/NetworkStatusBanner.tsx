import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Wifi, Loader2, RefreshCw, X } from 'lucide-react';

export type NetworkCondition = 'online' | 'offline' | 'slow';

export const NetworkStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<NetworkCondition>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissedSlow, setDismissedSlow] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleOnline = useCallback(() => {
    clearHideTimer();
    setStatus((prev) => {
      if (prev === 'offline' || prev === 'slow') {
        setWasOffline(true);
        hideTimerRef.current = setTimeout(() => {
          setWasOffline(false);
        }, 3000);
      }
      return 'online';
    });
    setDismissedSlow(false);
    setIsRetrying(false);
  }, []);

  const handleOffline = useCallback(() => {
    clearHideTimer();
    setWasOffline(false);
    setStatus('offline');
    setDismissedSlow(false);
  }, []);

  const handleSlow = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'offline') return prev;
      return 'slow';
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const onCustomOnline = () => handleOnline();
    const onCustomOffline = () => handleOffline();
    const onCustomSlow = () => handleSlow();

    window.addEventListener('presnt:network-online', onCustomOnline);
    window.addEventListener('presnt:network-offline', onCustomOffline);
    window.addEventListener('presnt:network-slow', onCustomSlow);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('presnt:network-online', onCustomOnline);
      window.removeEventListener('presnt:network-offline', onCustomOffline);
      window.removeEventListener('presnt:network-slow', onCustomSlow);
      clearHideTimer();
    };
  }, [handleOnline, handleOffline, handleSlow]);

  const checkConnection = async () => {
    setIsRetrying(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');
      const res = await fetch(`${rootUrl}/health`, {
        cache: 'no-store',
        method: 'GET',
      });
      if (res.ok) {
        handleOnline();
      } else {
        handleOffline();
      }
    } catch {
      handleOffline();
    } finally {
      setIsRetrying(false);
    }
  };

  // If online and wasn't recently offline, or slow was dismissed, render nothing
  if (status === 'online' && !wasOffline) return null;
  if (status === 'slow' && dismissedSlow) return null;

  return (
    <aside
      aria-label="Network status banner"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {status === 'offline' && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-[#24133F] px-4 py-3 text-white shadow-2xl backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
            <WifiOff className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>You're currently offline</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            </p>
            <p className="text-[11px] text-purple-200/80 leading-snug">
              Showing cached records. Database edits & live card scan sync will resume when connection returns.
            </p>
          </div>
          <button
            type="button"
            onClick={checkConnection}
            disabled={isRetrying}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
          </button>
        </div>
      )}

      {status === 'slow' && !dismissedSlow && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-[#24133F] px-4 py-3 text-white shadow-2xl backdrop-blur-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-bold text-amber-300">Slow connection detected</p>
            <p className="text-[11px] text-purple-200/80 leading-snug">
              Requests are taking longer than usual. Still loading latest data in background...
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSlow(true)}
            className="rounded-lg p-1 text-purple-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'online' && wasOffline && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/95 px-4 py-2.5 text-emerald-100 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Wifi className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold">
            <span className="font-bold text-white">Back online!</span> Connection restored. Syncing latest data...
          </p>
        </div>
      )}
    </aside>
  );
};

export default NetworkStatusBanner;
