import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';

import LandingPage from './pages/public/LandingPage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentProfilePage from './pages/student/StudentProfilePage.jsx';
import StudentCoursesPage from './pages/student/StudentCoursesPage.jsx';
import StudentCourseDetailsPage from './pages/student/StudentCourseDetailsPage.jsx';
import StudentAssignmentDetailsPage from './pages/student/StudentAssignmentDetailsPage.jsx';
import StudentProjectsPage from './pages/student/StudentProjectsPage.jsx';
import StudentTasksPage from './pages/student/StudentTasksPage.jsx';
import StudentInternshipsPage from './pages/student/StudentInternshipsPage.jsx';
import StudentApplicationsPage from './pages/student/StudentApplicationsPage.jsx';
import StudentAIAssistantPage from './pages/student/StudentAIAssistantPage.jsx';
import StudentAchievementsPage from './pages/student/StudentAchievementsPage.jsx';
import StudentMessagesPage from './pages/student/StudentMessagesPage.jsx';
import StudentNotificationsPage from './pages/student/StudentNotificationsPage.jsx';

// Instructor pages
import InstructorDashboard from './pages/instructor/InstructorDashboard.jsx';
import InstructorGradingPage from './pages/instructor/InstructorGradingPage.jsx';
import AtRiskMonitoringPage from './pages/instructor/AtRiskMonitoringPage.jsx';
import InstructorCoursesPage from './pages/instructor/InstructorCoursesPage.jsx';
import InstructorCourseDetailsPage from './pages/instructor/InstructorCourseDetailsPage.jsx';

// Coordinator pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard.jsx';
import CoordinatorCoursesPage from './pages/coordinator/CoordinatorCoursesPage.jsx';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

// Shared pages (messages, notifications, profile used by instructor, coordinator, admin)
import MessagesPage from './pages/shared/MessagesPage.jsx';
import NotificationsPage from './pages/shared/NotificationsPage.jsx';
import ProfilePage from './pages/shared/ProfilePage.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Public ──────────────────────────────────────────────── */}
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* ── Student ─────────────────────────────────────────────── */}
            <Route path="/student/dashboard"       element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/profile"         element={<ProtectedRoute allowedRoles={['student']}><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/student/courses"         element={<ProtectedRoute allowedRoles={['student']}><StudentCoursesPage /></ProtectedRoute>} />
            <Route path="/student/courses/:id"     element={<ProtectedRoute allowedRoles={['student']}><StudentCourseDetailsPage /></ProtectedRoute>} />
            <Route path="/student/assignments/:id" element={<ProtectedRoute allowedRoles={['student']}><StudentAssignmentDetailsPage /></ProtectedRoute>} />
            <Route path="/student/projects"        element={<ProtectedRoute allowedRoles={['student']}><StudentProjectsPage /></ProtectedRoute>} />
            <Route path="/student/tasks"           element={<ProtectedRoute allowedRoles={['student']}><StudentTasksPage /></ProtectedRoute>} />
            <Route path="/student/internships"     element={<ProtectedRoute allowedRoles={['student']}><StudentInternshipsPage /></ProtectedRoute>} />
            <Route path="/student/applications"    element={<ProtectedRoute allowedRoles={['student']}><StudentApplicationsPage /></ProtectedRoute>} />
            <Route path="/student/ai"              element={<ProtectedRoute allowedRoles={['student']}><StudentAIAssistantPage /></ProtectedRoute>} />
            <Route path="/student/analytics"       element={<ProtectedRoute allowedRoles={['student']}><StudentAchievementsPage /></ProtectedRoute>} />
            <Route path="/student/achievements"    element={<ProtectedRoute allowedRoles={['student']}><StudentAchievementsPage /></ProtectedRoute>} />
            <Route path="/student/messages"        element={<ProtectedRoute allowedRoles={['student']}><StudentMessagesPage /></ProtectedRoute>} />
            <Route path="/student/notifications"   element={<ProtectedRoute allowedRoles={['student']}><StudentNotificationsPage /></ProtectedRoute>} />

            {/* ── Instructor ──────────────────────────────────────────── */}
            <Route path="/instructor/dashboard"   element={<ProtectedRoute allowedRoles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
            <Route path="/instructor/courses"     element={<ProtectedRoute allowedRoles={['instructor','coordinator','admin']}><InstructorCoursesPage /></ProtectedRoute>} />
            <Route path="/instructor/courses/:id" element={<ProtectedRoute allowedRoles={['instructor','coordinator','admin']}><InstructorCourseDetailsPage /></ProtectedRoute>} />
            <Route path="/instructor/students"    element={<ProtectedRoute allowedRoles={['instructor']}><AtRiskMonitoringPage /></ProtectedRoute>} />
            <Route path="/instructor/at-risk"     element={<ProtectedRoute allowedRoles={['instructor']}><AtRiskMonitoringPage /></ProtectedRoute>} />
            <Route path="/instructor/grading"     element={<ProtectedRoute allowedRoles={['instructor']}><InstructorGradingPage /></ProtectedRoute>} />
            <Route path="/instructor/messages"    element={<ProtectedRoute allowedRoles={['instructor']}><MessagesPage /></ProtectedRoute>} />
            <Route path="/instructor/notifications" element={<ProtectedRoute allowedRoles={['instructor']}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/instructor/profile"     element={<ProtectedRoute allowedRoles={['instructor']}><ProfilePage /></ProtectedRoute>} />

            {/* ── Coordinator ─────────────────────────────────────────── */}
            <Route path="/coordinator/dashboard"      element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/courses"        element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorCoursesPage /></ProtectedRoute>} />
            {/* Companies, Internships, Applications, Reports all fully live inside CoordinatorDashboard */}
            <Route path="/coordinator/companies"      element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/internships"    element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/applications"   element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/reports"        element={<ProtectedRoute allowedRoles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
            <Route path="/coordinator/messages"       element={<ProtectedRoute allowedRoles={['coordinator']}><MessagesPage /></ProtectedRoute>} />
            <Route path="/coordinator/notifications"  element={<ProtectedRoute allowedRoles={['coordinator']}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/coordinator/profile"        element={<ProtectedRoute allowedRoles={['coordinator']}><ProfilePage /></ProtectedRoute>} />

            {/* ── Admin ───────────────────────────────────────────────── */}
            <Route path="/admin/dashboard"      element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            {/* Users, Settings, Announcements, Content, Reports all fully live inside AdminDashboard */}
            <Route path="/admin/users"          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings"       element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/announcements"  element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/content"        element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/reports"        element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/notifications"  element={<ProtectedRoute allowedRoles={['admin']}><NotificationsPage /></ProtectedRoute>} />
            <Route path="/admin/messages"       element={<ProtectedRoute allowedRoles={['admin']}><MessagesPage /></ProtectedRoute>} />
            <Route path="/admin/profile"        element={<ProtectedRoute allowedRoles={['admin']}><ProfilePage /></ProtectedRoute>} />

            {/* ── Fallback ────────────────────────────────────────────── */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
