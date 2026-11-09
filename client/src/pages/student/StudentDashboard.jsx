import React from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import LearningProgressWidget from '../../components/dashboard/LearningProgressWidget.jsx';
import WeeklyActivityWidget from '../../components/dashboard/WeeklyActivityWidget.jsx';
import UpcomingTasksWidget from '../../components/dashboard/UpcomingTasksWidget.jsx';
import ProjectsWidget from '../../components/dashboard/ProjectsWidget.jsx';
import QuickLinksWidget from '../../components/dashboard/QuickLinksWidget.jsx';
import RecentActivityWidget from '../../components/dashboard/RecentActivityWidget.jsx';
import { 
  FolderKanban, 
  CheckCircle2, 
  BookOpen, 
  Trophy 
} from 'lucide-react';

export default function StudentDashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Futuristic Welcome Banner */}
        <WelcomeBanner />

        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={FolderKanban}
            label="Projects"
            value="12"
            trend="+2"
            accentColor="#00C8FF"
            sparklineData={[5, 8, 7, 10, 9, 11, 12]}
          />
          <StatCard
            icon={CheckCircle2}
            label="Tasks Completed"
            value="48"
            trend="+8"
            accentColor="#10B981"
            sparklineData={[20, 25, 28, 35, 40, 42, 48]}
          />
          <StatCard
            icon={BookOpen}
            label="Study Hours"
            value="120h"
            trend="+15h"
            accentColor="#00C8FF"
            sparklineData={[80, 90, 85, 100, 110, 115, 120]}
          />
          <StatCard
            icon={Trophy}
            label="Achievements"
            value="5"
            trend="+1"
            accentColor="#F59E0B"
            sparklineData={[1, 2, 2, 3, 4, 4, 5]}
          />
        </div>

        {/* Dashboard Grid Row 1: Learning Progress, Weekly Activity, Upcoming Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LearningProgressWidget />
          <WeeklyActivityWidget />
          <UpcomingTasksWidget />
        </div>

        {/* Dashboard Grid Row 2: Your Projects, Quick Links, Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProjectsWidget />
          <QuickLinksWidget />
          <RecentActivityWidget />
        </div>
      </div>
    </AppLayout>
  );
}
