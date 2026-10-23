import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, ChartNoAxesColumn, ClipboardList, LayoutGrid, LogOut, MapPin, Search, UsersRound } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../features/auth';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutGrid },
  { name: 'Events', path: '/events', icon: ClipboardList },
  { name: 'Sessions', path: '/sessions', icon: CalendarDays },
  { name: 'Locations', path: '/locations', icon: MapPin },
  { name: 'Attendance', path: '/attendance', icon: ChartNoAxesColumn },
  { name: 'Students', path: '/students', icon: UsersRound },
  { name: 'Staff', path: '/admins', icon: UsersRound },
] as const;

export function Header() {
  const pagesDialog = useRef<HTMLDialogElement>(null);
  const { logout } = useAuth();

  return <header className="relative flex min-h-[84px] flex-wrap items-center justify-between gap-2 pl-7 pr-11 py-3 md:flex-nowrap">
    <NavLink to="/overview" className="z-10 text-[22px] font-extrabold leading-none text-[#24133F]">Presnt</NavLink>

    <nav aria-label="Main navigation" className="order-3 flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-[#F2F1F5] p-1.5 md:absolute md:left-[calc(50%+32px)] md:order-2 md:-translate-x-1/2">
      {navigation.map(({ name, path, icon: Icon }) => <NavLink
        key={path}
        to={path}
        title={name}
        aria-label={name}
        className={({ isActive }) => cn(
          'flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-700',
          isActive ? 'border-slate-200 bg-white text-[#24133F]' : 'border-transparent bg-white text-[#756883] hover:text-brand-700'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {name === 'Overview' && <span>Overview</span>}
      </NavLink>)}
    </nav>

    <div className="z-10 flex items-center gap-2">
      <button type="button" onClick={logout} aria-label="Sign out" title="Sign out" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0EB] bg-white text-[#756883] md:hidden"><LogOut className="h-4 w-4" /></button>
      <button type="button" onClick={() => pagesDialog.current?.showModal()} aria-label="Find a page" title="Find a page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E0EB] bg-white text-[#756883] hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700">
        <Search className="h-4 w-4" />
      </button>
    </div>

    <dialog ref={pagesDialog} aria-labelledby="pages-title" className="w-[min(420px,calc(100%-32px))] rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 backdrop:bg-[#24133F]/40">
      <h2 id="pages-title" className="text-lg font-extrabold">Go to page</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {navigation.map(({ name, path, icon: Icon }) => <NavLink key={path} to={path} onClick={() => pagesDialog.current?.close()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:border-brand-700">
          <Icon className="h-4 w-4 text-brand-700" />{name}
        </NavLink>)}
      </div>
      <button type="button" onClick={() => pagesDialog.current?.close()} className="mt-5 text-sm font-bold text-brand-700">Close</button>
    </dialog>
  </header>;
}
