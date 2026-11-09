import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  Activity, 
  Moon, 
  Sun, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [health, setHealth] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    // Check backend health
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setHealth({ loading: false, data: json, error: null }))
      .catch((err) => setHealth({ loading: false, data: null, error: err.message }));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const isDark = theme === 'dark';

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

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/30">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 1 Initialized
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase bg-[#1C2948] text-[#8CEBFF] border border-[#00C8FF]/20 shadow-glow-cyan-sm">
            Academic Learning & Internship Placement Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            CampusBridge System Architecture
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base opacity-75">
            Strictly tailored to Brolf Tech SRS v2.0 & UI Specification. 
            Clean ES Modules, React + Vite frontend, Express REST API, and MongoDB with Mongoose.
          </p>
        </div>

        {/* Live System Diagnostics / Health */}
        <div className={`p-6 rounded-2xl border transition-all ${
          isDark ? 'bg-[#1C2948]/40 border-[#1C2948] shadow-lg' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-inherit">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-[#00C8FF]" />
              <h2 className="text-base font-bold uppercase tracking-wider">System Health & Live Diagnostics</h2>
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
            {/* Express API Status */}
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

            {/* MongoDB Status */}
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

            {/* Security / RBAC */}
            <div className={`p-4 rounded-xl border flex items-center space-x-4 ${
              isDark ? 'bg-[#101735]/70 border-[#1C2948]' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider opacity-60">Authentication & RBAC</p>
                <p className="text-sm font-bold text-indigo-400">
                  JWT + Bcrypt (4 Roles)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Multi-Developer Role Modules */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold tracking-wider uppercase text-[#00C8FF]">
            Multi-Developer Module Matrix (4-Day Team Plan)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Dev 1 & 2: Student */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]/50' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <GraduationCap className="w-6 h-6 text-[#00C8FF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#00C8FF]/10 text-[#00C8FF]">
                  Dev 1 & 2
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Student Module</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Courses, assignments, submissions, internship applications, personal projects & tasks, AI assistant.
              </p>
            </div>

            {/* Dev 1 & 2: Instructor */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]/50' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <BookOpen className="w-6 h-6 text-[#8CEBFF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#8CEBFF]/10 text-[#8CEBFF]">
                  Dev 1 & 2
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Instructor Module</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Course resources, assignment creation, submission grading queue, at-risk student monitoring.
              </p>
            </div>

            {/* Dev 3: Coordinator */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]/50' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-6 h-6 text-[#00C8FF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#00C8FF]/10 text-[#00C8FF]">
                  Dev 3
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Coordinator Module</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                Course creation & instructor assignment, partner companies, internship postings, application reviews.
              </p>
            </div>

            {/* Dev 4: Administrator */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#1C2948]/50 border-[#1C2948] hover:border-[#00C8FF]/50' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <Users className="w-6 h-6 text-[#8CEBFF]" />
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#8CEBFF]/10 text-[#8CEBFF]">
                  Dev 4
                </span>
              </div>
              <h4 className="font-bold text-base mb-1">Administrator Module</h4>
              <p className="text-xs opacity-70 leading-relaxed">
                User management, staff accounts, role assignment, platform settings, announcements, public content.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 border-t border-inherit opacity-60 text-xs">
          CampusBridge &copy; 2026 &bull; Brolf Tech Remote Internship Challenge &bull; All Rights Reserved
        </div>
      </main>
    </div>
  );
}
