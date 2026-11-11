import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';

// Phase 1-10 routes
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import courseRoutes from './routes/course.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import atRiskRoutes from './routes/atRisk.routes.js';
import instructorRoutes from './routes/instructor.routes.js';
import progressRoutes from './routes/progress.routes.js';

// Phase 11 routes
import achievementsRoutes from './routes/achievements.routes.js';
import rankingsRoutes from './routes/rankings.routes.js';
import aiRoutes from './routes/ai.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import internshipsRoutes from './routes/internships.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import activityRoutes from './routes/activity.routes.js';
import searchRoutes from './routes/search.routes.js';

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

// API Routes — Phases 1-10
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/instructor/at-risk', atRiskRoutes); // Phase 10: At-Risk Student Monitoring (UC-I03, FR-16, FR-44)
app.use('/api/v1/instructor', instructorRoutes);
app.use('/api/v1/progress', progressRoutes);

// API Routes — Phase 11 (Achievements, Rankings, AI, Projects, Tasks, Internships, Applications, Notifications, Messages, Activity, Search)
app.use('/api/v1/achievements', achievementsRoutes);
app.use('/api/v1/rankings', rankingsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/internships', internshipsRoutes);
app.use('/api/v1/applications', applicationsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/search', searchRoutes);

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
