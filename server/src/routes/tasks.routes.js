/**
 * Tasks Routes
 * Phase 11 — FR-31, FR-32, ASM-02 (student-only)
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/tasks.controller.js';

const router = Router();

// ASM-02: Tasks are a student-only feature
router.get('/', authenticate, authorize('student'), listTasks);
router.post('/', authenticate, authorize('student'), createTask);
router.patch('/:id', authenticate, authorize('student'), updateTask);
router.delete('/:id', authenticate, authorize('student'), deleteTask);

export default router;
