import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_NAVIGATION, COMMON_NAVIGATION } from './navigationConfig.js';
import { 
  GraduationCap, 
  Rocket, 
  ArrowRight, 
  X,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const { user } = useAuth();
  const role = user?.role || 'student';
  const menuItems = ROLE_NAVIGATION[role] || ROLE_NAVIGATION.student;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#101735]/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 md:w-72 z-50 flex flex-col 
        border-r border-[#1C2948] dark:border-[#1C2948] light:border-gray-200
        bg-[#101735] dark:bg-[#101735] light:bg-white transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] flex items-center justify-center shadow-glow-cyan-sm group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-[#101735]" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-[#8CEBFF] to-[#00C8FF] bg-clip-text text-transparent">
                CampusBridge
              </span>
              <span className="block text-[10px] text-[#00C8FF] font-semibold tracking-wider uppercase">
                Build • Learn • Grow
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Main Role Section */}
          <div className="space-y-1">
            <div className="px-3 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {role} Navigation
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#00C8FF]/10 text-[#00C8FF] uppercase">
                {role}
              </span>
            </div>

            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#00C8FF]/15 text-[#00C8FF] shadow-glow-cyan-sm border border-[#00C8FF]/30 font-bold'
                        : 'text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-[#1C2948]/50 light:hover:bg-gray-100'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 transition-colors group-hover:text-[#00C8FF]" />
                    <span>{item.name}</span>
                  </div>

                  {item.badge != null && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00C8FF]/20 text-[#00C8FF]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Common Secondary Section */}
          <div className="pt-4 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Platform & Support
            </div>

            {COMMON_NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30'
                        : 'text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 hover:bg-[#1C2948]/50 light:hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Bottom Motivation Card (per screenshot 2 & 3) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C2948]/80 to-[#101735] border border-[#00C8FF]/20 text-center space-y-2.5 shadow-lg">
            <div className="w-9 h-9 mx-auto rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Keep going!</p>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                Your consistency builds greatness.
              </p>
            </div>
            <Link
              to={role === 'student' ? '/student/dashboard' : `/${role}/dashboard`}
              className="inline-flex items-center text-[11px] font-semibold text-[#00C8FF] hover:underline"
            >
              <span>View Progress</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 text-center">
          <p className="text-[10px] text-gray-500">
            &copy; 2026 CampusBridge &bull; All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}
