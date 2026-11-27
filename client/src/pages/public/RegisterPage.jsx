import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  ArrowRight, 
  AlertCircle, 
  Loader2,
  ShieldAlert
} from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    program: '',
    year: '1',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [checkingSettings, setCheckingSettings] = useState(true);

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const rawBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const API = rawBase.endsWith('/api/v1') ? rawBase.slice(0, -'/api/v1'.length) : rawBase;
    fetch(`${API}/api/v1/settings`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setRegistrationOpen(json.data.registrationOpen !== false);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSettings(false));
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        program: formData.program,
        year: Number(formData.year),
      });

      // Self-registered users are students; redirect to student workspace
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101735] text-[#F5F8FC] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-[#00C8FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-[#8CEBFF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-6">
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
            Student Registration
          </h1>
          <p className="text-xs text-[#8CEBFF]/80">
            Create your university account to enroll in courses and discover internships
          </p>
        </div>

        {/* Form Container */}
        <div className="p-5 sm:p-8 rounded-2xl bg-[#1C2948]/70 border border-[#00C8FF]/20 backdrop-blur-xl shadow-2xl space-y-6">
          {!checkingSettings && !registrationOpen ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Registration Currently Closed</h2>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                Student self-registration is currently disabled by university administration (FR-24). Please contact your faculty coordinator or administrator for an account.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan transition-all"
                >
                  <span>Go to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Sabrin Abdu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                University Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                />
              </div>
            </div>

            {/* Program & Year Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                  Degree Program
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    name="program"
                    required
                    value={formData.program}
                    onChange={handleChange}
                    placeholder="Software Engineering"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                  Academic Year
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                  >
                    <option value="1">Year 1 (Freshman)</option>
                    <option value="2">Year 2 (Sophomore)</option>
                    <option value="3">Year 3 (Junior)</option>
                    <option value="4">Year 4 (Senior)</option>
                    <option value="5">Year 5 (Finalist / Graduating)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 chars"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#8CEBFF] uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8CEBFF]/50 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-white placeholder-gray-500 focus:border-[#00C8FF] focus:outline-none focus:ring-1 focus:ring-[#00C8FF] text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#101735]" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
          </>
          )}

          {/* Navigation link to Login */}
          <div className="text-center pt-2 border-t border-[#1C2948]">
            <p className="text-xs text-gray-400">
              Already have a CampusBridge account?{' '}
              <Link to="/login" className="text-[#00C8FF] hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
