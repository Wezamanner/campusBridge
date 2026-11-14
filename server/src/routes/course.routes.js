import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  getCourses, 
  getCourseById, 
  enrollCourse,
  addCourseResource,
  getCourseResources,
  downloadCourseResource
} from '../controllers/course.controller.js';
import { createAssignment } from '../controllers/assignment.controller.js';
import { handleResourceUpload } from '../middleware/upload.js';
import { Course } from '../models/Course.js';

const router = express.Router();

// Enforce authentication across all course workspace endpoints
router.use(authenticate);

// Create course (Instructor, Coordinator, Admin)
router.post('/', authorize('instructor', 'coordinator', 'admin'), async (req, res, next) => {
  try {
    const { code, name, title, description, credits, department, semester } = req.body;
    const courseTitle = title || name; // accept either field name

    if (!code || !courseTitle) {
      return res.status(400).json({ success: false, message: 'Course code and title are required.' });
    }

    const existing = await Course.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A course with this code already exists.' });
    }

    const course = new Course({
      code: code.trim().toUpperCase(),
      title: courseTitle.trim(),
      description: description ? description.trim() : '',
      status: 'active',
      instructorId: req.user._id,  // creator is the instructor for self-registration
      createdBy: req.user._id,
    });

    await course.save();
    res.status(201).json({ success: true, message: 'Course created successfully.', course });
  } catch (error) {
    next(error);
  }
});

// List courses (Instructor: assigned courses; Student: active catalog; Coordinator/Admin: all)
router.get('/', getCourses);

// Get single course details and authorized student associations
router.get('/:id', getCourseById);

// Student course enrollment (FR-05)
router.post('/:id/enroll', authorize('student'), enrollCourse);

// Course learning resources (FR-04, FR-05)
// View learning resources (Assigned instructor or enrolled students)
router.get('/:id/resources', authorize('student', 'instructor'), getCourseResources);

// Upload or link course resource (Assigned instructor only)
router.post('/:id/resources', authorize('instructor'), handleResourceUpload, addCourseResource);

// Secure download of course resource (Assigned instructor or enrolled students)
router.get('/:id/resources/:resourceId/download', authorize('student', 'instructor'), downloadCourseResource);

// Course assignments (FR-06)
// Create assignment for course (Assigned instructor only)
router.post('/:id/assignments', authorize('instructor'), createAssignment);

export default router;
