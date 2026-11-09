import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldCheck, LogOut, CheckCircle2, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#101735] text-[#F5F8FC] p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-6 border-b border-[#1C2948]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-[#00C8FF] flex items-center justify-center text-[#101735] font-bold">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CampusBridge Workspace</h1>
              <p className="text-xs text-[#00C8FF] font-medium">Administrator Console</p>
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

        <div className="p-8 rounded-2xl bg-[#1C2948]/60 border border-indigo-500/30 backdrop-blur-md shadow-glow-cyan-sm space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Phase 3 RBAC Active
          </div>

          <h2 className="text-3xl font-extrabold text-white">
            Welcome, {user?.name || 'Administrator'}!
          </h2>
          <p className="text-sm text-[#8CEBFF]/80 max-w-xl">
            You are securely authenticated as a platform administrator. 
            Protected routing has validated full administrative privileges.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Email Address</span>
              <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Administration Level</span>
              <p className="text-sm font-semibold text-indigo-400">Super Administrator</p>
            </div>
            <div className="p-4 rounded-xl bg-[#101735]/70 border border-[#1C2948]">
              <span className="text-[10px] uppercase font-bold text-gray-400">Role Status</span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> System Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
