import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Wifi, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from '../../context';

export type NetworkCondition = 'online' | 'offline' | 'slow';

export const NetworkStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<NetworkCondition>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [dismissedSlow, setDismissedSlow] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleOffline = useCallback(() => {
    clearHideTimer();
    setWasOffline(false);
    setStatus('offline');
    setDismissedSlow(false);
    setDismissedOffline(false);
  }, []);

  const handleOnline = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
      return;
    }

    // Ping external endpoint to verify genuine internet connectivity (not local loopback)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
    } catch {
      handleOffline();
      return;
    }

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
    setDismissedOffline(false);
    setIsRetrying(false);
  }, [handleOffline]);

  const handleSlow = useCallback(() => {
    setStatus((prev) => {
      if (prev === 'offline') return prev;
      return 'slow';
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const onCustomOnline = () => void handleOnline();
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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline');
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);

      // Verify external internet reachability
      await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);

      await handleOnline();
    } catch {
      handleOffline();
      toast.error('Still offline. Please check your Wi-Fi or internet connection.');
    } finally {
      setIsRetrying(false);
    }
  };

  if (status === 'online' && !wasOffline) return null;
  if (status === 'slow' && dismissedSlow) return null;
  if (status === 'offline' && dismissedOffline) return null;

  return (
    <aside
      aria-label="Network status banner"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {status === 'offline' && (
        <div
          style={{ backgroundColor: '#FFFFFF', borderColor: '#FCA5A5' }}
          className="flex items-center gap-3.5 rounded-2xl border bg-white px-4 py-3 text-[#24133F] shadow-[0_8px_30px_rgba(36,19,63,0.12)]"
        >
          <div
            style={{ backgroundColor: '#FDE8EA', borderColor: '#FCA5A5' }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[#EF3340]"
          >
            <WifiOff className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-bold text-[#24133F] flex items-center gap-1.5">
              <span>You're currently offline</span>
              <span className="inline-block h-2 w-2 rounded-full bg-[#EF3340]"></span>
            </p>
            <p className="text-[11px] text-[#756883] leading-snug mt-0.5">
              Showing cached records. Database edits & live card scan sync will resume when connection returns.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={checkConnection}
              disabled={isRetrying}
              style={{ backgroundColor: '#FAF8FC', borderColor: '#E5E0EB', color: '#24133F' }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold hover:bg-purple-50 hover:border-[#7026B7] active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#756883] ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissedOffline(true)}
              className="rounded-lg p-1.5 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {status === 'slow' && !dismissedSlow && (
        <div
          style={{ backgroundColor: '#FFFFFF', borderColor: '#FDE68A' }}
          className="flex items-center gap-3.5 rounded-2xl border bg-white px-4 py-3 text-[#24133F] shadow-[0_8px_30px_rgba(36,19,63,0.12)]"
        >
          <div
            style={{ backgroundColor: '#FFF3D8', borderColor: '#FDE68A' }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[#F59E0B]"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-bold text-[#24133F]">Slow connection detected</p>
            <p className="text-[11px] text-[#756883] leading-snug mt-0.5">
              Requests are taking longer than usual. Still loading latest data in background...
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSlow(true)}
            className="rounded-lg p-1.5 text-[#756883] hover:bg-slate-100 hover:text-[#24133F] transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {status === 'online' && wasOffline && (
        <div
          style={{ backgroundColor: '#FFFFFF', borderColor: '#A7F3D0' }}
          className="flex items-center gap-2.5 rounded-2xl border bg-white px-4 py-2.5 text-[#24133F] shadow-[0_8px_30px_rgba(36,19,63,0.12)] animate-in fade-in slide-in-from-top-1"
        >
          <div
            style={{ backgroundColor: '#E4F7EB', borderColor: '#A7F3D0' }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[#17B556]"
          >
            <Wifi className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs font-semibold text-[#24133F]">
            <span className="font-bold text-[#17B556]">Back online!</span> Connection restored. Syncing latest data...
          </p>
        </div>
      )}
    </aside>
  );
};

export default NetworkStatusBanner;
