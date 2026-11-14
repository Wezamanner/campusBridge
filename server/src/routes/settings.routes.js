import { Router } from 'express';
import { getSettings } from '../controllers/settings.controller.js';

const router = Router();

// GET /api/v1/settings — Public read of system settings
router.get('/', getSettings);

export default router;
