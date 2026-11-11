import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getAssignments,
  getAssignmentById,
} from '../controllers/assignment.controller.js';

const router = express.Router();

// Enforce authentication across all assignment endpoints
router.use(authenticate);

// List assignments for instructor's assigned courses (FR-06)
// Only instructor access is authorized; student access activates in Phase 7 (FR-07)
router.get('/', authorize('instructor'), getAssignments);

// View single assignment details (FR-06)
// Only instructor access is authorized; student access activates in Phase 7 (FR-07)
router.get('/:id', authorize('instructor'), getAssignmentById);

export default router;
