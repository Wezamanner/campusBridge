/**
 * Reports Service: CSV export generation
 * Phase 12.5 - Reporting functionality
 * 
 * Implements:
 * - Progress reporting (instructor-scoped, coordinator, admin)
 * - Application reporting (coordinator, admin)
 * - Backend-enforced 10,000 row maximum (approved decision)
 * - Bounded-memory CSV generation
 * - Formula injection protection (CSV escaping)
 * - Role-based data scoping
 */

import { Enrollment } from '../models/Enrollment.js';
import { Progress } from '../models/Progress.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { Internship } from '../models/Internship.js';

// Backend-enforced maximum row limit per approved Phase 12.5 decision
const MAX_CSV_ROWS = 10000;

/**
 * Escape CSV field to prevent formula injection (SEC-14)
 * Protects against Excel/LibreOffice formula execution attacks
 * 
 * @param {any} value - Field value to escape
 * @returns {string} Safely escaped CSV field
 */
const escapeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  let strValue = String(value);

  // Formula injection protection: escape leading special characters
  // Characters: = + - @ \t \r (can trigger formula execution in spreadsheet apps)
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerousChars.some(char => strValue.startsWith(char))) {
    strValue = `'${strValue}`; // Prepend single quote to neutralize formula
  }

  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
    strValue = `"${strValue.replace(/"/g, '""')}"`;
  }

  return strValue;
};

/**
 * Convert array of objects to CSV string
 * 
 * @param {Array} rows - Array of data objects
 * @param {Array} headers - Array of column header names
 * @returns {string} CSV formatted string with headers
 */
const arrayToCsv = (rows, headers) => {
  if (!rows || rows.length === 0) {
    return headers.join(',') + '\n'; // Return headers only if no data
  }

  const csvRows = [headers.join(',')]; // Header row

  for (const row of rows) {
    const values = headers.map(header => escapeCsvField(row[header]));
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Generate progress report CSV
 * Includes student enrollment, submission progress, and average scores
 * 
 * Access control:
 * - Instructor: only courses they teach (scoped by instructorId)
 * - Coordinator: all courses (no scope restriction)
 * - Admin: all courses (no scope restriction)
 * 
 * @param {Object} options - Report options
 * @param {string} options.userRole - Role of requesting user (instructor, coordinator, admin)
 * @param {string} options.userId - ID of requesting user (for instructor scoping)
 * @param {string} options.courseCode - Optional: filter by specific course code
 * @returns {string} CSV formatted progress report
 */
export const generateProgressReport = async (options = {}) => {
  const { userRole, userId, courseCode } = options;

  // Validate required parameters
  if (!userRole || !userId) {
    const error = new Error('User role and ID are required for report generation.');
    error.statusCode = 400;
    throw error;
  }

  // Build course filter based on role (role-based data scoping)
  const courseFilter = { status: 'active' }; // Only active courses

  if (userRole === 'instructor') {
    // Instructor: only courses they teach (enforced scoping)
    courseFilter.instructorId = userId;
  }
  // Coordinator and admin: no instructor scoping (can see all courses)

  // Optional course code filter
  if (courseCode) {
    courseFilter.code = courseCode.toUpperCase().trim();
  }

  // Fetch courses matching filter
  const courses = await Course.find(courseFilter)
    .populate('instructorId', 'name email')
    .select('_id code title instructorId')
    .lean();

  if (courses.length === 0) {
    // No courses found - return empty report
    const headers = ['Course Code', 'Course Title', 'Instructor', 'Student Name', 'Student Email', 'Submitted', 'Total', 'Progress %', 'Average Score'];
    return arrayToCsv([], headers);
  }

  const courseIds = courses.map(c => c._id);

  // BOUNDED MEMORY PROTECTION: Check enrollment count BEFORE loading data
  // Prevents unbounded memory consumption from large datasets
  const totalEnrollments = await Enrollment.countDocuments({ courseId: { $in: courseIds } });
  
  if (totalEnrollments > MAX_CSV_ROWS) {
    const error = new Error(`Report would exceed maximum limit of ${MAX_CSV_ROWS} rows. Found ${totalEnrollments} enrollments. Please apply filters to reduce scope.`);
    error.statusCode = 400;
    throw error;
  }

  // Now safe to load data with bounded result set
  // Fetch enrollments for these courses (exclude soft-deleted students per policy)
  const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
    .limit(MAX_CSV_ROWS) // Safety limit at query level
    .populate({
      path: 'studentId',
      match: { deletedAt: null }, // Soft-delete policy: exclude deleted students
      select: 'name email',
    })
    .populate('courseId', 'code title instructorId')
    .lean();

  // Filter out enrollments where student was deleted (populate returns null)
  const validEnrollments = enrollments.filter(e => e.studentId !== null);

  // Fetch progress records for these courses
  const progressRecords = await Progress.find({ courseId: { $in: courseIds } })
    .select('studentId courseId submittedCount totalAssignments percent averageScore')
    .lean();

  // Build progress lookup map: studentId_courseId -> progress
  const progressMap = new Map();
  for (const progress of progressRecords) {
    const key = `${progress.studentId}_${progress.courseId}`;
    progressMap.set(key, progress);
  }

  // Build instructor lookup map: courseId -> instructor name
  const instructorMap = new Map();
  for (const course of courses) {
    instructorMap.set(course._id.toString(), course.instructorId?.name || 'N/A');
  }

  // Build report rows
  const reportRows = [];

  for (const enrollment of validEnrollments) {
    const courseId = enrollment.courseId._id.toString();
    const studentId = enrollment.studentId._id.toString();
    const progressKey = `${studentId}_${courseId}`;
    const progress = progressMap.get(progressKey);

    reportRows.push({
      'Course Code': enrollment.courseId.code,
      'Course Title': enrollment.courseId.title,
      'Instructor': instructorMap.get(courseId),
      'Student Name': enrollment.studentId.name,
      'Student Email': enrollment.studentId.email,
      'Submitted': progress?.submittedCount ?? 0,
      'Total': progress?.totalAssignments ?? 0,
      'Progress %': progress?.percent ?? 0,
      'Average Score': progress?.averageScore ?? 0,
    });
  }

  // Final safety check: Verify row count after filtering
  // (Should not exceed due to pre-query count, but defensive check for populate filtering)
  if (reportRows.length > MAX_CSV_ROWS) {
    const error = new Error(`Report generated ${reportRows.length} rows after filtering, exceeding maximum of ${MAX_CSV_ROWS}.`);
    error.statusCode = 500;
    throw error;
  }

  // Generate CSV
  const headers = ['Course Code', 'Course Title', 'Instructor', 'Student Name', 'Student Email', 'Submitted', 'Total', 'Progress %', 'Average Score'];
  return arrayToCsv(reportRows, headers);
};

/**
 * Generate applications report CSV
 * Includes student applications with status and internship details
 * 
 * Access control:
 * - Coordinator: all applications
 * - Admin: all applications
 * - Instructor: NOT authorized (applications are not course-related)
 * 
 * Security: Does NOT expose reviewerNotes (private field with select: false)
 * 
 * @param {Object} options - Report options
 * @param {string} options.userRole - Role of requesting user (coordinator, admin)
 * @param {string} options.status - Optional: filter by application status
 * @param {Date} options.startDate - Optional: filter by appliedAt >= startDate
 * @param {Date} options.endDate - Optional: filter by appliedAt <= endDate
 * @returns {string} CSV formatted applications report
 */
export const generateApplicationsReport = async (options = {}) => {
  const { userRole, status, startDate, endDate } = options;

  // Validate required parameters
  if (!userRole) {
    const error = new Error('User role is required for report generation.');
    error.statusCode = 400;
    throw error;
  }

  // Authorization check: only coordinator and admin
  if (!['coordinator', 'admin'].includes(userRole)) {
    const error = new Error('Access denied. Applications report requires coordinator or admin role.');
    error.statusCode = 403;
    throw error;
  }

  // Build application filter
  const filter = {};

  // Status filter
  if (status) {
    const allowedStatuses = ['Submitted', 'Under review', 'Forwarded', 'Accepted', 'Rejected', 'Withdrawn'];
    if (!allowedStatuses.includes(status)) {
      const error = new Error(`Invalid status filter. Allowed: ${allowedStatuses.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    filter.status = status;
  }

  // Date range filter
  if (startDate || endDate) {
    filter.appliedAt = {};
    if (startDate) {
      filter.appliedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.appliedAt.$lte = new Date(endDate);
    }
  }

  // BOUNDED MEMORY PROTECTION: Check application count BEFORE loading data
  const totalApplications = await Application.countDocuments(filter);
  
  if (totalApplications > MAX_CSV_ROWS) {
    const error = new Error(`Report would exceed maximum limit of ${MAX_CSV_ROWS} rows. Found ${totalApplications} applications. Please apply filters to reduce scope.`);
    error.statusCode = 400;
    throw error;
  }

  // Now safe to load data with bounded result set
  // Fetch applications (exclude reviewerNotes - private field per SEC-13)
  // Note: reviewerNotes has select: false, so it won't be included by default
  const applications = await Application.find(filter)
    .limit(MAX_CSV_ROWS) // Safety limit at query level
    .populate({
      path: 'studentId',
      match: { deletedAt: null }, // Soft-delete policy: exclude deleted students
      select: 'name email program year',
    })
    .populate('internshipId', 'title type location companyId')
    .select('studentId internshipId status appliedAt')
    .sort({ appliedAt: -1 })
    .lean();

  // Filter out applications where student was deleted
  const validApplications = applications.filter(app => app.studentId !== null);

  // Final safety check: Verify row count after filtering
  if (validApplications.length > MAX_CSV_ROWS) {
    const error = new Error(`Report generated ${validApplications.length} rows after filtering, exceeding maximum of ${MAX_CSV_ROWS}.`);
    error.statusCode = 500;
    throw error;
  }

  // Build report rows
  const reportRows = validApplications.map(app => ({
    'Application ID': app._id.toString(),
    'Student Name': app.studentId.name,
    'Student Email': app.studentId.email,
    'Program': app.studentId.program || 'N/A',
    'Year': app.studentId.year || 'N/A',
    'Internship Title': app.internshipId?.title || 'N/A',
    'Internship Type': app.internshipId?.type || 'N/A',
    'Location': app.internshipId?.location || 'N/A',
    'Status': app.status,
    'Applied At': app.appliedAt ? new Date(app.appliedAt).toISOString() : 'N/A',
  }));

  // Generate CSV
  const headers = ['Application ID', 'Student Name', 'Student Email', 'Program', 'Year', 'Internship Title', 'Internship Type', 'Location', 'Status', 'Applied At'];
  return arrayToCsv(reportRows, headers);
};

/**
 * Generate users report CSV (UC-A05, FR-18, FR-26)
 * Available to Administrator.
 *
 * @param {Object} options - Report options (role, active)
 * @returns {string} CSV formatted user directory report
 */
export const generateUsersReport = async (options = {}) => {
  const { role, active } = options;

  const filter = { deletedAt: null };

  if (role) {
    const validRoles = ['student', 'instructor', 'coordinator', 'admin'];
    if (!validRoles.includes(role)) {
      const error = new Error('Invalid role filter.');
      error.statusCode = 400;
      throw error;
    }
    filter.role = role;
  }

  if (typeof active !== 'undefined') {
    filter.active = active === true || active === 'true';
  }

  // Pre-query count check
  const totalUsers = await User.countDocuments(filter);
  if (totalUsers > MAX_CSV_ROWS) {
    const error = new Error(`Report would exceed maximum limit of ${MAX_CSV_ROWS} rows. Found ${totalUsers} users.`);
    error.statusCode = 400;
    throw error;
  }

  const users = await User.find(filter)
    .limit(MAX_CSV_ROWS)
    .sort({ createdAt: -1 })
    .lean();

  const reportRows = users.map(u => ({
    'User ID': u._id.toString(),
    'Name': u.name,
    'Email': u.email,
    'Role': u.role,
    'Status': u.active ? 'Active' : 'Inactive',
    'Department': u.department || 'N/A',
    'Program': u.program || 'N/A',
    'Year': u.year || 'N/A',
    'Created At': u.createdAt ? new Date(u.createdAt).toISOString() : 'N/A',
  }));

  const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Department', 'Program', 'Year', 'Created At'];
  return arrayToCsv(reportRows, headers);
};

/**
 * Get forwarded applications for an internship (Section 12.3: GET /internships/:id/forwarded)
 * Coordinator and Administrator access.
 *
 * @param {string} internshipId - Internship ID
 * @returns {Array} List of forwarded applications
 */
export const getForwardedApplicationsForInternship = async (internshipId) => {
  if (!internshipId) {
    const error = new Error('Internship ID is required.');
    error.statusCode = 400;
    throw error;
  }

  const applications = await Application.find({
    internshipId,
    status: { $in: ['Forwarded', 'Accepted', 'Rejected'] },
  })
    .populate({
      path: 'studentId',
      select: 'name email program year cv',
    })
    .populate('internshipId', 'title companyId')
    .sort({ appliedAt: -1 })
    .lean();

  return applications;
};

