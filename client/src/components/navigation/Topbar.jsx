import React from 'react';
import { Menu } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';
import UserProfileMenu from './UserProfileMenu.jsx';

export default function Topbar({ onToggleMobileSidebar, className = '' }) {
  return (
    <header
      className={`h-16 px-4 md:px-8 border-b border-[#1C2948] dark:border-[#1C2948] light:border-gray-200 
      bg-[#101735]/80 dark:bg-[#101735]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between
      light:bg-white/80 ${className}`}
    >
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1C2948]/60"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <SearchBar />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3 ml-4">
        <ThemeToggle />
        <NotificationDropdown />
        <UserProfileMenu />
      </div>
    </header>
  );
}
