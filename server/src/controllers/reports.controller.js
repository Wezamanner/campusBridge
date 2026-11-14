/**
 * Reports Controller: CSV export generation
 *
 * Phase 12.5 — Reporting functionality
 *
 * SRS Traceability:
 *   FR-18 (Staff export CSV reports) · FR-26 (Coordinator CSV exports)
 *
 * Authorization:
 *   - Progress reports: Instructor (own courses), Coordinator (all), Admin (all)
 *   - Applications reports: Coordinator, Admin only (students not authorized)
 *   - Instructor data automatically scoped to assigned courses (server-side enforcement)
 *
 * CSV Security:
 *   - Formula injection protection (service layer)
 *   - 10,000 row limit enforced (service layer)
 *   - PII protection: Reports contain authorized staff-visible student data
 *
 * Response: Raw CSV content with appropriate headers for file download
 */

import * as reportsService from '../services/reports.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/reports/progress
// Generate student progress report CSV (FR-18, FR-26)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/progress
 * @desc    Generate CSV report of student enrollment progress.
 *          Includes submission counts, progress percentages, and average scores.
 *          Instructor access automatically scoped to assigned courses.
 *          Coordinator and admin have full platform access.
 * @access  Protected — instructor, coordinator, admin
 * @query   courseCode (optional: filter by specific course)
 * @returns CSV file download with Content-Type and Content-Disposition headers
 */
export const getProgressReport = async (req, res, next) => {
  try {
    // Extract authenticated user context (never trust client-supplied user data)
    const userRole = req.user.role;
    const userId = req.user._id.toString();

    // Authorization check: Only instructor, coordinator, admin
    const authorizedRoles = ['instructor', 'coordinator', 'admin'];
    if (!authorizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Progress reports require one of [${authorizedRoles.join(', ')}]. Your role is '${userRole}'.`,
      });
    }

    // Parse and validate query parameters
    const options = {
      userRole,
      userId,
      courseCode: req.query.courseCode ? req.query.courseCode.toString().trim() : undefined,
    };

    // Delegate to service layer (handles role-based scoping, CSV generation, memory protection)
    const csvContent = await reportsService.generateProgressReport(options);

    // Generate filename with current date
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `progress-report-${timestamp}.csv`;

    // Set CSV download headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Return raw CSV content (not wrapped in JSON envelope)
    return res.status(200).send(csvContent);
  } catch (error) {
    // Service layer throws errors with statusCode for known failures
    if (error.statusCode) {
      // CSV generation failed - return JSON error response instead of CSV
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/reports/applications
// Generate internship applications report CSV (FR-18, FR-26)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/applications
 * @desc    Generate CSV report of student internship applications.
 *          Includes application status, student details, and internship information.
 *          Coordinator and admin roles only (instructors not authorized).
 *          Does NOT expose reviewerNotes (private field per SEC-13).
 * @access  Protected — coordinator, admin only
 * @query   status (optional: filter by application status)
 * @query   startDate (optional: filter by appliedAt >= startDate, ISO 8601 format)
 * @query   endDate (optional: filter by appliedAt <= endDate, ISO 8601 format)
 * @returns CSV file download with Content-Type and Content-Disposition headers
 */
export const getApplicationsReport = async (req, res, next) => {
  try {
    // Extract authenticated user context
    const userRole = req.user.role;

    // Authorization check: Only coordinator and admin
    const authorizedRoles = ['coordinator', 'admin'];
    if (!authorizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Applications reports require one of [${authorizedRoles.join(', ')}]. Your role is '${userRole}'.`,
      });
    }

    // Parse and validate query parameters
    const options = {
      userRole,
      status: req.query.status ? req.query.status.toString().trim() : undefined,
      startDate: req.query.startDate ? req.query.startDate.toString().trim() : undefined,
      endDate: req.query.endDate ? req.query.endDate.toString().trim() : undefined,
    };

    // Validate date formats if provided (ISO 8601)
    if (options.startDate) {
      const startDateObj = new Date(options.startDate);
      if (isNaN(startDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format. Use ISO 8601 format (e.g., 2026-11-01).',
        });
      }
      options.startDate = startDateObj;
    }

    if (options.endDate) {
      const endDateObj = new Date(options.endDate);
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format. Use ISO 8601 format (e.g., 2026-11-30).',
        });
      }
      options.endDate = endDateObj;
    }

    // Validate date range logic
    if (options.startDate && options.endDate && options.startDate > options.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range: startDate cannot be after endDate.',
      });
    }

    // Delegate to service layer (handles authorization, CSV generation, memory protection)
    const csvContent = await reportsService.generateApplicationsReport(options);

    // Generate filename with current date
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `applications-report-${timestamp}.csv`;

    // Set CSV download headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Return raw CSV content (not wrapped in JSON envelope)
    return res.status(200).send(csvContent);
  } catch (error) {
    // Service layer throws errors with statusCode for known failures
    if (error.statusCode) {
      // CSV generation failed - return JSON error response instead of CSV
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/reports/users
// Generate user directory report CSV (UC-A05, FR-18, FR-26)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/users
 * @desc    Generate CSV report of system users with role filtering.
 *          Administrator only.
 * @access  Protected — admin only
 * @query   role, active
 * @returns CSV file download
 */
export const getUsersReport = async (req, res, next) => {
  try {
    const options = {
      role: req.query.role ? req.query.role.toString().trim() : undefined,
      active: req.query.active !== undefined ? req.query.active : undefined,
    };

    const csvContent = await reportsService.generateUsersReport(options);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `users-report-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).send(csvContent);
  } catch (error) {
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
// GET /api/v1/reports/internships/:id/forwarded & GET /api/v1/internships/:id/forwarded
// List forwarded applications for an internship (Section 12.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/internships/:id/forwarded
 * @desc    Get forwarded applications for a specific internship.
 * @access  Protected — coordinator, admin
 * @param   id - Internship ID
 */
export const getForwardedApplications = async (req, res, next) => {
  try {
    const internshipId = req.params.id;
    const applications = await reportsService.getForwardedApplicationsForInternship(internshipId);

    return res.status(200).json({
      success: true,
      message: `Retrieved ${applications.length} forwarded application(s).`,
      data: applications,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

