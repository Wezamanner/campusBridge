import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    API and Database Health status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbStatusMap[dbState] || 'unknown';
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: true,
    message: 'CampusBridge API is operational',
    data: {
      status: isHealthy ? 'UP' : 'DEGRADED',
      database: dbStatus,
      uptime: `${Math.floor(process.uptime())}s`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

export default router;
