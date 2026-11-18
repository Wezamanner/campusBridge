/**
 * At-Risk Student Monitoring Controller
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance (Integrated with Phases 4–9)
 *
 * SRS Traceability:
 *   UC-I03 (Monitor at-risk students) · FR-16 (Instructor dashboard) · FR-44 (Dashboard analytics)
 *
 * Authorization Model (enforced server-side, never from client input):
 *   - Only instructors may access these endpoints.
 *   - Instructors may only access students enrolled in their own assigned courses.
 *   - Student data is never exposed to other students.
 *   - Coordinator and admin access is not defined in UC-I03 or the approved API contract.
 *
 * Response Envelope: All responses follow the shared CampusBridge standard
 *   { success, message, data, pagination } per shared-api-standards.md
 */

import mongoose from 'mongoose';
import {
  getAtRiskStudents,
  getStudentRiskAssessment,
  getMonitoringSummary,
} from '../services/atRisk.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// 5.2: Monitor At-Risk Students — UC-I03, FR-16, FR-44
// GET /api/v1/instructor/at-risk
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/instructor/at-risk
 * @desc    List students flagged as at-risk across all courses assigned to the instructor.
 *          Flags: lowProgress, missedDeadlines, inactivity (UC-I03).
 *          Indicators with unavailable data return 'insufficient_data' (not suppressed).
 * @access  Protected — instructor only; course ownership enforced server-side
 */
export const listAtRiskStudents = async (req, res, next) => {
  try {
    const instructorId = req.user._id.toString();
    const courseCodeFilter = req.query.courseCode
      ? req.query.courseCode.toString().toUpperCase().trim()
      : undefined;

    const { atRiskStudents, summary, dataAvailability } = await getAtRiskStudents(instructorId, {
      courseCode: courseCodeFilter,
    });

    // Apply optional flag filter
    let results = atRiskStudents;

    // Filter by specific flag being 'flagged'
    if (req.query.flag) {
      const allowedFlags = ['lowProgress', 'missedDeadlines', 'inactivity'];
      const requestedFlag = req.query.flag.toString().trim();
      if (allowedFlags.includes(requestedFlag)) {
        results = results.filter((s) => s.flags[requestedFlag] === 'flagged');
      }
    }

    // Map to response shape (strip internal indicator detail from list view for conciseness)
    const responseData = results.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      program: s.program,
      year: s.year,
      courseId: s.courseId,
      courseCode: s.courseCode,
      courseTitle: s.courseTitle,
      enrolledAt: s.enrolledAt,
      flagCount: s.flagCount,
      flags: s.flags,
      riskReasons: buildRiskReasonSummary(s.indicators),
    }));

    return res.status(200).json({
      success: true,
      message:
        atRiskStudents.length === 0
          ? 'No at-risk students identified in your assigned courses.'
          : `${atRiskStudents.length} at-risk student(s) identified across assigned courses.`,
      data: {
        atRiskStudents: responseData,
        summary,
        dataAvailability,
      },
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Individual Student Risk Assessment
// GET /api/v1/instructor/at-risk/:studentId?courseId=...
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/instructor/at-risk/:studentId
 * @desc    Retrieve full at-risk assessment for a single student in a specific course.
 *          Course must be assigned to the authenticated instructor (enforced server-side).
 * @access  Protected — instructor only
 * @param   :studentId — MongoDB ObjectId of the student
 * @query   courseId   — Required: Which course to assess (must belong to instructor)
 */
export const getStudentAtRiskDetail = async (req, res, next) => {
  try {
    const instructorId = req.user._id.toString();
    const { studentId } = req.params;
    const { courseId } = req.query;

    // Validate ObjectIds
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format.',
      });
    }

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid courseId query parameter is required.',
      });
    }

    // Service enforces course ownership (throws 404 if not assigned to instructor)
    const assessment = await getStudentRiskAssessment(studentId, courseId, instructorId);

    return res.status(200).json({
      success: true,
      message: `At-risk assessment retrieved for ${assessment.studentName} in ${assessment.courseCode}.`,
      data: assessment,
      pagination: null,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring Summary (for dashboard stat cards — FR-16, FR-44)
// GET /api/v1/instructor/at-risk/summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/instructor/at-risk/summary
 * @desc    Returns lightweight monitoring statistics for the instructor dashboard:
 *          total enrolled, total at-risk, data availability report.
 *          Feeds the FR-16 / FR-44 "At-Risk Students" stat card.
 * @access  Protected — instructor only
 */
export const getAtRiskSummary = async (req, res, next) => {
  try {
    const instructorId = req.user._id.toString();
    const { summary, dataAvailability } = await getMonitoringSummary(instructorId);

    return res.status(200).json({
      success: true,
      message: 'At-risk monitoring summary retrieved.',
      data: {
        summary,
        dataAvailability,
      },
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Available Risk Indicators Metadata
// GET /api/v1/instructor/at-risk/indicators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/instructor/at-risk/indicators
 * @desc    Returns metadata about all defined risk indicators:
 *          which are available, data sources, and evaluation rules.
 * @access  Protected — instructor only
 */
export const getRiskIndicators = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Available risk indicators retrieved.',
      data: {
        indicators: [
          {
            id: 'inactivity',
            label: 'Platform Inactivity',
            description:
              'Student has no recorded platform activity in ActivityLog, logins, or submissions. Flagged when no activity has been recorded at all.',
            srsReference: 'UC-I03 ("inactivity")',
            dataSource: 'ActivityLog, User logins, and Submission timestamps',
            available: true,
            blockedBy: null,
          },
          {
            id: 'lowProgress',
            label: 'Low Course Progress',
            description:
              'Student has 0% progress in a course where assignments exist. Returns insufficient_data when no assignments exist in the course.',
            srsReference: 'UC-I03 ("low progress"), FR-09',
            dataSource: 'Progress collection',
            available: true,
            note: 'Evaluated using authoritative assignment and submission progress records.',
            blockedBy: null,
          },
          {
            id: 'missedDeadlines',
            label: 'Missed Assignment Deadlines',
            description:
              'Student has at least one past-deadline assignment with no submission. Returns insufficient_data when no assignment records exist in the course.',
            srsReference: 'UC-I03 ("missed deadlines"), FR-06, FR-07',
            dataSource: 'Assignment + Submission collections',
            available: true,
            note: 'Future deadlines and submitted assignments are not counted as missed.',
            blockedBy: null,
          },
          {
            id: 'assignmentPerformance',
            label: 'Assignment Performance Analytics',
            description:
              'Assignment submission and grading performance metrics across assigned courses.',
            srsReference: 'FR-08, FR-09',
            dataSource: 'Assignment, Submission, and Grade collections',
            available: true,
            blockedBy: null,
          },
          {
            id: 'progressAnalytics',
            label: 'Progress Analytics',
            description:
              'Tracked course completion metrics and average score analytics.',
            srsReference: 'FR-09',
            dataSource: 'Progress service and collection',
            available: true,
            blockedBy: null,
          },
        ],
      },
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a human-readable array of risk reason strings from indicator evaluations.
 * Only includes 'flagged' indicators in the summary to keep list view concise.
 */
function buildRiskReasonSummary(indicators) {
  const reasons = [];
  for (const [key, evaluation] of Object.entries(indicators)) {
    if (evaluation.status === 'flagged') {
      reasons.push({ indicator: key, reason: evaluation.reason });
    }
  }
  return reasons;
}
