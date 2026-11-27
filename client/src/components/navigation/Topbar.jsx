import React from 'react';
import { Menu } from 'lucide-react';
import SearchBar from './SearchBar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';
import UserProfileMenu from './UserProfileMenu.jsx';

export default function Topbar({ onToggleMobileSidebar, className = '' }) {
  return (
    <header
      className={`h-16 px-3 sm:px-4 md:px-8 sticky top-0 z-30 flex items-center justify-between gap-2 backdrop-blur-md transition-colors duration-300 ${className}`}
      style={{
        backgroundColor: 'var(--cb-surface-2)',
        borderBottom: '1px solid var(--cb-border)',
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-xl">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden flex-shrink-0 p-2 rounded-xl transition-colors"
          style={{ color: 'var(--cb-text-muted)' }}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar — hidden on very small screens to give space to controls */}
        <div className="hidden sm:block flex-1 min-w-0">
          <SearchBar />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />
        <NotificationDropdown />
        <UserProfileMenu />
      </div>
    </header>
  );
}
