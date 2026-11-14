/**
 * Progress Analytics Routes (FR-09, UC-I03)
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getProgress } from '../controllers/progress.controller.js';

const router = express.Router();

// GET /api/v1/progress - View learning progress (FR-09)
router.get('/', authenticate, authorize('student', 'instructor'), getProgress);

export default router;
