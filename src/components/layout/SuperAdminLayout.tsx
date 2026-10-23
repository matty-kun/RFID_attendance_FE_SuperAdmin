import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ApiErrorBanner } from '../common/ApiErrorBanner';
import { isDevPreview } from '../../features/auth/devPreview';

export const SuperAdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-7">
          {isDevPreview() && <p role="status" className="mb-5 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-brand-700">Local UI preview · overview numbers are sample data. API actions require a real Super Admin login.</p>}
          <ApiErrorBanner />
          <Outlet />
      </main>
    </div>
  );
};
