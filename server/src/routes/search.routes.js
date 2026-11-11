/**
 * Search Routes
 * Phase 11 — FR-42, ASM-06
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { globalSearch } from '../controllers/search.controller.js';

const router = Router();

// All authenticated users may search (results scoped by role at controller level)
router.get('/', authenticate, globalSearch);

export default router;
