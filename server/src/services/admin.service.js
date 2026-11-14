/**
 * Admin Service: User management operations
 * Phase 12.5 - Administrator functionality
 * 
 * Implements:
 * - User listing with filtering, search, and pagination
 * - User role and profile updates (admin-only)
 * - Soft-delete policy enforcement (exclude deletedAt !== null from operational queries)
 */

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

/**
 * List users with filtering, search, and pagination
 * Excludes soft-deleted users from operational listings (approved soft-delete policy)
 * 
 * @param {Object} options - Query options
 * @param {string} options.role - Filter by role (student, instructor, coordinator, admin)
 * @param {boolean} options.active - Filter by active status
 * @param {string} options.search - Search by name or email (case-insensitive)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20, max: 100)
 * @param {string} options.sortBy - Sort field (default: 'createdAt')
 * @param {string} options.sortOrder - Sort order: 'asc' or 'desc' (default: 'desc')
 * @param {boolean} options.includeDeleted - Include soft-deleted users (admin audit only)
 * @returns {Object} { users: Array, pagination: Object }
 */
export const listUsers = async (options = {}) => {
  const {
    role,
    active,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    includeDeleted = false,
  } = options;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10))); // Max 100 per page
  const skip = (pageNum - 1) * limitNum;

  // Build filter query
  const filter = {};

  // Soft-delete policy: exclude deleted users from normal operations
  if (!includeDeleted) {
    filter.deletedAt = null;
  }

  // Role filter (validate against allowed roles)
  if (role) {
    const allowedRoles = ['student', 'instructor', 'coordinator', 'admin'];
    if (!allowedRoles.includes(role)) {
      const error = new Error(`Invalid role filter. Allowed: ${allowedRoles.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    filter.role = role;
  }

  // Active status filter
  if (typeof active !== 'undefined') {
    filter.active = active === true || active === 'true';
  }

  // Search filter (name or email, case-insensitive)
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  // Build sort object
  const sort = {};
  const allowedSortFields = ['createdAt', 'name', 'email', 'lastLoginAt', 'role'];
  if (allowedSortFields.includes(sortBy)) {
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1; // Default fallback
  }

  // Execute query with pagination
  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('-passwordHash') // Never expose password hash
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    users,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      pageSize: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

/**
 * Update user profile and role (admin-only operation)
 * Uses explicit allowlist for security - no mass assignment
 * 
 * @param {string} userId - Target user ID
 * @param {Object} updates - Allowed update fields
 * @param {string} updates.name - User full name
 * @param {string} updates.role - User role (student, instructor, coordinator, admin)
 * @param {boolean} updates.active - Account active status
 * @param {string} updates.program - Student program
 * @param {number} updates.year - Student year
 * @param {string} updates.department - Instructor/coordinator department
 * @param {string} adminUserId - ID of admin performing the update (for audit trail)
 * @returns {Object} Updated user document
 */
export const updateUser = async (userId, updates, adminUserId) => {
  // Validate user ID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('Invalid user ID format.');
    error.statusCode = 400;
    throw error;
  }

  // Validate admin ID
  if (!mongoose.Types.ObjectId.isValid(adminUserId)) {
    const error = new Error('Invalid administrator ID.');
    error.statusCode = 400;
    throw error;
  }

  // Fetch target user (exclude soft-deleted by default per policy)
  const user = await User.findOne({ _id: userId, deletedAt: null });

  if (!user) {
    const error = new Error('User not found or has been deleted.');
    error.statusCode = 404;
    throw error;
  }

  // Explicit allowlist for permitted fields (SEC: prevent mass assignment)
  const allowedFields = ['name', 'role', 'active', 'program', 'year', 'department'];
  const updateData = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  // Validate role if being changed
  if (updateData.role) {
    const allowedRoles = ['student', 'instructor', 'coordinator', 'admin'];
    if (!allowedRoles.includes(updateData.role)) {
      const error = new Error(`Invalid role. Allowed: ${allowedRoles.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Validate name length if being changed
  if (updateData.name !== undefined) {
    const trimmedName = updateData.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      const error = new Error('Name must be between 2 and 100 characters.');
      error.statusCode = 400;
      throw error;
    }
    updateData.name = trimmedName;
  }

  // Validate year if being changed
  if (updateData.year !== undefined) {
    const yearNum = Number(updateData.year);
    if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 7) {
      const error = new Error('Year must be an integer between 1 and 7.');
      error.statusCode = 400;
      throw error;
    }
    updateData.year = yearNum;
  }

  // Check if any updates were provided
  if (Object.keys(updateData).length === 0) {
    const error = new Error('No valid fields to update.');
    error.statusCode = 400;
    throw error;
  }

  // Apply updates to user document
  const previousRole = user.role;
  const previousActive = user.active;
  Object.assign(user, updateData);

  // Save changes (single-document atomic operation - no transaction needed per approved decision)
  await user.save();

  // SEC-12: Record role changes and deactivations in activity log
  if (updateData.role && updateData.role !== previousRole) {
    ActivityLog.create({
      userId: adminUserId,
      action: 'ADMIN_ROLE_CHANGE',
      targetType: 'User',
      targetId: user._id,
      meta: { targetEmail: user.email, previousRole, newRole: updateData.role },
    }).catch((e) => console.error('[ActivityLog] role-change error:', e.message));
  }

  if (updateData.active === false && previousActive === true) {
    ActivityLog.create({
      userId: adminUserId,
      action: 'ADMIN_DEACTIVATE_USER',
      targetType: 'User',
      targetId: user._id,
      meta: { targetEmail: user.email, targetRole: user.role },
    }).catch((e) => console.error('[ActivityLog] deactivate error:', e.message));
  } else if (updateData.active === true && previousActive === false) {
    ActivityLog.create({
      userId: adminUserId,
      action: 'ADMIN_REACTIVATE_USER',
      targetType: 'User',
      targetId: user._id,
      meta: { targetEmail: user.email, targetRole: user.role },
    }).catch((e) => console.error('[ActivityLog] reactivate error:', e.message));
  }

  // Return sanitized user object
  return user.toJSON();
};


// ─────────────────────────────────────────────────────────────────────────────
// Phase 13.1: Administrator Staff Account Provisioning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create staff user account (admin-only operation)
 * Phase 13.1 - FR-22: Staff provisioning
 * 
 * Restricted to instructor and coordinator roles only
 * Admin cannot create other admins or students via this endpoint
 * 
 * @param {Object} userData - User account details
 * @param {string} adminUserId - ID of admin creating account
 * @returns {Object} Created user document (passwordHash excluded)
 */
export const createStaffUser = async (userData, adminUserId) => {
  // Validate admin ID
  if (!mongoose.Types.ObjectId.isValid(adminUserId)) {
    const error = new Error('Invalid administrator ID.');
    error.statusCode = 400;
    throw error;
  }

  // Verify admin exists and is active
  const admin = await User.findOne({
    _id: adminUserId,
    role: 'admin',
    active: true,
    deletedAt: null,
  });

  if (!admin) {
    const error = new Error('Administrator not found or account is inactive/deleted.');
    error.statusCode = 403;
    throw error;
  }

  // Validate role restriction (business rule)
  if (!['instructor', 'coordinator'].includes(userData.role)) {
    const error = new Error('Only instructor and coordinator accounts can be created via this endpoint.');
    error.statusCode = 403;
    throw error;
  }

  // Validate required fields
  if (!userData.name || !userData.email || !userData.passwordHash) {
    const error = new Error('Name, email, and password are required.');
    error.statusCode = 400;
    throw error;
  }

  // Validate name length
  const trimmedName = userData.name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    const error = new Error('Name must be between 2 and 100 characters.');
    error.statusCode = 400;
    throw error;
  }

  // Validate password length (before hashing)
  if (userData.passwordHash.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    const error = new Error('Invalid email format.');
    error.statusCode = 400;
    throw error;
  }

  // Create user (User model pre-save hook will hash password)
  try {
    const user = await User.create({
      name: trimmedName,
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash, // Will be hashed by pre-save hook
      role: userData.role,
      active: userData.active !== undefined ? userData.active : true,
      department: userData.department?.trim() || '',
    });

    // Return user without password hash
    return user.toJSON();
  } catch (err) {
    // Handle duplicate email error
    if (err.code === 11000) {
      const error = new Error('A user with this email already exists.');
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Soft-Delete & Reactivation (FR-22 / UC-A02) + SEC-12 Activity Logging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-delete a user account (admin-only)
 * Sets deletedAt timestamp so the user can no longer authenticate (Phase 12.5 auth.js enforces this).
 * Admin cannot soft-delete their own account.
 *
 * @param {string} targetUserId - ID of user to soft-delete
 * @param {string} adminUserId - ID of admin performing action
 */
export const softDeleteUser = async (targetUserId, adminUserId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user ID format.');
    err.statusCode = 400;
    throw err;
  }

  if (targetUserId === adminUserId.toString()) {
    const err = new Error('Administrators cannot delete their own account.');
    err.statusCode = 403;
    throw err;
  }

  const user = await User.findOne({ _id: targetUserId }).select('+deletedAt');
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (user.deletedAt) {
    const err = new Error('User account has already been deleted.');
    err.statusCode = 409;
    throw err;
  }

  user.deletedAt = new Date();
  user.active = false;
  await user.save();

  // SEC-12: Record deactivation in activity log
  ActivityLog.create({
    userId: adminUserId,
    action: 'ADMIN_SOFT_DELETE_USER',
    targetType: 'User',
    targetId: user._id,
    meta: {
      targetEmail: user.email,
      targetRole: user.role,
      adminId: adminUserId.toString(),
    },
  }).catch((e) => console.error('[ActivityLog] soft-delete error:', e.message));

  return user.toJSON();
};

/**
 * Reactivate a soft-deleted user account (admin-only)
 * Clears deletedAt and re-enables the account.
 *
 * @param {string} targetUserId - ID of user to reactivate
 * @param {string} adminUserId - ID of admin performing action
 */
export const reactivateUser = async (targetUserId, adminUserId) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const err = new Error('Invalid user ID format.');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(targetUserId).select('+deletedAt');
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!user.deletedAt && user.active) {
    const err = new Error('User account is already active.');
    err.statusCode = 409;
    throw err;
  }

  user.deletedAt = null;
  user.active = true;
  await user.save();

  // SEC-12: Record reactivation in activity log
  ActivityLog.create({
    userId: adminUserId,
    action: 'ADMIN_REACTIVATE_USER',
    targetType: 'User',
    targetId: user._id,
    meta: { targetEmail: user.email, targetRole: user.role },
  }).catch((e) => console.error('[ActivityLog] reactivate error:', e.message));

  return user.toJSON();
};
