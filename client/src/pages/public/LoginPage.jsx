import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Lock, 
  Mail, 
  GraduationCap, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Sparkles 
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      // Navigate to intended page or role dashboard
      if (from) {
        navigate(from, { replace: true });
      } else {
        const dashboardRoutes = {
          student: '/student/dashboard',
          instructor: '/instructor/dashboard',
          coordinator: '/coordinator/dashboard',
          admin: '/admin/dashboard',
        };
        navigate(dashboardRoutes[user.role] || '/', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101735] text-[#F5F8FC] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glowing ambient effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00C8FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#8CEBFF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-flex items-center space-x-3 group">
            <img
              src="/brolf-tech-logo.jpg"
              alt="Brolf Tech"
              className="w-12 h-12 rounded-2xl object-cover shadow-glow-cyan group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#8CEBFF] to-[#00C8FF] bg-clip-text text-transparent">
              CampusBridge
            </span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome Back
          </h1>
          <p className="text-xs text-[#8CEBFF]/80">
            Sign in to access your role-based academic & internship workspace
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8 rounded-2xl bg-[#1C2948]/70 border border-[#00C8FF]/20 backdrop-blur-xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#101735]" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Navigation */}
          <div className="text-center pt-2 border-t border-[#1C2948]">
            <p className="text-xs text-gray-400">
              New university student?{' '}
              <Link to="/register" className="text-[#00C8FF] hover:underline font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
