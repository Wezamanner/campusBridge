/**
 * Applications Routes
 * Phase 11 — FR-12 (track/withdraw applications, student-only)
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listMyApplications,
  updateApplicationStatus,
} from '../controllers/internships.controller.js';

const router = Router();

// Students track their own applications (FR-12)
router.get('/', authenticate, authorize('student'), listMyApplications);
router.patch('/:id/status', authenticate, authorize('student'), updateApplicationStatus);

export default router;
