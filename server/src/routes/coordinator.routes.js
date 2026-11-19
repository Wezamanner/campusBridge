/**
 * Coordinator Routes: Organization Approval Workflow
 *
 * Phase 12.5 — Coordinator functionality
 *
 * SRS Traceability: FR-13, UC-C02
 *
 * Authorization:
 *   ALL routes require:
 *     1. Valid JWT (authenticate)
 *     2. Role === 'coordinator' (authorize)
 *
 * Base path: /api/v1/coordinator (registered in server.js)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listOrganizations,
  approveOrganization,
  createInternship,
  listApplications,
  forwardApplication,
  recordDecision,
  // Phase 14 additions
  createCourse,
  updateCourse,
  setCourseStatus,
  registerOrganization,
  updateOrganization,
  listInternships,
  updateInternship,
  setInternshipStatus,
  scheduleInterview,
  getInterviewSchedule,
} from '../controllers/coordinator.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/coordinator/courses
 * @desc    List all courses with instructor info, status, and enrollment counts.
 *          Accessible by coordinator AND admin — registered BEFORE the global
 *          coordinator-only guard so its own authorize('coordinator','admin')
 *          takes precedence.
 * @access  Coordinator or Admin
 */
router.get(
  '/courses',
  authenticate,
  authorize('coordinator', 'admin'),
  async (req, res, next) => {
    try {
      const { status, search, page = 1, limit = 20 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (search) {
        const re = new RegExp(search, 'i');
        filter.$or = [{ code: re }, { title: re }];
      }
      const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(limit)));
      const lim  = Math.min(50, Math.max(1, parseInt(limit)));

      const { Course } = await import('../models/Course.js');
      const [courses, total] = await Promise.all([
        Course.find(filter)
          .populate('instructorId', 'name email department')
          .populate('createdBy',   'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(lim),
        Course.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: `Retrieved ${courses.length} course(s).`,
        data: courses,
        pagination: {
          page: parseInt(page),
          limit: lim,
          total,
          pages: Math.ceil(total / lim),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Apply authentication and coordinator-role authorization to ALL routes below
router.use(authenticate, authorize('coordinator'));

/**
 * @route   POST /api/v1/coordinator/courses/:id/students
 * @desc    Assign a student to a course (creates Enrollment record).
 *          Idempotent — returns 200 if already enrolled.
 * @access  Coordinator only
 * @body    { studentId: string }
 */
router.post('/courses/:id/students', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required.' });
    }

    const { User } = await import('../models/User.js');
    const { Course } = await import('../models/Course.js');
    const { Enrollment } = await import('../models/Enrollment.js');
    const mongoose = await import('mongoose');

    if (!mongoose.default.isValidObjectId(id) || !mongoose.default.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or student ID.' });
    }

    // Validate course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    // Validate student exists and has student role
    const student = await User.findOne({ _id: studentId, role: 'student', active: true, deletedAt: null });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found or inactive.' });
    }

    // Idempotent find-or-create
    const existing = await Enrollment.findOne({ studentId, courseId: id });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Student is already enrolled in this course.',
        data: { enrollmentId: existing._id, studentId, courseId: id, alreadyEnrolled: true },
      });
    }

    const enrollment = await Enrollment.create({
      studentId,
      courseId: id,
      enrolledAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Student ${student.name} assigned to ${course.code} successfully.`,
      data: { enrollmentId: enrollment._id, studentId, courseId: id, alreadyEnrolled: false },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/coordinator/courses/:id/students
 * @desc    List all students enrolled in a course
 * @access  Coordinator only
 */
router.get('/courses/:id/students', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Course }     = await import('../models/Course.js');
    const { Enrollment } = await import('../models/Enrollment.js');
    const mongoose       = await import('mongoose');

    if (!mongoose.default.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID.' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const enrollments = await Enrollment.find({ courseId: id })
      .populate('studentId', 'name email program year')
      .sort({ enrolledAt: -1 });

    const students = enrollments.map(e => e.studentId).filter(Boolean);

    return res.status(200).json({
      success: true,
      message: `${students.length} student(s) enrolled in ${course.code}.`,
      data: students,
      count: students.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/v1/coordinator/courses/:id/students/:studentId
 * @desc    Remove a student from a course (delete enrollment record).
 *          Does NOT delete submissions, grades or progress records.
 * @access  Coordinator only
 */
router.delete('/courses/:id/students/:studentId', async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const { Enrollment } = await import('../models/Enrollment.js');
    const mongoose       = await import('mongoose');

    if (!mongoose.default.isValidObjectId(id) || !mongoose.default.isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid course or student ID.' });
    }

    const deleted = await Enrollment.findOneAndDelete({ courseId: id, studentId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Student removed from course. Existing submissions and grades are preserved.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/coordinator/organizations
 * @desc    List partner organizations with filtering and pagination
 * @access  Protected — coordinator
 * @query   approved (true/false), search, page, limit
 */
router.get('/organizations', listOrganizations);

/**
 * @route   PATCH /api/v1/coordinator/organizations/:id/approve
 * @desc    Approve a pending partner organization (idempotent)
 * @access  Protected — coordinator
 * @param   id - Organization ID
 */
router.patch('/organizations/:id/approve', approveOrganization);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 13.1: Internship & Application Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/coordinator/internships
 * @desc    Create new internship posting
 * @access  Protected — coordinator
 */
router.post('/internships', createInternship);

/**
 * @route   GET /api/v1/coordinator/applications
 * @desc    List all applications with filtering
 * @access  Protected — coordinator
 * @query   status, internshipId, page, limit
 */
router.get('/applications', listApplications);

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/forward
 * @desc    Forward application to partner company
 * @access  Protected — coordinator
 */
router.patch('/applications/:id/forward', forwardApplication);

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/decision
 * @desc    Record company decision (Accepted/Rejected)
 * @access  Protected — coordinator
 */
router.patch('/applications/:id/decision', recordDecision);

export default router;

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Course Management (FR-04 / UC-C01)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/coordinator/courses
 * @desc    Create course and assign instructor
 * @access  Coordinator
 */
router.post('/courses', createCourse);

/**
 * @route   PUT /api/v1/coordinator/courses/:id
 * @desc    Update course details or instructor assignment
 * @access  Coordinator
 */
router.put('/courses/:id', updateCourse);

/**
 * @route   PATCH /api/v1/coordinator/courses/:id/status
 * @desc    Archive or reactivate a course
 * @access  Coordinator
 */
router.patch('/courses/:id/status', setCourseStatus);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Partner Company Registration (FR-13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/coordinator/organizations
 * @desc    Register a new partner company
 * @access  Coordinator
 */
router.post('/organizations', registerOrganization);

/**
 * @route   PUT /api/v1/coordinator/organizations/:id
 * @desc    Update partner company details
 * @access  Coordinator
 */
router.put('/organizations/:id', updateOrganization);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Internship Edit & Close (FR-10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/coordinator/internships
 * @desc    List all internships (coordinator view)
 * @access  Coordinator
 */
router.get('/internships', listInternships);

/**
 * @route   PUT /api/v1/coordinator/internships/:id
 * @desc    Edit internship posting
 * @access  Coordinator
 */
router.put('/internships/:id', updateInternship);

/**
 * @route   PATCH /api/v1/coordinator/internships/:id/status
 * @desc    Open or close internship posting
 * @access  Coordinator
 */
router.patch('/internships/:id/status', setInternshipStatus);

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Interview Scheduling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/interview
 * @desc    Schedule or update interview for an application
 * @access  Coordinator
 */
router.patch('/applications/:id/interview', scheduleInterview);

/**
 * @route   GET /api/v1/coordinator/applications/:id/interview
 * @desc    Get interview schedule for an application
 * @access  Coordinator
 */
router.get('/applications/:id/interview', getInterviewSchedule);

/**
 * @route   GET /api/v1/coordinator/instructors
 * @desc    List active instructors (name + id only) for course assignment.
 *          Narrow-scoped — does NOT expose personal data, passwords, or admin fields.
 * @access  Coordinator only
 */
router.get('/instructors', async (req, res, next) => {
  try {
    const { User } = await import('../models/User.js');
    const instructors = await User.find({ role: 'instructor', active: true, deletedAt: null })
      .select('_id name email department')
      .sort({ name: 1 });
    res.status(200).json({ success: true, message: 'Instructors retrieved successfully.', data: instructors });
  } catch (error) {
    next(error);
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// Additional Coordinator Routes for Testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/coordinator/placements
 * @desc    View student placements/internship assignments
 * @access  Protected — coordinator
 */
router.get('/placements', async (req, res, next) => {
  try {
    const { Application } = await import('../models/Application.js');
    
    const placements = await Application.find({
      status: 'accepted',
      deletedAt: null,
    })
      .populate('student', 'name email program year')
      .populate('internship', 'title company location startDate')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Student placements retrieved successfully.',
      count: placements.length,
      placements,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/coordinator/reports/placements
 * @desc    Generate placement report
 * @access  Protected — coordinator
 */
router.get('/reports/placements', async (req, res, next) => {
  try {
    const { Application } = await import('../models/Application.js');
    
    const totalApplications = await Application.countDocuments({ deletedAt: null });
    const acceptedApplications = await Application.countDocuments({
      status: 'accepted',
      deletedAt: null,
    });
    const pendingApplications = await Application.countDocuments({
      status: 'pending',
      deletedAt: null,
    });
    const rejectedApplications = await Application.countDocuments({
      status: 'rejected',
      deletedAt: null,
    });

    const placements = await Application.find({
      status: 'accepted',
      deletedAt: null,
    })
      .populate('student', 'name email program')
      .populate('internship', 'title company')
      .select('student internship createdAt');

    res.status(200).json({
      success: true,
      message: 'Placement report generated successfully.',
      report: {
        summary: {
          total: totalApplications,
          accepted: acceptedApplications,
          pending: pendingApplications,
          rejected: rejectedApplications,
          placementRate: totalApplications > 0 ? ((acceptedApplications / totalApplications) * 100).toFixed(2) + '%' : '0%',
        },
        placements,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/coordinator/internships/:id/applications
 * @desc    Get applications for a specific internship
 * @access  Protected — coordinator
 */
router.get('/internships/:id/applications', async (req, res, next) => {
  try {
    const { Application } = await import('../models/Application.js');
    
    const applications = await Application.find({
      internship: req.params.id,
      deletedAt: null,
    })
      .populate('student', 'name email program year')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Internship applications retrieved successfully.',
      count: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
});
