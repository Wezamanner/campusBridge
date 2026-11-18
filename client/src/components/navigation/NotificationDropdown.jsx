import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { notificationsService } from '../../services/phase11.js';

// Role → dedicated notifications page
const NOTIFICATION_PATHS = {
  student:     '/student/notifications',
  instructor:  '/instructor/notifications',
  coordinator: '/coordinator/notifications',
  admin:       '/admin/notifications',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationDropdown({ className = '' }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const dropdownRef = useRef(null);

  const [isOpen,       setIsOpen]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsService.list(false),
        notificationsService.getUnreadCount(),
      ]);
      if (listRes.success)  setNotifications(listRes.data || []);
      if (countRes.success) setUnreadCount(countRes.data?.unreadCount ?? 0);
    } catch (err) {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on open (not on mount — avoids unnecessary requests while collapsed)
  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, fetchData]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markItemAsRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await notificationsService.markRead(notif._id);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const goToNotificationCenter = () => {
    const path = NOTIFICATION_PATHS[user?.role] || '/student/notifications';
    setIsOpen(false);
    navigate(path);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="p-2 rounded-xl border relative transition-all duration-200
          bg-[#1C2948]/60 border-[#1C2948] text-[#8CEBFF]
          hover:border-[#00C8FF] hover:shadow-glow-cyan-sm
          light:bg-white light:border-gray-200 light:text-gray-700"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#00C8FF]/20
            bg-[#1C2948]/95 dark:bg-[#1C2948]/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden
            light:bg-white light:border-gray-200"
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--cb-border)' }}
          >
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm" style={{ color: 'var(--cb-text)' }}>
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

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-5 h-5 text-[#00C8FF] animate-spin" />
              </div>
            ) : error ? (
              <p className="text-xs text-rose-400 text-center py-6 px-4">{error}</p>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2 opacity-60">
                <Bell className="w-7 h-7 text-gray-500" />
                <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div style={{ borderBottom: '1px solid var(--cb-border)' }}>
                {notifications.slice(0, 8).map(notif => (
                  <div
                    key={notif._id}
                    onClick={() => markItemAsRead(notif)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 ${
                      notif.isRead
                        ? 'opacity-70 hover:opacity-100'
                        : 'bg-[#00C8FF]/5 hover:bg-[#00C8FF]/10'
                    }`}
                    style={{ borderBottom: '1px solid var(--cb-border)' }}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notif.isRead ? 'bg-transparent' : 'bg-[#00C8FF]'
                      }`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--cb-text)' }}>
                        {notif.title}
                      </p>
                      <p className="text-xs leading-snug" style={{ color: 'var(--cb-text-muted)' }}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 pt-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="p-3 text-center"
            style={{ backgroundColor: 'var(--cb-bg)', borderTop: '1px solid var(--cb-border)' }}
          >
            <button
              onClick={goToNotificationCenter}
              className="text-xs font-semibold text-[#00C8FF] hover:underline inline-flex items-center gap-1"
            >
              <span>Notification Center</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
