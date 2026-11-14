import * as authService from '../services/auth.service.js';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new student account
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, firstName, lastName, email, password, program, year, role, studentId, employeeId } = req.body;

    // Support both 'name' (single field) and 'firstName' + 'lastName' (split fields)
    let fullName = name;
    if (!fullName && firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    }

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required fields.',
      });
    }

    // If role is specified and not student, use advanced registration
    if (role && role !== 'student') {
      const result = await authService.registerUser({
        name: fullName,
        email,
        password,
        role,
        studentId,
        employeeId,
        program,
        year,
      });

      return res.status(201).json({
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account registered successfully.`,
        token: result.token,
        user: result.user,
        data: result,
      });
    }

    // Default to student registration
    const result = await authService.registerStudent({
      name: fullName,
      email,
      password,
      program,
      year,
    });

    // Expose token and user both at top-level AND under `data` so that
    // existing Phase 13/14 tests (res.body.data.token) and new Phase 15
    // journey tests (res.body.token) both pass without modification.
    res.status(201).json({
      success: true,
      message: 'Student account registered successfully.',
      token: result.token,
      user: result.user,
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
