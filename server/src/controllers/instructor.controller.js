import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
import { User } from '../models/User.js';
import { recalculateStudentCourseProgress } from '../services/progress.service.js';

/**
 * Retrieve submissions queue for assigned courses (FR-08, FR-07)
 * Endpoint: GET /api/v1/instructor/submissions
 * Role: Assigned instructor only
 * Query params: courseId (optional), status (optional: 'Submitted', 'Graded')
 */
export const getInstructorSubmissions = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { courseId, status } = req.query;

    // Build query: start with courses assigned to this instructor
    const assignedCourses = await Course.find({ instructorId }).select('_id code title');

    if (assignedCourses.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No assigned courses found.',
        data: [],
        pagination: null,
      });
    }

    const assignedCourseIds = assignedCourses.map((c) => c._id);

    // Build submission query
    const query = {
      courseId: courseId && mongoose.Types.ObjectId.isValid(courseId)
        ? new mongoose.Types.ObjectId(courseId)
        : { $in: assignedCourseIds },
    };

    // Optional courseId validation
    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID format.',
        });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found.',
        });
      }

      if (!course.instructorId || course.instructorId.toString() !== instructorId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the assigned instructor for this course.',
        });
      }

      query.courseId = course._id;
    }

    // Optional status filter
    if (status) {
      if (!['Submitted', 'Graded'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "Submitted" or "Graded".',
        });
      }
      query.status = status;
    }

    // Fetch submissions with populated data
    const submissions = await Submission.find(query)
      .populate('studentId', 'name email')
      .populate('assignmentId', 'title maxScore courseId')
      .sort({ submittedAt: -1 });

    // Build response data
    const data = await Promise.all(
      submissions.map(async (sub) => {
        const assignment = sub.assignmentId;
        const student = sub.studentId;

        // Find course for courseCode
        const course = assignedCourses.find((c) => c._id.toString() === assignment?.courseId?.toString());

        // Find grade if graded
        let gradeData = null;
        if (sub.status === 'Graded') {
          const grade = await Grade.findOne({ submissionId: sub._id });
          if (grade) {
            gradeData = {
              score: grade.score,
              feedback: grade.feedback || '',
              gradedAt: grade.gradedAt ? grade.gradedAt.toISOString() : grade.createdAt.toISOString(),
            };
          }
        }

        return {
          id: sub._id.toString(),
          assignmentId: assignment?._id?.toString() || '',
          assignmentTitle: assignment?.title || 'Unknown Assignment',
          courseId: course?._id?.toString() || '',
          courseCode: course?.code || '',
          courseTitle: course?.title || '',
          studentId: student?._id?.toString() || '',
          studentName: student?.name || 'Unknown Student',
          studentEmail: student?.email || '',
          status: sub.status,
          submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : sub.createdAt.toISOString(),
          text: sub.text || '',
          file: sub.file
            ? {
                name: sub.file.name,
                size: sub.file.size,
                mimeType: sub.file.mimeType,
              }
            : null,
          grade: gradeData,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: 'Submissions retrieved.',
      data,
      pagination: null,
    });
  } catch (err) {
    console.error('Get instructor submissions error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching submissions.',
    });
  }
};

/**
 * Grade submission and provide feedback (FR-08, FR-09)
 * Endpoint: PATCH /api/v1/submissions/:id/grade
 * Role: Assigned instructor only
 * Security: Verifies instructor ownership of course, validates score against maxScore
 * Post-actions: Updates submission status, recalculates progress (future: triggers notification)
 */
export const gradeSubmission = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { id } = req.params;
    const { score, feedback } = req.body;

    // Validate submission ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID format.',
      });
    }

    // Find submission
    const submission = await Submission.findById(id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found.',
      });
    }

    // Find related assignment
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Associated assignment not found.',
      });
    }

    // Find related course
    const course = await Course.findById(submission.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Associated course not found.',
      });
    }

    // Security guard: Only assigned instructor can grade (FR-08, SEC-07)
    if (!course.instructorId || course.instructorId.toString() !== instructorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned instructor may grade submissions for this course.',
      });
    }

    // Validate score (FR-08)
    if (score === undefined || score === null || score === '') {
      return res.status(400).json({
        success: false,
        message: 'Score is required.',
      });
    }

    const numScore = Number(score);

    // Validate score is a valid number
    if (!Number.isFinite(numScore)) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a valid number.',
      });
    }

    // Validate score >= 0
    if (numScore < 0) {
      return res.status(400).json({
        success: false,
        message: 'Score cannot be negative.',
      });
    }

    // Validate score <= assignment.maxScore (FR-08, SEC-07)
    if (numScore > assignment.maxScore) {
      return res.status(400).json({
        success: false,
        message: `Score cannot exceed assignment maximum score of ${assignment.maxScore}.`,
      });
    }

    // Validate feedback length
    const trimmedFeedback = typeof feedback === 'string' ? feedback.trim() : '';
    if (trimmedFeedback.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback cannot exceed 1000 characters.',
      });
    }

    // Check if already graded
    const existingGrade = await Grade.findOne({ submissionId: submission._id });

    // Use MongoDB transaction to ensure atomic Grade + Submission updates
    const session = await mongoose.startSession();

    let savedGrade;
    try {
      await session.withTransaction(async () => {
        if (existingGrade) {
          // Update existing grade
          existingGrade.score = numScore;
          existingGrade.maxScore = assignment.maxScore;
          existingGrade.feedback = trimmedFeedback;
          existingGrade.gradedAt = new Date();
          savedGrade = await existingGrade.save({ session });
        } else {
          // Create new grade record (must wrap in array for session support)
          const grades = await Grade.create(
            [
              {
                submissionId: submission._id,
                assignmentId: assignment._id,
                studentId: submission.studentId,
                courseId: submission.courseId,
                graderId: instructorId,
                score: numScore,
                maxScore: assignment.maxScore,
                feedback: trimmedFeedback,
                gradedAt: new Date(),
              },
            ],
            { session }
          );
          savedGrade = grades[0];
        }

        // Update submission status to Graded (FR-08)
        // Both operations succeed or fail together atomically
        submission.status = 'Graded';
        await submission.save({ session });
      });
    } catch (err) {
      // Transaction failed - neither Grade nor Submission were updated
      // Check for duplicate key error (E11000)
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This submission has already been graded.',
          data: null,
          pagination: null,
        });
      }

      throw err;
    } finally {
      await session.endSession();
    }

    // Recalculate student progress after successful grading (FR-09)
    // Progress recalculation failure should not invalidate successful grade
    try {
      await recalculateStudentCourseProgress(submission.studentId, submission.courseId);
    } catch (progressErr) {
      // Log but don't fail the grading operation
      console.error('[Progress Recalculation Error] Grade saved successfully but progress update failed:', {
        submissionId: submission._id.toString(),
        studentId: submission.studentId.toString(),
        courseId: submission.courseId.toString(),
        error: progressErr.message,
      });
      // Progress will be recalculated on next grading or can be manually triggered
    }

    // TODO Phase 14: Dispatch notification to student (FR-14)

    return res.status(200).json({
      success: true,
      message: 'Submission graded successfully.',
      data: {
        submissionId: submission._id.toString(),
        status: submission.status,
        grade: {
          score: numScore,
          maxScore: assignment.maxScore,
          feedback: trimmedFeedback,
          gradedAt: new Date().toISOString(),
        },
      },
      pagination: null,
    });
  } catch (err) {
    console.error('Grade submission error:', err);

    // Handle duplicate key error (E11000) - should not happen but defensive
    if (err.code === 11000 && err.keyPattern?.submissionId) {
      return res.status(409).json({
        success: false,
        message: 'A grade already exists for this submission. Use update instead.',
      });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while grading submission.',
    });
  }
};
