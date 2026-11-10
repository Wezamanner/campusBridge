import mongoose from 'mongoose';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { User } from '../models/User.js';

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

