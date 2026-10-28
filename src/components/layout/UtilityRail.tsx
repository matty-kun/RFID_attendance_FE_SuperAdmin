import { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Shield, X } from 'lucide-react';
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
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer shadow-sm ${
            isOpen && panel === 'notifications'
              ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-300'
              : 'border-slate-200 bg-white text-[#756883] hover:text-brand-700 hover:border-brand-300'
          }`}
        >
          <Bell className="h-4 w-4" />
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
          className="fixed bottom-26 left-6 md:left-10 z-50 w-[320px] rounded-3xl border border-[#E5E0EB] bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200 text-[#24133F]"
        >
          {panel === 'account' ? (
            <div className="space-y-4">
              {/* Header with Avatar, Name, Email, and Close X */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-sm border border-brand-200/60">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#24133F] truncate">{user?.name || 'Administrator'}</p>
                    <p className="text-xs text-[#756883] truncate">{user?.email}</p>
                    <span className="mt-0.5 inline-flex items-center rounded-md bg-[#F4EFFB] px-1.5 py-0.5 text-[10px] font-bold text-[#7026B7]">
                      Super Admin
                    </span>
                  </div>
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

              {/* Manage Admins Button */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent('presnt:open-admins-drawer'));
                }}
                className="inline-flex w-full items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#7026B7] bg-[#F4EFFB] hover:bg-[#ECE3F8] transition-colors cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                <span>Manage Admins</span>
              </button>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => setIsSignOutConfirmOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-brand-700" />
                  <span className="text-xs font-bold text-[#24133F]">Notifications</span>
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

              <div className="py-4 px-2 text-center">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-200 mb-2">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-[#24133F]">No new notifications</p>
                <p className="text-[11px] text-[#756883] mt-0.5 max-w-[220px] mx-auto">
                  System logs and attendance alerts will appear here in real time.
                </p>
              </div>
            </div>
          )}

          {/* Chat Bubble Arrow Pointer pointing toward the bottom-left buttons */}
          <div className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 border-b border-r border-[#E5E0EB] bg-white pointer-events-none" />
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
