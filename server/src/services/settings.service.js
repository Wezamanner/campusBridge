/**
 * Settings and Public Content Service
 *
 * Implements:
 *   - FR-24, UC-A03: Registration settings (turn registration on/off) & announcements
 *   - FR-46, FR-47, UC-A04: Public website content management & public announcements
 *   - UC-G01 to UC-G07: Public visitor view of platform, active announcements, registration availability
 */

import { Setting } from '../models/Setting.js';
import { Announcement } from '../models/Announcement.js';
import mongoose from 'mongoose';

/**
 * Get or initialize system settings singleton document
 */
export const getOrCreateSettings = async () => {
  let setting = await Setting.findOne({ key: 'system' });
  if (!setting) {
    setting = await Setting.create({ key: 'system', registrationOpen: true });
  }
  return setting;
};

/**
 * Public view of system settings (e.g., registration open/closed status)
 */
export const getPublicSettings = async () => {
  const setting = await getOrCreateSettings();
  return {
    registrationOpen: setting.registrationOpen,
  };
};

/**
 * Admin view of system settings
 */
export const getAdminSettings = async () => {
  const setting = await getOrCreateSettings();
  return setting.toObject();
};

/**
 * Admin update of system settings (registration toggle)
 */
export const updateAdminSettings = async (updates, adminUserId) => {
  if (typeof updates.registrationOpen !== 'undefined') {
    if (typeof updates.registrationOpen !== 'boolean') {
      const err = new Error('registrationOpen must be a boolean');
      err.statusCode = 400;
      throw err;
    }
  }

  const setting = await Setting.findOneAndUpdate(
    { key: 'system' },
    {
      ...(typeof updates.registrationOpen !== 'undefined' && { registrationOpen: updates.registrationOpen }),
      updatedBy: adminUserId,
    },
    { new: true, upsert: true, runValidators: true }
  );

  return setting.toObject();
};

/**
 * Public view of website content and active public announcements
 */
export const getPublicContent = async () => {
  const [setting, announcements] = await Promise.all([
    getOrCreateSettings(),
    Announcement.find({
      published: true,
      audience: { $in: ['public', 'both'] },
      startsAt: { $lte: new Date() },
      endsAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return {
    registrationOpen: setting.registrationOpen,
    publicContent: setting.publicContent || {},
    announcements,
  };
};

/**
 * Admin update of public website text blocks
 */
export const updatePublicContent = async (contentUpdates, adminUserId) => {
  const setting = await getOrCreateSettings();

  const allowedFields = ['heroTitle', 'heroSubtitle', 'aboutText', 'announcementBanner'];
  const updatePayload = {};

  for (const field of allowedFields) {
    if (typeof contentUpdates[field] === 'string') {
      updatePayload[`publicContent.${field}`] = contentUpdates[field].trim();
    }
  }

  const updated = await Setting.findOneAndUpdate(
    { key: 'system' },
    {
      $set: updatePayload,
      updatedBy: adminUserId,
    },
    { new: true, runValidators: true }
  );

  return updated.publicContent;
};

/**
 * List announcements for dashboard users (authenticated)
 */
export const listDashboardAnnouncements = async () => {
  const now = new Date();
  const announcements = await Announcement.find({
    published: true,
    audience: { $in: ['dashboard', 'both'] },
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  })
    .sort({ createdAt: -1 })
    .lean();

  return announcements;
};

/**
 * List all announcements for administrator (including draft, expired, all audiences)
 */
export const listAdminAnnouncements = async (options = {}) => {
  const filter = {};
  if (typeof options.published !== 'undefined') {
    filter.published = options.published === true || options.published === 'true';
  }
  if (options.audience) {
    filter.audience = options.audience;
  }

  const announcements = await Announcement.find(filter)
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 })
    .lean();

  return announcements;
};

/**
 * Create an announcement (Administrator only)
 */
export const createAnnouncement = async (data, adminUserId) => {
  const { message, audience = 'both', startsAt = new Date(), endsAt, published = true } = data;

  if (!message || !message.trim()) {
    const err = new Error('Announcement message is required');
    err.statusCode = 400;
    throw err;
  }

  if (message.trim().length > 200) {
    const err = new Error('Announcement message cannot exceed 200 characters');
    err.statusCode = 400;
    throw err;
  }

  const validAudiences = ['dashboard', 'public', 'both'];
  if (!validAudiences.includes(audience)) {
    const err = new Error(`Audience must be one of: ${validAudiences.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const parsedStart = startsAt ? new Date(startsAt) : new Date();
  if (isNaN(parsedStart.getTime())) {
    const err = new Error('Invalid startsAt date format');
    err.statusCode = 400;
    throw err;
  }

  if (!endsAt) {
    const err = new Error('Announcement expiry / end date is required');
    err.statusCode = 400;
    throw err;
  }

  const parsedEnd = new Date(endsAt);
  if (isNaN(parsedEnd.getTime())) {
    const err = new Error('Invalid endsAt date format');
    err.statusCode = 400;
    throw err;
  }

  if (parsedEnd <= parsedStart) {
    const err = new Error('End date must be chronologically after the start date');
    err.statusCode = 400;
    throw err;
  }

  const announcement = await Announcement.create({
    message: message.trim(),
    audience,
    startsAt: parsedStart,
    endsAt: parsedEnd,
    published: Boolean(published),
    createdBy: adminUserId,
  });

  return announcement.toObject();
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Announcement Edit & Delete (FR-47 / UC-A04)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update an existing announcement (admin-only)
 */
export const updateAnnouncement = async (announcementId, updates, adminUserId) => {
  if (!mongoose.Types.ObjectId.isValid(announcementId)) {
    const err = new Error('Invalid announcement ID format.');
    err.statusCode = 400;
    throw err;
  }

  const announcement = await Announcement.findById(announcementId);
  if (!announcement) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }

  if (updates.message !== undefined) {
    if (!updates.message.trim()) {
      const err = new Error('Announcement message cannot be empty.');
      err.statusCode = 400;
      throw err;
    }
    if (updates.message.trim().length > 200) {
      const err = new Error('Announcement message cannot exceed 200 characters.');
      err.statusCode = 400;
      throw err;
    }
    announcement.message = updates.message.trim();
  }

  if (updates.audience !== undefined) {
    if (!['dashboard', 'public', 'both'].includes(updates.audience)) {
      const err = new Error('Audience must be "dashboard", "public", or "both".');
      err.statusCode = 400;
      throw err;
    }
    announcement.audience = updates.audience;
  }

  if (updates.published !== undefined) {
    announcement.published = Boolean(updates.published);
  }

  if (updates.startsAt !== undefined) {
    const d = new Date(updates.startsAt);
    if (isNaN(d.getTime())) { const e = new Error('Invalid startsAt date.'); e.statusCode = 400; throw e; }
    announcement.startsAt = d;
  }

  if (updates.endsAt !== undefined) {
    const d = new Date(updates.endsAt);
    if (isNaN(d.getTime())) { const e = new Error('Invalid endsAt date.'); e.statusCode = 400; throw e; }
    if (d <= announcement.startsAt) {
      const err = new Error('End date must be after start date.');
      err.statusCode = 400;
      throw err;
    }
    announcement.endsAt = d;
  }

  await announcement.save();
  return announcement.toObject();
};

/**
 * Delete an announcement (admin-only)
 */
export const deleteAnnouncement = async (announcementId, adminUserId) => {
  if (!mongoose.Types.ObjectId.isValid(announcementId)) {
    const err = new Error('Invalid announcement ID format.');
    err.statusCode = 400;
    throw err;
  }

  const result = await Announcement.findByIdAndDelete(announcementId);
  if (!result) {
    const err = new Error('Announcement not found.');
    err.statusCode = 404;
    throw err;
  }

  return { deleted: true, id: announcementId };
};

/**
 * Preview an announcement (returns what it would look like when published)
 * Returns the announcement data without publishing it.
 */
export const previewAnnouncement = async (data) => {
  const { message, audience = 'both', startsAt = new Date(), endsAt, published = true } = data;
  return {
    message: message?.trim() || '',
    audience,
    startsAt: startsAt ? new Date(startsAt) : new Date(),
    endsAt: endsAt ? new Date(endsAt) : null,
    published,
    preview: true,
  };
};
