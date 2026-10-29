import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';

// Domain Page Routes
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { SessionsPage } from './pages/SessionsPage';
import { LocationsPage } from './pages/LocationsPage';
import { AttendancePage } from './pages/AttendancePage';
import { StudentsPage } from './pages/StudentsPage';
import { AdminsPage } from './pages/AdminsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FirstLoginPasswordPage } from './pages/FirstLoginPasswordPage';
import { OverviewPage } from './pages/OverviewPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ReportsPage } from './pages/ReportsPage';
import { CardsPage } from './pages/CardsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
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
              <Route path="/sessions" element={<SessionsPage />} />
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
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
