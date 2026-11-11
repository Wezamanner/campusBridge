/**
 * Internships & Applications Routes
 * Phase 11 — FR-10, FR-11, FR-12, FR-13
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listInternships,
  getInternship,
  applyForInternship,
  listMyApplications,
  updateApplicationStatus,
} from '../controllers/internships.controller.js';

const router = Router();

// Browse open internships — all roles
router.get('/', authenticate, listInternships);
router.get('/:id', authenticate, getInternship);

// Apply for internship — students only (FR-11)
router.post('/:id/applications', authenticate, authorize('student'), applyForInternship);

export default router;
