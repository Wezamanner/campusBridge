import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { RiskFlagsRow } from '../../components/atRisk/RiskFlagBadge.jsx';
import { fetchAtRiskSummary, fetchAtRiskStudents } from '../../services/atRisk.js';
import {
  BookOpen,
  CheckSquare,
  Users,
  AlertTriangle,
  GraduationCap,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

/**
 * InstructorDashboard — Phase 10 updated
 *
 * SRS Traceability:
 *   FR-16 "instructors (grading queue, at-risk students, courses)"
 *   FR-44 "grading and risk figures for instructors"
 *   UC-I03 "Monitor at-risk students"
 *
 * At-risk stat card now fetches live data from the Phase 10 monitoring endpoint.
 * Grading queue stat card remains a placeholder (Phase 8 not yet active).
 * No hardcoded student or submission data is used.
 */
export default function InstructorDashboard() {
  const [atRiskData, setAtRiskData] = useState({ summary: null, students: [], loading: true, error: null });

  useEffect(() => {
    async function loadAtRiskData() {
      try {
        // Fetch monitoring summary for stat card (FR-16, FR-44)
        const summaryResult = await fetchAtRiskSummary();
        // Fetch top at-risk students for dashboard preview
        const listResult = await fetchAtRiskStudents();

        setAtRiskData({
          summary: summaryResult.summary,
          students: (listResult.atRiskStudents || []).slice(0, 5), // Show top 5 on dashboard
          dataAvailability: listResult.dataAvailability,
          loading: false,
          error: null,
        });
      } catch (err) {
        setAtRiskData((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    }
    loadAtRiskData();
  }, []);

  const AT_RISK_COLUMNS = [
    {
      header: 'Student',
      accessor: 'studentName',
      render: (val, row) => (
        <div>
          <p className="text-sm font-semibold text-white">{val}</p>
          <p className="text-xs text-gray-400">{row.studentEmail}</p>
        </div>
      ),
    },
    {
      header: 'Course',
      accessor: 'courseCode',
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-[#00C8FF]">{val}</span>
      ),
    },
    {
      header: 'Flags',
      accessor: 'flags',
      render: (val) => <RiskFlagsRow flags={val} size="sm" />,
    },
    {
      header: '',
      accessor: '_link',
      render: (_, row) => (
        <Link
          to={`/instructor/students?highlight=${row.studentId}`}
          className="text-xs font-semibold text-[#00C8FF] hover:underline flex items-center gap-1"
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  const atRiskCount = atRiskData.summary?.totalAtRisk ?? '—';
  const totalEnrolled = atRiskData.summary?.totalEnrolled ?? '—';

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

        {/* Stat Cards — FR-16, FR-44 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Assigned Courses"
            value="—"
            trend="Phase 3 data"
            accentColor="#00C8FF"
            sparklineData={[1, 1, 1, 1]}
          />
          <StatCard
            icon={CheckSquare}
            label="Submissions to Grade"
            value="—"
            trend="Phase 8 pending"
            accentColor="#F59E0B"
            sparklineData={[1, 1, 1, 1]}
          />
          <StatCard
            icon={Users}
            label="Enrolled Students"
            value={atRiskData.loading ? '…' : String(totalEnrolled)}
            trend="Across active courses"
            accentColor="#10B981"
            sparklineData={[1]}
          />
          <StatCard
            icon={AlertTriangle}
            label="At-Risk Students"
            value={atRiskData.loading ? '…' : String(atRiskCount)}
            trend={atRiskData.loading ? '' : atRiskCount === 0 ? 'All clear' : 'Needs attention'}
            trendDirection={atRiskCount > 0 ? 'down' : 'up'}
            accentColor="#F43F5E"
            sparklineData={[1]}
          />
        </div>

        {/* At-Risk Students Preview (FR-16, UC-I03) */}
        <DashboardCard
          title="At-Risk Students"
          subtitle="Students with active risk flags across your assigned courses"
          icon={ShieldAlert}
          actionText="Open Monitoring Dashboard"
          actionLink="/instructor/students"
        >
          {atRiskData.loading ? (
            <LoadingState count={3} />
          ) : atRiskData.error ? (
            <div className="p-4 text-sm text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Failed to load at-risk data: {atRiskData.error}</span>
            </div>
          ) : atRiskData.students.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-emerald-400">No At-Risk Students</p>
              <p className="text-xs text-gray-400">
                No students are currently flagged in your courses.
                {atRiskData.dataAvailability?.progress?.available === false && (
                  <span className="block mt-1 text-amber-400">
                    Note: Some indicators show "No Data" — progress data requires Phase 7 &amp; 8 to be active.
                  </span>
                )}
              </p>
            </div>
          ) : (
            <DataTable
              columns={AT_RISK_COLUMNS}
              data={atRiskData.students}
              emptyTitle="No At-Risk Students"
              emptyMessage="All enrolled students are performing well."
            />
          )}
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
