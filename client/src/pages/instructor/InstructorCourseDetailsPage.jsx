import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  GraduationCap, 
  FileText, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function InstructorCourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');

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
      setError(err.data?.message || err.message || 'Unable to access course workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading course workspace..." />
      </AppLayout>
    );
  }

  if (error || !course) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/instructor/courses')}
          >
            Back to Courses
          </Button>

          <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Course Access Restricted</h2>
            <p className="text-sm text-rose-300 max-w-md mx-auto">
              {error || 'The requested course does not exist or you do not have teaching authorization for it.'}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/instructor/courses')}
            >
              Return to My Courses
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const enrolledStudents = Array.isArray(course.enrolledStudents) ? course.enrolledStudents : [];

  const filteredStudents = enrolledStudents.filter((student) => {
    const q = rosterSearch.toLowerCase();
    return (
      student.name?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q) ||
      student.program?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/instructor/courses"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assigned Courses</span>
          </Link>

          <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="md" dot>
            Status: {course.status}
          </Badge>
        </div>

        {/* Page Header */}
        <PageHeader
          title={`${course.code} — ${course.title}`}
          subtitle={course.description || 'Teaching course workspace and authorized student roster.'}
          badge={
            <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
              {course.code}
            </span>
          }
        />

        {/* Course Overview & Identity Banner */}
        <div className="p-6 rounded-2xl border border-[#00C8FF]/30 bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] shadow-glow-cyan-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-extrabold text-white">Course Overview</h2>
                <Badge variant="cyan" size="sm">
                  {course.status}
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-[#8CEBFF]/90 leading-relaxed max-w-3xl">
                {course.description || 'No additional syllabus description registered for this course.'}
              </p>
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="p-4 rounded-xl border border-[#1C2948] bg-[#101735]/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Enrolled Students
                </span>
                <p className="text-2xl font-black text-[#00C8FF] mt-0.5">
                  {course.enrolledStudentsCount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Ownership Note */}
          <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-[#00C8FF]/20 bg-[#00C8FF]/5 text-[#8CEBFF] text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00C8FF]" />
            <div className="leading-relaxed">
              <span className="font-bold text-white">Coordinator Ownership Boundary:</span> Course creation, 
              archiving, and faculty assignments are administered by Academic Coordinators. Assigned instructors hold teaching authority over course resources and grading.
            </div>
          </div>
        </div>

        {/* Enrolled Students Roster Card */}
        <DashboardCard
          title="Enrolled Student Roster"
          subtitle="Students currently registered and actively participating in this course"
          icon={Users}
        >
          <div className="p-6 space-y-5">
            {/* Roster Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter roster by student name, email, or program..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none transition-all
                    bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                    light:bg-white light:text-gray-900 light:border-gray-300"
                />
              </div>

              <div className="text-xs text-gray-400 font-medium">
                Showing <span className="font-bold text-[#00C8FF]">{filteredStudents.length}</span> of {enrolledStudents.length} enrolled students
              </div>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[#1C2948] bg-[#101735]/20 space-y-2">
                <Users className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-300">
                  {enrolledStudents.length === 0 ? "No Students Enrolled Yet" : "No Matching Students"}
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {enrolledStudents.length === 0
                    ? "Students will appear in this roster once they enroll in this active course through the course catalog."
                    : "No students match the search filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#1C2948] dark:border-[#1C2948] light:border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2948] bg-[#101735]/80 text-gray-400 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Degree Program</th>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2948] text-gray-300">
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        className="hover:bg-[#1C2948]/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00C8FF]/20 to-[#8CEBFF]/10 text-[#00C8FF] font-bold text-xs flex items-center justify-center border border-[#00C8FF]/30">
                              {student.name ? student.name.slice(0, 2).toUpperCase() : 'ST'}
                            </div>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {student.email}
                        </td>
                        <td className="py-3 px-4">
                          {student.program || 'Not Specified'}
                        </td>
                        <td className="py-3 px-4">
                          {student.year ? `Year ${student.year}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {formatDate(student.enrolledAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Teaching Context & Upcoming Module Activations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phase 5 Notice Card */}
          <div className="p-6 rounded-2xl border border-[#1C2948] bg-[#1C2948]/40 dark:bg-[#1C2948]/40 light:bg-white light:border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-5 h-5 text-[#00C8FF]" />
                <h4 className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                  Course Learning Resources
                </h4>
              </div>
              <Badge variant="cyan" size="sm">
                Activates in Phase 5
              </Badge>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Assigned instructors will upload documents, slide decks, and external learning resources for enrolled students in Phase 5 per SRS FR-04.
            </p>
          </div>

          {/* Phase 6 Notice Card */}
          <div className="p-6 rounded-2xl border border-[#1C2948] bg-[#1C2948]/40 dark:bg-[#1C2948]/40 light:bg-white light:border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <h4 className="font-bold text-sm text-white dark:text-white light:text-gray-900">
                  Assignment Management
                </h4>
              </div>
              <Badge variant="purple" size="sm">
                Activates in Phase 6
              </Badge>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Assignment creation with deadlines, maximum scores, instructions, and late-submission controls will be enabled in Phase 6 per SRS FR-06.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
