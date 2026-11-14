import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Course } from '../models/Course.js';
import { Assignment } from '../models/Assignment.js';
import { Enrollment } from '../models/Enrollment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
import { Notification } from '../models/Notification.js';
import { submissionsDir } from '../middleware/upload.js';
import {
  validateAssignmentInput,
  validateSubmissionFileSignature,
  ALLOWED_SUBMISSION_MIME_BY_EXT,
} from '../utils/validation.js';

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
 * List assignments for assigned courses (FR-06) or enrolled courses (FR-07)
 * Endpoint: GET /api/v1/assignments
 * Query param: courseId (optional)
 * Role: instructor or student
 */
export const getAssignments = async (req, res) => {
  try {
    const userRole = req.user.role;
    const { courseId } = req.query;

    if (userRole === 'instructor') {
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
    }

    if (userRole === 'student') {
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

        const isEnrolled = await Enrollment.findOne({
          studentId: req.user._id,
          courseId: course._id,
        });

        if (!isEnrolled) {
          return res.status(403).json({
            success: false,
            message: 'Access forbidden: You must be enrolled in this course to view assignments.',
          });
        }

        query.courseId = course._id;
      } else {
        const studentEnrollments = await Enrollment.find({ studentId: req.user._id }).select('courseId');
        const enrolledCourseIds = studentEnrollments.map((e) => e.courseId);
        query.courseId = { $in: enrolledCourseIds };
      }

      const assignments = await Assignment.find(query).sort({ deadline: 1, createdAt: -1 });

      const assignmentCourseIds = [...new Set(assignments.map((a) => a.courseId.toString()))];
      const courses = await Course.find({ _id: { $in: assignmentCourseIds } }).select('code title');
      const courseMap = {};
      courses.forEach((c) => {
        courseMap[c._id.toString()] = { code: c.code, title: c.title };
      });

      const assignmentIds = assignments.map((a) => a._id);
      const studentSubmissions = await Submission.find({
        assignmentId: { $in: assignmentIds },
        studentId: req.user._id,
      });

      const submissionMap = {};
      studentSubmissions.forEach((s) => {
        submissionMap[s.assignmentId.toString()] = s.status;
      });

      const data = assignments.map((a) => {
        const idStr = a._id.toString();
        const cInfo = courseMap[a.courseId.toString()] || { code: '', title: '' };
        return {
          id: idStr,
          courseId: a.courseId.toString(),
          courseCode: cInfo.code,
          courseTitle: cInfo.title,
          title: a.title,
          description: a.description,
          deadline: a.deadline.toISOString(),
          maxScore: a.maxScore,
          allowLate: a.allowLate,
          submissionStatus: submissionMap[idStr] || 'Not Submitted',
          createdAt: a.createdAt.toISOString(),
        };
      });

      return res.status(200).json({
        success: true,
        message: 'Assignments retrieved.',
        data,
        pagination: null,
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Access forbidden: Unauthorized role.',
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
 * Get single assignment details (FR-06 / FR-07)
 * Endpoint: GET /api/v1/assignments/:id
 * Role: instructor or student
 */
export const getAssignmentById = async (req, res) => {
  try {
    const userRole = req.user.role;
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

    if (userRole === 'instructor') {
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
          courseCode: course.code,
          courseTitle: course.title,
          title: assignment.title,
          description: assignment.description,
          deadline: assignment.deadline.toISOString(),
          maxScore: assignment.maxScore,
          allowLate: assignment.allowLate,
          createdAt: assignment.createdAt.toISOString(),
        },
        pagination: null,
      });
    }

    if (userRole === 'student') {
      const isEnrolled = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You must be enrolled in the course to view this assignment.',
        });
      }

      const submission = await Submission.findOne({
        assignmentId: assignment._id,
        studentId: req.user._id,
      });

      let submissionData = null;
      if (submission) {
        let gradeData = null;
        if (submission.status === 'Graded') {
          const grade = await Grade.findOne({ submissionId: submission._id });
          if (grade) {
            gradeData = {
              score: grade.score,
              feedback: grade.feedback || '',
              gradedAt: grade.gradedAt ? grade.gradedAt.toISOString() : grade.createdAt.toISOString(),
            };
          }
        }

        submissionData = {
          id: submission._id.toString(),
          status: submission.status,
          submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : submission.createdAt.toISOString(),
          text: submission.text || '',
          file: submission.file
            ? {
                name: submission.file.name,
                size: submission.file.size,
                mimeType: submission.file.mimeType,
              }
            : null,
          grade: gradeData,
        };
      }

      return res.status(200).json({
        success: true,
        message: 'Assignment details retrieved.',
        data: {
          id: assignment._id.toString(),
          courseId: assignment.courseId.toString(),
          courseCode: course.code,
          courseTitle: course.title,
          title: assignment.title,
          description: assignment.description,
          deadline: assignment.deadline.toISOString(),
          maxScore: assignment.maxScore,
          allowLate: assignment.allowLate,
          submission: submissionData,
          createdAt: assignment.createdAt.toISOString(),
        },
        pagination: null,
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Access forbidden: Unauthorized role.',
    });
  } catch (err) {
    console.error('Get assignment by id error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching assignment details.',
    });
  }
};

/**
 * Submit or replace assignment submission (FR-07)
 * Endpoint: POST /api/v1/assignments/:id/submissions
 * Role: Enrolled student only
 */
export const submitAssignment = async (req, res) => {
  let uploadedFilePath = null;
  if (req.file) {
    uploadedFilePath = req.file.path;
  }

  const cleanupUploadedFile = () => {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (err) {
        console.warn(`[Submission Cleanup Warning] Failed to delete file: ${err.message}`);
      }
    }
  };

  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      cleanupUploadedFile();
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID format.',
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      cleanupUploadedFile();
      return res.status(404).json({
        success: false,
        message: 'Assignment not found.',
      });
    }

    const course = await Course.findById(assignment.courseId);
    if (!course) {
      cleanupUploadedFile();
      return res.status(404).json({
        success: false,
        message: 'Associated course not found.',
      });
    }

    // Role & Enrollment check: Student must be actively enrolled
    const isEnrolled = await Enrollment.findOne({
      studentId: req.user._id,
      courseId: course._id,
    });

    if (!isEnrolled) {
      cleanupUploadedFile();
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course.',
      });
    }

    // Check submission deadline
    const now = new Date();
    if (now > assignment.deadline && !assignment.allowLate) {
      cleanupUploadedFile();
      return res.status(422).json({
        success: false,
        message: 'Deadline has passed and late submissions are not allowed for this assignment.',
      });
    }

    // Check if previous submission is already graded
    const existingSubmission = await Submission.findOne({
      assignmentId: assignment._id,
      studentId: req.user._id,
    });

    if (existingSubmission && existingSubmission.status === 'Graded') {
      cleanupUploadedFile();
      return res.status(422).json({
        success: false,
        message: 'This assignment has already been graded and cannot be resubmitted.',
      });
    }

    const rawText = req.body && typeof req.body.text === 'string' ? req.body.text.trim() : '';

    // Must provide either text or file (or retain existing content)
    if (!rawText && !req.file && (!existingSubmission || (!existingSubmission.text && !existingSubmission.file))) {
      cleanupUploadedFile();
      return res.status(400).json({
        success: false,
        message: 'Submission must contain either a text answer or an attached file.',
      });
    }

    // Deep signature validation if file uploaded
    if (req.file) {
      const sigValidation = validateSubmissionFileSignature(
        req.file.path,
        req.file.mimetype,
        req.file.originalname
      );

      if (!sigValidation.valid) {
        cleanupUploadedFile();
        return res.status(415).json({
          success: false,
          message: sigValidation.error || 'Invalid submission file format.',
        });
      }
    }

    // Move uploaded file to secure permanent submissions directory per storage matrix
    let permanentFileData = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storedFileName = `sub-${req.user._id.toString()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
      const destPath = path.resolve(submissionsDir, storedFileName);
      fs.renameSync(req.file.path, destPath);
      fs.chmodSync(destPath, 0o600);
      uploadedFilePath = destPath;

      permanentFileData = {
        name: req.file.originalname,
        path: destPath,
        size: req.file.size,
        mimeType: req.file.mimetype,
      };
    }

    if (existingSubmission) {
      // Capture previous submission file path for safe cleanup after database save
      const previousFilePath = existingSubmission.file?.path;

      // Replacement flow (FR-07): replace file and/or text before deadline or until graded
      if (req.file) {
        existingSubmission.file = permanentFileData;
      }

      if (req.body.text !== undefined) {
        existingSubmission.text = rawText;
      }

      existingSubmission.submittedAt = new Date();
      existingSubmission.status = 'Submitted';
      await existingSubmission.save();

      // Delete previous file from disk defensively only after database save has succeeded
      if (req.file && previousFilePath && fs.existsSync(previousFilePath) && previousFilePath !== permanentFileData?.path) {
        try {
          fs.unlinkSync(previousFilePath);
        } catch (delErr) {
          console.warn(`[Submission File Cleanup] Could not remove old file: ${delErr.message}`);
        }
      }

      // In-app notification for instructor — FR-14 (non-blocking)
      if (course.instructorId) {
        try {
          await Notification.create({
            userId: course.instructorId,
            type: 'submission',
            title: 'Assignment Submission Updated',
            message: `A student updated their submission for "${assignment.title}".`,
            link: `/instructor/courses/${course._id}`,
          });
        } catch (notifErr) {
          console.error('[Notification Dispatch Error] Submission update notification failed:', notifErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Assignment submission updated successfully.',
        data: {
          id: existingSubmission._id.toString(),
          assignmentId: existingSubmission.assignmentId.toString(),
          status: existingSubmission.status,
          submittedAt: existingSubmission.submittedAt.toISOString(),
          file: existingSubmission.file
            ? {
                name: existingSubmission.file.name,
                size: existingSubmission.file.size,
                mimeType: existingSubmission.file.mimeType,
              }
            : null,
          text: existingSubmission.text,
        },
        pagination: null,
      });
    }

    // New submission flow
    const submission = await Submission.create({
      assignmentId: assignment._id,
      studentId: req.user._id,
      courseId: course._id,
      text: rawText,
      file: permanentFileData,
      status: 'Submitted',
      submittedAt: new Date(),
    });

    // In-app notification for instructor — FR-14 (non-blocking)
    if (course.instructorId) {
      try {
        await Notification.create({
          userId: course.instructorId,
          type: 'submission',
          title: 'New Assignment Submission',
          message: `A student submitted work for "${assignment.title}".`,
          link: `/instructor/courses/${course._id}`,
        });
      } catch (notifErr) {
        console.error('[Notification Dispatch Error] Submission notification failed:', notifErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully.',
      data: {
        id: submission._id.toString(),
        assignmentId: submission.assignmentId.toString(),
        status: submission.status,
        submittedAt: submission.submittedAt.toISOString(),
        file: submission.file
          ? {
              name: submission.file.name,
              size: submission.file.size,
              mimeType: submission.file.mimeType,
            }
          : null,
        text: submission.text,
      },
      pagination: null,
    });
  } catch (err) {
    cleanupUploadedFile();
    console.error('Submit assignment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while submitting assignment.',
    });
  }
};

/**
 * Download submitted file (FR-07)
 * Endpoint: GET /api/v1/assignments/:id/submission/download
 * Role: Enrolled student (own submission) or Assigned instructor (student submission via ?studentId=)
 */
export const downloadSubmissionFile = async (req, res) => {
  try {
    const userRole = req.user.role;
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

    let targetStudentId = null;

    if (userRole === 'student') {
      const isEnrolled = await Enrollment.findOne({
        studentId: req.user._id,
        courseId: course._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Access forbidden: You must be enrolled in the course to download submissions.',
        });
      }

      targetStudentId = req.user._id;
    } else if (userRole === 'instructor') {
      if (!course.instructorId || course.instructorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the assigned instructor for this course.',
        });
      }

      if (!req.query.studentId || !mongoose.Types.ObjectId.isValid(req.query.studentId)) {
        return res.status(400).json({
          success: false,
          message: 'A valid studentId query parameter is required for instructors.',
        });
      }

      targetStudentId = req.query.studentId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: Unauthorized role.',
      });
    }

    const submission = await Submission.findOne({
      assignmentId: assignment._id,
      studentId: targetStudentId,
    });

    if (!submission || !submission.file || !submission.file.path) {
      return res.status(404).json({
        success: false,
        message: 'Submission file not found.',
      });
    }

    const storedPath = submission.file.path;
    const storedFilename = path.basename(storedPath);

    // Reject path traversal characters
    if (
      typeof storedFilename !== 'string' ||
      storedFilename.includes('..') ||
      storedFilename.includes('/') ||
      storedFilename.includes('\\') ||
      storedFilename.includes('\0')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission storage path.',
      });
    }

    const resolvedPath = path.resolve(submissionsDir, storedFilename);
    const rel = path.relative(submissionsDir, resolvedPath);

    if (
      rel.startsWith('..') ||
      path.isAbsolute(rel) ||
      rel !== storedFilename ||
      !fs.existsSync(resolvedPath)
    ) {
      return res.status(404).json({
        success: false,
        message: 'Submission file not found on disk.',
      });
    }

    const stats = fs.lstatSync(resolvedPath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      return res.status(404).json({
        success: false,
        message: 'Submission file not found on disk.',
      });
    }

    const ext = path.extname(storedFilename);
    const rawBase = submission.file.name ? submission.file.name.replace(/[/\\?%*:|"<>]/g, '_').trim() : 'submission';
    const downloadFilename = rawBase.endsWith(ext) ? rawBase : `${rawBase}${ext}`;
    const encodedName = encodeURIComponent(downloadFilename);
    const mimeType = ALLOWED_SUBMISSION_MIME_BY_EXT[ext] || submission.file.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', (err) => {
      console.error(`[Submission Download Stream Error] ${err.message}`);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error streaming submission file.',
        });
      }
    });

    return stream.pipe(res);
  } catch (err) {
    console.error('Download submission file error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while downloading submission file.',
    });
  }
};
