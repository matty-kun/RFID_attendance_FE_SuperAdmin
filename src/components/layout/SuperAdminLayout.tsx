import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ApiErrorBanner } from '../common/ApiErrorBanner';

export const SuperAdminLayout: React.FC = () => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Executive Overview', subtitle: 'Live event attendance and active RFID kiosk status' };
      case '/events':
        return { title: 'Events Management', subtitle: 'Configure campus events, sports fests, and intramurals' };
      case '/sessions':
        return { title: 'Attendance Sessions', subtitle: 'Manage morning and afternoon scan time windows' };
      case '/locations':
        return { title: 'Kiosks & Venues', subtitle: 'Hardware attendance check-in locations and gates' };
      case '/admins':
        return { title: 'Marshals & Admins', subtitle: 'Super Admin access control and officer assignments' };
      case '/scans':
        return { title: 'Live RFID Scans', subtitle: 'Real-time tap-in/tap-out audit trail' };
      case '/reports':
        return { title: 'Attendance Reports', subtitle: 'Analytics, student rate logs, and data exports' };
      case '/settings':
        return { title: 'System Settings', subtitle: 'Backend API connection and platform configurations' };
      default:
        return { title: 'Super Admin', subtitle: 'Management portal' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-8 overflow-y-auto">
          <ApiErrorBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
