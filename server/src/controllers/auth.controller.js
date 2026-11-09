import * as authService from '../services/auth.service.js';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new student account
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, program, year } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    const result = await authService.registerStudent({
      name,
      email,
      password,
      program,
      year,
    });

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user (student, instructor, coordinator, admin)
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user details
 * @access  Protected (all 4 roles)
 */
export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Current user profile retrieved successfully.',
    data: req.user.toJSON(),
  });
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (clears token on client)
 * @access  Public / Protected
 */
export const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
    data: null,
  });
};
