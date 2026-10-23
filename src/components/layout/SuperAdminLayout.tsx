import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ApiErrorBanner } from '../common/ApiErrorBanner';
import { isDevPreview } from '../../features/auth/devPreview';
import { UtilityRail } from './UtilityRail';

export const SuperAdminLayout: React.FC = () => {
  return (
    <div className="relative mx-auto min-h-screen max-w-[1440px] bg-slate-50 font-sans md:my-4 md:min-h-[calc(100vh-32px)] md:w-[calc(100%-36px)]">
      <Header />
      <UtilityRail />
      <main className="w-full px-4 pb-9 pt-8 md:pl-[92px] md:pr-10 md:pt-4">
          {isDevPreview() && <p role="status" className="mb-3 text-right text-[11px] font-semibold text-[#756883] md:absolute md:right-10 md:top-[84px] md:mb-0">Local UI preview · sample data</p>}
          <ApiErrorBanner />
          <Outlet />
      </main>
    </div>
  );
};
