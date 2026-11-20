/**
 * Admin Routes: User Management
 *
 * Phase 12.5 — Administrator functionality
 *
 * SRS Traceability: FR-22, UC-A01
 *
 * Authorization:
 *   - listUsers: admin only (per stakeholder decision 2026-11-12)
 *   - updateUser: admin only (user account modification requires admin role)
 *
 * Base path: /api/v1/admin (registered in server.js)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { listUsers, updateUser, createUser, deleteUser, reactivateUser, updateAnnouncement, deleteAnnouncement } from '../controllers/admin.controller.js';
import {
  getAdminSettings,
  updateSettings,
  updatePublicContent,
  getAdminAnnouncements,
  createAnnouncement,
} from '../controllers/settings.controller.js';

const router = express.Router();

// Apply auth to all admin routes
router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/v1/admin/users
 * @desc    List all users with filtering, search, and pagination
 * @access  Protected — admin only
 * @query   role, active, search, page, limit, sortBy, sortOrder, includeDeleted
 */
router.get('/users', listUsers);

/**
 * @route   PATCH /api/v1/admin/users/:id
 * @desc    Update user profile, role, or active status
 * @access  Protected — admin only
 * @param   id - Target user ID
 * @body    role, active, name, email, department, program, year
 */
router.patch('/users/:id', updateUser);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create staff account (instructor or coordinator)
 * @access  Protected — admin only
 * @body    name, email, role, passwordHash, department, active
 */
router.post('/users', createUser);

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Admin view of system settings
 * @access  Protected — admin only
 */
router.get('/settings', getAdminSettings);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Admin updates system settings (e.g. registrationOpen)
 * @access  Protected — admin only
 */
router.put('/settings', updateSettings);

/**
 * @route   PUT /api/v1/admin/public/content
 * @desc    Admin updates public website text blocks
 * @access  Protected — admin only
 */
router.put('/public/content', updatePublicContent);

/**
 * @route   GET /api/v1/admin/announcements
 * @desc    Admin lists all announcements
 * @access  Protected — admin only
 */
router.get('/announcements', getAdminAnnouncements);

/**
 * @route   POST /api/v1/admin/announcements
 * @desc    Admin creates an announcement
 * @access  Protected — admin only
 */
router.post('/announcements', createAnnouncement);

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Soft-Delete & Reactivation (FR-22 / UC-A02)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/admin/users/:id/delete
 * @desc    Soft-delete user account (sets deletedAt)
 * @access  Admin only
 */
router.patch('/users/:id/delete', deleteUser);

/**
 * @route   PATCH /api/v1/admin/users/:id/reactivate
 * @desc    Reactivate a soft-deleted user account
 * @access  Admin only
 */
router.patch('/users/:id/reactivate', reactivateUser);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Announcement Edit & Delete (FR-47 / UC-A04)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PUT /api/v1/admin/announcements/:id
 * @desc    Edit an announcement
 * @access  Admin only
 */
router.put('/announcements/:id', updateAnnouncement);

/**
 * @route   DELETE /api/v1/admin/announcements/:id
 * @desc    Delete an announcement
 * @access  Admin only
 */
router.delete('/announcements/:id', deleteAnnouncement);

/**
 * @route   POST /api/v1/admin/announcements/preview
 * @desc    Preview how an announcement will appear before publishing (FR-47)
 * @access  Admin only
 */
router.post('/announcements/preview', async (req, res, next) => {
  try {
    const { previewAnnouncement } = await import('../services/settings.service.js');
    const preview = await previewAnnouncement(req.body);
    return res.status(200).json({ success: true, message: 'Preview generated.', data: preview });
  } catch (err) {
    next(err);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// Additional Admin Routes for Testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get system statistics
 * @access  Protected — admin only
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const { Course } = await import('../models/Course.js');
    const { Assignment } = await import('../models/Assignment.js');
    const { Internship } = await import('../models/Internship.js');
    const { Application } = await import('../models/Application.js');

    const totalUsers = await User.countDocuments({ deletedAt: null });
    const totalStudents = await User.countDocuments({ role: 'student', deletedAt: null });
    const totalInstructors = await User.countDocuments({ role: 'instructor', deletedAt: null });
    const totalCoordinators = await User.countDocuments({ role: 'coordinator', deletedAt: null });
    const totalAdmins = await User.countDocuments({ role: 'admin', deletedAt: null });
    
    const totalCourses = await Course.countDocuments({ deletedAt: null });
    const activeCourses = await Course.countDocuments({ status: 'active', deletedAt: null });
    
    const totalAssignments = await Assignment.countDocuments({ deletedAt: null });
    const totalInternships = await Internship.countDocuments({ deletedAt: null });
    const totalApplications = await Application.countDocuments({ deletedAt: null });

    res.status(200).json({
      success: true,
      message: 'System statistics retrieved successfully.',
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          instructors: totalInstructors,
          coordinators: totalCoordinators,
          admins: totalAdmins,
        },
        courses: {
          total: totalCourses,
          active: activeCourses,
        },
        assignments: totalAssignments,
        internships: totalInternships,
        applications: totalApplications,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/courses
 * @desc    Get all courses (admin view)
 * @access  Protected — admin only
 */
router.get('/courses', async (req, res, next) => {
  try {
    const { Course } = await import('../models/Course.js');
    
    const courses = await Course.find({ deletedAt: null })
      .populate('instructorId', 'name email')
      .populate('createdBy', 'name email')
      .select('code title description status instructorId createdBy createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully.',
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/activity-logs
 * @desc    Get activity logs
 * @access  Protected — admin only
 */
router.get('/activity-logs', async (req, res, next) => {
  try {
    const { Activity } = await import('../models/Activity.js');
    
    const logs = await Activity.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      message: 'Activity logs retrieved successfully.',
      count: logs.length,
      logs,
    });
  } catch (error) {
    // If Activity model doesn't exist, return empty logs
    res.status(200).json({
      success: true,
      message: 'Activity logs retrieved successfully.',
      count: 0,
      logs: [],
    });
  }
});

/**
 * @route   GET /api/v1/admin/reports/system
 * @desc    Generate system report
 * @access  Protected — admin only
 */
router.get('/reports/system', async (req, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const { Course } = await import('../models/Course.js');
    const { Assignment } = await import('../models/Assignment.js');
    const { Submission } = await import('../models/Submission.js');

    const userStats = {
      total: await User.countDocuments({ deletedAt: null }),
      byRole: {
        student: await User.countDocuments({ role: 'student', deletedAt: null }),
        instructor: await User.countDocuments({ role: 'instructor', deletedAt: null }),
        coordinator: await User.countDocuments({ role: 'coordinator', deletedAt: null }),
        admin: await User.countDocuments({ role: 'admin', deletedAt: null }),
      },
      active: await User.countDocuments({ active: true, deletedAt: null }),
    };

    const courseStats = {
      total: await Course.countDocuments({ deletedAt: null }),
      active: await Course.countDocuments({ status: 'active', deletedAt: null }),
    };

    const assignmentStats = {
      total: await Assignment.countDocuments({ deletedAt: null }),
    };

    const submissionStats = {
      total: await Submission.countDocuments({ deletedAt: null }),
      graded: await Submission.countDocuments({ status: 'graded', deletedAt: null }),
      pending: await Submission.countDocuments({ status: 'pending', deletedAt: null }),
    };

    res.status(200).json({
      success: true,
      message: 'System report generated successfully.',
      report: {
        users: userStats,
        courses: courseStats,
        assignments: assignmentStats,
        submissions: submissionStats,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});
