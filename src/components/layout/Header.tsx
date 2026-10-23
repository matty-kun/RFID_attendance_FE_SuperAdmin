import { NavLink } from 'react-router-dom';
import { CalendarDays, ClipboardList, GraduationCap, LayoutDashboard, LogOut, MapPin, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../features/auth';
import { cn } from '../../utils/cn';

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Events', path: '/events', icon: CalendarDays },
  { name: 'Sessions', path: '/sessions', icon: ClipboardList },
  { name: 'Attendance', path: '/attendance', icon: ShieldCheck },
  { name: 'Locations', path: '/locations', icon: MapPin },
  { name: 'Students', path: '/students', icon: GraduationCap },
  { name: 'Staff', path: '/admins', icon: Users },
] as const;

export function Header() {
  const { user, logout } = useAuth();

  return <header className="border-b border-slate-200 bg-slate-50/95 px-4 py-4 sm:px-7">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
      <NavLink to="/overview" className="text-[22px] font-extrabold leading-none text-slate-900">Presnt</NavLink>
      <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 sm:order-2 sm:w-auto">
        {navigation.map(({ name, path, icon: Icon }) => <NavLink
          key={path}
          to={path}
          title={name}
          aria-label={name}
          className={({ isActive }) => cn(
            'flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[12px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-700',
            isActive ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <Icon className="h-4 w-4" />
          <span className={name === 'Overview' ? '' : 'sr-only lg:not-sr-only'}>{name}</span>
        </NavLink>)}
      </nav>
      <div className="order-2 flex items-center gap-2 sm:order-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-700" title={user?.name || 'Super Admin'}>
          {user?.name?.slice(0, 2).toUpperCase() || 'SA'}
        </span>
        <button type="button" onClick={logout} title="Sign out" aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-700">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  </header>;
}
