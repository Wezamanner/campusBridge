import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Assignment } from '../models/Assignment.js';
import { validateAssignmentInput } from '../utils/validation.js';

/**
 * Create a new assignment for a course (FR-06)
 * Endpoint: POST /api/v1/courses/:id/assignments
 * Role: Assigned instructor only
 */
export const createAssignment = async (req, res) => {
  try {
    const courseId = req.params.id || req.body.courseId;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
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

    // Protection: Cannot add assignments to archived courses (SEC-07)
    if (course.status === 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create assignments for an archived course.',
      });
    }

    // Security guard: Assigned instructor only (FR-06, Rule 3)
    if (!course.instructorId || course.instructorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned instructor may create assignments for this course.',
      });
    }

    // Input validation
    const validation = validateAssignmentInput(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Assignment validation failed.',
        errors: validation.errors,
      });
    }

    const { title, description, deadline, maxScore, allowLate } = req.body;

    const assignment = await Assignment.create({
      courseId: course._id,
      createdBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
      deadline: new Date(deadline),
      maxScore: maxScore !== undefined && maxScore !== null && maxScore !== '' ? Number(maxScore) : 100,
      allowLate: typeof allowLate === 'boolean' ? allowLate : allowLate === 'true',
    });

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully.',
      data: {
        id: assignment._id.toString(),
        courseId: assignment.courseId.toString(),
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline.toISOString(),
        maxScore: assignment.maxScore,
        allowLate: assignment.allowLate,
        createdAt: assignment.createdAt.toISOString(),
      },
      pagination: null,
    });
  } catch (err) {
    console.error('Create assignment error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating assignment.',
    });
  }
};

/**
 * List assignments for assigned courses (FR-06)
 * Endpoint: GET /api/v1/assignments
 * Query param: courseId (optional)
 * Role: instructor only
 */
export const getAssignments = async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Only instructors may access assignments.',
      });
    }

    const { courseId } = req.query;
    let query = {};

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
      if (!course.instructorId || course.instructorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the assigned instructor for this course.',
        });
      }
      query.courseId = course._id;
    } else {
      const assignedCourses = await Course.find({ instructorId: req.user._id });
      const courseIds = assignedCourses.map((c) => c._id);
      query.courseId = { $in: courseIds };
    }

    const assignments = await Assignment.find(query).sort({ deadline: 1, createdAt: -1 });

    const data = assignments.map((a) => ({
      id: a._id.toString(),
      courseId: a.courseId.toString(),
      title: a.title,
      description: a.description,
      deadline: a.deadline.toISOString(),
      maxScore: a.maxScore,
      allowLate: a.allowLate,
      createdAt: a.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      message: 'Assignments retrieved.',
      data,
      pagination: null,
    });
  } catch (err) {
    console.error('Get assignments error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assignments.',
    });
  }
};

/**
 * Get single assignment details (FR-06)
 * Endpoint: GET /api/v1/assignments/:id
 * Role: instructor only
 */
export const getAssignmentById = async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Only instructors may access assignments.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID format.',
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const course = await Course.findById(assignment.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Associated course not found.',
      });
    }

    // Role-based authorization: assigned instructor only
    if (!course.instructorId || course.instructorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned instructor for this course.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Assignment details retrieved.',
      data: {
        id: assignment._id.toString(),
        courseId: assignment.courseId.toString(),
        title: assignment.title,
        description: assignment.description,
        deadline: assignment.deadline.toISOString(),
        maxScore: assignment.maxScore,
        allowLate: assignment.allowLate,
        createdAt: assignment.createdAt.toISOString(),
      },
      pagination: null,
    });
  } catch (err) {
    console.error('Get assignment by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assignment details.',
    });
  }
};
