/**
 * Rankings Routes
 * Phase 11 — FR-17 (Student Cohort Rankings)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getRankings } from '../controllers/achievements.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('student'));

router.get('/', getRankings);

export default router;
