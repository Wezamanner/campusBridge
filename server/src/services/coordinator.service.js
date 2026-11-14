/**
 * Coordinator Service: Organization approval workflow
 * Phase 12.5 - Coordinator functionality
 * 
 * Implements:
 * - Organization approval with atomic transaction (UC-C02, FR-13)
 * - Approval metadata tracking (approvedAt, approvedBy)
 * - Idempotent approval handling (safe repeated requests)
 */

import mongoose from 'mongoose';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { User } from '../models/User.js';

/**
 * Approve a partner organization (coordinator-only operation)
 * Uses MongoDB transaction to ensure atomic approval metadata updates
 * Idempotent: repeated approval of already-approved org returns success
 * 
 * Per Phase 12.5 architectural decision:
 * - Organization approval involves multi-field atomic update (approved, approvedAt, approvedBy)
 * - Transaction ensures all-or-nothing metadata consistency
 * - Verification confirmed: MongoDB Atlas replica set supports transactions
 * 
 * @param {string} organizationId - Target organization ID
 * @param {string} coordinatorUserId - ID of coordinator performing approval
 * @returns {Object} Approved organization document with metadata
 */
export const approveOrganization = async (organizationId, coordinatorUserId) => {
  // Validate organization ID
  if (!mongoose.Types.ObjectId.isValid(organizationId)) {
    const error = new Error('Invalid organization ID format.');
    error.statusCode = 400;
    throw error;
  }

  // Validate coordinator ID
  if (!mongoose.Types.ObjectId.isValid(coordinatorUserId)) {
    const error = new Error('Invalid coordinator ID.');
    error.statusCode = 400;
    throw error;
  }

  // Verify coordinator exists and has coordinator role (authorization verification)
  const coordinator = await User.findOne({
    _id: coordinatorUserId,
    role: 'coordinator',
    active: true,
    deletedAt: null, // Soft-delete policy: deleted users cannot perform actions
  });

  if (!coordinator) {
    const error = new Error('Coordinator not found or account is inactive/deleted.');
    error.statusCode = 403;
    throw error;
  }

  // Atomic conditional update: only approve if not already approved
  // This prevents race conditions where two coordinators approve simultaneously
  // The conditional query ensures only one approval can succeed
  const organization = await PartnerOrganization.findOneAndUpdate(
    {
      _id: organizationId,
      approved: false, // Only match organizations that are NOT yet approved
    },
    {
      approved: true,
      approvedAt: new Date(),
      approvedBy: coordinatorUserId,
    },
    {
      new: true, // Return the updated document
      runValidators: true, // Run model validators
    }
  );

  // If no document matched, determine whether it doesn't exist or was already approved
  if (!organization) {
    // Check if organization exists at all
    const existingOrg = await PartnerOrganization.findById(organizationId);
    
    if (!existingOrg) {
      const error = new Error('Partner organization not found.');
      error.statusCode = 404;
      throw error;
    }

    // Organization exists but was already approved - return idempotent success
    return {
      success: true,
      message: 'Organization already approved.',
      organization: existingOrg.toObject(),
      alreadyApproved: true,
    };
  }

  // Approval succeeded
  return {
    success: true,
    message: 'Organization approved successfully.',
    organization: organization.toObject(),
    alreadyApproved: false,
  };
};

/**
 * List organizations with filtering and pagination
 * Coordinator view: includes pending (approved: false) organizations
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.approved - Filter by approval status (true/false/undefined for all)
 * @param {string} options.search - Search by name or contact person
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20, max: 100)
 * @returns {Object} { organizations: Array, pagination: Object }
 */
export const listOrganizations = async (options = {}) => {
  const {
    approved,
    search,
    page = 1,
    limit = 20,
  } = options;

  // Validate pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Build filter query
  const filter = {};

  // Approval status filter
  if (typeof approved !== 'undefined') {
    filter.approved = approved === true || approved === 'true';
  }

  // Search filter (name or contact person, case-insensitive)
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { name: searchRegex },
      { contactPerson: searchRegex },
    ];
  }

  // Execute query with pagination
  const [organizations, totalCount] = await Promise.all([
    PartnerOrganization.find(filter)
      .populate('createdBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limitNum)
      .lean(),
    PartnerOrganization.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    organizations,
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
 * Get pending organizations count (coordinator dashboard metric)
 * 
 * @returns {number} Count of unapproved organizations
 */
export const getPendingOrganizationsCount = async () => {
  const count = await PartnerOrganization.countDocuments({ approved: false });
  return count;
};


// ─────────────────────────────────────────────────────────────────────────────
// Phase 13.1: Coordinator Internship & Application Management
// ─────────────────────────────────────────────────────────────────────────────

import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
// D4: Use the established Phase 12 event contract instead of direct Notification.create()
// The applicationEvents consumer in applicationNotification.service.js:
//   - handles Notification creation with the correct message text per status
//   - performs deduplication to prevent duplicate notifications
//   - is non-blocking (errors caught by its own listener)
// Direct Notification.create() calls are removed to avoid duplicate notifications.
import { applicationEvents } from './applicationNotification.service.js';

/**
 * Create internship posting (coordinator-only operation)
 * Phase 13.1 - UC-C03: Internship Creation
 * 
 * @param {Object} internshipData - Internship details
 * @param {string} coordinatorUserId - ID of coordinator creating internship
 * @returns {Object} Created internship document
 */
export const createInternship = async (internshipData, coordinatorUserId) => {
  // Validate coordinator ID
  if (!mongoose.Types.ObjectId.isValid(coordinatorUserId)) {
    const error = new Error('Invalid coordinator ID.');
    error.statusCode = 400;
    throw error;
  }

  // Verify coordinator exists and is active
  const coordinator = await User.findOne({
    _id: coordinatorUserId,
    role: 'coordinator',
    active: true,
    deletedAt: null,
  });

  if (!coordinator) {
    const error = new Error('Coordinator not found or account is inactive/deleted.');
    error.statusCode = 403;
    throw error;
  }

  // Validate company ID
  if (!mongoose.Types.ObjectId.isValid(internshipData.companyId)) {
    const error = new Error('Invalid company ID format.');
    error.statusCode = 400;
    throw error;
  }

  // Verify company exists and is approved
  const company = await PartnerOrganization.findOne({
    _id: internshipData.companyId,
    approved: true,
  });

  if (!company) {
    const error = new Error('Partner company not found or not yet approved.');
    error.statusCode = 400;
    throw error;
  }

  // Validate deadline is in future
  const deadline = new Date(internshipData.deadline);
  if (deadline <= new Date()) {
    const error = new Error('Application deadline must be in the future.');
    error.statusCode = 400;
    throw error;
  }

  // Create internship
  const internship = await Internship.create({
    companyId: internshipData.companyId,
    createdBy: coordinatorUserId,
    title: internshipData.title,
    type: internshipData.type,
    skills: internshipData.skills,
    description: internshipData.description,
    requirements: internshipData.requirements,
    location: internshipData.location || '',
    deadline,
    status: 'open',
  });

  return internship.toObject();
};

/**
 * List all applications with filtering (coordinator view)
 * Phase 13.1 - UC-C05: Application Review
 * 
 * @param {Object} options - Query options
 * @returns {Object} { applications: Array, pagination: Object }
 */
export const listAllApplications = async (options = {}) => {
  const {
    status,
    internshipId,
    studentId,
    page = 1,
    limit = 20,
  } = options;

  // Validate pagination
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  const filter = {};

  if (status) {
    const validStatuses = ['Submitted', 'Under review', 'Forwarded', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status filter.');
      error.statusCode = 400;
      throw error;
    }
    filter.status = status;
  }

  if (internshipId) {
    if (!mongoose.Types.ObjectId.isValid(internshipId)) {
      const error = new Error('Invalid internship ID format.');
      error.statusCode = 400;
      throw error;
    }
    filter.internshipId = internshipId;
  }

  // D3: studentId filter
  if (studentId) {
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      const error = new Error('Invalid student ID format.');
      error.statusCode = 400;
      throw error;
    }
    filter.studentId = studentId;
  }

  // Execute query
  const [applications, totalCount] = await Promise.all([
    Application.find(filter)
      .populate('internshipId', 'title type location deadline companyId')
      .populate({
        path: 'internshipId',
        populate: { path: 'companyId', select: 'name website' },
      })
      .populate('studentId', 'name email program year')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Application.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    applications,
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
 * Forward application to partner company
 * Phase 13.1 - UC-C06: Application Forwarding
 * 
 * Transitions: 'Submitted' → 'Under review' → 'Forwarded'
 *              OR 'Under review' → 'Forwarded'
 * 
 * @param {string} applicationId - Application ID
 * @param {string} coordinatorUserId - Coordinator performing action
 * @param {string} notes - Optional coordinator notes
 * @returns {Object} Updated application
 */
export const forwardApplication = async (applicationId, coordinatorUserId, notes = '') => {
  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const error = new Error('Invalid application ID format.');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(coordinatorUserId)) {
    const error = new Error('Invalid coordinator ID.');
    error.statusCode = 400;
    throw error;
  }

  // ── D1: Atomic duplicate-forward protection ──────────────────────────────
  // Use findOneAndUpdate with a conditional status filter so only one concurrent
  // request can win the race. Any request that finds the application already in
  // 'Forwarded' (or a terminal state) gets null back and receives a 409.
  //
  // For applications still in 'Submitted', the update auto-transitions through
  // 'Under review' in the same atomic write before setting 'Forwarded'.
  //
  // We use two separate atomic operations:
  //   Pass 1 – auto-transition Submitted → Under review (if needed)
  //   Pass 2 – transition Under review → Forwarded
  // Each uses $in to match only the expected prior state, ensuring concurrency safety.
  // ─────────────────────────────────────────────────────────────────────────

  // Pass 1: If the application is 'Submitted', atomically move it to 'Under review'.
  // If two requests arrive simultaneously, only one will find status === 'Submitted'
  // and push the intermediate entry; the other will find status already updated.
  await Application.findOneAndUpdate(
    { _id: applicationId, status: 'Submitted' },
    {
      $set: { status: 'Under review' },
      $push: {
        history: {
          status: 'Under review',
          byUserId: coordinatorUserId,
          notes: 'Auto-transitioned during forward action',
          at: new Date(),
        },
      },
    }
  );

  // Pass 2: Atomically move 'Under review' → 'Forwarded'.
  // The condition { status: 'Under review' } guarantees:
  //   - Only one concurrent forward can succeed for a given application.
  //   - Applications already 'Forwarded' or in terminal states return null → 409.
  const updated = await Application.findOneAndUpdate(
    { _id: applicationId, status: 'Under review' },
    {
      $set: { status: 'Forwarded' },
      $push: {
        history: {
          status: 'Forwarded',
          byUserId: coordinatorUserId,
          notes: notes.trim() || '',
          at: new Date(),
        },
      },
    },
    { new: true }
  )
    .populate('internshipId', 'title _id')
    .populate('studentId', '_id name');

  if (!updated) {
    // Determine why: not found vs wrong state
    const existing = await Application.findById(applicationId).lean();
    if (!existing) {
      const error = new Error('Application not found.');
      error.statusCode = 404;
      throw error;
    }
    // Application exists but is not in a forwardable state
    const error = new Error(
      `Cannot forward application. Current status: '${existing.status}'.`
    );
    error.statusCode = 409;
    throw error;
  }

  // ── D4: Emit Phase 12 event contract instead of direct Notification.create() ──
  // The applicationEvents consumer handles message formatting + deduplication.
  applicationEvents.emit('APPLICATION_STATUS_CHANGED', {
    applicationId: updated._id.toString(),
    studentId: updated.studentId._id.toString(),
    previousStatus: 'Under review',
    newStatus: 'Forwarded',
    internshipId: updated.internshipId._id?.toString(),
    internshipTitle: updated.internshipId.title,
    timestamp: new Date().toISOString(),
  });

  return updated.toObject();
};

/**
 * Record company decision on application
 * Phase 13.1 - UC-C07: Record Company Decision
 * 
 * Transitions: 'Forwarded' → 'Accepted' | 'Rejected'
 * Terminal states - no further transitions allowed
 * 
 * @param {string} applicationId - Application ID
 * @param {string} decision - 'Accepted' or 'Rejected'
 * @param {string} coordinatorUserId - Coordinator performing action
 * @param {string} notes - Optional decision notes
 * @returns {Object} Updated application
 */
export const recordCompanyDecision = async (applicationId, decision, coordinatorUserId, notes = '') => {
  // Validate decision
  if (!['Accepted', 'Rejected'].includes(decision)) {
    const error = new Error('Decision must be either "Accepted" or "Rejected".');
    error.statusCode = 400;
    throw error;
  }

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const error = new Error('Invalid application ID format.');
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(coordinatorUserId)) {
    const error = new Error('Invalid coordinator ID.');
    error.statusCode = 400;
    throw error;
  }

  // Fetch application
  const application = await Application.findById(applicationId)
    .populate('internshipId', 'title')
    .populate('studentId', '_id name');

  if (!application) {
    const error = new Error('Application not found.');
    error.statusCode = 404;
    throw error;
  }

  // Validate current status is 'Forwarded'
  if (application.status !== 'Forwarded') {
    const error = new Error(`Can only record decision for forwarded applications. Current status: '${application.status}'.`);
    error.statusCode = 409;
    throw error;
  }

  // Validate transition
  if (!application.canTransitionTo(decision)) {
    const error = new Error(`Cannot transition from '${application.status}' to '${decision}'.`);
    error.statusCode = 409;
    throw error;
  }

  // Update status
  application.status = decision;
  application.history.push({
    status: decision,
    byUserId: coordinatorUserId,
    notes: notes.trim() || '',
  });

  await application.save();

  // ── D4: Emit Phase 12 event contract instead of direct Notification.create() ──
  applicationEvents.emit('APPLICATION_STATUS_CHANGED', {
    applicationId: application._id.toString(),
    studentId: application.studentId._id.toString(),
    previousStatus: 'Forwarded',
    newStatus: decision,
    internshipId: application.internshipId._id?.toString(),
    internshipTitle: application.internshipId.title,
    timestamp: new Date().toISOString(),
  });

  return application.toObject();
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Coordinator — Course Management (FR-04 / UC-C01)
// ─────────────────────────────────────────────────────────────────────────────

import { Course } from '../models/Course.js';

/**
 * Create a course and assign an instructor (coordinator-only)
 * FR-04 / UC-C01
 */
export const createCourse = async (data, coordinatorUserId) => {
  const { code, title, description, instructorId } = data;

  if (!code || !title || !instructorId) {
    const err = new Error('Course code, title, and instructorId are required.');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(instructorId)) {
    const err = new Error('Invalid instructor ID format.');
    err.statusCode = 400;
    throw err;
  }

  // Verify instructor exists, is active, and has instructor role
  const instructor = await User.findOne({ _id: instructorId, role: 'instructor', active: true, deletedAt: null });
  if (!instructor) {
    const err = new Error('Instructor not found or account is inactive.');
    err.statusCode = 404;
    throw err;
  }

  try {
    const course = await Course.create({
      code: code.toUpperCase().trim(),
      title: title.trim(),
      description: description?.trim() || '',
      instructorId,
      createdBy: coordinatorUserId,
      status: 'active',
    });
    return course.toObject();
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('A course with this code already exists.');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
};

/**
 * Update a course (title, description, instructorId)
 * Also allows changing the assigned instructor
 */
export const updateCourse = async (courseId, updates, coordinatorUserId) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const err = new Error('Invalid course ID format.');
    err.statusCode = 400;
    throw err;
  }

  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['title', 'description', 'instructorId'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'instructorId') {
        if (!mongoose.Types.ObjectId.isValid(updates.instructorId)) {
          const err = new Error('Invalid instructor ID format.');
          err.statusCode = 400;
          throw err;
        }
        const instructor = await User.findOne({ _id: updates.instructorId, role: 'instructor', active: true, deletedAt: null });
        if (!instructor) {
          const err = new Error('Instructor not found or account is inactive.');
          err.statusCode = 404;
          throw err;
        }
      }
      course[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }

  await course.save();
  return course.toObject();
};

/**
 * Archive (or reactivate) a course
 */
export const archiveCourse = async (courseId, status, coordinatorUserId) => {
  if (!['active', 'archived'].includes(status)) {
    const err = new Error('Status must be "active" or "archived".');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const err = new Error('Invalid course ID format.');
    err.statusCode = 400;
    throw err;
  }

  const course = await Course.findByIdAndUpdate(courseId, { status }, { new: true });
  if (!course) {
    const err = new Error('Course not found.');
    err.statusCode = 404;
    throw err;
  }
  return course.toObject();
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Partner Company Registration & Update (FR-13 / UC-C02)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a new partner company (coordinator-only)
 */
export const registerOrganization = async (data, coordinatorUserId) => {
  const { name, contactPerson, email, phone, description, website } = data;

  if (!name || !contactPerson || !email) {
    const err = new Error('Company name, contact person, and email are required.');
    err.statusCode = 400;
    throw err;
  }

  try {
    const org = await PartnerOrganization.create({
      name: name.trim(),
      contactPerson: contactPerson.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      description: description?.trim() || '',
      website: website?.trim() || '',
      createdBy: coordinatorUserId,
      approved: false,
    });
    return org.toObject();
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('A company with this name already exists.');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
};

/**
 * Update partner company details (coordinator-only)
 */
export const updateOrganization = async (orgId, updates, coordinatorUserId) => {
  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    const err = new Error('Invalid organization ID format.');
    err.statusCode = 400;
    throw err;
  }

  const org = await PartnerOrganization.findById(orgId);
  if (!org) {
    const err = new Error('Partner organization not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['contactPerson', 'email', 'phone', 'description', 'website'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      org[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  }
  // name update allowed (but keep uniqueness validation)
  if (updates.name !== undefined) {
    org.name = updates.name.trim();
  }

  try {
    await org.save();
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('A company with this name already exists.');
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
  return org.toObject();
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Internship Edit & Close (FR-10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update internship posting (coordinator-only)
 */
export const updateInternship = async (internshipId, updates, coordinatorUserId) => {
  if (!mongoose.Types.ObjectId.isValid(internshipId)) {
    const err = new Error('Invalid internship ID format.');
    err.statusCode = 400;
    throw err;
  }

  const internship = await Internship.findById(internshipId);
  if (!internship) {
    const err = new Error('Internship not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['title', 'type', 'skills', 'description', 'requirements', 'location', 'deadline'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'deadline') {
        const deadline = new Date(updates.deadline);
        if (isNaN(deadline.getTime()) || deadline <= new Date()) {
          const err = new Error('Deadline must be a valid future date.');
          err.statusCode = 400;
          throw err;
        }
        internship.deadline = deadline;
      } else {
        internship[field] = updates[field];
      }
    }
  }

  await internship.save();
  return internship.toObject();
};

/**
 * Close (or reopen) internship (coordinator-only)
 */
export const setInternshipStatus = async (internshipId, status, coordinatorUserId) => {
  if (!['open', 'closed'].includes(status)) {
    const err = new Error('Internship status must be "open" or "closed".');
    err.statusCode = 400;
    throw err;
  }

  if (!mongoose.Types.ObjectId.isValid(internshipId)) {
    const err = new Error('Invalid internship ID format.');
    err.statusCode = 400;
    throw err;
  }

  const internship = await Internship.findByIdAndUpdate(internshipId, { status }, { new: true });
  if (!internship) {
    const err = new Error('Internship not found.');
    err.statusCode = 404;
    throw err;
  }
  return internship.toObject();
};

/**
 * List internships (coordinator view — all statuses)
 */
export const listAllInternships = async (options = {}) => {
  const { status, companyId, page = 1, limit = 20 } = options;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};
  if (status) {
    if (!['open', 'closed'].includes(status)) {
      const err = new Error('Status must be "open" or "closed".');
      err.statusCode = 400;
      throw err;
    }
    filter.status = status;
  }
  if (companyId) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      const err = new Error('Invalid company ID format.');
      err.statusCode = 400;
      throw err;
    }
    filter.companyId = companyId;
  }

  const [internships, totalCount] = await Promise.all([
    Internship.find(filter)
      .populate('companyId', 'name email contactPerson approved')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Internship.countDocuments(filter),
  ]);

  return {
    internships,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalCount,
      pageSize: limitNum,
      hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
      hasPrevPage: pageNum > 1,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 14: Interview Scheduling (Application.interviewSchedule)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule an interview for a Forwarded application (coordinator-only)
 * Uses the existing Phase 12.5 interviewSchedule subdocument
 */
export const scheduleInterview = async (applicationId, scheduleData, coordinatorUserId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const err = new Error('Invalid application ID format.');
    err.statusCode = 400;
    throw err;
  }

  const { date, time, meetingLink, instructionsForCandidate } = scheduleData;

  if (!date) {
    const err = new Error('Interview date is required.');
    err.statusCode = 400;
    throw err;
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    const err = new Error('Invalid interview date format.');
    err.statusCode = 400;
    throw err;
  }

  if (meetingLink && !/^https?:\/\/.+/.test(meetingLink)) {
    const err = new Error('Meeting link must be a valid URL starting with http:// or https://');
    err.statusCode = 400;
    throw err;
  }

  const application = await Application.findById(applicationId)
    .populate('internshipId', 'title _id')
    .populate('studentId', '_id name');

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  if (!['Forwarded', 'Under review'].includes(application.status)) {
    const err = new Error('Interviews can only be scheduled for applications in "Forwarded" or "Under review" status.');
    err.statusCode = 409;
    throw err;
  }

  application.interviewSchedule = {
    date: parsedDate,
    time: time?.trim() || '',
    meetingLink: meetingLink?.trim() || '',
    instructionsForCandidate: instructionsForCandidate?.trim() || '',
    scheduledBy: coordinatorUserId,
    scheduledAt: new Date(),
  };

  await application.save();

  // Notify student via event contract
  applicationEvents.emit('APPLICATION_STATUS_CHANGED', {
    applicationId: application._id.toString(),
    studentId: application.studentId._id.toString(),
    newStatus: 'Under review',
    internshipId: application.internshipId._id?.toString(),
    internshipTitle: application.internshipId.title,
    timestamp: new Date().toISOString(),
    customMessage: `An interview has been scheduled for your application for "${application.internshipId.title}". Date: ${parsedDate.toLocaleDateString()}.`,
  });

  return application.toObject();
};

/**
 * Get interview schedule for an application
 */
export const getInterviewSchedule = async (applicationId, coordinatorUserId) => {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    const err = new Error('Invalid application ID format.');
    err.statusCode = 400;
    throw err;
  }

  const application = await Application.findById(applicationId)
    .select('+interviewSchedule')
    .populate('internshipId', 'title companyId')
    .populate('studentId', 'name email cv')
    .lean();

  if (!application) {
    const err = new Error('Application not found.');
    err.statusCode = 404;
    throw err;
  }

  return application;
};
