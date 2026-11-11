/**
 * Progress Analytics Controller (FR-09)
 * Handles student and instructor progress viewing
 */

import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import {
  getStudentProgress,
  getInstructorCourseProgress,
} from '../services/progress.service.js';

/**
 * Get learning progress (FR-09)
 * Endpoint: GET /api/v1/progress
 *
 * Role-specific behavior:
 * - Student: Returns own progress across enrolled courses
 * - Instructor: Returns progress for students in assigned courses
 *
 * Query params:
 * - courseId: Filter by specific course
 */
export const getProgress = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    const { courseId } = req.query;

    // Validate courseId if provided
    if (courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.',
      });
    }

    // STUDENT VIEW: Own progress (FR-09)
    if (role === 'student') {
      // Get enrolled courses
      const enrollments = await Enrollment.find({ studentId: userId }).select('courseId');

      if (enrollments.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No enrolled courses found.',
          data: [],
          pagination: null,
        });
      }

      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      // If courseId specified, verify enrollment
      let targetCourseId = null;
      if (courseId) {
        const courseObjectId = new mongoose.Types.ObjectId(courseId);
        const isEnrolled = enrolledCourseIds.some((id) => id.toString() === courseId);

        if (!isEnrolled) {
          return res.status(403).json({
            success: false,
            message: 'You are not enrolled in this course.',
          });
        }

        targetCourseId = courseObjectId;
      }

      // Get progress records
      const progressRecords = await getStudentProgress(userId, targetCourseId);

      // Build response data
      const data = progressRecords.map((p) => ({
        courseId: p.courseId._id.toString(),
        courseCode: p.courseId.code,
        courseTitle: p.courseId.title,
        submittedCount: p.submittedCount,
        totalAssignments: p.totalAssignments,
        percent: p.percent,
        averageScore: p.averageScore,
        updatedAt: p.updatedAt.toISOString(),
      }));

      return res.status(200).json({
        success: true,
        message: 'Student progress retrieved.',
        data,
        pagination: null,
      });
    }

    // INSTRUCTOR VIEW: Progress of students in assigned courses (FR-09)
    if (role === 'instructor') {
      // Get assigned courses
      const assignedCourses = await Course.find({ instructorId: userId }).select('_id code title');

      if (assignedCourses.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No assigned courses found.',
          data: [],
          pagination: null,
        });
      }

      const assignedCourseIds = assignedCourses.map((c) => c._id);

      // If courseId specified, verify instructor assignment
      if (courseId) {
        const courseObjectId = new mongoose.Types.ObjectId(courseId);
        const isAssigned = assignedCourseIds.some((id) => id.toString() === courseId);

        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            message: 'You are not the assigned instructor for this course.',
          });
        }

        assignedCourseIds.length = 0;
        assignedCourseIds.push(courseObjectId);
      }

      // Return all student progress for assigned courses
      const progressRecords = await getInstructorCourseProgress(assignedCourseIds);

      const data = progressRecords.map((p) => ({
        courseId: p.courseId._id.toString(),
        courseCode: p.courseId.code,
        courseTitle: p.courseId.title,
        studentId: p.studentId._id.toString(),
        studentName: p.studentId.name,
        studentEmail: p.studentId.email,
        submittedCount: p.submittedCount,
        totalAssignments: p.totalAssignments,
        percent: p.percent,
        averageScore: p.averageScore,
        updatedAt: p.updatedAt.toISOString(),
      }));

      return res.status(200).json({
        success: true,
        message: 'Course student progress retrieved.',
        data,
        pagination: null,
      });
    }

    // Other roles not authorized (FR-09)
    return res.status(403).json({
      success: false,
      message: 'Access to progress analytics is restricted to students and instructors.',
    });
  } catch (err) {
    console.error('Get progress error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching progress.',
    });
  }
};
