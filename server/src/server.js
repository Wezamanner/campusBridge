import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Base Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CampusBridge API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// API Routes
app.use('/api/v1/health', healthRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

// Connect Database and Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[CampusBridge Server] Running in ${config.nodeEnv} mode on http://localhost:${PORT}`);
  });
};

startServer();

export default app;
