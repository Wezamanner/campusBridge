import express from 'express';
import { register, login, getMe, logout } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { loginRateLimiter, registrationRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Authentication Endpoints — SEC-05 rate limiting applied
router.post('/register', registrationRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);

// Protected Authentication Endpoints
router.get('/me', authenticate, getMe);

// Role Verification Test Endpoints (used for RBAC testing)
router.get('/test-role/student', authenticate, authorize('student'), (req, res) => {
  res.json({ success: true, message: 'Student access authorized', user: req.user.name });
});

router.get('/test-role/instructor', authenticate, authorize('instructor'), (req, res) => {
  res.json({ success: true, message: 'Instructor access authorized', user: req.user.name });
});

router.get('/test-role/coordinator', authenticate, authorize('coordinator'), (req, res) => {
  res.json({ success: true, message: 'Coordinator access authorized', user: req.user.name });
});

router.get('/test-role/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ success: true, message: 'Admin access authorized', user: req.user.name });
});

export default router;
