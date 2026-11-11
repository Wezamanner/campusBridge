import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Info,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per FR-07
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.zip', '.txt'];

export default function StudentAssignmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Download state
  const [downloading, setDownloading] = useState(false);

  const fetchAssignment = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/assignments/${id}`);
      if (response.success && response.data) {
        setAssignment(response.data);
        if (response.data.submission?.text) {
          setSubmissionText(response.data.submission.text);
        }
      } else {
        throw new Error(response.message || 'Failed to retrieve assignment details.');
      }
    } catch (err) {
      console.error('Fetch assignment error:', err);
      setError(err.data?.message || err.message || 'Unable to load assignment details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAssignment();
    }
  }, [id]);

  const handleFileChange = (e) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File size exceeds the 5 MB limit.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError(`Invalid file format. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`);
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const hasText = Boolean(submissionText.trim());
    const hasFile = Boolean(selectedFile);
    const hasExistingContent = Boolean(assignment?.submission?.file || assignment?.submission?.text);

    if (!hasText && !hasFile && !hasExistingContent) {
      setSubmitError('Please provide a text answer or attach a file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (submissionText.trim()) {
        formData.append('text', submissionText.trim());
      }
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await api.post(`/assignments/${id}/submissions`, formData);
      if (response.success) {
        setSubmitSuccess(response.message || 'Submission uploaded successfully!');
        setSelectedFile(null);
        // Refresh assignment details to show new submission
        await fetchAssignment();
      } else {
        throw new Error(response.message || 'Submission failed.');
      }
    } catch (err) {
      console.error('Submit assignment error:', err);
      setSubmitError(err.data?.message || err.message || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSubmission = async () => {
    if (!assignment?.submission?.file) return;
    setDownloading(true);
    try {
      await api.download(
        `/assignments/${id}/submission/download`,
        assignment.submission.file.name || 'assignment-submission'
      );
    } catch (err) {
      console.error('Download submission file error:', err);
      setSubmitError(err.data?.message || err.message || 'Failed to download submission file.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading assignment details..." />
      </AppLayout>
    );
  }

  if (error || !assignment) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/student/courses')}
          >
            Back to Courses
          </Button>

          <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Assignment Unavailable</h2>
            <p className="text-sm text-rose-300 max-w-md mx-auto">
              {error || 'The requested assignment could not be found or you do not have permission to view it.'}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/student/courses')}
            >
              Return to Course Catalog
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isSubmitted = Boolean(assignment.submission);
  const isGraded = assignment.submission?.status === 'Graded';
  const isDeadlinePassed = new Date(assignment.deadline) < new Date();
  const canSubmit = !isGraded && (!isDeadlinePassed || assignment.allowLate);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={`/student/courses/${assignment.courseId}`}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {assignment.courseCode || 'Course'}</span>
          </Link>

          {isGraded ? (
            <Badge variant="cyan" size="md">
              Graded: {assignment.submission.grade?.score} / {assignment.maxScore}
            </Badge>
          ) : isSubmitted ? (
            <Badge variant="success" size="md" dot>
              Submitted
            </Badge>
          ) : isDeadlinePassed && !assignment.allowLate ? (
            <Badge variant="rose" size="md">
              Submission Closed
            </Badge>
          ) : (
            <Badge variant="amber" size="md">
              Awaiting Submission
            </Badge>
          )}
        </div>

        {/* Assignment Hero Header */}
        <div className="p-6 lg:p-8 rounded-2xl border border-[#1C2948] bg-gradient-to-br from-[#101735]/90 via-[#101735] to-[#162142] relative overflow-hidden shadow-card">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#00C8FF]">
                <BookOpen className="w-4 h-4" />
                <span>{assignment.courseCode} — {assignment.courseTitle}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                {assignment.title}
              </h1>
              <div className="flex items-center space-x-6 text-xs text-gray-300 flex-wrap gap-y-2 pt-1">
                <div className="flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Due: <strong className="text-white">{formatDateTime(assignment.deadline)}</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-[#00C8FF]" />
                  <span>Maximum Score: <strong className="text-white">{assignment.maxScore} pts</strong></span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Late Policy: <strong className="text-white">{assignment.allowLate ? 'Late Submissions Allowed' : 'Strict Deadline (No Late Work)'}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Instructions & Details (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <DashboardCard
              title="Assignment Instructions"
              subtitle="Review task guidelines and specifications"
              icon={FileText}
            >
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-[#101735]/60 border border-[#1C2948] text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {assignment.description || 'No detailed instructions provided.'}
                </div>

                <div className="p-4 rounded-xl border border-[#1C2948] bg-[#101735]/30 flex items-start space-x-3 text-xs text-gray-400">
                  <Info className="w-4 h-4 text-[#00C8FF] flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-gray-300">Submission Requirements (FR-07):</span>
                    <p>
                      You may submit a text response, attach a file (up to 5 MB; permitted formats: PDF, DOC, DOCX, ZIP, TXT), or both.
                      You can replace your submission before the deadline or until the instructor grades your work.
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Right Column: Submission & Grading Status (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            {/* If Graded, Show Grade Card */}
            {isGraded && assignment.submission?.grade && (
              <DashboardCard
                title="Grade & Feedback"
                subtitle="Evaluation from course instructor"
                icon={GraduationCap}
              >
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Grade Awarded</span>
                      <div className="text-3xl font-extrabold text-white mt-0.5">
                        {assignment.submission.grade.score}
                        <span className="text-sm font-normal text-gray-400"> / {assignment.maxScore}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                      {Math.round((assignment.submission.grade.score / assignment.maxScore) * 100)}%
                    </div>
                  </div>

                  {assignment.submission.grade.feedback && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-gray-300">Instructor Feedback:</span>
                      <div className="p-3.5 rounded-xl bg-[#101735]/60 border border-[#1C2948] text-xs text-gray-300 whitespace-pre-wrap">
                        {assignment.submission.grade.feedback}
                      </div>
                    </div>
                  )}

                  {assignment.submission.grade.gradedAt && (
                    <div className="text-[11px] text-gray-400">
                      Evaluated on {formatDateTime(assignment.submission.grade.gradedAt)}
                    </div>
                  )}
                </div>
              </DashboardCard>
            )}

            {/* Current Submission Card */}
            {isSubmitted && (
              <DashboardCard
                title="Your Submission"
                subtitle={`Submitted on ${formatDateTime(assignment.submission.submittedAt)}`}
                icon={FileCheck}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Status</span>
                    <Badge variant={isGraded ? 'cyan' : 'success'} size="sm">
                      {assignment.submission.status}
                    </Badge>
                  </div>

                  {assignment.submission.text && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-gray-300">Written Response:</span>
                      <div className="p-3 rounded-xl bg-[#101735]/60 border border-[#1C2948] text-xs text-gray-200 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                        {assignment.submission.text}
                      </div>
                    </div>
                  )}

                  {assignment.submission.file && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-gray-300">Attached File:</span>
                      <div className="p-3 rounded-xl bg-[#101735]/60 border border-[#1C2948] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {assignment.submission.file.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {formatBytes(assignment.submission.file.size)}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Download}
                          isLoading={downloading}
                          onClick={handleDownloadSubmission}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DashboardCard>
            )}

            {/* Submission Form Card */}
            <DashboardCard
              title={isSubmitted ? 'Resubmit Assignment' : 'Submit Assignment'}
              subtitle={
                canSubmit
                  ? 'Submit your text answer or file attachment'
                  : isGraded
                  ? 'Submissions locked after grading'
                  : 'Deadline has passed'
              }
              icon={Upload}
            >
              <div className="p-6 space-y-4">
                {submitSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {!canSubmit ? (
                  <div className="p-4 rounded-xl border border-dashed border-[#1C2948] bg-[#101735]/40 text-center space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <h5 className="text-sm font-bold text-white">Submissions Closed</h5>
                    <p className="text-xs text-gray-400">
                      {isGraded
                        ? 'This assignment has already been evaluated and graded.'
                        : 'The deadline has passed and late submissions are not accepted.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Text Answer */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">
                        Written Response / Notes (Optional if file attached)
                      </label>
                      <textarea
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Type your response or comments here..."
                        rows={4}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#1C2948] bg-[#101735]/80 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#00C8FF] transition-all resize-none"
                      />
                    </div>

                    {/* File Attachment */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-300">
                        File Attachment (Optional if text response provided)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip,.txt"
                        onChange={handleFileChange}
                        className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#00C8FF]/15 file:text-[#00C8FF] hover:file:bg-[#00C8FF]/25 cursor-pointer border border-[#1C2948] rounded-xl p-2 bg-[#101735]/60"
                      />
                      <p className="text-[11px] text-gray-400">
                        Supported formats: PDF, DOC, DOCX, ZIP, TXT. Max size: 5 MB.
                      </p>
                      {fileError && (
                        <p className="text-xs text-rose-400 font-medium">{fileError}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full"
                      isLoading={submitting}
                      icon={Upload}
                    >
                      {isSubmitted ? 'Replace Submission' : 'Submit Assignment'}
                    </Button>
                  </form>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
