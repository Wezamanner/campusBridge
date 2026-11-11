/**
 * AI Learning Assistant Routes
 * Phase 11 — FR-19, FR-20, FR-21, CON-05
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  generateStudyPlan,
  askQuestion,
  getInternshipMatches,
} from '../controllers/ai.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('student'));

router.post('/study-plan', generateStudyPlan);
router.post('/ask', askQuestion);
router.get('/internship-matches', getInternshipMatches);

export default router;
