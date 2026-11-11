/**
 * Activity Feed Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-35 (Activity logging) · FR-36 (Recent activity feed) · FR-37 (Weekly summary)
 *
 * Authorization:
 *   - All authenticated users may view their own activity.
 *   - Users may not access another user's activity log.
 */

import { ActivityLog } from '../models/ActivityLog.js';

// Day-of-week labels for weekly aggregation (Sunday = 0)
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/activity/recent
// Return recent activity entries for the authenticated user (FR-36)
// ─────────────────────────────────────────────────────────────────────────────
export const getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const activities = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Recent activity retrieved successfully.',
      data: activities,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/activity/weekly
// Return count of activity events grouped by day of the week (FR-37)
// Covers the last 7 calendar days relative to now.
// ─────────────────────────────────────────────────────────────────────────────
export const getWeeklyActivity = async (req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const activities = await ActivityLog.find({
      userId: req.user._id,
      createdAt: { $gte: since },
    })
      .select('createdAt action')
      .lean();

    // Build a zero-initialised map for all 7 days
    const counts = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const label = DAY_LABELS[d.getDay()];
      counts[label] = { day: label, count: 0, date: d.toISOString().slice(0, 10) };
    }

    for (const activity of activities) {
      const label = DAY_LABELS[new Date(activity.createdAt).getDay()];
      if (counts[label]) {
        counts[label].count += 1;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Weekly activity summary retrieved successfully.',
      data: Object.values(counts),
    });
  } catch (err) {
    next(err);
  }
};
