import { useRef, useState } from 'react';
import { Bell, CircleHelp, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth';

type Panel = 'help' | 'account';

export function UtilityRail() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>('account');
  const dialog = useRef<HTMLDialogElement>(null);

  const open = (nextPanel: Panel) => {
    setPanel(nextPanel);
    dialog.current?.showModal();
  };

  return <>
    <aside aria-label="Quick actions" className="absolute bottom-12 left-7 hidden flex-col items-center gap-2.5 md:flex">
      <button type="button" disabled aria-label="Notifications unavailable" title="Notifications unavailable" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[#756883]"><Bell className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => open('help')} aria-label="Help" title="Help" className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[#756883] hover:text-brand-700"><CircleHelp className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={() => open('account')} aria-label="Account" title={user?.name || 'Account'} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DFE8F8] text-[10px] font-extrabold text-[#294B85]">{user?.name?.slice(0, 2).toUpperCase() || 'SA'}</button>
    </aside>

    <dialog ref={dialog} aria-labelledby="quick-panel-title" className="w-[min(340px,calc(100%-32px))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 backdrop:bg-[#24133F]/40">
      <h2 id="quick-panel-title" className="text-lg font-extrabold">{panel === 'account' ? 'Account' : 'Help'}</h2>
      {panel === 'account' ? <>
        <p className="mt-2 text-sm font-semibold">{user?.name}</p>
        <p className="text-xs text-slate-500">{user?.email}</p>
        <button type="button" onClick={logout} className="mt-5 flex items-center gap-2 text-sm font-bold text-brand-700"><LogOut className="h-4 w-4" />Sign out</button>
      </> : <p className="mt-2 text-sm text-slate-500">Contact IT Services for account or system help.</p>}
      <button type="button" onClick={() => dialog.current?.close()} className="mt-5 text-sm font-bold text-brand-700">Close</button>
    </dialog>
  </>;
}
