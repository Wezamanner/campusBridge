import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getInstructorSubmissions,
  gradeSubmission,
} from '../controllers/instructor.controller.js';
import { Course } from '../models/Course.js';

const router = express.Router();

// Enforce authentication and instructor role across all instructor endpoints
router.use(authenticate);
router.use(authorize('instructor'));

// Get instructor's courses
router.get('/courses', async (req, res, next) => {
  try {
    const courses = await Course.find({
      instructorId: req.user._id,
      deletedAt: null,
    }).select('code title description status instructorId createdAt');

    res.status(200).json({
      success: true,
      message: 'Instructor courses retrieved successfully.',
      count: courses.length,
      courses,
    });
  } catch (error) {
    next(error);
  }
});

// Get students in a specific course
router.get('/courses/:courseId/students', async (req, res, next) => {
  try {
    const course = await Course.findOne({
      _id: req.params.courseId,
      instructorId: req.user._id,
      deletedAt: null,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or access denied.',
      });
    }

    // Query Enrollment model for enrolled students
    const { Enrollment } = await import('../models/Enrollment.js');
    const enrollments = await Enrollment.find({ courseId: course._id })
      .populate('studentId', 'name email program year skills')
      .sort({ enrolledAt: -1 });

    const students = enrollments.map(e => e.studentId).filter(Boolean);

    res.status(200).json({
      success: true,
      message: 'Course students retrieved successfully.',
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
});

// Instructor submission queue (FR-07, FR-08)
router.get('/submissions', getInstructorSubmissions);

// Grade submission with feedback (FR-08, FR-09)
router.patch('/submissions/:id/grade', gradeSubmission);

export default router;
