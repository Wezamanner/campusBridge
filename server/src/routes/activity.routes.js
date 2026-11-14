/**
 * Activity Feed Routes
 * Phase 11 — FR-35, FR-36, FR-37
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getRecentActivity, getWeeklyActivity } from '../controllers/activity.controller.js';

const router = Router();

// All authenticated users may view their own activity
router.get('/recent', authenticate, getRecentActivity);
router.get('/weekly', authenticate, getWeeklyActivity);

export default router;
