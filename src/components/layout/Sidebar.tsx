import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Radio,
  GraduationCap,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../features/auth';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Sessions', path: '/sessions', icon: Clock },
    { name: 'Locations', path: '/locations', icon: MapPin },
    { name: 'Attendance Records', path: '/attendance', icon: Radio },
    { name: 'Students & RFID', path: '/students', icon: GraduationCap },
    { name: 'Admins & Marshals', path: '/admins', icon: Users },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-900/50">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
            RFID SYSTEM
            <span className="text-[10px] uppercase font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/30">
              SUPER
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Administration Portal</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
          Backend Domains
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center font-black text-xs shrink-0">
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black text-white truncate">{user?.name || 'Super Admin'}</div>
              <div className="text-[10px] text-brand-400 font-semibold truncate capitalize">
                {user?.role?.replace('_', ' ') || 'Super Administrator'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
