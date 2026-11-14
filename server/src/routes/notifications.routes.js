/**
 * Notifications Routes
 * Phase 11 — FR-14, FR-25, FR-43
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '../controllers/notifications.controller.js';

const router = Router();

// All authenticated users manage their own notifications
router.get('/', authenticate, listNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, markRead);

export default router;
