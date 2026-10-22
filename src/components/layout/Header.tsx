import React from 'react';
import { Shield, Activity, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actionButton }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {title || 'Dashboard'}
        </h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {actionButton}

        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Backend Connected</span>
        </div>

        {/* Notifications Icon */}
        <button
          title="System Notifications"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        <div className="h-5 w-px bg-slate-200" />

        {/* Role Pill */}
        <Badge variant="purple" dot className="font-bold">
          <Shield className="w-3 h-3 mr-1 text-brand-600" />
          {user?.role?.toUpperCase() || 'SUPER_ADMIN'}
        </Badge>
      </div>
    </header>
  );
};
