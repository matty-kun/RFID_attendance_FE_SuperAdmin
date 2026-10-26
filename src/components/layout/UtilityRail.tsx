import { useEffect, useRef, useState } from 'react';
import { Bell, CircleHelp, Command, LogOut, User, X, Sparkles } from 'lucide-react';
import { useAuth } from '../../features/auth';

type Panel = 'account' | 'notifications' | 'help';

export function UtilityRail() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>('account');
  const [isOpen, setIsOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);

  const toggle = (nextPanel: Panel) => {
    if (isOpen && panel === nextPanel) {
      setIsOpen(false);
    } else {
      setPanel(nextPanel);
      setIsOpen(true);
    }
  };

  // Close when clicking outside both the bubble and the rail
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bubbleRef.current &&
        !bubbleRef.current.contains(target) &&
        railRef.current &&
        !railRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const onOpenUtility = (event: Event) => {
      const targetPanel = (event as CustomEvent<string>).detail;
      if (targetPanel === 'help' || targetPanel === 'notifications' || targetPanel === 'account') {
        setPanel(targetPanel);
        setIsOpen(true);
      }
    };
    window.addEventListener('presnt:open-utility', onOpenUtility);
    return () => window.removeEventListener('presnt:open-utility', onOpenUtility);
  }, []);

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'SA';

  return (
    <>
      {/* Floating Rail in bottom-left */}
      <aside
        ref={railRef}
        aria-label="Quick actions"
        className="fixed bottom-8 left-12 z-40 hidden flex-col items-center gap-2.5 md:flex"
      >
        {/* Notifications Button */}
        <button
          type="button"
          onClick={() => toggle('notifications')}
          aria-label="Notifications"
          title="Notifications"
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer shadow-sm ${
            isOpen && panel === 'notifications'
              ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-300'
              : 'border-slate-200 bg-white text-[#756883] hover:text-brand-700 hover:border-brand-300'
          }`}
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Help Button */}
        <button
          type="button"
          onClick={() => toggle('help')}
          aria-label="Help"
          title="Help & Shortcuts"
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer shadow-sm ${
            isOpen && panel === 'help'
              ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-300'
              : 'border-slate-200 bg-white text-[#756883] hover:text-brand-700 hover:border-brand-300'
          }`}
        >
          <CircleHelp className="h-4 w-4" />
        </button>

        {/* Account Avatar Button */}
        <button
          type="button"
          onClick={() => toggle('account')}
          aria-label="Account profile"
          title={user?.name || 'Account'}
          className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full transition-all cursor-pointer shadow-sm ${
            isOpen && panel === 'account'
              ? 'ring-2 ring-brand-600 ring-offset-2'
              : 'hover:ring-2 hover:ring-brand-300'
          } bg-[#DFE8F8] text-[11px] font-extrabold text-[#294B85]`}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </button>
      </aside>

      {/* Floating Chat Bubble Popover */}
      {isOpen && (
        <div
          ref={bubbleRef}
          role="region"
          aria-label="Quick actions bubble"
          className="fixed bottom-26 left-6 md:left-10 z-50 w-[340px] rounded-3xl border border-[#E5E0EB] bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 text-[#24133F]"
        >
          {/* Top Switcher Tabs + Close */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setPanel('account')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  panel === 'account'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-[#756883] hover:text-[#24133F]'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Account</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel('notifications')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  panel === 'notifications'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-[#756883] hover:text-[#24133F]'
                }`}
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Alerts</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel('help')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  panel === 'help'
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-[#756883] hover:text-[#24133F]'
                }`}
              >
                <CircleHelp className="h-3.5 w-3.5" />
                <span>Help</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close bubble"
              className="rounded-lg p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="pt-3">
            {panel === 'account' && (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-sm border border-brand-200/60">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#24133F] truncate">{user?.name || 'Administrator'}</p>
                      <span className="text-[10px] font-extrabold text-brand-700 bg-brand-50 border border-brand-200/80 px-1.5 py-0.5 rounded-md">
                        Super Admin
                      </span>
                    </div>
                    <p className="text-xs text-[#756883] truncate mt-0.5">{user?.email}</p>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Session Active</span>
                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}

            {panel === 'notifications' && (
              <div className="py-6 px-2 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200 mb-2.5">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-[#24133F]">No new notifications</p>
                <p className="text-[11px] text-[#756883] mt-0.5 max-w-[240px] mx-auto">
                  System logs and attendance alerts will appear here in real time.
                </p>
              </div>
            )}

            {panel === 'help' && (
              <div className="space-y-2 text-xs">
                <div className="rounded-2xl bg-brand-50/60 border border-brand-100/80 p-3">
                  <p className="flex items-center gap-1.5 font-bold text-[#24133F]">
                    <Command className="h-3.5 w-3.5 text-brand-700" />
                    <span>Quick Command Search</span>
                  </p>
                  <p className="text-[11px] text-[#756883] mt-1">
                    Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-[#24133F]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-[#24133F]">K</kbd> anywhere to search pages, sessions, or students.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3">
                  <p className="flex items-center gap-1.5 font-bold text-[#24133F]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>RFID USB Scanners</span>
                  </p>
                  <p className="text-[11px] text-[#756883] mt-1">
                    Readers act as USB keyboards. Open Rapid Scanner or tap directly on any student row to bind.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Chat Bubble Arrow Pointer pointing toward the bottom-left buttons */}
          <div className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 border-b border-r border-[#E5E0EB] bg-white pointer-events-none" />
        </div>
      )}
    </>
  );
}
