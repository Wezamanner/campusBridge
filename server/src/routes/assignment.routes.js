import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAssignments,
  getAssignmentById,
  submitAssignment,
  downloadSubmissionFile,
} from '../controllers/assignment.controller.js';
import { handleSubmissionUpload } from '../middleware/upload.js';

const router = express.Router();

// Enforce authentication across all assignment endpoints
router.use(authenticate);

// List assignments for instructor's assigned courses (FR-06) or student's enrolled courses (FR-07)
router.get('/', authorize('instructor', 'student'), getAssignments);

// View single assignment details (FR-06, FR-07)
router.get('/:id', authorize('instructor', 'student'), getAssignmentById);

// Submit or replace assignment submission (FR-07)
router.post('/:id/submissions', authorize('student'), handleSubmissionUpload, submitAssignment);

// Download submitted file (FR-07)
router.get('/:id/submission/download', authorize('student', 'instructor'), downloadSubmissionFile);

export default router;
