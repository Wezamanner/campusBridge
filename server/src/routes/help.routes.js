/**
 * Help & Support Routes
 * UC-G07, FR-52, M18 — Static FAQ content per role
 *
 * SRS Section 7.5 resolution: Option A implemented.
 * Returns role-specific FAQ entries. No form submission.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getHelp } from '../controllers/help.controller.js';

const router = Router();

// GET /api/v1/help — returns role-scoped FAQ and support contact
router.get('/', authenticate, getHelp);

export default router;
