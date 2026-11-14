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

// All authenticated users can view and update their own profile (FR-03 / UC-G02)
// CV upload/download is student-only (FR-23)
router.use(authenticate);

/**
 * @route   GET /api/v1/profile
 * @desc    Retrieve own profile (all roles: FR-03)
 */
router.get('/', getProfile);

/**
 * @route   PUT /api/v1/profile
 * @desc    Update own profile fields (all roles: FR-03)
 *          Students: name, program, year, skills, preferences
 *          Instructors/Coordinators: name, department, preferences
 */
router.put('/', updateProfile);

/**
 * @route   POST /api/v1/profile/cv
 * @desc    Upload or replace CV document (students only, FR-23)
 */
router.post('/cv', authorize('student'), handleCvUpload, uploadCv);

/**
 * @route   GET /api/v1/profile/cv
 * @desc    Secure authenticated download of own CV (students only, FR-23)
 */
router.get('/cv', authorize('student'), downloadCv);

export default router;
