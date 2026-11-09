import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { GraduationCap, LogOut, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#101735] text-[#F5F8FC] p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top bar with identity and logout */}
        <div className="flex items-center justify-between pb-6 border-b border-[#1C2948]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] flex items-center justify-center text-[#101735] font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CampusBridge Workspace</h1>
              <p className="text-xs text-[#00C8FF] font-medium">Student Role Protected Area</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#1C2948] hover:bg-rose-500/20 text-[#8CEBFF] hover:text-rose-400 border border-[#1C2948] hover:border-rose-500/30 transition-all text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Welcome Card */}
        <div className="p-8 rounded-2xl bg-[#1C2948]/60 border border-[#00C8FF]/30 backdrop-blur-md shadow-glow-cyan-sm space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/30">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 3 RBAC Active
          </div>

          <h2 className="text-3xl font-extrabold text-white">
            Welcome, {user?.name || 'Student'}!
          </h2>
          <p className="text-sm text-[#8CEBFF]/80 max-w-xl">
            You are securely authenticated as a student in the university portal. 
            Protected routing has validated your JWT token and confirmed your role permissions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Email Address</span>
              <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Academic Program</span>
              <p className="text-sm font-semibold text-[#8CEBFF] truncate">{user?.program || 'Not set'}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Role Status</span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Active Student
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
