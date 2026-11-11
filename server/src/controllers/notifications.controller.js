/**
 * Notifications Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-14 (Deadline/grade notifications) · FR-25 (In-app notification delivery)
 *   FR-43 (Notification management)
 *
 * Authorization:
 *   - All authenticated users may manage their own notifications.
 *   - Users may only read/mark their own notifications.
 */

import { Notification } from '../models/Notification.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/notifications
// List all notifications for the authenticated user (FR-43)
// ─────────────────────────────────────────────────────────────────────────────
export const listNotifications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };

    if (req.query.unread === 'true') {
      filter.read = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/notifications/unread-count
// Return count of unread notifications for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      read: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Unread notification count retrieved.',
      data: { unreadCount: count },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/notifications/:id/read
// Mark a single notification as read
// ─────────────────────────────────────────────────────────────────────────────
export const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (!notification.read) {
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/notifications/read-all
// Mark all unread notifications as read for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read.`,
      data: { markedRead: result.modifiedCount },
    });
  } catch (err) {
    next(err);
  }
};
