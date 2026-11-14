import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101735] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#00C8FF] animate-spin" />
        <p className="text-sm text-[#8CEBFF] font-medium tracking-wide">
          Verifying CampusBridge Security Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardRoutes = {
      student: '/student/dashboard',
      instructor: '/instructor/dashboard',
      coordinator: '/coordinator/dashboard',
      admin: '/admin/dashboard',
    };

    const targetDashboard = dashboardRoutes[user.role] || '/';

    return (
      <div className="min-h-screen bg-[#101735] text-[#F5F8FC] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#1C2948]/70 border border-red-500/30 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Access Restricted</h2>
            <p className="text-sm text-[#8CEBFF]/80">
              Your account has the role <span className="font-semibold text-[#00C8FF] uppercase">[{user.role}]</span>. 
              This section is reserved for <span className="font-semibold text-white uppercase">[{allowedRoles.join(', ')}]</span>.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to={targetDashboard}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-90 shadow-glow-cyan-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Your Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
