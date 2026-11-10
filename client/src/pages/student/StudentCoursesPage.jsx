import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ArrowRight, 
  GraduationCap, 
  PlusCircle, 
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'enrolled'
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/courses');
      if (response.success && Array.isArray(response.data)) {
        setCourses(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve course catalog.');
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError(err.data?.message || err.message || 'Unable to load course catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId, courseCode) => {
    if (enrollingCourseId) return;
    setEnrollingCourseId(courseId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post(`/courses/${courseId}/enroll`);
      if (response.success) {
        setSuccessMessage(`Successfully enrolled in course ${courseCode}!`);
        // Update local course state immediately to show enrolled
        setCourses((prev) =>
          prev.map((c) =>
            c.id === courseId
              ? { ...c, isEnrolled: true, enrolledStudentsCount: (c.enrolledStudentsCount || 0) + 1 }
              : c
          )
        );
      } else {
        throw new Error(response.message || 'Enrollment failed.');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      setError(err.data?.message || err.message || 'Failed to enroll in course.');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const enrolledCount = courses.filter((c) => c.isEnrolled).length;
  const availableCount = courses.length;

  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (course.code && course.code.toLowerCase().includes(q)) ||
      (course.title && course.title.toLowerCase().includes(q)) ||
      (course.description && course.description.toLowerCase().includes(q)) ||
      (course.instructor?.name && course.instructor.name.toLowerCase().includes(q));

    const matchesTab = activeTab === 'all' || (activeTab === 'enrolled' && course.isEnrolled);

    return matchesSearch && matchesTab;
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <PageHeader
          title="Course Catalog & Learning"
          subtitle="Discover university courses, browse syllabi, and enroll in academic modules to access learning resources."
          badge={
            <Badge variant="cyan" size="md">
              FR-05 &bull; Student Module
            </Badge>
          }
        />

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

        {/* Metric Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-[#1C2948] bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200 flex items-center space-x-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-400">Available Courses</p>
              <h3 className="text-2xl font-black text-white dark:text-white light:text-gray-900 mt-0.5">
                {availableCount}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1C2948] bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200 flex items-center space-x-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-400">My Enrolled Courses</p>
              <h3 className="text-2xl font-black text-white dark:text-white light:text-gray-900 mt-0.5">
                {enrolledCount}
              </h3>
            </div>
          </div>
        </div>

        {/* Search & Navigation Tab Bar */}
        <div className="p-4 rounded-2xl border border-[#1C2948] bg-[#101735]/60 dark:bg-[#101735]/60 light:bg-gray-50 light:border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, or instructor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none transition-all
                bg-[#101735] dark:bg-[#101735] text-white dark:text-white
                light:bg-white light:text-gray-900 light:border-gray-300"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <div className="flex rounded-xl p-1 bg-[#1C2948]/50 border border-[#1C2948]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-[#00C8FF] text-[#101735] shadow-glow-cyan-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All Courses ({courses.length})
              </button>
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'enrolled'
                    ? 'bg-[#00C8FF] text-[#101735] shadow-glow-cyan-sm font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Enrolled ({enrolledCount})
              </button>
            </div>
          </div>
        </div>

        {/* Courses Cards Grid */}
        {loading ? (
          <LoadingState text="Loading course catalog..." />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title={activeTab === 'enrolled' ? "No Enrolled Courses" : "No Courses Found"}
            message={
              activeTab === 'enrolled'
                ? "You have not enrolled in any courses yet. Browse the catalog to enroll in active courses."
                : "No active courses match your current search query."
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isEnrolling = enrollingCourseId === course.id;

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-[#1C2948] hover:border-[#00C8FF]/50 transition-all duration-300
                    bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200
                    shadow-lg hover:shadow-glow-cyan-sm flex flex-col justify-between p-6 space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
                        {course.code}
                      </span>
                      {course.isEnrolled ? (
                        <Badge variant="success" size="sm" dot>
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="cyan" size="sm">
                          Available
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-white dark:text-white light:text-gray-900 group-hover:text-[#00C8FF] transition-colors leading-snug">
                        {course.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {course.description || 'Academic course module offering practical and theoretical learning.'}
                      </p>
                    </div>

                    {/* Instructor Info */}
                    <div className="flex items-center space-x-2 text-xs text-gray-300 dark:text-gray-300 light:text-gray-700 pt-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#00C8FF] flex-shrink-0" />
                      <span className="truncate">
                        {course.instructor?.name || 'Instructor Assigned'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/student/courses/${course.id}`}
                      className="text-xs font-semibold text-gray-400 hover:text-white dark:hover:text-white light:hover:text-gray-900 transition-colors"
                    >
                      View Details
                    </Link>

                    {course.isEnrolled ? (
                      <Link
                        to={`/student/courses/${course.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30 hover:bg-[#00C8FF]/25 transition-all"
                      >
                        <span>Open Course</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={PlusCircle}
                        isLoading={isEnrolling}
                        onClick={() => handleEnroll(course.id, course.code)}
                      >
                        Enroll Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
