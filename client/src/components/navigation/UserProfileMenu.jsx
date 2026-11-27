import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown, User, Settings, LogOut, ShieldCheck } from 'lucide-react';
import Badge from '../ui/Badge.jsx';

export default function UserProfileMenu({ className = '' }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  // Extract initials (e.g. 'Sabrin Abdu' -> 'SA')
  const getInitials = (name) => {
    if (!name) return 'CB';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Profile Trigger Pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-full border transition-all duration-200
        bg-[#1C2948]/60 border-[#1C2948] hover:border-[#00C8FF]/50
        light:bg-white light:border-gray-200"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] text-[#101735] font-bold text-xs flex items-center justify-center shadow-glow-cyan-sm">
          {getInitials(user?.name)}
        </div>
        <span className="text-xs font-semibold text-white dark:text-white light:text-gray-900 hidden sm:inline-block max-w-[120px] truncate">
          {user?.name || 'My Account'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-[256px] rounded-2xl border border-[#00C8FF]/20 bg-[#1C2948]/95 dark:bg-[#1C2948]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden light:bg-white light:border-gray-200">
          {/* Header Info */}
          <div className="p-4 border-b border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white dark:text-white light:text-gray-900 truncate">
                {user?.name}
              </span>
              <Badge variant={user?.role === 'admin' ? 'purple' : 'cyan'} size="sm">
                {user?.role}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>

          {/* Links */}
          <div className="p-2 space-y-1">
            <Link
              to={user?.role === 'student' ? '/student/profile' : `/${user?.role}/profile`}
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#8CEBFF] hover:text-white hover:bg-[#101735]/60 transition-colors light:text-gray-700 light:hover:bg-gray-100"
            >
              <Settings className="w-4 h-4 text-[#00C8FF]" />
              <span>Profile & Preferences</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="p-2 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
