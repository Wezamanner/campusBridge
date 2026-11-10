import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Mail, 
  Lock, 
  FileText, 
  PlusCircle,
  Info
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';

export default function StudentCourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchCourseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/courses/${id}`);
      if (response.success && response.data) {
        setCourse(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve course details.');
      }
    } catch (err) {
      console.error('Fetch course details error:', err);
      setError(err.data?.message || err.message || 'Unable to access course details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id]);

  const handleEnroll = async () => {
    if (isEnrolling || !course || course.isEnrolled) return;
    setIsEnrolling(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post(`/courses/${course.id}/enroll`);
      if (response.success) {
        setSuccessMessage(`Successfully enrolled in course ${course.code}!`);
        setCourse((prev) => ({ ...prev, isEnrolled: true }));
      } else {
        throw new Error(response.message || 'Enrollment failed.');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError(err.data?.message || err.message || 'Failed to complete enrollment.');
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading course details..." />
      </AppLayout>
    );
  }

  if (error && !course) {
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
            <h2 className="text-xl font-bold text-white">Course Not Available</h2>
            <p className="text-sm text-rose-300 max-w-md mx-auto">
              {error || 'The requested course does not exist or is inactive.'}
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

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/student/courses"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Course Catalog</span>
          </Link>

          {course?.isEnrolled ? (
            <Badge variant="success" size="md" dot>
              Enrolled Student
            </Badge>
          ) : (
            <Badge variant="cyan" size="md">
              Available for Enrollment
            </Badge>
          )}
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex items-start space-x-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 font-medium">{error}</div>
            <button 
              onClick={() => setError(null)}
              className="text-xs font-semibold text-rose-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start space-x-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Course Header Banner */}
        <div className="p-6 rounded-2xl border border-[#00C8FF]/30 bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] shadow-glow-cyan-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
                  {course.code}
                </span>
                <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="sm">
                  {course.status}
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {course.title}
              </h1>
              <p className="text-xs md:text-sm text-[#8CEBFF]/90 leading-relaxed max-w-3xl">
                {course.description || 'Academic course offering comprehensive theoretical and practical university training.'}
              </p>
            </div>

            {/* Quick Action in Banner */}
            <div className="flex-shrink-0">
              {course.isEnrolled ? (
                <div className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-2 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Actively Enrolled</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  icon={PlusCircle}
                  isLoading={isEnrolling}
                  onClick={handleEnroll}
                >
                  Enroll in Course
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Enrollment Status & Instructions Card */}
            <DashboardCard
              title="Course Enrollment Status"
              subtitle="Registration status for this academic module"
              icon={BookOpen}
            >
              <div className="p-6">
                {course.isEnrolled ? (
                  <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                    <div className="flex items-center space-x-2.5 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <h4 className="font-bold text-sm">Enrollment Confirmed</h4>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      You are officially enrolled in <span className="font-bold text-white">{course.code} — {course.title}</span>. 
                      You have full access to study materials, assignments, and submission workflows as they are published by the teaching instructor.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl border border-[#00C8FF]/30 bg-[#00C8FF]/10 space-y-4">
                    <div className="flex items-center space-x-2.5 text-[#00C8FF]">
                      <Info className="w-5 h-5 flex-shrink-0" />
                      <h4 className="font-bold text-sm">Open for Student Enrollment</h4>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Enrollment is currently open for this course. Click the button below to register. Once enrolled, you will be able to access lecture resources and submit coursework.
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      icon={PlusCircle}
                      isLoading={isEnrolling}
                      onClick={handleEnroll}
                    >
                      Confirm Enrollment Now
                    </Button>
                  </div>
                )}
              </div>
            </DashboardCard>

            {/* Course Resources & Assignments Notice Card (FR-05) */}
            <DashboardCard
              title="Learning Resources & Assignments"
              subtitle="Course materials and coursework submissions (FR-05)"
              icon={FileText}
            >
              <div className="p-6 space-y-4">
                {course.isEnrolled ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[#1C2948] bg-[#101735]/40 text-xs text-gray-300 space-y-1">
                      <div className="flex items-center space-x-2 font-bold text-white">
                        <FileText className="w-4 h-4 text-[#00C8FF]" />
                        <span>Course Resources (Phase 5)</span>
                      </div>
                      <p className="text-gray-400 leading-relaxed">
                        Lecture notes, slide decks, and reading resources uploaded by your instructor will appear here once Phase 5 is active.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#1C2948] bg-[#101735]/40 text-xs text-gray-300 space-y-1">
                      <div className="flex items-center space-x-2 font-bold text-white">
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        <span>Coursework & Assignments (Phase 6 & 7)</span>
                      </div>
                      <p className="text-gray-400 leading-relaxed">
                        Assignments, submission instructions, and deadlines will be available here once Phase 6 is active.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl border border-dashed border-[#1C2948] bg-[#101735]/20 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Course Materials Restricted</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        In accordance with university policy (FR-05), lecture resources and assignments are visible only to enrolled students.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={PlusCircle}
                      isLoading={isEnrolling}
                      onClick={handleEnroll}
                    >
                      Enroll to Unlock Materials
                    </Button>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>

          {/* Right Column: Faculty & Teaching Staff Card (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            <DashboardCard
              title="Teaching Faculty"
              subtitle="Assigned course instructor"
              icon={GraduationCap}
            >
              <div className="p-6 space-y-4">
                {course.instructor ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#00C8FF]/20 to-[#8CEBFF]/10 text-[#00C8FF] border border-[#00C8FF]/30 font-bold text-base flex items-center justify-center">
                        {course.instructor.name ? course.instructor.name.slice(0, 2).toUpperCase() : 'IN'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {course.instructor.name}
                        </h4>
                        <p className="text-xs text-[#8CEBFF]/80">
                          Course Faculty
                        </p>
                      </div>
                    </div>

                    {course.instructor.email && (
                      <div className="pt-3 border-t border-[#1C2948] flex items-center space-x-2 text-xs text-gray-400">
                        <Mail className="w-3.5 h-3.5 text-[#00C8FF]" />
                        <span className="font-mono text-gray-300">{course.instructor.email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Faculty instructor assignment pending by Academic Coordinator.
                  </p>
                )}

                <div className="pt-4 border-t border-[#1C2948] text-[11px] text-gray-400 leading-relaxed">
                  Have questions about this course? You can reach out directly via CampusBridge Messages.
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
