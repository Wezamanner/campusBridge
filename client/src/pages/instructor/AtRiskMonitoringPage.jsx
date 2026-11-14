import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { RiskFlagsRow, DataAvailabilityNotice } from '../../components/atRisk/RiskFlagBadge.jsx';
import { fetchAtRiskStudents, fetchAtRiskSummary } from '../../services/atRisk.js';
import {
  AlertTriangle,
  Users,
  CheckSquare,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';

/**
 * AtRiskMonitoringPage
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   UC-I03 (Monitor at-risk students — primary use case)
 *   FR-16  (Instructor dashboard — at-risk count stat card)
 *   FR-44  (Dashboard analytics)
 *
 * Design: Follows CampusBridge design system (dark/light themes, Tailwind, Lucide icons).
 * Data: All data fetched from API — no hardcoded values, no fabricated records.
 * Unavailable indicators shown with 'No Data' badge (insufficient_data).
 */

const FLAG_OPTIONS = [
  { value: '', label: 'All Flags' },
  { value: 'inactivity', label: 'Inactivity' },
  { value: 'lowProgress', label: 'Low Progress' },
  { value: 'missedDeadlines', label: 'Missed Deadlines' },
];

export default function AtRiskMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [dataAvailability, setDataAvailability] = useState(null);

  // Filters (client-side search + server-side flag filter)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlag, setSelectedFlag] = useState('');
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null); // For detail panel

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (selectedFlag) filters.flag = selectedFlag;
      if (selectedCourseCode) filters.courseCode = selectedCourseCode;

      const data = await fetchAtRiskStudents(filters);
      setAtRiskStudents(data.atRiskStudents || []);
      setSummary(data.summary || null);
      setDataAvailability(data.dataAvailability || null);

      // Collect unique course codes for filter dropdown
      const courses = [...new Set((data.atRiskStudents || []).map((s) => s.courseCode).filter(Boolean))];
      setAvailableCourses(courses);
    } catch (err) {
      setError(err.message || 'Failed to load at-risk monitoring data.');
    } finally {
      setLoading(false);
    }
  }, [selectedFlag, selectedCourseCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side search filter
  const filteredStudents = atRiskStudents.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.studentName?.toLowerCase().includes(q) ||
      s.studentEmail?.toLowerCase().includes(q) ||
      s.courseCode?.toLowerCase().includes(q) ||
      s.program?.toLowerCase().includes(q)
    );
  });

  const TABLE_COLUMNS = [
    {
      header: 'Student',
      accessor: 'studentName',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-white text-sm">{val}</p>
          <p className="text-xs text-gray-400">{row.studentEmail}</p>
        </div>
      ),
    },
    {
      header: 'Program / Year',
      accessor: 'program',
      render: (val, row) => (
        <div>
          <p className="text-sm text-gray-200">{val || <span className="text-gray-500 italic">Not set</span>}</p>
          {row.year && <p className="text-xs text-gray-400">Year {row.year}</p>}
        </div>
      ),
    },
    {
      header: 'Course',
      accessor: 'courseCode',
      render: (val, row) => (
        <div>
          <p className="text-sm font-mono font-semibold text-[#00C8FF]">{val}</p>
          <p className="text-xs text-gray-400 truncate max-w-[140px]">{row.courseTitle}</p>
        </div>
      ),
    },
    {
      header: 'Risk Flags',
      accessor: 'flags',
      render: (val) => <RiskFlagsRow flags={val} size="sm" />,
    },
    {
      header: 'Reasons',
      accessor: 'riskReasons',
      render: (val) => (
        <div className="space-y-0.5 max-w-[200px]">
          {(val || []).map((r, i) => (
            <p key={i} className="text-xs text-rose-300 leading-tight truncate" title={r.reason}>
              {r.reason}
            </p>
          ))}
          {(!val || val.length === 0) && (
            <span className="text-xs text-gray-500 italic">No active flags</span>
          )}
        </div>
      ),
    },
    {
      header: '',
      accessor: '_detail',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedStudent(row); }}
          className="flex items-center gap-1 text-xs font-semibold text-[#00C8FF] hover:underline"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">At-Risk Student Monitoring</h1>
            </div>
            <p className="text-sm text-gray-400">
              Identifies enrolled students showing signs of low progress, missed deadlines, or inactivity.{' '}
              <span className="text-[#8CEBFF]">SRS UC-I03 · FR-16 · FR-44</span>
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-[#8CEBFF] hover:border-[#00C8FF]/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary Stat Cards (FR-16, FR-44) */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={Users}
              label="Total Enrolled"
              value={loading ? '—' : String(summary.totalEnrolled)}
              accentColor="#00C8FF"
              sparklineData={[summary.totalEnrolled]}
            />
            <StatCard
              icon={AlertTriangle}
              label="At-Risk Students"
              value={loading ? '—' : String(summary.totalAtRisk)}
              trend={summary.totalAtRisk > 0 ? 'Needs attention' : 'All clear'}
              trendDirection={summary.totalAtRisk > 0 ? 'down' : 'up'}
              accentColor="#F43F5E"
              sparklineData={[summary.totalAtRisk]}
            />
            <StatCard
              icon={CheckSquare}
              label="No Issues Found"
              value={loading ? '—' : String(summary.totalSafe)}
              accentColor="#10B981"
              sparklineData={[summary.totalSafe]}
            />
          </div>
        )}

        {/* Data Availability Notice */}
        {dataAvailability && !loading && (
          <DataAvailabilityNotice dataAvailability={dataAvailability} />
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, email, course, program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-[#1C2948]/60 border border-[#1C2948] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00C8FF]/50 transition-all"
            />
          </div>

          {/* Flag Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={selectedFlag}
              onChange={(e) => setSelectedFlag(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm bg-[#1C2948]/60 border border-[#1C2948] rounded-xl text-white focus:outline-none focus:border-[#00C8FF]/50 transition-all appearance-none"
            >
              {FLAG_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          {availableCourses.length > 0 && (
            <select
              value={selectedCourseCode}
              onChange={(e) => setSelectedCourseCode(e.target.value)}
              className="px-4 py-2.5 text-sm bg-[#1C2948]/60 border border-[#1C2948] rounded-xl text-white focus:outline-none focus:border-[#00C8FF]/50 transition-all"
            >
              <option value="">All Courses</option>
              {availableCourses.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          )}
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-rose-400">Failed to load monitoring data</p>
              <p className="text-xs text-gray-400 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Table */}
        <DashboardCard
          title="At-Risk Students"
          subtitle={
            loading
              ? 'Loading...'
              : `${filteredStudents.length} student(s) flagged${searchQuery ? ' matching search' : ''}`
          }
          icon={ShieldAlert}
        >
          {loading ? (
            <LoadingState count={4} />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={
                atRiskStudents.length === 0
                  ? 'No At-Risk Students Identified'
                  : 'No Students Match Your Filters'
              }
              description={
                atRiskStudents.length === 0
                  ? 'No students in your assigned courses are currently flagged. Some indicators may show "No Data" if Phase 6–9 are not yet active.'
                  : 'Try adjusting your search query or filters.'
              }
            />
          ) : (
            <DataTable
              columns={TABLE_COLUMNS}
              data={filteredStudents}
              onRowClick={(row) => setSelectedStudent(row)}
            />
          )}
        </DashboardCard>

        {/* Inline Detail Panel */}
        {selectedStudent && (
          <StudentDetailPanel
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

/**
 * StudentDetailPanel — inline expanded view of a single student's risk assessment
 * Shown below the table when a row is clicked.
 */
function StudentDetailPanel({ student, onClose }) {
  const { studentName, studentEmail, program, year, courseCode, courseTitle, enrolledAt, indicators, flags } = student;

  return (
    <div className="rounded-2xl border border-[#1C2948] bg-[#1C2948]/30 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">{studentName}</h3>
          </div>
          <p className="text-sm text-gray-400">{studentEmail}</p>
          {program && (
            <p className="text-xs text-[#8CEBFF]">
              {program}{year ? ` · Year ${year}` : ''}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Course: <span className="font-mono text-[#00C8FF]">{courseCode}</span> — {courseTitle}
          </p>
          {enrolledAt && (
            <p className="text-xs text-gray-600">
              Enrolled: {new Date(enrolledAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-[#1C2948] hover:border-[#00C8FF]/30 transition-all"
        >
          Close
        </button>
      </div>

      {/* Flags Summary */}
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Risk Flags</p>
        <RiskFlagsRow flags={flags} size="md" />
      </div>

      {/* Detailed Indicators */}
      {indicators && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Indicator Details</p>
          {Object.entries(indicators).map(([key, evaluation]) => (
            <IndicatorDetailRow key={key} indicatorKey={key} evaluation={evaluation} />
          ))}
        </div>
      )}
    </div>
  );
}

function IndicatorDetailRow({ indicatorKey, evaluation }) {
  const LABEL = {
    inactivity: 'Platform Inactivity',
    lowProgress: 'Course Progress',
    missedDeadlines: 'Missed Deadlines',
  };

  const statusColors = {
    flagged: 'border-rose-500/30 bg-rose-500/5',
    not_flagged: 'border-emerald-500/20 bg-emerald-500/5',
    insufficient_data: 'border-amber-500/20 bg-amber-500/5',
  };

  const statusTextColors = {
    flagged: 'text-rose-400',
    not_flagged: 'text-emerald-400',
    insufficient_data: 'text-amber-400',
  };

  return (
    <div className={`rounded-xl border p-3 ${statusColors[evaluation.status] || 'border-[#1C2948]'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-300">{LABEL[indicatorKey] || indicatorKey}</p>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${statusTextColors[evaluation.status]}`}>
          {evaluation.status?.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">{evaluation.reason}</p>
      {evaluation.lastActivityAt && (
        <p className="text-xs text-gray-500 mt-1">
          Last activity: {new Date(evaluation.lastActivityAt).toLocaleString()}
        </p>
      )}
      {evaluation.progressData && (
        <p className="text-xs text-gray-500 mt-1">
          Progress: {evaluation.progressData.percent}% ({evaluation.progressData.submittedCount}/{evaluation.progressData.totalAssignments} assignments)
        </p>
      )}
    </div>
  );
}
