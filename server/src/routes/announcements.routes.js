import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardAnnouncements } from '../controllers/settings.controller.js';

const router = Router();

// GET /api/v1/announcements — List active dashboard announcements for authenticated users
router.get('/', authenticate, getDashboardAnnouncements);

export default router;
