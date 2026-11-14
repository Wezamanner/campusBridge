import dotenv from 'dotenv';
dotenv.config();

const isProd = (process.env.NODE_ENV || 'development') === 'production';

// In production the JWT secret MUST be supplied via environment variable.
// A missing or default secret in production would allow anyone who reads
// this repository to forge authentication tokens.
if (isProd && !process.env.JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not set. Set it in your Render environment variables and restart.');
  process.exit(1);
}

export const config = {
  port:      process.env.PORT      || 5001,
  nodeEnv:   process.env.NODE_ENV  || 'development',
  mongoURI:  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbridge',
  // Development fallback is intentionally weak and local-only.
  // Production deployment MUST override this via the JWT_SECRET env var.
  jwtSecret: process.env.JWT_SECRET || 'supersecret_campusbridge_jwt_dev_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
