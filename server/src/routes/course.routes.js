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

const router = express.Router();

// Enforce authentication across all course workspace endpoints
router.use(authenticate);

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
