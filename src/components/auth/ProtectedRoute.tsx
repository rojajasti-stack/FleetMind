import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bus } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

/**
 * Guard for protected dashboard screens with RBAC authorization check.
 * Redirects unauthenticated users to /login and unauthorized users to /access-denied.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, loading, profile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08111F] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse mb-4">
          <Bus className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00C2FF] animate-ping" />
          <span className="text-xs font-semibold text-slate-300">Verifying session credentials & role...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-Based Authorization Check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile?.role || 'Guest';
    // Super Admin always inherits all permissions
    const isAuthorized = userRole === 'Super Admin' || allowedRoles.includes(userRole);
    if (!isAuthorized) {
      return (
        <Navigate
          to="/access-denied"
          state={{ requiredRoles: allowedRoles, attemptedPath: location.pathname }}
          replace
        />
      );
    }
  }

  return <Outlet />;
};

/**
 * Guard for login/register pages.
 * Redirects already authenticated operators to the main dashboard.
 */
export const PublicOnlyRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
