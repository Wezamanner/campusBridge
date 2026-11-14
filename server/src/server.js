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

// Phase 12.5 routes (Coordinator/Administrator Functionality)
import adminRoutes from './routes/admin.routes.js';
import coordinatorRoutes from './routes/coordinator.routes.js';
import reportsRoutes from './routes/reports.routes.js';

// Phase 14 routes (Settings, Public Content, Announcements)
import settingsRoutes from './routes/settings.routes.js';
import publicRoutes from './routes/public.routes.js';
import announcementsRoutes from './routes/announcements.routes.js';
import helpRoutes from './routes/help.routes.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middlewares
const allowedOrigins = [
  config.clientUrl,                          // set CLIENT_URL=https://campus-bridge-lyart.vercel.app on Render
  'https://campus-bridge-lyart.vercel.app',  // explicit fallback for the production frontend
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);                           // drop any undefined/empty entries

app.use(cors({
  origin: (incomingOrigin, callback) => {
    // Allow requests with no Origin header (server-to-server, curl, Postman)
    if (!incomingOrigin) return callback(null, true);
    if (allowedOrigins.includes(incomingOrigin)) return callback(null, true);
    callback(new Error(`CORS: origin '${incomingOrigin}' is not allowed`));
  },
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

// API Routes — Phase 12.5 (Coordinator/Administrator Functionality)
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/coordinator', coordinatorRoutes);
app.use('/api/v1/reports', reportsRoutes);

// API Routes — Phase 14 (Settings, Public Content, Announcements, Help)
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/announcements', announcementsRoutes);
app.use('/api/v1/help', helpRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = config.port;

// Connect Database and Start Server
export const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[CampusBridge Server] Running in ${config.nodeEnv} mode on http://localhost:${PORT}`);
  });
};

// Only start server when executed directly or when invoked by test suites with designated PORT
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.env.PORT === '5005') {
  startServer();
}

export default app;
