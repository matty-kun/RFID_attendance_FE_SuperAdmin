import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import hawiFindingImg from '../../assets/illustrations/Hawi Finding.png';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8FC] gap-3">
        <img
          src={hawiFindingImg}
          alt="Loading..."
          className="w-24 h-24 object-contain animate-pulse"
        />
        <p className="text-sm font-bold text-[#24133F]">Verifying Super Admin Authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
};
