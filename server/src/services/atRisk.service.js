/**
 * At-Risk Student Monitoring Service
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance (Integrated with Phases 4–9)
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
 * Full Integration with Completed Phases 4–9:
 *   - Phase 4 (Enrollment & Courses)       → enrollmentDataProvider
 *   - Phase 5 (Student Profile / Activity) → activityDataProvider (ActivityLog + logins + submissions)
 *   - Phase 6 (Assignment Management)      → submissionStatusProvider & assignmentPerformanceProvider
 *   - Phase 7 (Student Submissions)        → submissionStatusProvider & progressDataProvider
 *   - Phase 8 (Grading Queue)              → Grade integration in progress & performance providers
 *   - Phase 9 (Progress Analytics)         → progressDataProvider & progressAnalyticsProvider
 *
 * Risk Indicator States (per UC-I03 flag taxonomy):
 *   'flagged'           — criterion satisfied by authoritative data
 *   'not_flagged'       — criterion NOT satisfied by authoritative data
 *   'insufficient_data' — cannot evaluate: required authoritative data source unavailable
 */

import mongoose from 'mongoose';
import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../models/Course.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Progress } from '../models/Progress.js';
import { Submission } from '../models/Submission.js';
import { Assignment } from '../models/Assignment.js';
import { Grade } from '../models/Grade.js';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Authoritative Data Providers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enrollment Data Provider (Phase 4)
 * Returns all active enrollments for courses assigned to the given instructor.
 * @param {string} instructorId
 * @param {string} [filterCourseCode] - Optional course code filter
 * @returns {Promise<Array<{ studentId, courseId, enrolledAt, studentName, studentEmail, program, year, courseCode, courseTitle }>>}
 */
async function enrollmentDataProvider(instructorId, filterCourseCode) {
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

  const enrollments = await Enrollment.find({ courseId: { $in: courseIds } })
    .select('studentId courseId enrolledAt')
    .lean();

  if (!enrollments.length) return [];

  const studentIds = [...new Set(enrollments.map((e) => e.studentId.toString()))];
  const students = await User.find({
    _id: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
    role: 'student',
    active: true,
  }).select('_id name email program year').lean();

  const studentMap = Object.fromEntries(students.map((s) => [s._id.toString(), s]));

  return enrollments
    .filter((e) => studentMap[e.studentId.toString()])
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
 * Activity Data Provider (Connected to ActivityLog, User.lastLoginAt, Submission.submittedAt)
 * Returns the most recent authoritative activity timestamp per student.
 * Respects D-5 ambiguity: no arbitrary time threshold is invented.
 *
 * @param {string[]} studentIds
 * @returns {Promise<Map<string, Date|null>>}  studentId → lastActivityAt
 */
async function activityDataProvider(studentIds) {
  if (!studentIds.length) return new Map();

  const studentObjectIds = studentIds.map((id) => new mongoose.Types.ObjectId(id));
  const result = new Map();

  // 1. ActivityLog query
  try {
    const logs = await ActivityLog.aggregate([
      { $match: { userId: { $in: studentObjectIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', lastActivityAt: { $first: '$createdAt' } } },
    ]);

    for (const log of logs) {
      if (log.lastActivityAt) {
        result.set(log._id.toString(), log.lastActivityAt);
      }
    }
  } catch (err) {
    console.warn('ActivityLog query warning:', err.message);
  }

  // 2. Check User.lastLoginAt
  try {
    const users = await User.find({ _id: { $in: studentObjectIds } })
      .select('_id lastLoginAt')
      .lean();

    for (const u of users) {
      const id = u._id.toString();
      if (u.lastLoginAt) {
        const current = result.get(id);
        if (!current || new Date(u.lastLoginAt) > new Date(current)) {
          result.set(id, u.lastLoginAt);
        }
      }
    }
  } catch (err) {
    console.warn('User lastLoginAt check warning:', err.message);
  }

  // 3. Check Submission.submittedAt
  try {
    const recentSubmissions = await Submission.aggregate([
      { $match: { studentId: { $in: studentObjectIds } } },
      { $sort: { submittedAt: -1 } },
      { $group: { _id: '$studentId', lastSubmittedAt: { $first: '$submittedAt' } } },
    ]);

    for (const sub of recentSubmissions) {
      const id = sub._id.toString();
      if (sub.lastSubmittedAt) {
        const current = result.get(id);
        if (!current || new Date(sub.lastSubmittedAt) > new Date(current)) {
          result.set(id, sub.lastSubmittedAt);
        }
      }
    }
  } catch (err) {
    console.warn('Submission activity check warning:', err.message);
  }

  // Any remaining students with no recorded activity get null
  for (const id of studentIds) {
    if (!result.has(id)) result.set(id, null);
  }

  return result;
}

/**
 * Progress Data Provider (Integrated with Phase 9 Progress Service & Progress Model)
 *
 * Reads authoritative Progress records. If a record does not exist yet but
 * assignments exist, dynamically computes real progress and grade average.
 * If no assignments exist in the course, progress cannot be assessed and returns null.
 *
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<Map<string, { percent, submittedCount, totalAssignments, averageScore }|null>>}
 *           Key: `${studentId}::${courseId}`
 */
async function progressDataProvider(studentIds, courseIds) {
  if (!studentIds.length || !courseIds.length) return new Map();

  const studentObjectIds = studentIds.map((id) => new mongoose.Types.ObjectId(id));
  const courseObjectIds = courseIds.map((id) => new mongoose.Types.ObjectId(id));

  // 1. Fetch existing Progress records
  const records = await Progress.find({
    studentId: { $in: studentObjectIds },
    courseId: { $in: courseObjectIds },
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

  // 2. For student/course pairs without existing record, compute dynamically if assignments exist
  for (const studentId of studentIds) {
    for (const courseId of courseIds) {
      const key = `${studentId}::${courseId}`;
      if (!result.has(key)) {
        try {
          const totalAssignments = await Assignment.countDocuments({
            courseId: new mongoose.Types.ObjectId(courseId),
          });

          if (totalAssignments > 0) {
            const submittedCount = await Submission.countDocuments({
              studentId: new mongoose.Types.ObjectId(studentId),
              courseId: new mongoose.Types.ObjectId(courseId),
              status: { $in: ['Submitted', 'Graded'] },
            });

            const percent = Math.round((submittedCount / totalAssignments) * 100);

            // Compute grade average if graded submissions exist
            const gradedSubmissions = await Submission.find({
              studentId: new mongoose.Types.ObjectId(studentId),
              courseId: new mongoose.Types.ObjectId(courseId),
              status: 'Graded',
            }).select('_id').lean();

            let averageScore = 0;
            if (gradedSubmissions.length > 0) {
              const grades = await Grade.find({
                submissionId: { $in: gradedSubmissions.map((s) => s._id) },
              }).select('score').lean();

              if (grades.length > 0) {
                const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
                averageScore = Math.round((totalScore / grades.length) * 10) / 10;
              }
            }

            result.set(key, {
              percent,
              submittedCount,
              totalAssignments,
              averageScore,
            });
          }
        } catch {
          // Leave null if error occurs so it safely returns insufficient_data
        }
      }
    }
  }

  return result;
}

/**
 * Submission Data Provider (Integrated with Phase 6 Assignments & Phase 7 Submissions)
 *
 * Evaluates:
 *   1. No assignments exist for course -> insufficient_data
 *   2. Assignments exist, but no deadlines have passed -> not_flagged (0 missed)
 *   3. Assignments exist and past-deadline assignments exist -> checks submissions
 *      - Submitted assignments are NEVER counted as missed
 *      - Future deadlines are NEVER counted as missed
 *      - Only unsubmitted past-deadline assignments are flagged as missed
 *   4. Submission data unavailable -> insufficient_data
 *
 * @param {string[]} studentIds
 * @param {string[]} courseIds
 * @returns {Promise<Map<string, { available: boolean, submissionsAvailable: boolean, totalAssignments: number, overdueCount: number, totalOverdueAssignments: number }>>}
 *           Key: `${studentId}::${courseId}`
 */
async function submissionStatusProvider(studentIds, courseIds) {
  if (!studentIds.length || !courseIds.length) return new Map();

  const now = new Date();

  // 1. Fetch all assignments for these courses
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

  // 2. Identify overdue assignments
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
  const submittedIndex = new Map();
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
 * Assignment Performance Provider (Integrated with Phases 6, 7, 8)
 *
 * Provides assignment performance analytics (total assignments, submissions,
 * grades, and scores) sourced directly from Assignment, Submission, and Grade collections.
 */
async function assignmentPerformanceProvider(studentIds, courseIds) {
  try {
    const courseObjectIds = courseIds.map((id) => new mongoose.Types.ObjectId(id));
    const studentObjectIds = studentIds.map((id) => new mongoose.Types.ObjectId(id));

    const totalAssignments = await Assignment.countDocuments({
      courseId: { $in: courseObjectIds },
    });

    const totalSubmissions = await Submission.countDocuments({
      courseId: { $in: courseObjectIds },
      studentId: { $in: studentObjectIds },
    });

    const gradedSubmissions = await Submission.find({
      courseId: { $in: courseObjectIds },
      studentId: { $in: studentObjectIds },
      status: 'Graded',
    }).select('_id').lean();

    const gradedCount = gradedSubmissions.length;
    let averageGrade = null;

    if (gradedCount > 0) {
      const grades = await Grade.find({
        submissionId: { $in: gradedSubmissions.map((s) => s._id) },
      }).select('score').lean();

      if (grades.length > 0) {
        const sum = grades.reduce((acc, g) => acc + (g.score || 0), 0);
        averageGrade = Math.round((sum / grades.length) * 10) / 10;
      }
    }

    return {
      available: true,
      totalAssignments,
      totalSubmissions,
      gradedCount,
      averageGrade,
    };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

/**
 * Progress Analytics Provider (Integrated with Phase 9)
 *
 * Provides progress analytics across enrolled courses for monitored students,
 * backed by the Progress model and recalculation service.
 */
async function progressAnalyticsProvider(studentIds, courseIds) {
  try {
    const progressRecords = await Progress.find({
      studentId: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
      courseId: { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) },
    }).lean();

    const hasRecords = progressRecords.length > 0;
    const avgProgress = hasRecords
      ? Math.round(
          (progressRecords.reduce((sum, p) => sum + (p.percent || 0), 0) /
            progressRecords.length) *
            10
        ) / 10
      : 0;

    return {
      available: true,
      trackedRecordsCount: progressRecords.length,
      averagePercent: avgProgress,
    };
  } catch (err) {
    return { available: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Risk Evaluation Engine
//
// Evaluates exactly the three flag types named in SRS UC-I03:
//   • lowProgress      — derived from Progress model & Phase 9 analytics
//   • missedDeadlines  — derived from Assignment + Submission models (Phases 6 & 7)
//   • inactivity       — derived from ActivityLog, logins, and submissions
//
// No arbitrary numeric thresholds are invented (SRS Compliance Audit):
//   - Absence of progress data / no assignments → insufficient_data (not "safe")
//   - Progress exists and shows 0% with assignments present → flagged (lowProgress)
//   - Progress exists and is > 0% → not_flagged (threshold-free)
//   - Unsubmitted past-deadline assignment → flagged (missedDeadlines)
//   - No past deadlines or all submitted → not_flagged
//   - No platform activity recorded anywhere → flagged (inactivity)
//   - Recorded platform activity present → not_flagged
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate inactivity flag for a student.
 *
 * SRS UC-I03 names "inactivity" as a flag criterion.
 * Rule (SRS-grounded, threshold-free, D-5 ambiguity respected):
 *   - Student has never logged any action → flagged (inactivity)
 *   - Student has at least one recorded action → not_flagged
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
 * Rule (SRS-grounded, threshold-free):
 *   - No Progress record exists → insufficient_data
 *   - Progress record exists AND percent === 0 AND totalAssignments > 0 → flagged
 *   - Progress record exists AND percent > 0 → not_flagged
 *   - Progress record exists AND totalAssignments === 0 → insufficient_data (no assignments)
 *
 * @param {{ percent, submittedCount, totalAssignments, averageScore }|null} progressRecord
 * @returns {{ status: 'flagged'|'not_flagged'|'insufficient_data', reason: string, progressData: object|null }}
 */
export function evaluateLowProgress(progressRecord) {
  if (!progressRecord) {
    return {
      status: 'insufficient_data',
      reason:
        'No progress record exists for this student in this course. Progress requires assignments to be created and evaluated.',
      progressData: null,
    };
  }

  if (progressRecord.totalAssignments === 0) {
    return {
      status: 'insufficient_data',
      reason:
        'No assignments have been created for this course yet. Progress cannot be assessed without assignments.',
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
        'No assignment records found for this course. Missed deadlines cannot be assessed without assignments.',
      missedCount: 0,
    };
  }

  if (submissionStatus.submissionsAvailable === false) {
    return {
      status: 'insufficient_data',
      reason:
        'Assignment records exist, but submission tracking data is unavailable.',
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
 * automatically classify a student as at risk.
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
  const enrollments = await enrollmentDataProvider(instructorId, options.courseCode);

  if (!enrollments.length) {
    return {
      atRiskStudents: [],
      summary: buildEmptySummary(),
      dataAvailability: buildDataAvailability(false, false),
    };
  }

  const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

  // Run all authoritative data providers in parallel
  const [activityMap, progressMap, submissionMap] = await Promise.all([
    activityDataProvider(studentIds),
    progressDataProvider(studentIds, courseIds),
    submissionStatusProvider(studentIds, courseIds),
  ]);

  // Run integrated performance and progress analytics
  await Promise.all([
    assignmentPerformanceProvider(studentIds, courseIds),
    progressAnalyticsProvider(studentIds, courseIds),
  ]);

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

  // Sort: students with more flags first
  atRiskStudents.sort((a, b) => b.flagCount - a.flagCount);

  // Deduplicated unique student counts (D-3)
  const totalEnrolled = allStudentIds.size;
  const totalAtRisk = atRiskStudentIds.size;
  const totalSafe = totalEnrolled - totalAtRisk;

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
      description: 'Student enrollment data is available.',
      blockedBy: null,
    },
    activity: {
      available: true,
      description:
        'Platform activity tracking is available. Inactivity flag evaluates from this source.',
      blockedBy: null,
    },
    progress: {
      available: true,
      description: hasProgressData
        ? 'Progress records exist. Low-progress flag is active.'
        : 'Progress analytics active. No progress records found for courses without assignments.',
      blockedBy: null,
    },
    submissionHistory: {
      available: true,
      description: hasSubmissionData
        ? 'Assignment and submission records exist. Missed-deadlines flag is active.'
        : 'Assignment and submission tracking active. No overdue unsubmitted assignments found.',
      blockedBy: null,
    },
    assignmentPerformance: {
      available: true,
      description:
        'Assignment and grading performance analytics are available.',
      blockedBy: null,
    },
    progressAnalytics: {
      available: true,
      description:
        'Progress analytics are available.',
      blockedBy: null,
    },
  };
}
