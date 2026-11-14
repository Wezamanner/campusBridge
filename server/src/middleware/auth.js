import { verifyToken } from '../utils/token.js';
import { User } from '../models/User.js';

/**
 * Authentication Middleware: Identifies logged-in user from Bearer JWT
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required. Format: Bearer <token>',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Phase 12.5: Fetch user with explicit deletedAt check (soft-delete policy enforcement)
    const user = await User.findById(decoded.id).select('+deletedAt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account associated with this token no longer exists.',
      });
    }

    // Phase 12.5: Soft-delete policy - deleted users cannot authenticate
    if (user.deletedAt) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deleted. Please contact an administrator if you believe this is an error.',
      });
    }

    // Check if account has been deactivated per FR-22 / SRS Section 12.4
    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Attach user document to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-based Authorization Middleware: Enforces permitted roles on routes
 * @param  {...string} allowedRoles - Array of allowed roles (e.g. 'student', 'instructor')
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization check.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}]. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
};

/**
 * Resource Ownership Middleware: Enforces that the user owns the record, unless admin
 * @param {Function} getOwnerIdFn - Async or sync function (req) => ObjectId / String of resource owner
 */
export const checkOwnership = (getOwnerIdFn) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      // Administrators have global platform management privileges per SRS
      if (req.user.role === 'admin') {
        return next();
      }

      const ownerId = await getOwnerIdFn(req);

      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Target resource not found for ownership verification.',
        });
      }

      if (ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to access or modify another user\'s private record.',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
