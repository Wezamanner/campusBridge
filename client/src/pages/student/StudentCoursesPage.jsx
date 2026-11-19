import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Info,
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

/**
 * StudentCoursesPage — Coordinator-assigned courses only.
 *
 * Students no longer self-enroll. The backend (getCourses for role=student)
 * returns only courses the student has been assigned to by a coordinator.
 * Self-enrollment via POST /courses/:id/enroll is blocked (HTTP 403).
 */
export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/courses')
      .then(res => {
        if (res.success && Array.isArray(res.data)) setCourses(res.data);
        else throw new Error(res.message || 'Failed to load courses.');
      })
      .catch(err => setError(err.data?.message || err.message || 'Unable to load courses.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q ||
      c.code?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.instructor?.name?.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="My Courses"
          subtitle="Courses assigned to you by your coordinator. Contact your coordinator to request course access."
          badge={<Badge variant="cyan" size="md">Coordinator-Assigned</Badge>}
        />

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-[#00C8FF]/20 bg-[#00C8FF]/5 text-sm">
          <Info className="w-5 h-5 text-[#00C8FF] flex-shrink-0 mt-0.5" />
          <p className="text-[#8CEBFF]">
            Course access is managed by your academic coordinator. Only courses assigned to your account are shown here.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats + Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#00C8FF]/10">
              <BookOpen className="w-5 h-5 text-[#00C8FF]" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--cb-text-muted)' }}>
                Assigned Courses
              </p>
              <p className="text-2xl font-black" style={{ color: 'var(--cb-text)' }}>
                {courses.length}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3" style={{ color: 'var(--cb-text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by code, title, or instructor..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none transition-all"
              style={{
                backgroundColor: 'var(--cb-bg)',
                border: '1px solid var(--cb-border)',
                color: 'var(--cb-text)',
              }}
            />
          </div>
        </div>

        {/* Course grid */}
        {loading ? (
          <LoadingState count={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={courses.length === 0 ? 'No Courses Assigned' : 'No Courses Found'}
            message={
              courses.length === 0
                ? 'Your coordinator has not assigned any courses to your account yet.'
                : 'No assigned courses match your search.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(course => (
              <div
                key={course.id}
                className="rounded-2xl border hover:border-[#00C8FF]/50 transition-all duration-300 shadow-lg hover:shadow-glow-cyan-sm flex flex-col justify-between p-6 space-y-4 group"
                style={{ backgroundColor: 'var(--cb-surface)', borderColor: 'var(--cb-border)' }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
                      {course.code}
                    </span>
                    <Badge variant="success" size="sm" dot>Assigned</Badge>
                  </div>

                  <div>
                    <h3
                      className="font-extrabold text-base group-hover:text-[#00C8FF] transition-colors leading-snug"
                      style={{ color: 'var(--cb-text)' }}
                    >
                      {course.title}
                    </h3>
                    <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--cb-text-muted)' }}>
                      {course.description || 'Academic course module.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs pt-1" style={{ color: 'var(--cb-text-muted)' }}>
                    <GraduationCap className="w-3.5 h-3.5 text-[#00C8FF] flex-shrink-0" />
                    <span className="truncate">{course.instructor?.name || 'Instructor assigned'}</span>
                  </div>
                </div>

                <div
                  className="pt-4 flex items-center justify-between gap-2"
                  style={{ borderTop: '1px solid var(--cb-border)' }}
                >
                  <Link
                    to={`/student/courses/${course.id}`}
                    className="text-xs font-semibold text-gray-400 hover:text-[#00C8FF] transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/student/courses/${course.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30 hover:bg-[#00C8FF]/25 transition-all"
                  >
                    <span>Open Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
