/**
 * At-Risk Student Monitoring Controller
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance
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
          ? 'No at-risk students identified in your assigned courses. Indicators may be insufficient_data if Phase 6–9 are not yet active.'
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
 *          which are available, which are blocked by missing phases,
 *          and what each flag evaluates.
 *          Allows the frontend to render accurate data-availability notices.
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
              'Student has no recorded platform activity in the ActivityLog. Flagged when no actions have been logged at all.',
            srsReference: 'UC-I03 ("inactivity")',
            dataSource: 'ActivityLog collection',
            available: true,
            blockedBy: null,
          },
          {
            id: 'lowProgress',
            label: 'Low Course Progress',
            description:
              'Student has 0% progress in a course where assignments exist, based on the Progress collection. Returns insufficient_data when no Progress record exists (requires Phase 7 submissions and Phase 8 grading to populate).',
            srsReference: 'UC-I03 ("low progress"), FR-09',
            dataSource: 'Progress collection (populated by Phase 7 & 8)',
            available: true,
            note: 'Data availability depends on whether Progress records have been created by submission and grading activity.',
            blockedBy: ['Phase 7: Student Submissions', 'Phase 8: Grading Queue'],
          },
          {
            id: 'missedDeadlines',
            label: 'Missed Assignment Deadlines',
            description:
              'Student has at least one past-deadline assignment with no submission. Returns insufficient_data when no past-deadline assignments exist in the course (requires Phase 6 assignment creation).',
            srsReference: 'UC-I03 ("missed deadlines"), FR-06, FR-07',
            dataSource: 'Assignment + Submission collections (populated by Phase 6 & 7)',
            available: true,
            note: 'Only evaluable once at least one assignment with a past deadline exists (Phase 6 dependency).',
            blockedBy: [
              'Phase 6: Assignment Authoring',
              'Phase 7: Student Submissions',
            ],
          },
          {
            id: 'assignmentPerformance',
            label: 'Assignment Performance Analytics',
            description:
              'Score trends, feedback patterns, and submission velocity. Not yet implemented.',
            srsReference: 'FR-08, FR-09 (future)',
            dataSource: 'Grade collection (Phase 8 dependency)',
            available: false,
            blockedBy: [
              'Phase 6: Assignment Authoring',
              'Phase 7: Student Submissions',
              'Phase 8: Grading Queue',
            ],
          },
          {
            id: 'progressAnalytics',
            label: 'Progress Trend Analytics',
            description:
              'Advanced computed metrics including trend lines and deadline velocity. Not yet implemented.',
            srsReference: 'FR-09 (future Phase 9)',
            dataSource: 'Progress Analytics Service (Phase 9 dependency)',
            available: false,
            blockedBy: ['Phase 9: Student Progress Analytics'],
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
