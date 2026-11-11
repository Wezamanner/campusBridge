/**
 * Projects Routes
 * Phase 11 — FR-27–FR-30, ASM-02 (student-only)
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projects.controller.js';

const router = Router();

// ASM-02: Projects are a student-only feature
router.get('/', authenticate, authorize('student'), listProjects);
router.post('/', authenticate, authorize('student'), createProject);
router.put('/:id', authenticate, authorize('student'), updateProject);
router.delete('/:id', authenticate, authorize('student'), deleteProject);

export default router;
