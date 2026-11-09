import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {Object} user - User document
 * @returns {string} Signed JWT
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

/**
 * Verify and decode a JWT
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};
