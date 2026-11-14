import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import LearningProgressWidget from '../../components/dashboard/LearningProgressWidget.jsx';
import WeeklyActivityWidget from '../../components/dashboard/WeeklyActivityWidget.jsx';
import UpcomingTasksWidget from '../../components/dashboard/UpcomingTasksWidget.jsx';
import ProjectsWidget from '../../components/dashboard/ProjectsWidget.jsx';
import QuickLinksWidget from '../../components/dashboard/QuickLinksWidget.jsx';
import RecentActivityWidget from '../../components/dashboard/RecentActivityWidget.jsx';
import { FolderKanban, CheckCircle2, BookOpen, Trophy } from 'lucide-react';
import { projectsService, tasksService, achievementsService } from '../../services/phase11.js';
import { api } from '../../services/api.js';

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    projects: null,
    tasksCompleted: null,
    enrolledCourses: null,
    achievements: null,
  });

  useEffect(() => {
    // Load all stats in parallel; each failure is silent — card shows '—'
    Promise.allSettled([
      projectsService.list(),
      tasksService.list({ status: 'completed' }),
      api.get('/courses'),
      achievementsService.getBadges(),
    ]).then(([proj, tasks, courses, badges]) => {
      setStats({
        projects:       proj.status === 'fulfilled' && proj.value.success   ? (proj.value.data?.length  ?? 0) : null,
        tasksCompleted: tasks.status === 'fulfilled' && tasks.value.success  ? (tasks.value.data?.length ?? 0) : null,
        enrolledCourses:courses.status === 'fulfilled' && courses.value.success ? (courses.value.data?.length ?? 0) : null,
        achievements:   badges.status === 'fulfilled' && badges.value.success ? (badges.value.data?.length ?? 0) : null,
      });
    });
  }, []);

  const fmt = (v) => (v === null ? '—' : String(v));

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner />

        {/* Real stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FolderKanban}
            label="Projects"
            value={fmt(stats.projects)}
            trend={stats.projects != null ? `${stats.projects} total` : ''}
            accentColor="#00C8FF"
            sparklineData={[1,1,2,2,3,3,Math.max(stats.projects||1,1)]}
          />
          <StatCard
            icon={CheckCircle2}
            label="Tasks Completed"
            value={fmt(stats.tasksCompleted)}
            trend={stats.tasksCompleted != null ? 'completed tasks' : ''}
            accentColor="#10B981"
            sparklineData={[1,1,2,3,4,5,Math.max(stats.tasksCompleted||1,1)]}
          />
          <StatCard
            icon={BookOpen}
            label="Enrolled Courses"
            value={fmt(stats.enrolledCourses)}
            trend={stats.enrolledCourses != null ? 'active courses' : ''}
            accentColor="#8CEBFF"
            sparklineData={[1,1,1,2,2,3,Math.max(stats.enrolledCourses||1,1)]}
          />
          <StatCard
            icon={Trophy}
            label="Achievements"
            value={fmt(stats.achievements)}
            trend={stats.achievements != null ? 'badges earned' : ''}
            accentColor="#F59E0B"
            sparklineData={[0,0,1,1,2,3,Math.max(stats.achievements||1,1)]}
          />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LearningProgressWidget />
          <WeeklyActivityWidget />
          <UpcomingTasksWidget />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProjectsWidget />
          <QuickLinksWidget />
          <RecentActivityWidget />
        </div>
      </div>
    </AppLayout>
  );
}
