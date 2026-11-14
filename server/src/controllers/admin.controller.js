/**
 * Admin Controller: User management
 *
 * Phase 12.5 — Administrator functionality
 *
 * SRS Traceability:
 *   FR-22 (Admin manages user accounts) · UC-A01 (Admin user management)
 *
 * Authorization:
 *   - Only admin role may access user management endpoints.
 *   - Coordinator may access listUsers for operational visibility.
 *   - Admin cannot modify their own account (enforced in updateUser).
 *
 * Response Envelope: { success, message, data, pagination }
 */

import * as adminService from '../services/admin.service.js';
import mongoose from 'mongoose';

// Phase 14 service imports
import {
  softDeleteUser as softDeleteUserService,
  reactivateUser as reactivateUserService,
} from '../services/admin.service.js';
import {
  updateAnnouncement as updateAnnouncementService,
  deleteAnnouncement as deleteAnnouncementService,
} from '../services/settings.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/users
// List users with filtering, search, and pagination (FR-22)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with optional filtering by role, status, and search.
 *          Supports pagination for large user directories.
 *          Excludes soft-deleted users from operational listings (soft-delete policy).
 * @access  Protected — admin, coordinator (operational visibility)
 * @query   role (student, instructor, coordinator, admin)
 * @query   active (true, false)
 * @query   search (name or email substring, case-insensitive)
 * @query   page (default: 1)
 * @query   limit (default: 20, max: 100)
 * @query   sortBy (createdAt, name, email, lastLoginAt, role)
 * @query   sortOrder (asc, desc)
 * @query   includeDeleted (true - admin audit only)
 */
export const listUsers = async (req, res, next) => {
  try {
    // Parse and validate query parameters
    const options = {
      role: req.query.role ? req.query.role.toString().trim() : undefined,
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      search: req.query.search ? req.query.search.toString().trim() : undefined,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      sortBy: req.query.sortBy ? req.query.sortBy.toString().trim() : 'createdAt',
      sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      includeDeleted: req.query.includeDeleted === 'true',
    };

    // Validate pagination bounds
    if (options.page < 1 || isNaN(options.page)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page number. Must be a positive integer.',
      });
    }

    if (options.limit < 1 || options.limit > 100 || isNaN(options.limit)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit. Must be between 1 and 100.',
      });
    }

    // Delegate to service layer
    const result = await adminService.listUsers(options);

    return res.status(200).json({
      success: true,
      message: `Retrieved ${result.users.length} user(s).`,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    // Service layer throws errors with statusCode property for known failures
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    // Unexpected errors passed to Express error handler
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/admin/users/:id
// Update user role, profile, or active status (FR-22)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/admin/users/:id
 * @desc    Update user profile, role, or active status.
 *          Enforces explicit allowlist for security (no mass assignment).
 *          Admin cannot modify their own account (business rule).
 * @access  Protected — admin only
 * @param   id - Target user ID (MongoDB ObjectId)
 * @body    role (student, instructor, coordinator, admin)
 * @body    active (true, false)
 * @body    name (user full name)
 * @body    email (user email address)
 * @body    department (instructor profile field)
 * @body    program (student profile field)
 * @body    year (student profile field)
 */
export const updateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    // Business rule: Admin cannot modify their own account
    // Prevents privilege escalation or accidental self-lockout
    if (targetUserId === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot modify your own account. Request another administrator for assistance.',
      });
    }

    // Extract and validate request body (explicit allowlist)
    const updates = {};

    if (req.body.role !== undefined) {
      updates.role = req.body.role.toString().trim();
    }

    if (req.body.active !== undefined) {
      // Accept boolean or string "true"/"false"
      updates.active = req.body.active === true || req.body.active === 'true';
    }

    if (req.body.name !== undefined) {
      updates.name = req.body.name.toString().trim();
    }

    if (req.body.email !== undefined) {
      updates.email = req.body.email.toString().trim().toLowerCase();
    }

    // Instructor-specific fields
    if (req.body.department !== undefined) {
      updates.department = req.body.department.toString().trim();
    }

    // Student-specific fields
    if (req.body.program !== undefined) {
      updates.program = req.body.program.toString().trim();
    }

    if (req.body.year !== undefined) {
      const year = parseInt(req.body.year, 10);
      if (isNaN(year) || year < 1 || year > 6) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year. Must be between 1 and 6.',
        });
      }
      updates.year = year;
    }

    // Validate at least one field provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required for update.',
      });
    }

    // Delegate to service layer
    const updatedUser = await adminService.updateUser(targetUserId, updates, req.user._id.toString());

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUser,
    });
  } catch (error) {
    // Service layer throws errors with statusCode property
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Phase 13.1: Administrator Staff Account Provisioning
// ─────────────────────────────────────────────────────────────────────────────

import { createStaffUser as createStaffUserService } from '../services/admin.service.js';

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create staff account (instructor or coordinator)
 * @access  Protected — admin only
 */
export const createUser = async (req, res, next) => {
  try {
    const userData = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      passwordHash: req.body.passwordHash || req.body.password, // Support both field names
      department: req.body.department,
      active: req.body.active,
    };

    const user = await createStaffUserService(userData, req.user._id);

    return res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      data: user,
    });
  } catch (err) {
    // D2: propagate service statusCode to HTTP response
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Soft-Delete & Reactivation (FR-22 / UC-A02)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/admin/users/:id/delete
 * @desc    Soft-delete a user account (sets deletedAt, blocks authentication)
 * @access  Admin only
 */
export const deleteUser = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }
    const user = await softDeleteUserService(req.params.id, req.user._id.toString());
    return res.status(200).json({
      success: true,
      message: 'User account soft-deleted successfully. The user can no longer authenticate.',
      data: user,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/admin/users/:id/reactivate
 * @desc    Reactivate a soft-deleted user account
 * @access  Admin only
 */
export const reactivateUser = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }
    const user = await reactivateUserService(req.params.id, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'User account reactivated successfully.', data: user });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Announcement Edit & Delete (FR-47 / UC-A04)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PUT /api/v1/admin/announcements/:id
 * @desc    Edit an announcement
 * @access  Admin only
 */
export const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await updateAnnouncementService(req.params.id, req.body, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Announcement updated successfully.', data: announcement });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   DELETE /api/v1/admin/announcements/:id
 * @desc    Delete an announcement
 * @access  Admin only
 */
export const deleteAnnouncement = async (req, res, next) => {
  try {
    await deleteAnnouncementService(req.params.id, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};
