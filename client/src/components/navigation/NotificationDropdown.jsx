import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Assignment Graded',
    message: 'Your Hydraulics II submission received 95/100.',
    time: '2h ago',
    read: false,
    type: 'grade',
  },
  {
    id: 2,
    title: 'New Internship Opportunity',
    message: 'Brolf Tech posted Full Stack Engineering Intern.',
    time: '5h ago',
    read: false,
    type: 'application',
  },
  {
    id: 3,
    title: 'Upcoming Deadline',
    message: 'Portfolio Admin Page due tomorrow at 11:59 PM.',
    time: '1d ago',
    read: true,
    type: 'deadline',
  },
];

export default function NotificationDropdown({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markItemAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-xl border relative transition-all duration-200
        bg-[#1C2948]/60 border-[#1C2948] text-[#8CEBFF] hover:border-[#00C8FF] hover:shadow-glow-cyan-sm
        light:bg-white light:border-gray-200 light:text-gray-700"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#00C8FF]/20 bg-[#1C2948]/95 dark:bg-[#1C2948]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden light:bg-white light:border-gray-200">
          <div className="p-4 border-b border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00C8FF]/10 text-[#00C8FF]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-[#8CEBFF] hover:text-white flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-[#1C2948] dark:divide-[#1C2948] light:divide-gray-100 max-h-80 overflow-y-auto">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markItemAsRead(item.id)}
                className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                  item.read
                    ? 'opacity-70 hover:opacity-100'
                    : 'bg-[#00C8FF]/5 hover:bg-[#00C8FF]/10'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.read ? 'bg-transparent' : 'bg-[#00C8FF]'
                  }`}
                />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-semibold text-white dark:text-white light:text-gray-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-300 dark:text-gray-300 light:text-gray-600 leading-snug">
                    {item.message}
                  </p>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 pt-0.5">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 bg-[#101735]/40 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#00C8FF] hover:underline inline-flex items-center gap-1"
            >
              <span>Notification Center</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
