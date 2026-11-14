/**
 * NotificationsPage — Shared across instructor, coordinator, and admin roles.
 * Reuses the same notificationsService used by StudentNotificationsPage.
 */
import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { notificationsService } from '../../services/phase11.js';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  AlertTriangle,
  Briefcase,
  BookOpen,
  Info,
  Clock,
  Filter,
  AlertCircle,
} from 'lucide-react';

function notificationIcon(type) {
  if (!type) return <Info className="w-4 h-4 text-[#00C8FF]" />;
  const t = type.toLowerCase();
  if (t.includes('application') || t.includes('internship')) return <Briefcase className="w-4 h-4 text-amber-400" />;
  if (t.includes('grade') || t.includes('submission') || t.includes('course')) return <BookOpen className="w-4 h-4 text-[#8CEBFF]" />;
  if (t.includes('warn') || t.includes('risk') || t.includes('deadline')) return <AlertTriangle className="w-4 h-4 text-rose-400" />;
  return <Info className="w-4 h-4 text-[#00C8FF]" />;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listRes, countRes] = await Promise.all([
        notificationsService.list(filterUnread),
        notificationsService.getUnreadCount(),
      ]);
      if (listRes.success) setNotifications(listRes.data || []);
      if (countRes.success) setUnreadCount(countRes.data?.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterUnread]);

  const handleMarkRead = async (id) => {
    try {
      const res = await notificationsService.markRead(id);
      if (res.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationsService.markAllRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch { /* ignore */ }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#00C8FF]/20 text-[#00C8FF] text-sm font-bold border border-[#00C8FF]/30">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Platform alerts, grade updates, and application status changes</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterUnread(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterUnread
                  ? 'bg-[#00C8FF]/10 text-[#00C8FF] border-[#00C8FF]/30'
                  : 'text-gray-400 border-[#1C2948] hover:border-[#00C8FF]/50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {filterUnread ? 'Unread only' : 'All notifications'}
            </button>
            {unreadCount > 0 && (
              <Button size="sm" variant="secondary" onClick={handleMarkAllRead}>
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <DashboardCard
          title={filterUnread ? 'Unread Notifications' : 'All Notifications'}
          subtitle="Click a notification to mark it as read"
          icon={Bell}
        >
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <LoadingState count={5} />
          ) : notifications.length === 0 ? (
            <EmptyState
              title={filterUnread ? 'All caught up!' : 'No Notifications'}
              description={
                filterUnread
                  ? 'You have no unread notifications.'
                  : 'No notifications have been sent to your account yet.'
              }
            />
          ) : (
            <div className="divide-y divide-[#1C2948]">
              {notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkRead(n._id)}
                  className={`flex items-start gap-3 py-4 transition-colors ${
                    !n.isRead ? 'cursor-pointer hover:bg-[#1C2948]/30' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                    n.isRead ? 'bg-[#1C2948]/40' : 'bg-[#00C8FF]/10'
                  }`}>
                    {notificationIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-300' : 'text-white font-medium'}`}>
                        {n.message || n.title || 'Notification'}
                      </p>
                      {!n.isRead && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#00C8FF] mt-1.5" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {n.type && (
                        <Badge variant="neutral" size="sm">{n.type.replace(/_/g, ' ')}</Badge>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Clock className="w-3 h-3" />
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleString(undefined, {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  {n.isRead && (
                    <CheckCircle2 className="w-4 h-4 text-gray-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
