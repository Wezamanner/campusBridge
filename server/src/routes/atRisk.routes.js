/**
 * At-Risk Student Monitoring Routes
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability: UC-I03, FR-16, FR-44
 *
 * Authorization:
 *   ALL routes require:
 *     1. Valid JWT (authenticate)
 *     2. Role === 'instructor' (authorize)
 *
 *   Course ownership is enforced at the service layer, not trusting any
 *   client-supplied instructor ID. Only req.user._id from the verified JWT
 *   is used to scope course queries.
 *
 * Base path: /api/v1/instructor/at-risk (registered in server.js)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listAtRiskStudents,
  getStudentAtRiskDetail,
  getAtRiskSummary,
  getRiskIndicators,
} from '../controllers/atRisk.controller.js';

const router = express.Router();

// Apply authentication and instructor-role authorization to ALL routes in this file
router.use(authenticate, authorize('instructor'));

/**
 * @route   GET /api/v1/instructor/at-risk/summary
 * @desc    Lightweight monitoring summary for dashboard stat cards (FR-16, FR-44)
 * @access  instructor
 *
 * Note: This route must be registered BEFORE /:studentId to prevent
 *       'summary' from being treated as a studentId parameter.
 */
router.get('/summary', getAtRiskSummary);

/**
 * @route   GET /api/v1/instructor/at-risk/indicators
 * @desc    Metadata about all defined risk indicators and their data availability
 * @access  instructor
 */
router.get('/indicators', getRiskIndicators);

/**
 * @route   GET /api/v1/instructor/at-risk
 * @desc    List all at-risk students across assigned courses (UC-I03, FR-16)
 * @query   courseCode  — Filter by course code (e.g. CS301)
 * @query   flag        — Filter by specific flag: lowProgress | missedDeadlines | inactivity
 * @access  instructor
 */
router.get('/', listAtRiskStudents);

/**
 * @route   GET /api/v1/instructor/at-risk/:studentId
 * @desc    Full at-risk assessment for a specific student in a specific course (UC-I03)
 * @query   courseId — Required MongoDB ObjectId of the course
 * @access  instructor (course must be assigned to this instructor)
 */
router.get('/:studentId', getStudentAtRiskDetail);

export default router;
