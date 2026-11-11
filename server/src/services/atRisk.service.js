/**
 * At-Risk Student Monitoring Service
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Authority:
 *   UC-I03: "The system lists flagged students (low progress, missed deadlines, inactivity)"
 *   FR-16:  Instructor dashboard includes at-risk student count
 *   FR-44:  Dashboard analytics includes risk/grading figures
 *
 * SRS Compliance Audit (srs-compliance-matrix.md, row 83):
 *   "Numeric At-Risk Thresholds" were REMOVED from the approved contract.
 *   "UC-I03 specifies flagging for low progress, missed deadlines, inactivity.
 *    No numeric cutoffs exist in SRS."
 *
 * Design Decisions Forced by Missing Data:
 *   - Phase 6–8 (Assignment Authoring, Submissions, Grading) may not be active yet.
 *   - Phase 9 (Progress Analytics) may not be active yet.
 *   - When those data sources are absent, risk indicators return INSUFFICIENT_DATA
 *     rather than treating absence as "safe" or as "zero".
 *
 * Integration Boundaries:
 *   - assignmentPerformanceProvider  → Phase 6–8 (not implemented)
 *   - progressAnalyticsProvider      → Phase 9 (not implemented)
 *   - enrollmentDataProvider         → Available NOW (Enrollment + Course + User models)
 *   - activityDataProvider           → Available NOW (ActivityLog model)
 *
 * Risk Indicator States (per UC-I03 flag taxonomy):
 *   'flagged'           — criterion satisfied by available data
 *   'not_flagged'       — criterion NOT satisfied by available data
 *   'insufficient_data' — cannot evaluate: required data source unavailable
 */

import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Progress } from '../models/Progress.js';
import { Submission } from '../models/Submission.js';
import { Assignment } from '../models/Assignment.js';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Data Provider Interfaces
//
// Each provider is documented as an integration boundary.
// Only providers backed by existing, verified models are implemented.
// Future providers return an explicit "unavailable" state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enrollment Data Provider — Available (Phase 4 implemented)
 * Returns all active enrollments for courses assigned to the given instructor.
 * @param {string} instructorId
 * @param {string} [filterCourseCode] - Optional course code filter
 * @returns {Promise<Array<{ studentId, courseId, enrolledAt, studentName, studentEmail, program, year, courseCode, courseTitle }>>}
 */
async function enrollmentDataProvider(instructorId, filterCourseCode) {
  // 1. Find active courses assigned to this instructor (optionally filtered by code)
  const courseQuery = {
    instructorId: new mongoose.Types.ObjectId(instructorId),
    status: 'active',
  };
  if (filterCourseCode) {
    courseQuery.code = filterCourseCode.toUpperCase().trim();
  }

  const courses = await Course.find(courseQuery).select('_id code title').lean();

  if (!courses.length) return [];

  const courseIds = courses.map((c) => c._id);
  const courseMap = Object.fromEntries(courses.map((c) => [c._id.toString(), c]));

  // 2. Find all enrollments for those courses
  const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
    .select('studentId courseId enrolledAt')
    .lean();

  if (!enrollments.length) return [];

  // 3. Load student profiles
  const studentIds = [...new Set(enrollments.map((e) => e.studentId.toString()))];
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    active: true,
  }).select('_id name email program year').lean();

  const studentMap = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

  return enrollments
    .filter((e) => studentMap[e.studentId.toString()]) // Only active students
    .map((e) => {
      const student = studentMap[e.studentId.toString()];
      const course = courseMap[e.courseId.toString()];
      return {
        studentId: e.studentId.toString(),
        courseId: e.courseId.toString(),
        enrolledAt: e.enrolledAt,
        studentName: student.name,
        studentEmail: student.email,
        program: student.program || null,
        year: student.year || null,
        courseCode: course?.code || null,
        courseTitle: course?.title || null,
      };
    });
}

/**
 * Activity Data Provider — Available (ActivityLog model exists, Phase 1)
 * Returns the most recent activity timestamp per student.
 * @param {string[]} studentIds
 * @returns {Promise<Map<string, Date|null>>}  studentId → lastActivityAt
 */
async function activityDataProvider(studentIds) {
  if (!studentIds.length) return new Map();

  const logs = await ActivityLog.aggregate([
    { $match: { userId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$userId', lastActivityAt: { $first: '$createdAt' } } },
  ]);

  const result = new Map();
  for (const log of logs) {
    result.set(log._id.toString(), log.lastActivityAt);
  }
  // Students with NO activity log entries get null
  for (const id of studentIds) {
    if (!result.has(id)) result.set(id, null);
  }
  return result;
}

/**
 * Progress Data Provider — Conditionally Available (Progress model exists, Phase 9 not yet implemented)
 *
 * The Progress model IS defined and may contain records if any grading has
 * occurred via manual or future Phase 8 integration. We read it as-is.
 * When a student has no Progress record for a course, we return null
 * (insufficient data) rather than treating them as 0% progress.
 *
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<Map<string, { percent, submittedCount, totalAssignments, averageScore }|null>>}
 *           Key: `${studentId}::${courseId}`
 */
async function progressDataProvider(studentIds, courseIds) {
  if (!studentIds.length || !courseIds.length) return new Map();

  const records = await Progress.find({
    studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
    courseId: { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const result = new Map();
  for (const r of records) {
    const key = `${r.studentId.toString()}::${r.courseId.toString()}`;
    result.set(key, {
      percent: r.percent,
      submittedCount: r.submittedCount,
      totalAssignments: r.totalAssignments,
      averageScore: r.averageScore,
    });
  }
  return result;
}

/**
 * Submission Data Provider — Conditionally Available (Submission + Assignment models exist)
 *
 * When Phase 6–7 are active, assignments and submissions will be present.
 * D-1 Correction: Distinguishes between:
 *   1. No assignments exist at all for the course -> insufficient_data (Phase 6 pending)
 *   2. Assignments exist, but none are past their deadline -> not_flagged (0 missed)
 *   3. Assignments exist and past-deadline assignments exist -> checks submissions
 *   4. Submission tracking is unavailable -> insufficient_data
 *
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<Map<string, { available: boolean, submissionsAvailable: boolean, totalAssignments: number, overdueCount: number, totalOverdueAssignments: number }>>}
 *           Key: `${studentId}::${courseId}`, value = submission status per student+course
 */
async function submissionStatusProvider(studentIds, courseIds) {
  if (!studentIds.length || !courseIds.length) return new Map();

  const now = new Date();

  // 1. Fetch all assignments for these courses to verify if assignment data exists
  const allAssignments = await Assignment.find({
    courseId: { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).select('_id courseId allowLate deadline').lean();

  if (!allAssignments.length) return new Map();

  // Group assignments by courseId
  const assignmentsByCourse = new Map();
  for (const a of allAssignments) {
    const cId = a.courseId.toString();
    if (!assignmentsByCourse.has(cId)) assignmentsByCourse.set(cId, []);
    assignmentsByCourse.get(cId).push(a);
  }

  // 2. Identify overdue assignments across courses
  const overdueAssignments = allAssignments.filter((a) => new Date(a.deadline) < now);
  const overdueAssignmentIds = overdueAssignments.map((a) => a._id);

  // 3. Fetch submissions for overdue assignments
  let submissions = [];
  let submissionsAvailable = true;
  try {
    if (overdueAssignmentIds.length > 0) {
      submissions = await Submission.find({
        assignmentId: { $in: overdueAssignmentIds },
        studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
      }).select('assignmentId studentId courseId').lean();
    }
  } catch {
    submissionsAvailable = false;
  }

  // Index submitted assignment IDs per student
  const submittedIndex = new Map(); // `${studentId}::${assignmentId}` → true
  for (const sub of submissions) {
    submittedIndex.set(`${sub.studentId.toString()}::${sub.assignmentId.toString()}`, true);
  }

  // 4. Build per-student-per-course status
  const result = new Map();
  for (const studentId of studentIds) {
    for (const courseId of courseIds) {
      const courseAssignments = assignmentsByCourse.get(courseId) || [];
      if (!courseAssignments.length) continue;

      const courseOverdue = courseAssignments.filter((a) => new Date(a.deadline) < now);

      let missedCount = 0;
      for (const assignment of courseOverdue) {
        const wasSubmitted = submittedIndex.has(`${studentId}::${assignment._id.toString()}`);
        if (!wasSubmitted) missedCount++;
      }

      const key = `${studentId}::${courseId}`;
      result.set(key, {
        available: true,
        submissionsAvailable,
        totalAssignments: courseAssignments.length,
        overdueCount: missedCount,
        totalOverdueAssignments: courseOverdue.length,
      });
    }
  }
  return result;
}

/**
 * Future Integration Boundary: Assignment Performance Provider (Phase 6–8)
 *
 * When Phases 6, 7, and 8 are implemented, this provider should be replaced
 * with real data sourced from the Assignment, Submission, and Grade collections
 * via the Phase 8 grading service.
 *
 * Interface contract (for future implementors):
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<{ available: false }>}  — Not yet implemented
 */
async function assignmentPerformanceProvider(_studentIds, _courseIds) {
  // Phase 6–8 not yet implemented. Return explicit unavailability.
  return { available: false };
}

/**
 * Future Integration Boundary: Progress Analytics Provider (Phase 9)
 *
 * When Phase 9 (Student Progress Analytics) is implemented, it may supply
 * richer computed metrics (trend lines, deadline velocity, etc.). For now,
 * the progressDataProvider above reads the Progress model directly.
 *
 * Interface contract (for future implementors):
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<{ available: false }>}  — Phase 9 analytics not yet implemented
 */
async function progressAnalyticsProvider(_studentIds, _courseIds) {
  // Phase 9 not yet implemented. Return explicit unavailability.
  return { available: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Risk Evaluation Engine
//
// Evaluates exactly the three flag types named in SRS UC-I03:
//   • lowProgress      — derived from Progress model (if records exist)
//   • missedDeadlines  — derived from Assignment + Submission models (if exist)
//   • inactivity       — derived from ActivityLog model (always available)
//
// No numeric thresholds are invented. Flags are set based on:
//   - Absence of any progress record → insufficient_data (not "safe")
//   - Absence of any submission for a past-deadline assignment → flagged
//   - No activity logged at all → flagged (inactivity = zero recorded activity)
//   - Progress exists and shows 0% with assignments present → flagged (lowProgress)
//   - Progress exists and is > 0% → not_flagged (threshold-free)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate inactivity flag for a student.
 *
 * SRS UC-I03 names "inactivity" as a flag criterion. The ActivityLog model
 * is the authoritative source for recorded platform activity.
 *
 * Rule (SRS-grounded, threshold-free):
 *   - Student has never logged any action → flagged (inactivity)
 *   - Student has at least one logged action → not_flagged
 *
 * @param {Date|null} lastActivityAt
 * @returns {{ status: 'flagged'|'not_flagged', reason: string, lastActivityAt: Date|null }}
 */
export function evaluateInactivity(lastActivityAt) {
  if (lastActivityAt === null) {
    return {
      status: 'flagged',
      reason: 'No platform activity has been recorded for this student.',
      lastActivityAt: null,
    };
  }
  return {
    status: 'not_flagged',
    reason: 'Student has recorded platform activity.',
    lastActivityAt,
  };
}

/**
 * Evaluate low-progress flag for a student in a course.
 *
 * SRS UC-I03 names "low progress" as a flag criterion.
 * SRS Compliance Audit: numeric thresholds are REMOVED.
 *
 * Rule (SRS-grounded, threshold-free):
 *   - No Progress record exists → insufficient_data (Phase 9 or Phase 7 not active)
 *   - Progress record exists AND percent === 0 AND totalAssignments > 0 → flagged
 *   - Progress record exists AND percent > 0  → not_flagged
 *   - Progress record exists AND totalAssignments === 0 → insufficient_data (no assignments to assess)
 *
 * @param {{ percent, submittedCount, totalAssignments, averageScore }|null} progressRecord
 * @returns {{ status: 'flagged'|'not_flagged'|'insufficient_data', reason: string, progressData: object|null }}
 */
export function evaluateLowProgress(progressRecord) {
  if (!progressRecord) {
    return {
      status: 'insufficient_data',
      reason:
        'No progress record exists for this student in this course. Progress data is populated by Phase 7 (submissions) and Phase 8 (grading). These phases are not yet active.',
      progressData: null,
    };
  }

  if (progressRecord.totalAssignments === 0) {
    return {
      status: 'insufficient_data',
      reason:
        'No assignments have been created for this course yet. Progress cannot be assessed without assignments (Phase 6 dependency).',
      progressData: progressRecord,
    };
  }

  if (progressRecord.percent === 0) {
    return {
      status: 'flagged',
      reason: `Student has submitted 0 out of ${progressRecord.totalAssignments} available assignment(s) with no recorded progress.`,
      progressData: progressRecord,
    };
  }

  return {
    status: 'not_flagged',
    reason: `Student has ${progressRecord.percent}% progress (${progressRecord.submittedCount}/${progressRecord.totalAssignments} assignments submitted).`,
    progressData: progressRecord,
  };
}

/**
 * Evaluate missed deadlines flag for a student in a course.
 *
 * SRS UC-I03 names "missed deadlines" as a flag criterion.
 *
 * Rule (SRS-grounded, threshold-free, D-1 corrected):
 *   - No assignment data available at all → insufficient_data
 *   - Submission tracking data unavailable → insufficient_data
 *   - Assignments exist, but no deadlines have passed yet → not_flagged (0 missed)
 *   - Overdue assignments exist AND student missed at least one → flagged
 *   - Overdue assignments exist AND student submitted all → not_flagged
 *
 * @param {{ available?: boolean, submissionsAvailable?: boolean, totalAssignments?: number, overdueCount?: number, totalOverdueAssignments?: number }|null} submissionStatus
 * @returns {{ status: 'flagged'|'not_flagged'|'insufficient_data', reason: string, missedCount: number }}
 */
export function evaluateMissedDeadlines(submissionStatus) {
  if (!submissionStatus || !submissionStatus.available) {
    return {
      status: 'insufficient_data',
      reason:
        'No assignment records found for this course. This indicator requires assignment data (Phase 6 dependency).',
      missedCount: 0,
    };
  }

  if (submissionStatus.submissionsAvailable === false) {
    return {
      status: 'insufficient_data',
      reason:
        'Assignment records exist, but submission tracking data is unavailable (Phase 7 dependency).',
      missedCount: 0,
    };
  }

  if (submissionStatus.totalOverdueAssignments === 0) {
    return {
      status: 'not_flagged',
      reason: `Assignments exist for this course, but no deadlines have passed yet (${submissionStatus.totalAssignments || 0} upcoming assignment(s)).`,
      missedCount: 0,
    };
  }

  if (submissionStatus.overdueCount > 0) {
    return {
      status: 'flagged',
      reason: `Student missed ${submissionStatus.overdueCount} of ${submissionStatus.totalOverdueAssignments} past-deadline assignment(s).`,
      missedCount: submissionStatus.overdueCount,
    };
  }

  return {
    status: 'not_flagged',
    reason: `Student submitted all ${submissionStatus.totalOverdueAssignments} past-deadline assignment(s).`,
    missedCount: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Risk Aggregator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a student+course combination should be flagged as at-risk.
 *
 * A student is at-risk (included in the at-risk list) if ANY flag evaluates
 * to 'flagged'. Indicators that evaluate to 'insufficient_data' do NOT
 * suppress inclusion — this prevents false negatives due to missing data.
 *
 * @param {object} indicators
 * @returns {{ isAtRisk: boolean, flagCount: number }}
 */
export function computeAtRiskStatus(indicators) {
  const flags = [indicators.inactivity, indicators.lowProgress, indicators.missedDeadlines];
  const flaggedCount = flags.filter((f) => f.status === 'flagged').length;
  const isAtRisk = flaggedCount > 0;
  return { isAtRisk, flagCount: flaggedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Public Service API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all at-risk students across courses assigned to an instructor.
 *
 * SRS Traceability: UC-I03, FR-16, FR-44
 * Authorization: Caller must have already verified instructor identity and
 *   that only their own assigned courses are queried (enforced at route level).
 *
 * D-3 Correction: Aggregates unique students (`totalEnrolled`, `totalAtRisk`, `totalSafe`)
 * so students enrolled in multiple courses under the same instructor are not double-counted.
 *
 * @param {string} instructorId — Verified instructor user ID from JWT
 * @param {object} [options] — Optional filters: { courseCode }
 * @returns {Promise<{
 *   atRiskStudents: Array<AtRiskEntry>,
 *   summary: MonitoringSummary,
 *   dataAvailability: DataAvailabilityReport,
 * }>}
 */
export async function getAtRiskStudents(instructorId, options = {}) {
  // 1. Load active course enrollments for this instructor (optionally filtered by courseCode)
  const enrollments = await enrollmentDataProvider(instructorId, options.courseCode);

  if (!enrollments.length) {
    return {
      atRiskStudents: [],
      summary: buildEmptySummary(),
      dataAvailability: buildDataAvailability(false, false),
    };
  }

  // 2. Collect unique student and course IDs
  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

  // 3. Run all data providers in parallel
  const [activityMap, progressMap, submissionMap] = await Promise.all([
    activityDataProvider(studentIds),
    progressDataProvider(studentIds, courseIds),
    submissionStatusProvider(studentIds, courseIds),
  ]);

  // 4. Check future provider availability
  const [perfResult, analyticsResult] = await Promise.all([
    assignmentPerformanceProvider(studentIds, courseIds),
    progressAnalyticsProvider(studentIds, courseIds),
  ]);

  // 5. Evaluate each enrollment entry
  const atRiskStudents = [];
  const atRiskStudentIds = new Set();
  const allStudentIds = new Set(enrollments.map((e) => e.studentId));

  for (const enrollment of enrollments) {
    const { studentId, courseId } = enrollment;
    const progressKey = `${studentId}::${courseId}`;

    const inactivityEval = evaluateInactivity(activityMap.get(studentId) ?? null);
    const lowProgressEval = evaluateLowProgress(progressMap.get(progressKey) ?? null);
    const missedDeadlinesEval = evaluateMissedDeadlines(submissionMap.get(progressKey) ?? null);

    const indicators = {
      inactivity: inactivityEval,
      lowProgress: lowProgressEval,
      missedDeadlines: missedDeadlinesEval,
    };

    const { isAtRisk, flagCount } = computeAtRiskStatus(indicators);

    if (isAtRisk) {
      atRiskStudentIds.add(studentId);
      atRiskStudents.push({
        studentId: enrollment.studentId,
        studentName: enrollment.studentName,
        studentEmail: enrollment.studentEmail,
        program: enrollment.program,
        year: enrollment.year,
        courseId: enrollment.courseId,
        courseCode: enrollment.courseCode,
        courseTitle: enrollment.courseTitle,
        enrolledAt: enrollment.enrolledAt,
        flagCount,
        flags: {
          lowProgress: lowProgressEval.status,
          missedDeadlines: missedDeadlinesEval.status,
          inactivity: inactivityEval.status,
        },
        indicators,
      });
    }
  }

  // 6. Sort: students with more flags first
  atRiskStudents.sort((a, b) => b.flagCount - a.flagCount);

  // 7. Deduplicated unique student counts (D-3)
  const totalEnrolled = allStudentIds.size;
  const totalAtRisk = atRiskStudentIds.size;
  const totalSafe = totalEnrolled - totalAtRisk;

  // 8. Build data availability report
  const hasProgressData = progressMap.size > 0;
  const hasSubmissionData = submissionMap.size > 0;

  return {
    atRiskStudents,
    summary: {
      totalEnrolled,
      totalAtRisk,
      totalSafe,
      evaluatedAt: new Date().toISOString(),
    },
    dataAvailability: buildDataAvailability(hasProgressData, hasSubmissionData),
  };
}

/**
 * Get at-risk assessment for a single student in a specific course.
 *
 * SRS Traceability: UC-I03, FR-09 (progress view), FR-16
 * Authorization: Caller must verify that the courseId belongs to the instructor.
 *
 * @param {string} studentId
 * @param {string} courseId
 * @param {string} instructorId — For verification (course must be assigned to instructor)
 * @returns {Promise<SingleStudentAssessment>}
 */
export async function getStudentRiskAssessment(studentId, courseId, instructorId) {
  // Verify enrollment exists and course belongs to instructor
  const course = await Course.findOne({
    _id: new mongoose.Types.ObjectId(courseId),
    instructorId: new mongoose.Types.ObjectId(instructorId),
  }).lean();

  if (!course) {
    const err = new Error('Course not found or not assigned to this instructor.');
    err.statusCode = 404;
    throw err;
  }

  const enrollment = await Enrollment.findOne({
    studentId: new mongoose.Types.ObjectId(studentId),
    courseId: new mongoose.Types.ObjectId(courseId),
  }).lean();

  if (!enrollment) {
    const err = new Error('Student is not enrolled in this course.');
    err.statusCode = 404;
    throw err;
  }

  // Load student profile
  const student = await User.findOne({
    _id: new mongoose.Types.ObjectId(studentId),
    role: 'student',
    active: true,
  }).select('name email program year').lean();

  if (!student) {
    const err = new Error('Student not found or account is inactive.');
    err.statusCode = 404;
    throw err;
  }

  // Run data providers
  const [activityMap, progressMap, submissionMap] = await Promise.all([
    activityDataProvider([studentId]),
    progressDataProvider([studentId], [courseId]),
    submissionStatusProvider([studentId], [courseId]),
  ]);

  const progressKey = `${studentId}::${courseId}`;

  const inactivityEval = evaluateInactivity(activityMap.get(studentId) ?? null);
  const lowProgressEval = evaluateLowProgress(progressMap.get(progressKey) ?? null);
  const missedDeadlinesEval = evaluateMissedDeadlines(submissionMap.get(progressKey) ?? null);

  const indicators = {
    inactivity: inactivityEval,
    lowProgress: lowProgressEval,
    missedDeadlines: missedDeadlinesEval,
  };

  const { isAtRisk, flagCount } = computeAtRiskStatus(indicators);

  return {
    studentId,
    studentName: student.name,
    studentEmail: student.email,
    program: student.program || null,
    year: student.year || null,
    courseId,
    courseCode: course.code,
    courseTitle: course.title,
    enrolledAt: enrollment.enrolledAt,
    isAtRisk,
    flagCount,
    flags: {
      lowProgress: lowProgressEval.status,
      missedDeadlines: missedDeadlinesEval.status,
      inactivity: inactivityEval.status,
    },
    indicators,
    assessedAt: new Date().toISOString(),
    dataAvailability: buildDataAvailability(
      progressMap.size > 0,
      submissionMap.size > 0
    ),
  };
}

/**
 * Get a summary of monitoring statistics for an instructor's dashboard.
 * Used to populate FR-16 "at-risk students" count and FR-44 analytics cards.
 *
 * SRS Traceability: FR-16, FR-44
 * @param {string} instructorId
 * @returns {Promise<MonitoringSummary>}
 */
export async function getMonitoringSummary(instructorId) {
  const { summary, dataAvailability } = await getAtRiskStudents(instructorId);
  return { summary, dataAvailability };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Helper constructors
// ─────────────────────────────────────────────────────────────────────────────

function buildEmptySummary() {
  return {
    totalEnrolled: 0,
    totalAtRisk: 0,
    totalSafe: 0,
    evaluatedAt: new Date().toISOString(),
  };
}

function buildDataAvailability(hasProgressData, hasSubmissionData) {
  return {
    enrollment: {
      available: true,
      description: 'Student enrollment data is available (Phase 4 implemented).',
    },
    activity: {
      available: true,
      description:
        'Platform activity log is available. Inactivity flag evaluates from this source.',
    },
    progress: {
      available: hasProgressData,
      description: hasProgressData
        ? 'Progress records exist. Low-progress flag evaluates from this source.'
        : 'No progress records found. The Progress collection is defined but requires Phase 7 (submissions) and Phase 8 (grading) to populate it. Low-progress flag returns insufficient_data.',
      blockedBy: hasProgressData ? null : ['Phase 7: Student Submissions', 'Phase 8: Grading Queue'],
    },
    submissionHistory: {
      available: hasSubmissionData,
      description: hasSubmissionData
        ? 'Submission records exist. Missed-deadlines flag evaluates from this source.'
        : 'No submission or assignment records found for past-deadline assignments. Missed-deadlines flag returns insufficient_data.',
      blockedBy: hasSubmissionData
        ? null
        : ['Phase 6: Assignment Authoring', 'Phase 7: Student Submissions'],
    },
    assignmentPerformance: {
      available: false,
      description:
        'Assignment performance analytics (scores, feedback patterns) are not available. Requires Phase 6 (Assignment Authoring), Phase 7 (Student Submissions), and Phase 8 (Grading Queue).',
      blockedBy: [
        'Phase 6: Assignment Authoring',
        'Phase 7: Student Submissions',
        'Phase 8: Grading Queue',
      ],
    },
    progressAnalytics: {
      available: false,
      description:
        'Advanced progress analytics (trend lines, velocity) are not available. Requires Phase 9 (Student Progress Analytics).',
      blockedBy: ['Phase 9: Student Progress Analytics'],
    },
  };
}
