/**
 * Achievements Routes
 * Phase 11 — FR-17 (Student Achievement Badges)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getAchievements } from '../controllers/achievements.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('student'));

router.get('/', getAchievements);

export default router;
