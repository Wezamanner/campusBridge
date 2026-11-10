import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentProfilePage from './pages/student/StudentProfilePage.jsx';
import InstructorDashboard from './pages/instructor/InstructorDashboard.jsx';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

import { 
  GraduationCap, 
  ShieldCheck, 
  Activity, 
  Moon, 
  Sun, 
  Users, 
  BookOpen, 
  Briefcase, 
  ArrowRight,
  Sparkles,
  Server,
  Database,
  LogIn
} from 'lucide-react';

function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [health, setHealth] = useState({ loading: true, data: null, error: null });
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setHealth({ loading: false, data: json, error: null }))
      .catch((err) => setHealth({ loading: false, data: null, error: err.message }));
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/login';
    const routes = {
      student: '/student/dashboard',
      instructor: '/instructor/dashboard',
      coordinator: '/coordinator/dashboard',
      admin: '/admin/dashboard',
    };
    return routes[user.role] || '/login';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#101735] text-[#F5F8FC]' : 'bg-[#F5F8FC] text-[#101735]'
    }`}>
      {/* Top Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between ${
        isDark ? 'border-[#1C2948] bg-[#101735]/80' : 'border-gray-200 bg-white/80'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] flex items-center justify-center shadow-glow-cyan-sm">
            <GraduationCap className="w-6 h-6 text-[#101735]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-[#8CEBFF] to-[#00C8FF] bg-clip-text text-transparent">
              CampusBridge
            </span>
            <span className="block text-xs text-[#00C8FF] font-medium tracking-wider uppercase">
              University Platform
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Switcher */}
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'border-[#1C2948] bg-[#1C2948]/60 text-[#8CEBFF] hover:border-[#00C8FF]' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-[#00C8FF]'
            }`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#00C8FF] text-[#101735] hover:opacity-95 shadow-glow-cyan-sm transition-all"
              >
                <span>Dashboard ({user?.role})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8CEBFF] border border-[#1C2948] hover:border-[#00C8FF] transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan-sm transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-5">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase bg-[#1C2948] text-[#8CEBFF] border border-[#00C8FF]/20 shadow-glow-cyan-sm">
            Turning Ideas into Powerful Solutions
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            Connecting University Learning with Real-World Industry
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base opacity-75 leading-relaxed">
            CampusBridge unifies academic coursework, student projects, assignment grading, and verified corporate internship placements within a secure role-based ecosystem.
          </p>

          <div className="flex items-center justify-center space-x-4 pt-4">
            <Link
              to={isAuthenticated ? getDashboardPath() : '/register'}
              className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan transition-all flex items-center space-x-2"
            >
              <span>{isAuthenticated ? 'Open Your Dashboard' : 'Explore Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl font-semibold text-sm bg-[#1C2948] text-[#8CEBFF] hover:border-[#00C8FF] border border-[#1C2948] transition-all flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>

        {/* Live System Diagnostics */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1C2948]/40 border-[#1C2948] shadow-lg' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-inherit">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-[#00C8FF]" />
              <h2 className="text-base font-bold uppercase tracking-wider">System Health & Live Status</h2>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
              health.loading 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : health.data?.data?.status === 'UP' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {health.loading ? 'Checking...' : health.data?.data?.status === 'UP' ? 'All Systems Operational' : 'Offline / Degraded'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border flex items-center space-x-4 ${
              isDark ? 'bg-[#101735]/70 border-[#1C2948]' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="p-3 rounded-lg bg-[#00C8FF]/10 text-[#00C8FF]">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider opacity-60">Express REST API</p>
                <p className="text-sm font-bold text-[#8CEBFF]">
                  {health.loading ? 'Probing...' : health.error ? 'Unavailable' : 'Port 5001 (/api/v1)'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center space-x-4 ${
              isDark ? 'bg-[#101735]/70 border-[#1C2948]' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider opacity-60">MongoDB / Mongoose</p>
                <p className="text-sm font-bold text-emerald-400 capitalize">
                  {health.loading ? 'Connecting...' : health.data?.data?.database || 'Disconnected'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-center space-x-4 ${
              isDark ? 'bg-[#101735]/70 border-[#1C2948]' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider opacity-60">Authentication & RBAC</p>
                <p className="text-sm font-bold text-indigo-400">
                  Phase 3 Verified (4 Roles)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Role Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#00C8FF]">
              Role-Based Unified Workspaces
            </h3>
            <span className="text-xs opacity-60">Click any role to test protected route guard</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="/student/dashboard" 
              className={`p-5 rounded-2xl border transition-all block ${
                isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <GraduationCap className="w-6 h-6 text-[#00C8FF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#00C8FF]/10 text-[#00C8FF]">
                  Role 1
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Student Area</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Courses, assignments, submissions, internship applications, personal tasks.
              </p>
            </Link>

            <Link 
              to="/instructor/dashboard" 
              className={`p-5 rounded-2xl border transition-all block ${
                isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#8CEBFF]' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="w-6 h-6 text-[#8CEBFF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#8CEBFF]/10 text-[#8CEBFF]">
                  Role 2
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Instructor Area</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Course resources, assignment creation, grading queue, student progress.
              </p>
            </Link>

            <Link 
              to="/coordinator/dashboard" 
              className={`p-5 rounded-2xl border transition-all block ${
                isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-6 h-6 text-[#00C8FF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#00C8FF]/10 text-[#00C8FF]">
                  Role 3
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Coordinator Area</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Course creation, instructor assignment, company partnerships, internship matching.
              </p>
            </Link>

            <Link 
              to="/admin/dashboard" 
              className={`p-5 rounded-2xl border transition-all block ${
                isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-indigo-400' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Users className="w-6 h-6 text-indigo-400" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                  Role 4
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Administrator Area</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Account provisioning, role management, system settings, global announcements.
              </p>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-inherit opacity-60 text-xs">
          CampusBridge &copy; 2026 &bull; Brolf Tech Remote Internship Challenge &bull; All Rights Reserved
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Role-Protected Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coordinator/dashboard"
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback to home */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>
  );
}
