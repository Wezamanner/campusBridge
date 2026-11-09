import React from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { 
  Users, 
  ShieldCheck, 
  Sliders, 
  Megaphone, 
  UserPlus, 
  Activity,
  CheckCircle2 
} from 'lucide-react';

export default function AdminDashboard() {
  const USER_COLUMNS = [
    { header: 'User Name', accessor: 'name' },
    { header: 'Email Address', accessor: 'email' },
    {
      header: 'Role',
      accessor: 'role',
      render: (role) => {
        const variants = {
          student: 'cyan',
          instructor: 'success',
          coordinator: 'warning',
          admin: 'purple',
        };
        return <Badge variant={variants[role] || 'neutral'} size="sm">{role}</Badge>;
      },
    },
    {
      header: 'Account Status',
      accessor: 'active',
      render: (active) => (
        <span className={`text-xs font-semibold flex items-center gap-1 ${
          active ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {active ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: () => (
        <span className="text-xs font-semibold text-[#00C8FF] hover:underline cursor-pointer">
          Manage Account &rarr;
        </span>
      ),
    },
  ];

  const USERS_DATA = [
    {
      name: 'Sabrin Abdu',
      email: 'student@campusbridge.edu',
      role: 'student',
      active: true,
    },
    {
      name: 'Dr. Jane Smith',
      email: 'instructor@campusbridge.edu',
      role: 'instructor',
      active: true,
    },
    {
      name: 'Alex Coordinator',
      email: 'coordinator@campusbridge.edu',
      role: 'coordinator',
      active: true,
    },
    {
      name: 'Platform Administrator',
      email: 'admin@campusbridge.edu',
      role: 'admin',
      active: true,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="“Security, reliability, and precision at university scale.”"
          tags={[
            { label: 'Super Administrator', icon: ShieldCheck },
            { label: 'Security & Access', icon: Sliders },
            { label: 'System Health', icon: Activity },
          ]}
        />

        {/* 4 Admin Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Accounts"
            value="354"
            trend="+18 this week"
            accentColor="#00C8FF"
            sparklineData={[300, 315, 320, 335, 340, 348, 354]}
          />
          <StatCard
            icon={ShieldCheck}
            label="Staff Members"
            value="28"
            trend="Active faculty"
            accentColor="#A855F7"
            sparklineData={[24, 25, 25, 26, 26, 27, 28]}
          />
          <StatCard
            icon={Megaphone}
            label="Announcements"
            value="1"
            trend="Live on portal"
            accentColor="#10B981"
            sparklineData={[1, 1, 1, 2, 2, 1, 1]}
          />
          <StatCard
            icon={Activity}
            label="System Health"
            value="100%"
            trend="DB Connected"
            accentColor="#00C8FF"
            sparklineData={[99, 100, 100, 99, 100, 100, 100]}
          />
        </div>

        {/* Users Management Preview Table */}
        <DashboardCard
          title="Recent User Accounts & Provisioning"
          subtitle="Manage student, instructor, and coordinator credentials, roles, and status"
          icon={Users}
          actionText="Open User Directory"
          actionLink="/admin/users"
        >
          <DataTable
            columns={USER_COLUMNS}
            data={USERS_DATA}
            emptyTitle="No Users Found"
            emptyMessage="There are currently no users registered in the system."
          />
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
