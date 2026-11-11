import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getInstructorSubmissions,
  gradeSubmission,
} from '../controllers/instructor.controller.js';

const router = express.Router();

// Enforce authentication and instructor role across all instructor endpoints
router.use(authenticate);
router.use(authorize('instructor'));

// Instructor submission queue (FR-07, FR-08)
router.get('/submissions', getInstructorSubmissions);

// Grade submission with feedback (FR-08, FR-09)
router.patch('/submissions/:id/grade', gradeSubmission);

export default router;
