import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { UtilityRail } from './UtilityRail';
import { AdminsDrawer } from '../../features/admins';
import { AcademicTermsDrawer } from '../academic-terms/AcademicTermsDrawer';

export const SuperAdminLayout: React.FC = () => {
  const [isAdminsDrawerOpen, setIsAdminsDrawerOpen] = useState(false);
  const [isTermsDrawerOpen, setIsTermsDrawerOpen] = useState(false);

  useEffect(() => {
    const handleOpenAdmins = () => setIsAdminsDrawerOpen(true);
    const handleOpenTerms = () => setIsTermsDrawerOpen(true);

    window.addEventListener('presnt:open-admins-drawer', handleOpenAdmins);
    window.addEventListener('presnt:open-academic-terms-drawer', handleOpenTerms);
    window.addEventListener('presnt:open-academic-terms-modal', handleOpenTerms);

    return () => {
      window.removeEventListener('presnt:open-admins-drawer', handleOpenAdmins);
      window.removeEventListener('presnt:open-academic-terms-drawer', handleOpenTerms);
      window.removeEventListener('presnt:open-academic-terms-modal', handleOpenTerms);
    };
  }, []);

  return (
    <div className="relative mx-auto min-h-screen max-w-[1440px] bg-slate-50 font-sans md:my-4 md:min-h-[calc(100vh-32px)] md:w-[calc(100%-36px)]">
      <Header />
      <UtilityRail />
      <main className="w-full px-4 pb-9 pt-8 md:pl-[92px] md:pr-10 md:pt-4">
        <Outlet />
      </main>

      <AdminsDrawer
        isOpen={isAdminsDrawerOpen}
        onClose={() => setIsAdminsDrawerOpen(false)}
      />

      <AcademicTermsDrawer
        isOpen={isTermsDrawerOpen}
        onClose={() => setIsTermsDrawerOpen(false)}
      />
    </div>
  );
};
