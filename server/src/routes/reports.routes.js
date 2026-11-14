/**
 * Reports Routes: CSV Export Generation
 *
 * Phase 12.5 — Reporting functionality
 *
 * SRS Traceability: FR-18, FR-26
 *
 * Authorization:
 *   - Progress reports: instructor, coordinator, admin
 *     (Instructor access is automatically scoped to assigned courses at service layer)
 *   - Applications reports: coordinator, admin only
 *
 * CSV Security:
 *   - Formula injection protection (service layer)
 *   - 10,000 row limit enforced (service layer)
 *   - Memory-bounded export (service layer)
 *
 * Base path: /api/v1/reports (registered in server.js)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getProgressReport,
  getApplicationsReport,
  getUsersReport,
  getForwardedApplications,
} from '../controllers/reports.controller.js';

const router = express.Router();

/**
 * @route   GET /api/v1/reports/progress
 * @desc    Generate student progress CSV report
 * @access  Protected — instructor, coordinator, admin
 * @query   courseCode (optional filter)
 * @returns CSV file download with appropriate headers
 */
router.get('/progress', authenticate, authorize('instructor', 'coordinator', 'admin'), getProgressReport);

/**
 * @route   GET /api/v1/reports/applications
 * @desc    Generate internship applications CSV report
 * @access  Protected — coordinator, admin
 * @query   status, startDate, endDate (optional filters)
 * @returns CSV file download with appropriate headers
 */
router.get('/applications', authenticate, authorize('coordinator', 'admin'), getApplicationsReport);

/**
 * @route   GET /api/v1/reports/users
 * @desc    Generate user directory CSV report (UC-A05, FR-18, FR-26)
 * @access  Protected — admin only
 * @query   role, active
 * @returns CSV file download with appropriate headers
 */
router.get('/users', authenticate, authorize('admin'), getUsersReport);

/**
 * @route   GET /api/v1/reports/internships/:id/forwarded
 * @desc    List forwarded applications for an internship (Section 12.3)
 * @access  Protected — coordinator, admin
 * @param   id - Internship ID
 */
router.get('/internships/:id/forwarded', authenticate, authorize('coordinator', 'admin'), getForwardedApplications);

export default router;
