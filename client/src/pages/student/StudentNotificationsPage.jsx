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
} from 'lucide-react';

export default function StudentNotificationsPage() {
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

      if (listRes.success) {
        setNotifications(listRes.data || []);
      }
      if (countRes.success) {
        setUnreadCount(countRes.data?.unreadCount || 0);
      }
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
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationsService.markAllRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'assignment':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'internship':
        return <Briefcase className="w-5 h-5 text-emerald-600" />;
      case 'academic_alert':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-primary-600" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'assignment':
        return <Badge variant="info">Assignment</Badge>;
      case 'internship':
        return <Badge variant="success">Internship</Badge>;
      case 'academic_alert':
        return <Badge variant="warning">Academic Alert</Badge>;
      default:
        return <Badge variant="default">System</Badge>;
    }
  };

  return (
    <AppLayout title="In-App Notifications">
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Stay updated on deadlines, internship status updates, and academic notifications (FR-14, FR-25).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm">
              <button
                onClick={() => setFilterUnread(false)}
                className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                  !filterUnread ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterUnread(true)}
                className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors ${
                  filterUnread ? 'bg-primary-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread Only
              </button>
            </div>

            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <DashboardCard>
            <LoadingState message="Loading notifications..." />
          </DashboardCard>
        ) : notifications.length === 0 ? (
          <DashboardCard>
            <EmptyState
              icon={Bell}
              title={filterUnread ? 'No unread notifications' : 'No notifications yet'}
              description={
                filterUnread
                  ? "You're all caught up! Switch to 'All' to view your notification history."
                  : 'Important updates regarding your courses, grades, and internships will appear here.'
              }
            />
          </DashboardCard>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-4 rounded-xl border transition-all ${
                  notif.isRead
                    ? 'bg-white border-gray-200'
                    : 'bg-primary-50/30 border-primary-200 shadow-sm'
                } flex items-start justify-between gap-4`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-gray-100 flex-shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-sm ${notif.isRead ? 'font-semibold text-gray-800' : 'font-bold text-gray-900'}`}>
                        {notif.title}
                      </h3>
                      {getCategoryBadge(notif.category)}
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {notif.message || notif.body}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-gray-400 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!notif.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkRead(notif._id)}
                    className="text-primary-600 hover:text-primary-800 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Mark read
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
