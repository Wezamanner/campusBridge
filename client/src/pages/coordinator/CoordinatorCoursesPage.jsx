import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { api } from '../../services/api.js';
import {
  BookOpen, Users, Archive, RefreshCw, Search,
  AlertCircle, ArrowRight, X, UserPlus, UserMinus,
  CheckCircle2, Loader2, GraduationCap, Trash2,
} from 'lucide-react';

/**
 * CoordinatorCoursesPage — Course Management + Student Assignment
 * SRS: FR-04, FR-05, UC-C01
 */
export default function CoordinatorCoursesPage() {
  // ── Course list state ────────────────────────────────────────────────────
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ── Create course state ──────────────────────────────────────────────────
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', title: '', description: '', instructorId: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);
  const [instructors, setInstructors]     = useState([]);

  // ── Student management panel state ───────────────────────────────────────
  const [studentPanel, setStudentPanel] = useState(null); // { courseId, courseCode, courseTitle }
  const [enrolledStudents, setEnrolledStudents]   = useState([]);
  const [enrolledLoading, setEnrolledLoading]     = useState(false);
  const [enrolledError, setEnrolledError]         = useState(null);
  const [studentSearch, setStudentSearch]         = useState('');
  const [allStudents, setAllStudents]             = useState([]);
  const [studentsLoading, setStudentsLoading]     = useState(false);
  const [assigningId, setAssigningId]             = useState(null);
  const [assignFeedback, setAssignFeedback]       = useState(null); // { type: 'success'|'error', msg }
  const [removingId, setRemovingId]               = useState(null);
  const [confirmRemove, setConfirmRemove]         = useState(null); // { studentId, name }

  // ── Fetch courses ────────────────────────────────────────────────────────
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/coordinator/courses');
      if (res.success) {
        setCourses(res.data || []);
      } else {
        const fallback = await api.get('/courses');
        if (fallback.success) setCourses(fallback.data || []);
        else setError(res.message || 'Failed to load courses.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstructors = useCallback(async () => {
    try {
      const res = await api.get('/coordinator/instructors');
      if (res.success) setInstructors(res.data || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchCourses(); fetchInstructors(); }, [fetchCourses, fetchInstructors]);

  // ── Create course ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.code || !createForm.title) { setCreateError('Code and title are required.'); return; }
    try {
      setCreateLoading(true); setCreateError(null);
      const res = await api.post('/coordinator/courses', {
        code: createForm.code.trim().toUpperCase(),
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        instructorId: createForm.instructorId || undefined,
      });
      if (res.success) {
        setCreateSuccess('Course created successfully!');
        setCreateForm({ code: '', title: '', description: '', instructorId: '' });
        fetchCourses();
        setTimeout(() => { setShowCreateForm(false); setCreateSuccess(null); }, 1500);
      } else throw new Error(res.message || 'Failed to create course.');
    } catch (err) { setCreateError(err.message); }
    finally { setCreateLoading(false); }
  };

  const handleSetStatus = async (courseId, newStatus) => {
    try {
      await api.patch(`/coordinator/courses/${courseId}/status`, { status: newStatus });
      fetchCourses();
    } catch (err) { setError(err.message || 'Failed to update course status.'); }
  };

  // ── Student panel helpers ────────────────────────────────────────────────
  const openStudentPanel = async (course) => {
    setStudentPanel({ courseId: course._id, courseCode: course.code, courseTitle: course.title });
    setStudentSearch('');
    setAssignFeedback(null);
    setConfirmRemove(null);
    await loadEnrolledStudents(course._id);
    await loadAllStudents('');
  };

  const closeStudentPanel = () => {
    setStudentPanel(null);
    setEnrolledStudents([]);
    setAllStudents([]);
    setStudentSearch('');
    setAssignFeedback(null);
    setConfirmRemove(null);
  };

  const loadEnrolledStudents = async (courseId) => {
    try {
      setEnrolledLoading(true); setEnrolledError(null);
      const res = await api.get(`/coordinator/courses/${courseId}/students`);
      if (res.success) setEnrolledStudents(res.data || []);
      else setEnrolledError(res.message || 'Failed to load enrolled students.');
    } catch (err) { setEnrolledError(err.message || 'Failed to load enrolled students.'); }
    finally { setEnrolledLoading(false); }
  };

  const loadAllStudents = async (q) => {
    try {
      setStudentsLoading(true);
      const endpoint = q ? `/coordinator/students?search=${encodeURIComponent(q)}` : '/coordinator/students';
      const res = await api.get(endpoint);
      if (res.success) setAllStudents(res.data || []);
    } catch { /* silent */ }
    finally { setStudentsLoading(false); }
  };

  // Debounced student search
  useEffect(() => {
    if (!studentPanel) return;
    const t = setTimeout(() => loadAllStudents(studentSearch), 300);
    return () => clearTimeout(t);
  }, [studentSearch, studentPanel]);

  const handleAssign = async (studentId, studentName) => {
    if (!studentPanel) return;
    try {
      setAssigningId(studentId);
      setAssignFeedback(null);
      const res = await api.post(`/coordinator/courses/${studentPanel.courseId}/students`, { studentId });
      if (res.success) {
        const msg = res.data?.alreadyEnrolled
          ? `${studentName} is already assigned to this course.`
          : `${studentName} assigned successfully.`;
        setAssignFeedback({ type: res.data?.alreadyEnrolled ? 'warn' : 'success', msg });
        await loadEnrolledStudents(studentPanel.courseId);
        setTimeout(() => setAssignFeedback(null), 3000);
      } else {
        setAssignFeedback({ type: 'error', msg: res.message || 'Assignment failed.' });
      }
    } catch (err) {
      setAssignFeedback({ type: 'error', msg: err.message || 'Assignment failed.' });
    } finally {
      setAssigningId(null);
    }
  };

  const handleRemove = async () => {
    if (!studentPanel || !confirmRemove) return;
    try {
      setRemovingId(confirmRemove.studentId);
      const res = await api.delete(`/coordinator/courses/${studentPanel.courseId}/students/${confirmRemove.studentId}`);
      if (res.success) {
        setAssignFeedback({ type: 'success', msg: `${confirmRemove.name} removed. Academic records preserved.` });
        await loadEnrolledStudents(studentPanel.courseId);
        setTimeout(() => setAssignFeedback(null), 3000);
      } else {
        setAssignFeedback({ type: 'error', msg: res.message || 'Removal failed.' });
      }
    } catch (err) {
      setAssignFeedback({ type: 'error', msg: err.message || 'Removal failed.' });
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const isEnrolled = (studentId) =>
    enrolledStudents.some(s => (s._id || s) === studentId);

  // ── Filtered course list ─────────────────────────────────────────────────
  const filtered = courses.filter(c => {
    const q = searchTerm.toLowerCase();
    return (!q || c.code?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q)) &&
           (!statusFilter || c.status === statusFilter);
  });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--cb-text)' }}>
              Course Management
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--cb-text-muted)' }}>
              Create courses, assign instructors, and manage student enrolments (FR-04, FR-05, UC-C01)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={fetchCourses}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
            </Button>
            <Button size="sm" onClick={() => { setShowCreateForm(true); setCreateError(null); setCreateSuccess(null); }}>
              + Create Course
            </Button>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <DashboardCard title="Create New Course" subtitle="Assign an instructor after creation" icon={BookOpen}>
            {createSuccess && <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{createSuccess}</div>}
            {createError   && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{createError}</div>}
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Course Code *</label>
                <input type="text" required value={createForm.code}
                  onChange={e => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder="e.g. CS301"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Course Title *</label>
                <input type="text" required value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Data Structures"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
                <input type="text" value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Short course description"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Assign Instructor</label>
                <select value={createForm.instructorId}
                  onChange={e => setCreateForm({ ...createForm, instructorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]">
                  <option value="">— Select instructor (optional) —</option>
                  {instructors.map(i => <option key={i._id} value={i._id}>{i.name} ({i.email})</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" size="sm" disabled={createLoading}>{createLoading ? 'Creating…' : 'Create Course'}</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </form>
          </DashboardCard>
        )}

        {/* Course list */}
        <DashboardCard title="All Courses" subtitle="Manage active and archived courses" icon={BookOpen}>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by code or title…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          {loading ? <LoadingState count={4} /> : filtered.length === 0 ? (
            <EmptyState title="No Courses Found" description="No courses match your filters, or none exist yet." />
          ) : (
            <div className="divide-y divide-[#1C2948]">
              {filtered.map(c => (
                <div key={c._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#00C8FF]/10">
                      <BookOpen className="w-4 h-4 text-[#00C8FF]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#00C8FF]">{c.code}</span>
                        <Badge variant={c.status === 'active' ? 'success' : 'neutral'} size="sm">{c.status}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-white mt-0.5">{c.title}</p>
                      {c.instructorId && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Users className="w-3 h-3" />
                          <span>{typeof c.instructorId === 'object' ? c.instructorId.name : 'Instructor assigned'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Manage Students button */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openStudentPanel(c)}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                      Students
                    </Button>
                    <Link to={`/instructor/courses/${c._id}`}
                      className="text-xs font-semibold text-[#00C8FF] hover:underline flex items-center gap-1">
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Button size="sm" variant="secondary"
                      onClick={() => handleSetStatus(c._id, c.status === 'active' ? 'archived' : 'active')}>
                      <Archive className="w-3 h-3 mr-1" />
                      {c.status === 'active' ? 'Archive' : 'Reactivate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ── Student Management Modal ──────────────────────────────────────── */}
      {studentPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-[#1C2948] bg-[#0D1424] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="p-5 border-b border-[#1C2948] flex items-start justify-between gap-3 flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#00C8FF]" />
                  Student Assignments
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="font-mono text-[#00C8FF]">{studentPanel.courseCode}</span>
                  {' — '}{studentPanel.courseTitle}
                </p>
              </div>
              <button onClick={closeStudentPanel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2948] transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feedback banner */}
            {assignFeedback && (
              <div className={`mx-5 mt-4 p-3 rounded-lg text-sm flex items-start gap-2 flex-shrink-0 ${
                assignFeedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                assignFeedback.type === 'warn'    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400' :
                                                    'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{assignFeedback.msg}</span>
              </div>
            )}

            {/* Confirm remove */}
            {confirmRemove && (
              <div className="mx-5 mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex-shrink-0">
                <p className="text-sm font-semibold text-rose-300 mb-1">Remove student from course?</p>
                <p className="text-xs text-rose-400 mb-3">
                  <strong>{confirmRemove.name}</strong> will lose access to this course.
                  Existing submissions, grades and progress records are preserved.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="danger"
                    disabled={!!removingId}
                    onClick={handleRemove}>
                    {removingId ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                    {removingId ? 'Removing…' : 'Remove'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmRemove(null)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Body: two-column split */}
            <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

              {/* Left: enrolled students */}
              <div className="sm:w-1/2 flex flex-col border-r border-[#1C2948] overflow-hidden">
                <div className="p-4 border-b border-[#1C2948] flex-shrink-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Assigned Students
                    {enrolledStudents.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-[#00C8FF]/10 text-[#00C8FF] font-bold">
                        {enrolledStudents.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {enrolledError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{enrolledError}</div>
                  )}
                  {enrolledLoading ? (
                    <LoadingState count={3} />
                  ) : enrolledStudents.length === 0 ? (
                    <div className="py-8 text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                      <p className="text-xs text-gray-500">No students assigned yet.</p>
                      <p className="text-xs text-gray-600 mt-1">Search and assign students on the right.</p>
                    </div>
                  ) : (
                    enrolledStudents.map(s => (
                      <div key={s._id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] group hover:border-[#00C8FF]/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                          {s.program && <p className="text-[10px] text-gray-500">{s.program}{s.year ? ` · Yr ${s.year}` : ''}</p>}
                        </div>
                        <button
                          onClick={() => setConfirmRemove({ studentId: s._id, name: s.name })}
                          disabled={!!removingId}
                          className="ml-2 p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Remove student">
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: student search + assign */}
              <div className="sm:w-1/2 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-[#1C2948] flex-shrink-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Add Students
                  </p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      placeholder="Search by name or email…"
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-xs focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {studentsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-5 h-5 text-[#00C8FF] animate-spin" />
                    </div>
                  ) : allStudents.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">
                      {studentSearch ? 'No students match your search.' : 'Type to search students.'}
                    </p>
                  ) : (
                    allStudents.map(s => {
                      const enrolled = isEnrolled(s._id);
                      const assigning = assigningId === s._id;
                      return (
                        <div key={s._id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                            enrolled
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-[#1C2948]/40 border-[#1C2948] hover:border-[#00C8FF]/30'
                          }`}>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                            {s.program && <p className="text-[10px] text-gray-500">{s.program}{s.year ? ` · Yr ${s.year}` : ''}</p>}
                          </div>
                          {enrolled ? (
                            <span className="ml-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-400 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Assigned
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAssign(s._id, s.name)}
                              disabled={assigning}
                              className="ml-2 p-1.5 rounded-lg bg-[#00C8FF]/10 text-[#00C8FF] hover:bg-[#00C8FF]/20 transition-colors flex-shrink-0 disabled:opacity-50"
                              title="Assign to course">
                              {assigning
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <UserPlus className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </AppLayout>
  );
}
