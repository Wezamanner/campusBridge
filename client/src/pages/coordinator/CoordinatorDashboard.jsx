import React from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { 
  Briefcase, 
  Building2, 
  FileText, 
  BookOpen, 
  FileSpreadsheet, 
  Users 
} from 'lucide-react';

export default function CoordinatorDashboard() {
  const APPLICATION_COLUMNS = [
    { header: 'Applicant', accessor: 'student' },
    { header: 'Company', accessor: 'company' },
    { header: 'Internship Role', accessor: 'role' },
    {
      header: 'Workflow Stage',
      accessor: 'status',
      render: (val) => {
        const variants = {
          Submitted: 'cyan',
          'Under review': 'warning',
          Forwarded: 'purple',
          Accepted: 'success',
          Rejected: 'danger',
        };
        return <Badge variant={variants[val] || 'neutral'} size="sm" dot>{val}</Badge>;
      },
    },
    {
      header: 'Action',
      accessor: 'action',
      render: () => (
        <span className="text-xs font-semibold text-[#00C8FF] hover:underline cursor-pointer">
          Review Application &rarr;
        </span>
      ),
    },
  ];

  const APPLICATION_DATA = [
    {
      student: 'Sabrin Abdu',
      company: 'Brolf Tech Partners',
      role: 'Full Stack Engineering Intern',
      status: 'Under review',
    },
    {
      student: 'Alex Johnson',
      company: 'TechFlow Solutions',
      role: 'Frontend UI/UX Intern',
      status: 'Submitted',
    },
    {
      student: 'Marta Bekele',
      company: 'Addis Cloud Systems',
      role: 'Backend DevOps Intern',
      status: 'Forwarded',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="“Bridging university ambition with industry innovation.”"
          tags={[
            { label: 'Corporate Relations', icon: Building2 },
            { label: 'Internship Placements', icon: Briefcase },
            { label: 'Curriculum Coordinator', icon: BookOpen },
          ]}
        />

        {/* 4 Coordinator Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Active Courses"
            value="12"
            trend="+2"
            accentColor="#00C8FF"
            sparklineData={[8, 9, 9, 10, 11, 11, 12]}
          />
          <StatCard
            icon={Building2}
            label="Partner Companies"
            value="8"
            trend="+1 verified"
            accentColor="#10B981"
            sparklineData={[4, 5, 5, 6, 7, 7, 8]}
          />
          <StatCard
            icon={Briefcase}
            label="Open Internships"
            value="15"
            trend="4 ending soon"
            accentColor="#8CEBFF"
            sparklineData={[10, 12, 11, 14, 13, 14, 15]}
          />
          <StatCard
            icon={FileText}
            label="Pending Applications"
            value="24"
            trend="Ready to forward"
            accentColor="#F59E0B"
            sparklineData={[12, 15, 18, 20, 22, 21, 24]}
          />
        </div>

        {/* Applications Pipeline Table */}
        <DashboardCard
          title="Student Internship Applications Workflow"
          subtitle="Review candidate CVs, forward to company contacts, and track placement decisions"
          icon={FileText}
          actionText="View All Applications"
          actionLink="/coordinator/applications"
        >
          <DataTable
            columns={APPLICATION_COLUMNS}
            data={APPLICATION_DATA}
            emptyTitle="No Pending Applications"
            emptyMessage="All student applications have been processed."
          />
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
