/**
 * Progress Calculation Service (FR-09)
 * Calculates student progress from submitted work per course and overall.
 * Recalculates after each submission grading.
 */

import { Progress } from '../models/Progress.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';

/**
 * Recalculate progress for a specific student in a specific course (FR-09)
 * Called after grading to update progress metrics
 *
 * @param {ObjectId} studentId - Student's user ID
 * @param {ObjectId} courseId - Course ID
 * @returns {Promise<Object>} Updated progress record
 */
export async function recalculateStudentCourseProgress(studentId, courseId) {
  try {
    // Count total assignments in course
    const totalAssignments = await Assignment.countDocuments({ courseId });

    // Count submitted assignments (Submitted or Graded status)
    const submittedCount = await Submission.countDocuments({
      studentId,
      courseId,
      status: { $in: ['Submitted', 'Graded'] },
    });

    // Calculate completion percentage
    const percent = totalAssignments > 0
      ? Math.round((submittedCount / totalAssignments) * 100)
      : 0;

    // Calculate average score from graded submissions
    const gradedSubmissions = await Submission.find({
      studentId,
      courseId,
      status: 'Graded',
    }).select('_id');

    const submissionIds = gradedSubmissions.map((s) => s._id);

    let averageScore = 0;
    if (submissionIds.length > 0) {
      const grades = await Grade.find({ submissionId: { $in: submissionIds } }).select('score');

      if (grades.length > 0) {
        const totalScore = grades.reduce((sum, g) => sum + g.score, 0);
        averageScore = Math.round((totalScore / grades.length) * 10) / 10; // Round to 1 decimal
      }
    }

    // Update or create Progress record
    const progress = await Progress.findOneAndUpdate(
      { studentId, courseId },
      {
        submittedCount,
        totalAssignments,
        percent,
        averageScore,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return progress;
  } catch (err) {
    console.error('Progress calculation error:', err);
    throw err;
  }
}

/**
 * Get progress for a student across all enrolled courses
 *
 * @param {ObjectId} studentId - Student's user ID
 * @param {ObjectId} courseId - Optional: filter by specific course
 * @returns {Promise<Array>} Array of progress records
 */
export async function getStudentProgress(studentId, courseId = null) {
  try {
    const query = { studentId };
    if (courseId) {
      query.courseId = courseId;
    }

    const progressRecords = await Progress.find(query)
      .populate('courseId', 'code title')
      .sort({ percent: -1 });

    return progressRecords;
  } catch (err) {
    console.error('Get student progress error:', err);
    throw err;
  }
}

/**
 * Get progress for all students in instructor's assigned courses (FR-09)
 *
 * @param {Array} courseIds - Array of course IDs assigned to instructor
 * @returns {Promise<Array>} Array of progress records with student info
 */
export async function getInstructorCourseProgress(courseIds) {
  try {
    const progressRecords = await Progress.find({
      courseId: { $in: courseIds },
    })
      .populate('studentId', 'name email')
      .populate('courseId', 'code title')
      .sort({ courseId: 1, percent: -1 });

    return progressRecords;
  } catch (err) {
    console.error('Get instructor course progress error:', err);
    throw err;
  }
}
