import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, AlertTriangle, Info, RotateCcw } from 'lucide-react';

export type ToastType = 'success' | 'delete' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastState {
  id: string;
  message: string;
  type: ToastType;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastContextValue {
  showToast: (message: string, options?: ToastType | ToastOptions) => void;
  success: (message: string, actionLabel?: string, onAction?: () => void) => void;
  error: (message: string, actionLabel?: string, onAction?: () => void) => void;
  warning: (message: string, actionLabel?: string, onAction?: () => void) => void;
  info: (message: string, actionLabel?: string, onAction?: () => void) => void;
  dismissToast: () => void;
}

// Global Imperative Listener
type ToastListener = (state: ToastState | null, duration?: number) => void;
let globalListener: ToastListener | null = null;

export const toast = {
  show: (message: string, options?: ToastType | ToastOptions) => {
    const opts: ToastOptions =
      typeof options === 'string' ? { type: options } : options || {};
    const type = opts.type || 'success';
    const duration = opts.duration ?? 3500;
    if (globalListener) {
      globalListener(
        {
          id: Math.random().toString(),
          message,
          type,
          actionLabel: opts.actionLabel,
          onAction: opts.onAction,
        },
        duration
      );
    }
  },
  success: (message: string, actionLabel?: string, onAction?: () => void) => {
    toast.show(message, { type: 'success', actionLabel, onAction });
  },
  error: (message: string, actionLabel?: string, onAction?: () => void) => {
    toast.show(message, { type: 'error', actionLabel, onAction });
  },
  warning: (message: string, actionLabel?: string, onAction?: () => void) => {
    toast.show(message, { type: 'warning', actionLabel, onAction });
  },
  info: (message: string, actionLabel?: string, onAction?: () => void) => {
    toast.show(message, { type: 'info', actionLabel, onAction });
  },
  dismiss: () => {
    if (globalListener) globalListener(null);
  },
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeToast, setActiveToast] = useState<ToastState | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastType | ToastOptions) => {
      toast.show(message, options);
    },
    []
  );

  const success = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      toast.success(message, actionLabel, onAction);
    },
    []
  );

  const error = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      toast.error(message, actionLabel, onAction);
    },
    []
  );

  const warning = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      toast.warning(message, actionLabel, onAction);
    },
    []
  );

  const info = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      toast.info(message, actionLabel, onAction);
    },
    []
  );

  useEffect(() => {
    globalListener = (nextToast, duration = 3500) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setActiveToast(nextToast);

      if (nextToast && duration > 0) {
        timerRef.current = setTimeout(() => {
          setActiveToast(null);
          timerRef.current = null;
        }, duration);
      }
    };

    return () => {
      globalListener = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value: ToastContextValue = {
    showToast,
    success,
    error,
    warning,
    info,
    dismissToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {activeToast &&
        createPortal(
          <div
            className={`fixed bottom-6 left-6 z-[1000] flex items-center gap-2.5 rounded-full px-5 py-3 shadow-2xl text-white animate-in slide-in-from-bottom-4 duration-200 ${
              activeToast.type === 'error'
                ? 'bg-[#EF3340]'
                : activeToast.type === 'warning'
                ? 'bg-[#F59E0B]'
                : activeToast.type === 'info'
                ? 'bg-[#3B82F6]'
                : 'bg-[#17B556]'
            }`}
          >
            {activeToast.type === 'error' ? (
              <X className="h-4 w-4 shrink-0 text-white stroke-[2.5]" />
            ) : activeToast.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-white stroke-[2.5]" />
            ) : activeToast.type === 'info' ? (
              <Info className="h-4 w-4 shrink-0 text-white stroke-[2.5]" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-white stroke-[2.5]" />
            )}

            <span className="text-xs font-semibold leading-tight text-white whitespace-nowrap">
              {activeToast.message}
            </span>

            {activeToast.actionLabel && activeToast.onAction && (
              <button
                type="button"
                onClick={() => {
                  activeToast.onAction?.();
                  dismissToast();
                }}
                className="ml-2 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30 active:scale-95 transition-all shadow-2xs"
              >
                <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                {activeToast.actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={dismissToast}
              className="ml-1 p-1 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
