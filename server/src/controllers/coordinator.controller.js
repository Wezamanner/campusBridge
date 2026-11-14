/**
 * Coordinator Controller: Organization approval workflow
 *
 * Phase 12.5 — Coordinator functionality
 *
 * SRS Traceability:
 *   FR-13 (Coordinators manage partner organizations) · UC-C02 (Organization approval workflow)
 *
 * Authorization:
 *   - Only coordinator role may approve organizations.
 *   - Coordinator ID derived from authenticated session (req.user), never from request body.
 *   - Approval workflow is idempotent (repeated approvals return success).
 *
 * Response Envelope: { success, message, data, pagination }
 */

import * as coordinatorService from '../services/coordinator.service.js';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/coordinator/organizations
// List partner organizations with filtering and pagination (FR-13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/coordinator/organizations
 * @desc    List partner organizations with optional filtering by approval status.
 *          Supports search by organization name or contact person.
 *          Includes pagination for large organization directories.
 * @access  Protected — coordinator only
 * @query   approved (true, false, undefined for all)
 * @query   search (name or contact person substring, case-insensitive)
 * @query   page (default: 1)
 * @query   limit (default: 20, max: 100)
 */
export const listOrganizations = async (req, res, next) => {
  try {
    // Parse and validate query parameters
    const options = {
      approved:
        req.query.approved === 'true'
          ? true
          : req.query.approved === 'false'
          ? false
          : undefined,
      search: req.query.search ? req.query.search.toString().trim() : undefined,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
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
    const result = await coordinatorService.listOrganizations(options);

    return res.status(200).json({
      success: true,
      message: `Retrieved ${result.organizations.length} organization(s).`,
      data: result.organizations,
      pagination: result.pagination,
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
// PATCH /api/v1/coordinator/organizations/:id/approve
// Approve a pending partner organization (UC-C02, FR-13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/coordinator/organizations/:id/approve
 * @desc    Approve a partner organization for active partnerships.
 *          Sets approval metadata (approved: true, approvedAt, approvedBy).
 *          Idempotent: repeated approvals return success without error.
 *          Atomic operation prevents race conditions with concurrent approvals.
 * @access  Protected — coordinator only
 * @param   id - Partner organization ID (MongoDB ObjectId)
 * @body    None (approval action requires no request body)
 */
export const approveOrganization = async (req, res, next) => {
  try {
    const organizationId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid organization ID format.',
      });
    }

    // Security: Coordinator ID from authenticated session, NEVER from request body
    // This prevents privilege escalation and audit trail manipulation
    const coordinatorUserId = req.user._id.toString();

    // Delegate to service layer (handles atomic update, idempotency, authorization)
    const result = await coordinatorService.approveOrganization(organizationId, coordinatorUserId);

    // Determine HTTP status based on whether this was the first approval or idempotent
    // First approval: 200 OK
    // Already approved: 200 OK (idempotent success per REST best practices)
    const statusCode = 200;

    return res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: {
        organization: result.organization,
        alreadyApproved: result.alreadyApproved,
      },
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
// Phase 13.1: Coordinator Internship & Application Management
// ─────────────────────────────────────────────────────────────────────────────

import {
  createInternship as createInternshipService,
  listAllApplications as listAllApplicationsService,
  forwardApplication as forwardApplicationService,
  recordCompanyDecision as recordCompanyDecisionService,
} from '../services/coordinator.service.js';

/**
 * @route   POST /api/v1/coordinator/internships
 * @desc    Create new internship posting
 * @access  Protected — coordinator
 */
export const createInternship = async (req, res, next) => {
  try {
    const internshipData = {
      companyId: req.body.companyId,
      title: req.body.title,
      type: req.body.type,
      skills: req.body.skills,
      description: req.body.description,
      requirements: req.body.requirements,
      location: req.body.location,
      deadline: req.body.deadline,
    };

    const internship = await createInternshipService(internshipData, req.user._id);

    return res.status(201).json({
      success: true,
      message: 'Internship created successfully.',
      data: internship,
    });
  } catch (err) {
    // D2: propagate service statusCode to HTTP response
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   GET /api/v1/coordinator/applications
 * @desc    List all applications with filtering
 * @access  Protected — coordinator
 */
export const listApplications = async (req, res, next) => {
  try {
    const options = {
      status: req.query.status,
      internshipId: req.query.internshipId,
      studentId: req.query.studentId,  // D3: pass through studentId filter
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await listAllApplicationsService(options);

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully.',
      data: result.applications,
      pagination: result.pagination,
    });
  } catch (err) {
    // D2: propagate service statusCode to HTTP response
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/forward
 * @desc    Forward application to partner company
 * @access  Protected — coordinator
 */
export const forwardApplication = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const notes = req.body.notes || '';

    const application = await forwardApplicationService(applicationId, req.user._id, notes);

    return res.status(200).json({
      success: true,
      message: 'Application forwarded to partner company successfully.',
      data: application,
    });
  } catch (err) {
    // D2: propagate service statusCode to HTTP response
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/decision
 * @desc    Record company decision (Accepted/Rejected)
 * @access  Protected — coordinator
 */
export const recordDecision = async (req, res, next) => {
  try {
    const applicationId = req.params.id;
    const { decision, notes } = req.body;

    if (!decision) {
      return res.status(400).json({
        success: false,
        message: 'Decision is required (Accepted or Rejected).',
      });
    }

    const application = await recordCompanyDecisionService(
      applicationId,
      decision,
      req.user._id,
      notes || ''
    );

    return res.status(200).json({
      success: true,
      message: 'Company decision recorded successfully.',
      data: application,
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
// Phase 14: Course Management (FR-04 / UC-C01)
// ─────────────────────────────────────────────────────────────────────────────

import {
  createCourse as createCourseService,
  updateCourse as updateCourseService,
  archiveCourse as archiveCourseService,
  registerOrganization as registerOrganizationService,
  updateOrganization as updateOrganizationService,
  updateInternship as updateInternshipService,
  setInternshipStatus as setInternshipStatusService,
  listAllInternships as listAllInternshipsService,
  scheduleInterview as scheduleInterviewService,
  getInterviewSchedule as getInterviewScheduleService,
} from '../services/coordinator.service.js';

/**
 * @route   POST /api/v1/coordinator/courses
 * @desc    Create a course and assign an instructor (FR-04 / UC-C01)
 * @access  Coordinator
 */
export const createCourse = async (req, res, next) => {
  try {
    const course = await createCourseService(req.body, req.user._id.toString());
    return res.status(201).json({ success: true, message: 'Course created successfully.', data: course });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PUT /api/v1/coordinator/courses/:id
 * @desc    Update course details or instructor assignment
 * @access  Coordinator
 */
export const updateCourse = async (req, res, next) => {
  try {
    const course = await updateCourseService(req.params.id, req.body, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Course updated successfully.', data: course });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/coordinator/courses/:id/status
 * @desc    Archive or reactivate a course
 * @access  Coordinator
 */
export const setCourseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const course = await archiveCourseService(req.params.id, status, req.user._id.toString());
    return res.status(200).json({ success: true, message: `Course status set to "${status}".`, data: course });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Partner Company Management (FR-13 / UC-C02)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/coordinator/organizations
 * @desc    Register a new partner company (FR-13)
 * @access  Coordinator
 */
export const registerOrganization = async (req, res, next) => {
  try {
    const org = await registerOrganizationService(req.body, req.user._id.toString());
    return res.status(201).json({ success: true, message: 'Partner company registered successfully.', data: org });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PUT /api/v1/coordinator/organizations/:id
 * @desc    Update partner company details
 * @access  Coordinator
 */
export const updateOrganization = async (req, res, next) => {
  try {
    const org = await updateOrganizationService(req.params.id, req.body, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Partner company updated successfully.', data: org });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Internship Edit & Close (FR-10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/coordinator/internships
 * @desc    List all internships (coordinator view)
 * @access  Coordinator
 */
export const listInternships = async (req, res, next) => {
  try {
    const options = {
      status: req.query.status,
      companyId: req.query.companyId,
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await listAllInternshipsService(options);
    return res.status(200).json({
      success: true,
      message: 'Internships retrieved successfully.',
      data: result.internships,
      pagination: result.pagination,
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PUT /api/v1/coordinator/internships/:id
 * @desc    Edit internship posting
 * @access  Coordinator
 */
export const updateInternship = async (req, res, next) => {
  try {
    const internship = await updateInternshipService(req.params.id, req.body, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Internship updated successfully.', data: internship });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   PATCH /api/v1/coordinator/internships/:id/status
 * @desc    Open or close an internship posting
 * @access  Coordinator
 */
export const setInternshipStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const internship = await setInternshipStatusService(req.params.id, status, req.user._id.toString());
    return res.status(200).json({ success: true, message: `Internship set to "${status}".`, data: internship });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Interview Scheduling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/coordinator/applications/:id/interview
 * @desc    Schedule or update an interview for an application
 * @access  Coordinator
 */
export const scheduleInterview = async (req, res, next) => {
  try {
    const application = await scheduleInterviewService(req.params.id, req.body, req.user._id.toString());
    return res.status(200).json({ success: true, message: 'Interview scheduled successfully.', data: application });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * @route   GET /api/v1/coordinator/applications/:id/interview
 * @desc    Get interview schedule for an application
 * @access  Coordinator
 */
export const getInterviewSchedule = async (req, res, next) => {
  try {
    const application = await getInterviewScheduleService(req.params.id, req.user._id.toString());
    return res.status(200).json({ success: true, data: application });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};
