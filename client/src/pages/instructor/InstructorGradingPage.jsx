import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { api } from '../../services/api.js';
import {
  CheckSquare,
  FileText,
  User,
  BookOpen,
  Calendar,
  Star,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';

/**
 * InstructorGradingPage — Submission Grading Queue
 * SRS: FR-07, FR-08, FR-09, UC-I02
 *
 * Displays all student submissions pending review for the authenticated instructor.
 * Allows grading with a numeric score and written feedback.
 */
export default function InstructorGradingPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('Submitted');
  const [expandedId, setExpandedId] = useState(null);

  // Per-submission grading state
  const [grading, setGrading] = useState({}); // { [id]: { score, feedback, loading, error, success } }

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const endpoint = statusFilter
        ? `/instructor/submissions?status=${encodeURIComponent(statusFilter)}`
        : '/instructor/submissions';
      const res = await api.get(endpoint);
      if (res.success) {
        setSubmissions(res.data || []);
      } else {
        setError(res.message || 'Failed to load submissions.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  const handleGradeChange = (id, field, value) => {
    setGrading(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSubmitGrade = async (submission) => {
    const g = grading[submission._id] || {};
    if (g.score === undefined || g.score === '' || isNaN(Number(g.score))) {
      setGrading(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], error: 'A numeric score is required.' },
      }));
      return;
    }
    const maxPoints = submission.assignmentId?.totalPoints;
    const scoreNum = Number(g.score);
    if (maxPoints !== undefined && (scoreNum < 0 || scoreNum > maxPoints)) {
      setGrading(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], error: `Score must be between 0 and ${maxPoints}.` },
      }));
      return;
    }

    try {
      setGrading(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], loading: true, error: null, success: null },
      }));
      const res = await api.patch(`/instructor/submissions/${submission._id}/grade`, {
        score: scoreNum,
        feedback: g.feedback || '',
      });
      if (res.success) {
        setGrading(prev => ({
          ...prev,
          [submission._id]: { ...prev[submission._id], loading: false, success: 'Graded successfully!' },
        }));
        // Refresh list after short delay
        setTimeout(() => fetchSubmissions(), 1200);
      } else {
        throw new Error(res.message || 'Grading failed.');
      }
    } catch (err) {
      setGrading(prev => ({
        ...prev,
        [submission._id]: { ...prev[submission._id], loading: false, error: err.message },
      }));
    }
  };

  const statusVariants = {
    Submitted: 'warning',
    Graded: 'success',
    'Under review': 'cyan',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Grading Queue</h1>
            <p className="text-sm text-gray-400 mt-1">Review and grade student assignment submissions (FR-07, FR-08)</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
            >
              <option value="Submitted">Pending (Submitted)</option>
              <option value="Graded">Already Graded</option>
              <option value="">All Submissions</option>
            </select>
            <Button size="sm" variant="secondary" onClick={fetchSubmissions}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        <DashboardCard
          title={`${statusFilter || 'All'} Submissions`}
          subtitle={
            statusFilter === 'Submitted'
              ? 'Students awaiting your grade and feedback'
              : statusFilter === 'Graded'
              ? 'Submissions you have already graded'
              : 'All submissions across your courses'
          }
          icon={CheckSquare}
        >
          {loading ? (
            <LoadingState count={4} />
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              title={statusFilter === 'Submitted' ? 'No Pending Submissions' : 'No Submissions Found'}
              description={
                statusFilter === 'Submitted'
                  ? 'All caught up! No student submissions are waiting for grading.'
                  : 'No submissions match the selected filter.'
              }
            />
          ) : (
            <div className="divide-y divide-[#1C2948]">
              {submissions.map((sub) => {
                const g = grading[sub._id] || {};
                const isExpanded = expandedId === sub._id;
                const isGraded = sub.status === 'Graded';

                return (
                  <div key={sub._id} className="py-4 space-y-3">
                    {/* Submission header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-[#1C2948]/60 flex-shrink-0">
                          <FileText className="w-4 h-4 text-[#00C8FF]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {sub.assignmentId?.title || 'Assignment'}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <User className="w-3 h-3" />
                              {sub.studentId?.name || sub.studentId?.email || 'Student'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <BookOpen className="w-3 h-3" />
                              {sub.assignmentId?.courseId?.code || sub.assignmentId?.courseId?.title || 'Course'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {sub.submittedAt
                                ? new Date(sub.submittedAt).toLocaleDateString()
                                : 'Unknown date'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={statusVariants[sub.status] || 'neutral'} size="sm">
                          {sub.status}
                        </Badge>
                        {isGraded && sub.grade?.score !== undefined && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <Star className="w-3.5 h-3.5" />
                            {sub.grade.score}/{sub.assignmentId?.totalPoints || '?'}
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : sub._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2948]/60 transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded grading panel */}
                    {isExpanded && (
                      <div className="ml-11 p-4 rounded-xl bg-[#1C2948]/30 border border-[#1C2948] space-y-4">
                        {/* Submission content */}
                        {sub.text && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                              Submission Content
                            </p>
                            <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed bg-[#101735]/60 p-3 rounded-lg border border-[#1C2948]">
                              {sub.text}
                            </p>
                          </div>
                        )}

                        {sub.file && sub.file.name && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                              Attached File
                            </p>
                            <div className="flex items-center gap-2 text-sm text-[#00C8FF]">
                              <FileText className="w-4 h-4" />
                              <span>{sub.file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({sub.file.mimeType || 'file'}{sub.file.size ? `, ${Math.round(sub.file.size / 1024)}KB` : ''})
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">File downloads are handled through the submission management system.</p>
                          </div>
                        )}

                        {/* Existing grade (if already graded) */}
                        {isGraded && sub.grade && (
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                            <p className="text-xs font-semibold text-emerald-400">Already Graded</p>
                            <p className="text-sm text-white">
                              Score: <span className="font-bold">{sub.grade.score}</span>
                              {sub.assignmentId?.totalPoints ? `/${sub.assignmentId.totalPoints}` : ''}
                            </p>
                            {sub.grade.feedback && (
                              <p className="text-xs text-gray-300">Feedback: {sub.grade.feedback}</p>
                            )}
                          </div>
                        )}

                        {/* Grading form (always shown — allows re-grading) */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {isGraded ? 'Update Grade' : 'Grade This Submission'}
                          </p>

                          {g.error && (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                              {g.error}
                            </div>
                          )}
                          {g.success && (
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                              {g.success}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="sm:w-32">
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Score{sub.assignmentId?.totalPoints ? ` (max ${sub.assignmentId.totalPoints})` : ''}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={sub.assignmentId?.totalPoints}
                                step={0.5}
                                defaultValue={isGraded ? sub.grade?.score : ''}
                                onChange={e => handleGradeChange(sub._id, 'score', e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Feedback (optional)
                              </label>
                              <textarea
                                rows={2}
                                defaultValue={isGraded ? sub.grade?.feedback : ''}
                                onChange={e => handleGradeChange(sub._id, 'feedback', e.target.value)}
                                placeholder="Written feedback for the student..."
                                className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] resize-none"
                              />
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleSubmitGrade(sub)}
                            disabled={g.loading}
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            {g.loading ? 'Saving grade...' : isGraded ? 'Update Grade' : 'Submit Grade'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
