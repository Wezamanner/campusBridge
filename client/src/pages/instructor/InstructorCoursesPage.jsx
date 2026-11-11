import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Search, 
  Filter, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/courses');
      if (response.success && Array.isArray(response.data)) {
        setCourses(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve assigned courses.');
      }
    } catch (err) {
      console.error('Fetch courses error:', err);
      setError(err.data?.message || err.message || 'Unable to load assigned courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Filter courses by search keyword and status
  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.title && course.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalAssigned = courses.length;
  const activeCount = courses.filter((c) => c.status === 'active').length;
  const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrolledStudentsCount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Header */}
        <PageHeader
          title="Assigned Courses Workspace"
          subtitle="Explore course information, view enrolled student rosters, and prepare learning contexts for courses assigned to you."
          badge={
            <Badge variant="cyan" size="md">
              FR-04 &bull; Instructor Stream
            </Badge>
          }
        />

        {/* Global Error Banner */}
        {error && (
          <div className="flex items-start space-x-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 font-medium">{error}</div>
            <Button variant="ghost" size="sm" onClick={fetchCourses}>
              Retry
            </Button>
          </div>
        )}

        {/* Course Metrics Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-[#1C2948] bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200 flex items-center space-x-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Assigned</p>
              <h3 className="text-2xl font-black text-white dark:text-white light:text-gray-900 mt-0.5">
                {totalAssigned}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1C2948] bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200 flex items-center space-x-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-400">Active Courses</p>
              <h3 className="text-2xl font-black text-white dark:text-white light:text-gray-900 mt-0.5">
                {activeCount}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-[#1C2948] bg-[#1C2948]/60 dark:bg-[#1C2948]/60 light:bg-white light:border-gray-200 flex items-center space-x-4 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-gray-400">Enrolled Students</p>
              <h3 className="text-2xl font-black text-white dark:text-white light:text-gray-900 mt-0.5">
                {totalEnrolled}
              </h3>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 rounded-2xl border border-[#1C2948] bg-[#101735]/60 dark:bg-[#101735]/60 light:bg-gray-50 light:border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or title..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none transition-all
                bg-[#101735] dark:bg-[#101735] text-white dark:text-white
                light:bg-white light:text-gray-900 light:border-gray-300"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Status:</span>
            <div className="flex rounded-xl p-1 bg-[#1C2948]/50 border border-[#1C2948]">
              {['all', 'active', 'archived'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                    statusFilter === status
                      ? 'bg-[#00C8FF] text-[#101735] shadow-glow-cyan-sm font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Courses Listing Grid */}
        {loading ? (
          <LoadingState text="Loading assigned courses..." />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title={courses.length === 0 ? "No Courses Assigned Yet" : "No Matching Courses Found"}
            message={
              courses.length === 0
                ? "You do not have any teaching courses assigned to your account. Academic Coordinators assign courses to faculty."
                : "No courses match your current search query or status filter."
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
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
                    <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="sm" dot>
                      {course.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-white dark:text-white light:text-gray-900 group-hover:text-[#00C8FF] transition-colors leading-snug">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {course.description || 'No detailed syllabus description provided.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1C2948] dark:border-[#1C2948] light:border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-gray-300 dark:text-gray-300 light:text-gray-600">
                    <Users className="w-3.5 h-3.5 text-[#00C8FF]" />
                    <span className="font-semibold">{course.enrolledStudentsCount || 0}</span>
                    <span className="text-gray-400">enrolled</span>
                  </div>

                  <Link
                    to={`/instructor/courses/${course.id}`}
                    className="inline-flex items-center space-x-1 font-bold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors group-hover:translate-x-0.5 transform duration-150"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
