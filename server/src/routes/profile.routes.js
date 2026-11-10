import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { handleCvUpload } from '../middleware/upload.js';
import {
  getProfile,
  updateProfile,
  uploadCv,
  downloadCv,
} from '../controllers/profile.controller.js';

const router = express.Router();

// Enforce authentication and student role on all profile operations
router.use(authenticate, authorize('student'));

/**
 * @route   GET /api/v1/profile
 * @desc    Retrieve own student profile
 */
router.get('/', getProfile);

/**
 * @route   PUT /api/v1/profile
 * @desc    Update editable student profile fields
 */
router.put('/', updateProfile);

/**
 * @route   POST /api/v1/profile/cv
 * @desc    Upload or replace CV document (multipart/form-data, field: 'cv')
 */
router.post('/cv', handleCvUpload, uploadCv);

/**
 * @route   GET /api/v1/profile/cv
 * @desc    Secure authenticated download of own CV document
 */
router.get('/cv', downloadCv);

export default router;
