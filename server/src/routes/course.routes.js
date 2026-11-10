import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getCourses, getCourseById, enrollCourse } from '../controllers/course.controller.js';

const router = express.Router();

// Enforce authentication across all course workspace endpoints
router.use(authenticate);

// List courses (Instructor: assigned courses; Student: active catalog; Coordinator/Admin: all)
router.get('/', getCourses);

// Get single course details and authorized student associations
router.get('/:id', getCourseById);

// Student course enrollment (FR-05)
router.post('/:id/enroll', authorize('student'), enrollCourse);

export default router;
