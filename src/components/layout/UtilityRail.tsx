import { useEffect, useRef, useState } from 'react';
import { Bell, CircleHelp, Command, LogOut, X } from 'lucide-react';
import { useAuth } from '../../features/auth';

type Panel = 'help' | 'account' | 'notifications';

export function UtilityRail() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>('account');
  const dialog = useRef<HTMLDialogElement>(null);

  const open = (nextPanel: Panel) => {
    setPanel(nextPanel);
    if (!dialog.current?.open) dialog.current?.showModal();
  };

  useEffect(() => {
    const onOpenUtility = (event: Event) => {
      const panel = (event as CustomEvent<string>).detail;
      if (panel === 'help' || panel === 'notifications') open(panel);
    };
    window.addEventListener('presnt:open-utility', onOpenUtility);
    return () => window.removeEventListener('presnt:open-utility', onOpenUtility);
  }, []);

  return <>
    <aside aria-label="Quick actions" className="fixed bottom-8 left-12 z-20 hidden flex-col items-center gap-2.5 md:flex">
      <button type="button" onClick={() => open('notifications')} aria-label="Notifications" title="Notifications" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[#756883] hover:text-brand-700"><Bell className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => open('help')} aria-label="Help" title="Help" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[#756883] hover:text-brand-700"><CircleHelp className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => open('account')} aria-label="Account" title={user?.name || 'Account'} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#DFE8F8] text-[10px] font-extrabold text-[#294B85]">{user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user?.name?.slice(0, 2).toUpperCase() || 'SA'}</button>
    </aside>

    <dialog ref={dialog} aria-labelledby="quick-panel-title" onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }} className="w-[min(420px,calc(100%-32px))] rounded-2xl border border-[#E5E0EB] bg-white p-5 text-[#24133F] shadow-2xl backdrop:bg-[#170D29]/40 backdrop:backdrop-blur-md">
      <div className="flex items-center justify-between gap-4"><h2 id="quick-panel-title" className="text-xl font-extrabold">{panel === 'account' ? 'Account' : panel === 'help' ? 'Help' : 'Notifications'}</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="rounded-lg p-1 text-[#756883] hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      {panel === 'account' ? <>
        <p className="mt-2 text-sm font-semibold">{user?.name}</p>
        <p className="text-xs text-[#756883]">{user?.email}</p>
        <button type="button" onClick={logout} className="mt-5 flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-800"><LogOut className="h-4 w-4" />Sign out</button>
      </> : panel === 'help' ? <div className="mt-5 space-y-4 text-sm text-[#756883]">
        <div className="rounded-xl bg-[#F7F3FB] p-4"><p className="flex items-center gap-2 font-bold text-[#24133F]"><Command className="h-4 w-4" />Find anything</p><p className="mt-1 text-xs">Use Ctrl+K (⌘K on Mac) to search pages, charts, Help, and Notifications.</p></div>
        <div className="rounded-xl bg-[#F7F3FB] p-4"><p className="font-bold text-[#24133F]">Overview charts</p><p className="mt-1 text-xs">Hover or focus a day for scan counts. Select it for a larger breakdown.</p></div>
        <p className="text-xs">For account or system issues, contact IT Services.</p>
      </div> : <div className="mt-5 rounded-xl bg-[#F7F3FB] px-4 py-8 text-center"><Bell className="mx-auto h-7 w-7 text-brand-700" /><p className="mt-3 font-bold">No notifications yet</p><p className="mt-1 text-xs text-[#756883]">System notifications will appear here when available.</p></div>}
    </dialog>
  </>;
}
