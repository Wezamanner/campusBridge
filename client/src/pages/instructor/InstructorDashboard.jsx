import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { RiskFlagsRow } from '../../components/atRisk/RiskFlagBadge.jsx';
import { fetchAtRiskSummary, fetchAtRiskStudents } from '../../services/atRisk.js';
import { reportsService } from '../../services/phase11.js';
import {
  BookOpen,
  CheckSquare,
  Users,
  AlertTriangle,
  GraduationCap,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  Download,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';

/**
 * InstructorDashboard — Phase 10 integrated with Phases 4–9
 *
 * SRS Traceability:
 *   FR-16 "instructors (grading queue, at-risk students, courses)"
 *   FR-44 "grading and risk figures for instructors"
 *   UC-I03 "Monitor at-risk students"
 */
export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(null);
  const [atRiskData, setAtRiskData] = useState({
    summary: null,
    students: [],
    loading: true,
    error: null,
  });
  
  // Reports state
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      // 1. Load instructor courses
      try {
        const res = await api.get('/courses');
        if (isMounted && res.success && Array.isArray(res.data)) {
          setCourses(res.data);
        }
      } catch (err) {
        console.error('Failed to load instructor courses for dashboard:', err);
      } finally {
        if (isMounted) setLoadingCourses(false);
      }

      // 2. Load pending submissions queue count (Phase 8 integration)
      try {
        const subRes = await api.get('/instructor/submissions?status=Submitted');
        if (isMounted && subRes.success && Array.isArray(subRes.data)) {
          setPendingSubmissionsCount(subRes.data.length);
        }
      } catch (err) {
        // Fallback if not configured or empty
        console.warn('Could not load submissions queue count:', err);
      }

      // 3. Load at-risk summary and top students (Phase 10)
      try {
        const [summaryResult, listResult] = await Promise.all([
          fetchAtRiskSummary(),
          fetchAtRiskStudents(),
        ]);

        if (isMounted) {
          setAtRiskData({
            summary: summaryResult.summary,
            students: (listResult.atRiskStudents || []).slice(0, 5),
            dataAvailability: listResult.dataAvailability,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setAtRiskData((prev) => ({ ...prev, loading: false, error: err.message }));
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
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

  // Download progress report (scoped to instructor's courses)
  const handleDownloadProgressReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError(null);
      await reportsService.downloadProgressReport();
    } catch (err) {
      setReportError(err.message || 'Failed to download progress report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const totalAssigned = courses.length;
  // Calculate total enrolled from courses or fallback to atRisk summary
  const totalEnrolled =
    courses.reduce((sum, c) => sum + (c.enrolledStudentsCount || 0), 0) ||
    atRiskData.summary?.totalEnrolled ||
    0;
  const atRiskCount = atRiskData.summary?.totalAtRisk ?? '—';

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
            value={loadingCourses ? '...' : String(totalAssigned)}
            trend={totalAssigned > 0 ? `${totalAssigned} active portfolio` : '0 assigned'}
            accentColor="#00C8FF"
            sparklineData={[1, 2, 2, 3, 3, 4, Math.max(totalAssigned, 1)]}
          />
          <StatCard
            icon={CheckSquare}
            label="Submissions to Grade"
            value={
              pendingSubmissionsCount !== null
                ? String(pendingSubmissionsCount)
                : '—'
            }
            trend={
              pendingSubmissionsCount !== null
                ? pendingSubmissionsCount > 0
                  ? 'Pending in queue'
                  : 'Queue empty'
                : 'Grading Queue'
            }
            accentColor="#F59E0B"
            sparklineData={[0, 1, 2, Math.max(pendingSubmissionsCount || 0, 1)]}
          />
          <StatCard
            icon={Users}
            label="Enrolled Students"
            value={
              loadingCourses && atRiskData.loading
                ? '...'
                : String(totalEnrolled)
            }
            trend={totalEnrolled > 0 ? `${totalEnrolled} total roster` : '0 enrolled'}
            accentColor="#10B981"
            sparklineData={[0, 10, 25, 40, 60, 90, Math.max(totalEnrolled, 1)]}
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

        {/* Progress Report Section */}
        <DashboardCard
          title="Student Progress Report"
          subtitle="Export CSV report for your assigned courses"
          icon={Download}
        >
          <div className="space-y-3">
            {reportError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{reportError}</span>
              </div>
            )}
            <div className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white text-sm mb-1">My Courses Progress Report</h4>
                <p className="text-xs text-gray-400">Export enrollment progress, submission counts, and scores for students in your assigned courses</p>
              </div>
              <Button
                size="sm"
                onClick={handleDownloadProgressReport}
                disabled={downloadingReport}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {downloadingReport ? 'Downloading...' : 'Download CSV'}
              </Button>
            </div>
          </div>
        </DashboardCard>

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

        {/* Assigned Courses Portfolio Card */}
        <DashboardCard
          title="My Teaching Courses"
          subtitle="Courses assigned to you for teaching and instruction"
          icon={BookOpen}
          actionText="View All Courses"
          actionLink="/instructor/courses"
        >
          {loadingCourses ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-300">No Courses Assigned Yet</p>
              <p className="text-xs text-gray-400">Academic Coordinators assign courses to instructors.</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 3).map((course) => (
                <Link
                  key={course.id || course._id}
                  to={`/instructor/courses/${course.id || course._id}`}
                  className="p-4 rounded-xl border border-[#1C2948] hover:border-[#00C8FF]/50 bg-[#101735]/60 hover:bg-[#101735] transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#00C8FF]/15 text-[#00C8FF]">
                        {course.code}
                      </span>
                      <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {course.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-[#00C8FF] transition-colors truncate">
                      {course.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#1C2948]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#00C8FF]" />
                      <span>{course.enrolledStudentsCount || 0} enrolled</span>
                    </span>
                    <span className="text-[#00C8FF] font-semibold group-hover:translate-x-0.5 transform transition-transform">
                      Workspace &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
