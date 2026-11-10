import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCourses, getCourseById } from '../controllers/course.controller.js';

const router = express.Router();

// Enforce authentication across all course workspace endpoints
router.use(authenticate);

// List courses (Instructor: assigned courses; Student: active catalog; Coordinator/Admin: all)
router.get('/', getCourses);

// Get single course details and authorized student associations
router.get('/:id', getCourseById);

export default router;
