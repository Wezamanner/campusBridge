import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../utils/token.js';
import { getPublicSettings } from './settings.service.js';

// Pre-computed dummy hash for timing-safe password comparison per SEC-03
const DUMMY_HASH = '$2a$10$wW2W1H1e7hH0zL5z3Y6yIeR9H7qf8yq.mO3XJ2b4vR7mG4tK2cXe.';

/**
 * Register a new user account for any role (instructor, coordinator, admin)
 * For development/testing purposes
 */
export const registerUser = async ({ name, email, password, role, studentId, employeeId, program, year }) => {
  // Validate role - map 'administrator' to 'admin' for compatibility
  const normalizedRole = role === 'administrator' ? 'admin' : role;
  const validRoles = ['student', 'instructor', 'coordinator', 'admin'];
  if (!validRoles.includes(normalizedRole)) {
    const error = new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // Normalize email
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  // Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Password length validation
  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Create user with specified role
  const userData = {
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password, // Will be hashed by User pre-save hook
    role: normalizedRole,
  };

  // Add role-specific fields
  if (normalizedRole === 'student') {
    if (studentId) userData.studentId = studentId.trim();
    if (program) userData.program = program.trim();
    if (year) userData.year = Number(year);
  } else {
    if (employeeId) userData.employeeId = employeeId.trim();
  }

  const user = new User(userData);
  await user.save();

  // Generate JWT
  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Register a new student account (FR-01, FR-24)
 */
export const registerStudent = async ({ name, email, password, program, year }) => {
  // Phase 14 / FR-24: Check if student self-registration is enabled
  const { registrationOpen } = await getPublicSettings();
  if (registrationOpen === false) {
    const error = new Error('Student self-registration is currently closed by administration.');
    error.statusCode = 403;
    throw error;
  }

  // Normalize email
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  // Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    throw error;
  }

  // Password length validation
  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Create student user (role strictly student for self-registration)
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password, // Will be hashed by User pre-save hook
    role: 'student',
    program: program ? program.trim() : '',
    year: year ? Number(year) : undefined,
  });

  await user.save();

  // Generate JWT
  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Authenticate user login for any of the 4 roles (FR-01, SEC-03)
 */
export const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Phase 12.5: Find user and include passwordHash + deletedAt for authentication check
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash +deletedAt');

  if (!user) {
    // Perform dummy bcrypt comparison to prevent timing-based user enumeration (SEC-03)
    await bcrypt.compare(password, DUMMY_HASH);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Phase 12.5: Soft-delete policy - deleted users cannot authenticate
  if (user.deletedAt) {
    // Still perform password check to prevent timing-based enumeration
    await user.comparePassword(password);
    const error = new Error('Your account has been deleted. Please contact an administrator if you believe this is an error.');
    error.statusCode = 403;
    throw error;
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check if account is active (FR-22)
  if (!user.active) {
    const error = new Error('Your account has been deactivated. Please contact an administrator.');
    error.statusCode = 403;
    throw error;
  }

  // Update lastLoginAt timestamp
  user.lastLoginAt = new Date();
  await user.save();

  // Generate JWT
  const token = generateToken(user);

  return {
    user: user.toJSON(),
    token,
  };
};

/**
 * Retrieve current authenticated user profile
 */
export const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};
