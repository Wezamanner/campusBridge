import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';
import { resourcesDir } from '../middleware/upload.js';
import { 
  validateResourceInput, 
  validateResourceFileSignature, 
  RESOURCE_TYPE_ENUM,
  ALLOWED_RESOURCE_MIME_BY_EXT
} from '../utils/validation.js';

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.txt': 'text/plain',
};

/**
 * @route   GET /api/v1/courses
 * @desc    List courses based on authenticated user's role
 *          - Instructor: Returns courses assigned to the instructor (FR-04, FR-16)
 *          - Student: Returns active courses for catalog browsing (FR-05)
 *          - Coordinator / Admin: Returns all courses with optional filters
 * @access  Protected (All authenticated roles)
 */
export const getCourses = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const { search, status } = req.query;

    let query = {};

    if (userRole === 'instructor') {
      // Security Guard: Instructors can only view courses assigned to them by Coordinators
      // Never trust client-supplied instructorId parameter for ownership
      query.instructorId = req.user._id;

      if (status && (status === 'active' || status === 'archived')) {
        query.status = status;
      }
    } else if (userRole === 'student') {
      // Students can browse active courses
      query.status = 'active';
    } else if (status) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const sanitizedSearch = search.trim();
      query.$or = [
        { code: { $regex: sanitizedSearch, $options: 'i' } },
        { title: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const courses = await Course.find(query)
      .populate('instructorId', 'name email department')
      .sort({ createdAt: -1 });

    // Aggregate enrolled student counts and enrollment status
    const courseIds = courses.map((c) => c._id);
    
    // Count enrollments per course
    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    enrollmentCounts.forEach((ec) => {
      countMap.set(ec._id.toString(), ec.count);
    });

    let studentEnrolledCourseIds = new Set();
    if (userRole === 'student') {
      const studentEnrollments = await Enrollment.find({
        studentId: req.user._id,
        courseId: { $in: courseIds },
      }).select('courseId');
      studentEnrollments.forEach((e) => {
        studentEnrolledCourseIds.add(e.courseId.toString());
      });
    }

    const data = courses.map((course) => {
      const courseIdStr = course._id.toString();
      const enrolledCount = countMap.get(courseIdStr) || 0;

      const formatted = {
        id: courseIdStr,
        _id: courseIdStr,
        code: course.code,
        title: course.title,
        description: course.description || '',
        status: course.status,
        instructorId: course.instructorId?._id
          ? course.instructorId._id.toString()
          : course.instructorId?.toString() || null,
        instructor: course.instructorId && course.instructorId.name
          ? (userRole === 'student'
              ? {
                  id: course.instructorId._id.toString(),
                  name: course.instructorId.name,
                }
              : {
                  id: course.instructorId._id.toString(),
                  name: course.instructorId.name,
                  email: course.instructorId.email,
                  department: course.instructorId.department || '',
                })
          : null,
        enrolledStudentsCount: enrolledCount,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };

      if (userRole === 'student') {
        formatted.isEnrolled = studentEnrolledCourseIds.has(courseIdStr);
      }

      return formatted;
    });

    return res.status(200).json({
      success: true,
      message: userRole === 'instructor' 
        ? 'Assigned courses retrieved successfully.' 
        : 'Courses retrieved successfully.',
      data,
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/courses/:id
 * @desc    View single course details and authorized student roster
 *          - Instructor: Enforces course assignment (Course.instructorId === req.user._id)
 *          - Authorized student roster is populated for assigned instructors and coordinators
 * @access  Protected (All authenticated roles)
 */
export const getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.',
      });
    }

    const course = await Course.findById(id).populate('instructorId', 'name email department');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    const userRole = req.user.role;
    const assignedInstructorId = course.instructorId?._id
      ? course.instructorId._id.toString()
      : course.instructorId?.toString();

    // Security Rule 3: Instructors can only access courses assigned to them
    if (userRole === 'instructor') {
      if (!assignedInstructorId || assignedInstructorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only access courses assigned to you.',
        });
      }
    }

    // Retrieve authorized student enrollments for this course
    const enrollments = await Enrollment.find({ courseId: course._id })
      .populate('studentId', 'name email program year active')
      .sort({ enrolledAt: -1 });

    const enrolledStudents = enrollments
      .filter((e) => e.studentId)
      .map((e) => ({
        id: e.studentId._id.toString(),
        name: e.studentId.name,
        email: e.studentId.email,
        program: e.studentId.program || '',
        year: e.studentId.year || null,
        active: e.studentId.active,
        enrolledAt: e.enrolledAt,
      }));

    const isStudentEnrolled = userRole === 'student'
      ? enrollments.some((e) => e.studentId && e.studentId._id.toString() === req.user._id.toString())
      : undefined;

    const instructorInfo = course.instructorId && course.instructorId.name
      ? (userRole === 'student'
          ? {
              id: course.instructorId._id.toString(),
              name: course.instructorId.name,
              email: course.instructorId.email || '',
            }
          : {
              id: course.instructorId._id.toString(),
              name: course.instructorId.name,
              email: course.instructorId.email,
              department: course.instructorId.department || '',
            })
      : null;

    const data = {
      id: course._id.toString(),
      _id: course._id.toString(),
      code: course.code,
      title: course.title,
      description: course.description || '',
      status: course.status,
      instructorId: assignedInstructorId || null,
      instructor: instructorInfo,
      enrolledStudentsCount: enrolledStudents.length,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    // Include authorized student roster for instructors, coordinators, and admins
    if (userRole === 'instructor' || userRole === 'coordinator' || userRole === 'admin') {
      data.enrolledStudents = enrolledStudents;
    }

    if (userRole === 'student') {
      data.isEnrolled = isStudentEnrolled;
    }

    return res.status(200).json({
      success: true,
      message: 'Course details retrieved successfully.',
      data,
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/courses/:id/enroll
 * @desc    Enroll authenticated student in an active course (FR-05)
 *          - Preconditions: Course must exist, course must be active, student not already enrolled
 *          - Conflict Handling: Returns 409 Conflict if duplicate enrollment attempted
 * @access  Protected (student)
 */
export const enrollCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.',
      });
    }

    // 1. Verify target course exists
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // 2. Verify course is currently active
    if (course.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot enroll in an archived or inactive course.',
      });
    }

    // 3. Derive student identity strictly from authenticated JWT
    const studentId = req.user._id;

    // 4. Duplicate enrollment check per SRS NFR-15 and student API spec
    const existingEnrollment = await Enrollment.findOne({
      studentId,
      courseId: course._id,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'Student is already enrolled in this course.',
      });
    }

    // 5. Create new enrollment record
    const enrollment = await Enrollment.create({
      studentId,
      courseId: course._id,
      enrolledAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `Successfully enrolled in course ${course.code}.`,
      data: {
        enrollmentId: enrollment._id.toString(),
        courseId: course._id.toString(),
        studentId: studentId.toString(),
        enrolledAt: enrollment.enrolledAt,
      },
      pagination: null,
    });
  } catch (error) {
    // Catch MongoDB duplicate key race condition (E11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Student is already enrolled in this course.',
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/v1/courses/:id/resources
 * @desc    Upload or link a course learning resource (Assigned Instructor only) (FR-04)
 * @access  Protected (instructor)
 */
export const addCourseResource = async (req, res, next) => {
  let stagedFilePath = req.file?.path;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      if (stagedFilePath && fs.existsSync(stagedFilePath)) {
        fs.unlinkSync(stagedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.',
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      if (stagedFilePath && fs.existsSync(stagedFilePath)) {
        fs.unlinkSync(stagedFilePath);
      }
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Role & Ownership Guard: Only the assigned instructor can upload resources (FR-04)
    if (course.instructorId.toString() !== req.user._id.toString()) {
      if (stagedFilePath && fs.existsSync(stagedFilePath)) {
        fs.unlinkSync(stagedFilePath);
      }
      return res.status(403).json({
        success: false,
        message: 'Only the assigned instructor can manage resources for this course.',
      });
    }

    if (course.status !== 'active') {
      if (stagedFilePath && fs.existsSync(stagedFilePath)) {
        fs.unlinkSync(stagedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Cannot add resources to an archived course.',
      });
    }

    // Input validation
    const validation = validateResourceInput(req.body, req.file);
    if (!validation.valid) {
      if (stagedFilePath && fs.existsSync(stagedFilePath)) {
        fs.unlinkSync(stagedFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Resource validation failed.',
        errors: validation.errors,
      });
    }

    let resourceUrl = req.body?.url ? req.body.url.trim() : '';
    let resourceType = req.body?.type;
    let storedFileName = null;

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      // Check MIME type against extension
      const validMimes = ALLOWED_RESOURCE_MIME_BY_EXT[ext];
      if (!validMimes || !validMimes.includes(req.file.mimetype)) {
        if (stagedFilePath && fs.existsSync(stagedFilePath)) {
          fs.unlinkSync(stagedFilePath);
        }
        return res.status(415).json({
          success: false,
          message: `MIME type '${req.file.mimetype}' is not permitted for extension '${ext}'.`,
        });
      }

      // Deep inspection of file content/signature
      const isSignatureValid = validateResourceFileSignature(
        req.file.path,
        req.file.mimetype,
        ext
      );

      if (!isSignatureValid) {
        if (stagedFilePath && fs.existsSync(stagedFilePath)) {
          fs.unlinkSync(stagedFilePath);
        }
        return res.status(415).json({
          success: false,
          message: `Uploaded file signature does not match declared format '${ext}'.`,
        });
      }

      // Safe UUID-based filename
      storedFileName = `res-${course._id.toString()}-${crypto.randomUUID()}${ext}`;
      const destPath = path.resolve(resourcesDir, storedFileName);

      // Move from tmpDir to resourcesDir
      fs.renameSync(req.file.path, destPath);
      stagedFilePath = null; // Staged file successfully moved

      // Restrictive file permissions
      fs.chmodSync(destPath, 0o600);

      resourceUrl = `/uploads/resources/${storedFileName}`;

      if (!resourceType) {
        if (ext === '.pdf') resourceType = 'pdf';
        else if (ext === '.ppt' || ext === '.pptx') resourceType = 'slides';
        else if (ext === '.doc' || ext === '.docx' || ext === '.txt') resourceType = 'document';
        else resourceType = 'other';
      }
    } else {
      if (!resourceType) {
        resourceType = 'link';
      }
    }

    const newResource = {
      title: req.body.title.trim(),
      type: resourceType,
      url: resourceUrl,
      addedAt: new Date(),
    };

    course.resources.push(newResource);

    try {
      await course.save();
    } catch (saveError) {
      // Clean up permanent file if database save fails
      if (storedFileName) {
        const destPath = path.resolve(resourcesDir, storedFileName);
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      }
      throw saveError;
    }

    const savedResource = course.resources[course.resources.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Course resource added successfully.',
      data: {
        _id: savedResource._id.toString(),
        title: savedResource.title,
        type: savedResource.type,
        url: savedResource.url,
        addedAt: savedResource.addedAt,
      },
      pagination: null,
    });
  } catch (error) {
    if (stagedFilePath && fs.existsSync(stagedFilePath)) {
      try {
        fs.unlinkSync(stagedFilePath);
      } catch (cleanupErr) {
        console.warn(`[Resource Cleanup Warning] Failed to delete temp file: ${cleanupErr.message}`);
      }
    }
    next(error);
  }
};

/**
 * @route   GET /api/v1/courses/:id/resources
 * @desc    View course learning resources (Assigned Instructor or Enrolled Student) (FR-05)
 * @access  Protected (student, instructor)
 */
export const getCourseResources = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format.',
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Role-based authorization per security-access-control.md
    if (userRole === 'instructor') {
      if (course.instructorId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Instructors can only access resources for courses assigned to them.',
        });
      }
    } else if (userRole === 'student') {
      const isEnrolled = await Enrollment.findOne({
        studentId: userId,
        courseId: course._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Course learning resources are accessible only to actively enrolled students.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to assigned instructor or enrolled students.',
      });
    }

    const resources = (course.resources || []).map((r) => ({
      _id: r._id.toString(),
      title: r.title,
      type: r.type,
      url: r.url,
      addedAt: r.addedAt,
    }));

    return res.status(200).json({
      success: true,
      message: userRole === 'instructor' ? 'Resources retrieved.' : 'Course learning resources retrieved.',
      data: resources,
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/courses/:id/resources/:resourceId/download
 * @desc    Secure authenticated download of a course learning resource (FR-05, SEC-04)
 * @access  Protected (student, instructor)
 */
export const downloadCourseResource = async (req, res, next) => {
  try {
    const { id, resourceId } = req.params;
    const userRole = req.user.role;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID or resource ID format.',
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Role-based authorization per security-access-control.md
    if (userRole === 'instructor') {
      if (course.instructorId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Instructors can only access resources for courses assigned to them.',
        });
      }
    } else if (userRole === 'student') {
      const isEnrolled = await Enrollment.findOne({
        studentId: userId,
        courseId: course._id,
      });

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'Course learning resources are accessible only to actively enrolled students.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to assigned instructor or enrolled students.',
      });
    }

    const resource = course.resources.id(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found in this course.',
      });
    }

    // If external link, validate and redirect safely
    if (resource.url.startsWith('http://') || resource.url.startsWith('https://')) {
      try {
        const parsed = new URL(resource.url);
        if (
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
          !parsed.username &&
          !parsed.password &&
          !/[\x00-\x1F\x7F\s]/.test(resource.url)
        ) {
          return res.redirect(resource.url);
        }
      } catch {}
      return res.status(400).json({
        success: false,
        message: 'Invalid or unsafe redirect URL.',
      });
    }

    // Stored file validation
    const storedFilename = path.basename(resource.url);

    // Reject suspicious path traversal attempts
    if (
      typeof storedFilename !== 'string' ||
      storedFilename.includes('..') ||
      storedFilename.includes('/') ||
      storedFilename.includes('\\') ||
      storedFilename.includes('\0')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or suspicious resource storage path.',
      });
    }

    const resolvedPath = path.resolve(resourcesDir, storedFilename);
    const rel = path.relative(resourcesDir, resolvedPath);

    if (
      rel.startsWith('..') ||
      path.isAbsolute(rel) ||
      rel !== storedFilename ||
      !fs.existsSync(resolvedPath)
    ) {
      return res.status(404).json({
        success: false,
        message: 'Resource file not found on disk.',
      });
    }

    const stats = fs.lstatSync(resolvedPath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      return res.status(404).json({
        success: false,
        message: 'Resource file not found on disk.',
      });
    }

    // Sanitize downloaded filename per RFC 6266 / RFC 5987
    const ext = path.extname(storedFilename);
    const rawBase = resource.title ? resource.title.replace(/[/\\?%*:|"<>]/g, '_').trim() : 'resource';
    const downloadFilename = rawBase.endsWith(ext) ? rawBase : `${rawBase}${ext}`;
    const encodedName = encodeURIComponent(downloadFilename);
    const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const readStream = fs.createReadStream(resolvedPath);
    readStream.on('error', (err) => {
      console.error(`[Resource Download Stream Error] ${err.message}`);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Error streaming resource file.',
        });
      }
    });

    return readStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

