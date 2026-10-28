import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../features/auth';
import { DeleteConfirmationModal } from '../common/DeleteConfirmationModal';
import hawiWavingImg from '../../assets/illustrations/Hawi Waving.png';

type Panel = 'account' | 'notifications';

export function UtilityRail() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>('account');
  const [isOpen, setIsOpen] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
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
      if (targetPanel === 'notifications' || targetPanel === 'account') {
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
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer active:scale-90 active:translate-y-[1px] ${
            isOpen && panel === 'notifications'
              ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-300'
              : 'border-slate-200 bg-white text-[#756883] hover:text-brand-700 hover:border-brand-300'
          }`}
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Manage Admins Button (In line with notifications and profile) */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            window.dispatchEvent(new CustomEvent('presnt:open-admins-drawer'));
          }}
          aria-label="Manage Admins"
          title="Manage Admins"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#756883] hover:text-[#7026B7] hover:border-[#7026B7]/40 active:scale-90 active:translate-y-[1px] transition-all cursor-pointer"
        >
          <Shield className="h-4 w-4" />
        </button>

        {/* Account Avatar Button */}
        <button
          type="button"
          onClick={() => toggle('account')}
          aria-label="Account profile"
          title={user?.name || 'Account'}
          className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 transition-all cursor-pointer active:scale-90 active:translate-y-[1px] ${
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
          className={`fixed left-[92px] z-50 w-[270px] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl shadow-[#24133F]/10 animate-in fade-in zoom-in-95 duration-150 text-[#24133F] ${
            panel === 'account' ? 'bottom-7' : 'bottom-[112px]'
          }`}
        >
          {panel === 'account' ? (
            <div className="space-y-2">
              {/* Header with Avatar, Name, Email */}
              <div className="flex items-center gap-2.5 min-w-0 pb-2.5 border-b border-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DFE8F8] text-[#294B85] font-extrabold text-xs">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-[#24133F] truncate">{user?.name || 'Administrator'}</p>
                    <span className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold bg-[#F4EFFB] text-[#7026B7] border border-[#E9D5FF]/60">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-[#756883] truncate mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Sign Out Action Row */}
              <button
                type="button"
                onClick={() => setIsSignOutConfirmOpen(true)}
                className="flex w-full items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50/80 active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100/60 text-rose-600 group-hover:bg-rose-100 transition-colors">
                  <LogOut className="h-3.5 w-3.5" />
                </div>
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Notifications Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-[#24133F]">Notifications</span>
              </div>

              <div className="py-3 px-2 text-center">
                <p className="text-xs font-bold text-[#24133F]">No new notifications</p>
                <p className="text-[11px] text-[#756883] mt-0.5">
                  System logs and attendance alerts will appear here in real time.
                </p>
              </div>
            </div>
          )}

          {/* Pointer tail pointing left directly at the active trigger button */}
          <div className="absolute -left-1.5 bottom-3.5 h-3 w-3 rotate-45 border-b border-l border-slate-200/90 bg-white pointer-events-none" />
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isSignOutConfirmOpen}
        onClose={() => setIsSignOutConfirmOpen(false)}
        onConfirm={() => {
          setIsSignOutConfirmOpen(false);
          setIsOpen(false);
          logout();
        }}
        title="Sign Out Confirmation"
        description="Are you sure you want to sign out of your account? You will need to log back in to access the system."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        illustration={hawiWavingImg}
        confirmIcon={<LogOut className="h-3.5 w-3.5" />}
        variant="brand"
      />
    </>
  );
}
