import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { generateToken } from '../utils/token.js';

// Pre-computed dummy hash for timing-safe password comparison per SEC-03
const DUMMY_HASH = '$2a$10$wW2W1H1e7hH0zL5z3Y6yIeR9H7qf8yq.mO3XJ2b4vR7mG4tK2cXe.';

/**
 * Register a new student account (FR-01)
 */
export const registerStudent = async ({ name, email, password, program, year }) => {
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

  // Find user and explicitly include passwordHash (which is select: false by default)
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    // Perform dummy bcrypt comparison to prevent timing-based user enumeration (SEC-03)
    await bcrypt.compare(password, DUMMY_HASH);
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
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
