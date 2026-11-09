import React from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { 
  BookOpen, 
  CheckSquare, 
  Users, 
  AlertTriangle, 
  GraduationCap, 
  FileCheck2,
  Clock 
} from 'lucide-react';

export default function InstructorDashboard() {
  const SUBMISSION_COLUMNS = [
    { header: 'Student', accessor: 'student' },
    { header: 'Course', accessor: 'course' },
    { header: 'Assignment', accessor: 'assignment' },
    {
      header: 'Submitted',
      accessor: 'submittedAt',
      render: (val) => (
        <span className="flex items-center text-xs text-gray-400 gap-1">
          <Clock className="w-3 h-3 text-[#00C8FF]" /> {val}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: () => (
        <span className="text-xs font-semibold text-[#00C8FF] hover:underline cursor-pointer">
          Grade Now &rarr;
        </span>
      ),
    },
  ];

  const SUBMISSIONS_DATA = [
    {
      student: 'Sabrin Abdu',
      course: 'CS301',
      assignment: 'Hydraulics II Exam Prep',
      submittedAt: '2 hours ago',
    },
    {
      student: 'Michael Chen',
      course: 'CS301',
      assignment: 'Database Schema Design',
      submittedAt: '4 hours ago',
    },
    {
      student: 'Sara Youssef',
      course: 'SE402',
      assignment: 'REST API Implementation',
      submittedAt: '1 day ago',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="“Teaching is the greatest act of optimism.”"
          tags={[
            { label: 'Course Lead', icon: BookOpen },
            { label: 'Evaluation Queue', icon: FileCheck2 },
            { label: 'Mentor', icon: GraduationCap },
          ]}
        />

        {/* 4 Instructor Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Assigned Courses"
            value="4"
            trend="+1 this term"
            accentColor="#00C8FF"
            sparklineData={[2, 2, 3, 3, 3, 4, 4]}
          />
          <StatCard
            icon={CheckSquare}
            label="Submissions to Grade"
            value="18"
            trend="5 urgent"
            accentColor="#F59E0B"
            sparklineData={[10, 14, 12, 16, 20, 15, 18]}
          />
          <StatCard
            icon={Users}
            label="Enrolled Students"
            value="142"
            trend="+12"
            accentColor="#10B981"
            sparklineData={[110, 120, 125, 130, 135, 140, 142]}
          />
          <StatCard
            icon={AlertTriangle}
            label="At-Risk Students"
            value="3"
            trend="Low activity"
            trendDirection="down"
            accentColor="#F43F5E"
            sparklineData={[5, 4, 4, 3, 4, 3, 3]}
          />
        </div>

        {/* Grading Queue Table Card */}
        <DashboardCard
          title="Submissions Awaiting Grading"
          subtitle="Assignments submitted by students ready for scoring and feedback"
          icon={CheckSquare}
          actionText="Open Full Queue"
          actionLink="/instructor/grading"
        >
          <DataTable
            columns={SUBMISSION_COLUMNS}
            data={SUBMISSIONS_DATA}
            emptyTitle="Grading Queue Clear"
            emptyMessage="All student submissions have been evaluated."
          />
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
