/**
 * Settings and Public Content Controller
 *
 * Implements:
 *   - FR-24, UC-A03: Registration settings (turn registration on/off) & announcements
 *   - FR-46, FR-47, UC-A04: Public website content management & public announcements
 *   - UC-G01 to UC-G07: Public visitor views & registration link availability
 */

import * as settingsService from '../services/settings.service.js';

/**
 * @route   GET /api/v1/settings
 * @desc    Public view of system settings (e.g., registrationOpen status)
 * @access  Public
 */
export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getPublicSettings();
    return res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully.',
      data: settings,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Admin view of system settings
 * @access  Protected — admin only
 */
export const getAdminSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getAdminSettings();
    return res.status(200).json({
      success: true,
      message: 'Admin settings retrieved successfully.',
      data: settings,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Admin updates system settings (e.g. toggle registrationOpen)
 * @access  Protected — admin only
 */
export const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await settingsService.updateAdminSettings(updates, req.user._id);
    return res.status(200).json({
      success: true,
      message: 'System settings updated successfully.',
      data: settings,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   GET /api/v1/public/content
 * @desc    Public view of landing page content and active public announcements
 * @access  Public
 */
export const getPublicContent = async (req, res, next) => {
  try {
    const content = await settingsService.getPublicContent();
    return res.status(200).json({
      success: true,
      message: 'Public content retrieved successfully.',
      data: content,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   PUT /api/v1/admin/public/content
 * @desc    Admin updates public website content text blocks
 * @access  Protected — admin only
 */
export const updatePublicContent = async (req, res, next) => {
  try {
    const content = await settingsService.updatePublicContent(req.body, req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Public website content updated successfully.',
      data: content,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   GET /api/v1/announcements
 * @desc    List active announcements for authenticated user dashboard
 * @access  Protected — all authenticated roles
 */
export const getDashboardAnnouncements = async (req, res, next) => {
  try {
    const announcements = await settingsService.listDashboardAnnouncements();
    return res.status(200).json({
      success: true,
      message: `Retrieved ${announcements.length} active announcement(s).`,
      data: announcements,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   GET /api/v1/admin/announcements
 * @desc    List all announcements for administrator
 * @access  Protected — admin only
 */
export const getAdminAnnouncements = async (req, res, next) => {
  try {
    const options = {
      published: req.query.published,
      audience: req.query.audience,
    };
    const announcements = await settingsService.listAdminAnnouncements(options);
    return res.status(200).json({
      success: true,
      message: `Retrieved ${announcements.length} announcement(s).`,
      data: announcements,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   POST /api/v1/admin/announcements
 * @desc    Create a new announcement
 * @access  Protected — admin only
 */
export const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await settingsService.createAnnouncement(req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Announcement published successfully.',
      data: announcement,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};
