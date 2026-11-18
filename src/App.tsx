import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';
import { LoginPage } from './pages/LoginPage';

// Lazy-loaded Domain Page Routes (reduces initial /login bundle size significantly)
const FirstLoginPasswordPage = lazy(() =>
  import('./pages/FirstLoginPasswordPage').then((m) => ({ default: m.FirstLoginPasswordPage }))
);
const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage }))
);
const EventsPage = lazy(() =>
  import('./pages/EventsPage').then((m) => ({ default: m.EventsPage }))
);
const LocationsPage = lazy(() =>
  import('./pages/LocationsPage').then((m) => ({ default: m.LocationsPage }))
);
const AttendancePage = lazy(() =>
  import('./pages/AttendancePage').then((m) => ({ default: m.AttendancePage }))
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const StudentsPage = lazy(() =>
  import('./pages/StudentsPage').then((m) => ({ default: m.StudentsPage }))
);
const CardsPage = lazy(() =>
  import('./pages/CardsPage').then((m) => ({ default: m.CardsPage }))
);
const AdminsPage = lazy(() =>
  import('./pages/AdminsPage').then((m) => ({ default: m.AdminsPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const PageLoader: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E9DCFA] border-t-[#7026B7]" />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NetworkStatusBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<FirstLoginPasswordPage />} />

              {/* Protected Super Admin Tier (Mirrors Backend Domains) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<SuperAdminLayout />}>
                  <Route path="/" element={<Navigate to="/overview" replace />} />
                  <Route path="/overview" element={<OverviewPage />} />
                  <Route path="/audit-log" element={<AuditLogPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/locations" element={<LocationsPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/scans" element={<Navigate to="/audit-log" replace />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/cards" element={<CardsPage />} />
                  <Route path="/admins" element={<AdminsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
