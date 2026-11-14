import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_NAVIGATION, COMMON_NAVIGATION } from './navigationConfig.js';
import { Rocket, ArrowRight, X } from 'lucide-react';

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
          className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(16,23,53,0.75)' }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 md:w-72 z-50 flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          backgroundColor: 'var(--cb-bg)',
          borderRight: '1px solid var(--cb-border)',
        }}
      >
        {/* Brand Header */}
        <div
          className="p-6 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--cb-border)' }}
        >
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/brolf-tech-logo.jpg"
              alt="Brolf Tech"
              className="w-10 h-10 rounded-xl object-cover shadow-glow-cyan-sm group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#F5F8FC] via-[#8CEBFF] to-[#00C8FF] bg-clip-text text-transparent">
                CampusBridge
              </span>
              <span className="block text-[10px] text-[#00C8FF] font-semibold tracking-wider uppercase">
                Build • Learn • Grow
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--cb-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Main Role Section */}
          <div className="space-y-1">
            <div className="px-3 pb-2 flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--cb-text-faint)' }}
              >
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
                        : ''
                    }`
                  }
                  style={({ isActive }) =>
                    isActive ? {} : { color: 'var(--cb-text-muted)' }
                  }
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains('text-\\[\\#00C8FF\\]')) {
                      e.currentTarget.style.backgroundColor = 'var(--cb-surface)';
                      e.currentTarget.style.color = 'var(--cb-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.classList.contains('text-\\[\\#00C8FF\\]')) {
                      e.currentTarget.style.backgroundColor = '';
                      e.currentTarget.style.color = 'var(--cb-text-muted)';
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 transition-colors" />
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
          <div
            className="pt-4 space-y-1"
            style={{ borderTop: '1px solid var(--cb-border)' }}
          >
            <div
              className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--cb-text-faint)' }}
            >
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
                        : ''
                    }`
                  }
                  style={({ isActive }) =>
                    isActive ? {} : { color: 'var(--cb-text-muted)' }
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Motivation Card */}
          <div
            className="p-4 rounded-2xl text-center space-y-2.5 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, var(--cb-surface) 0%, var(--cb-bg) 100%)',
              border: '1px solid rgba(0,200,255,0.20)',
            }}
          >
            <div className="w-9 h-9 mx-auto rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--cb-text)' }}>Keep going!</p>
              <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--cb-text-muted)' }}>
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
        <div
          className="p-4 text-center"
          style={{ borderTop: '1px solid var(--cb-border)' }}
        >
          <p className="text-[10px]" style={{ color: 'var(--cb-text-faint)' }}>
            &copy; 2026 CampusBridge &bull; All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}
