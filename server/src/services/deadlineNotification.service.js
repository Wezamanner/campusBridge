/**
 * Deadline Notification Service
 *
 * Phase 12 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-14 (Users are notified of deadlines)
 *
 * Responsibilities:
 *   1. Identifies assignments approaching their configured notification window.
 *   2. Identifies students enrolled in the relevant course.
 *   3. Excludes students who have already submitted the assignment.
 *   4. Creates the appropriate 'deadline' notification.
 *   5. Includes a valid assignment link (/student/courses/:courseId).
 *   6. Prevents duplicate notifications for the same student and assignment.
 *   7. Safely handles missing or invalid due dates.
 *
 * Scheduling Architecture Note:
 *   The SRS v2.0 mandates deadline notifications but leaves the runner interval
 *   and exact lead time to deployment/scheduler configuration (e.g. Cron or background worker).
 *   This service provides the decoupled, parameterizable domain engine.
 */

import { Assignment } from '../models/Assignment.js';
import { Enrollment } from '../models/Enrollment.js';
import { Submission } from '../models/Submission.js';
import { Notification } from '../models/Notification.js';

/**
 * Check for approaching assignment deadlines and dispatch notifications.
 *
 * @param {Object} options
 * @param {number} [options.windowHours=24] - Lead time window in hours
 * @param {Date|string} [options.referenceDate=new Date()] - Reference point for evaluation
 * @param {string} [options.courseId] - Optional course filter
 * @param {string} [options.assignmentId] - Optional assignment filter
 * @param {boolean} [options.dryRun=false] - If true, evaluates without persisting notifications
 * @returns {Promise<Object>} Execution summary
 */
export async function processDeadlineNotifications(options = {}) {
  const {
    windowHours = 24,
    referenceDate = new Date(),
    courseId = null,
    assignmentId = null,
    dryRun = false,
  } = options;

  // Validate referenceDate
  const refTime = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (isNaN(refTime.getTime())) {
    throw new Error('Invalid referenceDate provided to processDeadlineNotifications');
  }

  // Validate windowHours
  const hours = Number(windowHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('windowHours must be a positive number');
  }

  const windowStart = refTime;
  const windowEnd = new Date(refTime.getTime() + hours * 60 * 60 * 1000);

  // Build query for assignments in window
  const query = {
    deadline: { $gte: windowStart, $lte: windowEnd },
  };

  if (courseId) {
    query.courseId = courseId;
  }
  if (assignmentId) {
    query._id = assignmentId;
  }

  const assignments = await Assignment.find(query).lean();

  const summary = {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    windowHours: hours,
    scannedAssignments: assignments.length,
    candidatesEvaluated: 0,
    notificationsCreated: 0,
    duplicatesSkipped: 0,
    submittedSkipped: 0,
    createdNotifications: [],
  };

  for (const assignment of assignments) {
    // 7. Handle missing or invalid due dates defensively
    if (!assignment.deadline || isNaN(new Date(assignment.deadline).getTime())) {
      continue;
    }

    const assignmentCourseId = assignment.courseId;

    // 2. Identify students enrolled in the relevant course
    const enrollments = await Enrollment.find({ courseId: assignmentCourseId })
      .select('studentId')
      .lean();

    if (!enrollments.length) continue;

    const studentIds = enrollments.map((e) => e.studentId);
    summary.candidatesEvaluated += studentIds.length;

    // 3. Exclude students who have already submitted the assignment
    const existingSubmissions = await Submission.find({
      assignmentId: assignment._id,
      studentId: { $in: studentIds },
      status: { $in: ['Submitted', 'Graded'] },
    })
      .select('studentId')
      .lean();

    const submittedStudentIdSet = new Set(
      existingSubmissions.map((s) => s.studentId.toString())
    );

    for (const studentId of studentIds) {
      const studentIdStr = studentId.toString();

      if (submittedStudentIdSet.has(studentIdStr)) {
        summary.submittedSkipped++;
        continue;
      }

      const expectedTitle = `Upcoming Deadline: ${assignment.title}`;
      const targetLink = `/student/courses/${assignmentCourseId}`;

      // 6. Duplicate prevention: check if notification was already dispatched
      const existingNotification = await Notification.findOne({
        userId: studentId,
        type: 'deadline',
        title: expectedTitle,
        link: targetLink,
      }).lean();

      if (existingNotification) {
        summary.duplicatesSkipped++;
        continue;
      }

      // 4. Create deadline notification
      const notificationData = {
        userId: studentId,
        type: 'deadline',
        title: expectedTitle,
        message: `Assignment "${assignment.title}" is due soon (${new Date(
          assignment.deadline
        ).toLocaleDateString()}). Please submit your work on time.`,
        link: targetLink,
      };

      if (!dryRun) {
        try {
          const created = await Notification.create(notificationData);
          summary.notificationsCreated++;
          summary.createdNotifications.push({
            id: created._id.toString(),
            studentId: studentIdStr,
            assignmentId: assignment._id.toString(),
          });
        } catch (err) {
          console.error('[Deadline Notification Dispatch Error]:', err.message);
        }
      } else {
        summary.notificationsCreated++;
        summary.createdNotifications.push({
          dryRun: true,
          studentId: studentIdStr,
          assignmentId: assignment._id.toString(),
        });
      }
    }
  }

  return summary;
}
