/**
 * Messages Routes
 * Phase 11 — FR-33, FR-34, ASM-05
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listConversations,
  getThread,
  sendMessage,
} from '../controllers/messages.controller.js';

const router = Router();

// All authenticated users may use messaging (ASM-05 enforced at controller level)
router.get('/conversations', authenticate, listConversations);
router.get('/with/:userId', authenticate, getThread);
router.post('/', authenticate, sendMessage);

export default router;
