import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ApiErrorBanner } from '../common/ApiErrorBanner';

export const SuperAdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-7">
          <ApiErrorBanner />
          <Outlet />
      </main>
    </div>
  );
};
