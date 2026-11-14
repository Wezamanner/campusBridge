import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { api } from '../../services/api.js';
import {
  BookOpen,
  Users,
  Archive,
  RefreshCw,
  Search,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

/**
 * CoordinatorCoursesPage — Course Management
 * SRS: FR-04, UC-C01
 *
 * Coordinators view all courses, create courses, and manage instructor assignments.
 * Uses GET /api/v1/coordinator/courses  (list)
 *      POST /api/v1/coordinator/courses (create)
 *      PATCH /api/v1/coordinator/courses/:id/status (archive/reactivate)
 */
export default function CoordinatorCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create course state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ code: '', title: '', description: '', instructorId: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  // Instructors list for the assignment dropdown
  const [instructors, setInstructors] = useState([]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/coordinator/courses');
      if (res.success) {
        setCourses(res.data || []);
      } else {
        // Fallback: try generic courses endpoint
        const fallback = await api.get('/courses');
        if (fallback.success) setCourses(fallback.data || []);
        else setError(res.message || 'Failed to load courses.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const res = await api.get('/admin/users?role=instructor&limit=100');
      if (res.success) setInstructors(res.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.code || !createForm.title) {
      setCreateError('Course code and title are required.');
      return;
    }
    try {
      setCreateLoading(true);
      setCreateError(null);
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
      } else {
        throw new Error(res.message || 'Failed to create course.');
      }
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSetStatus = async (courseId, newStatus) => {
    try {
      await api.patch(`/coordinator/courses/${courseId}/status`, { status: newStatus });
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Failed to update course status.');
    }
  };

  const filtered = courses.filter(c => {
    const matchesSearch = !searchTerm ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Course Management</h1>
            <p className="text-sm text-gray-400 mt-1">Create courses and assign instructors (FR-04, UC-C01)</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={fetchCourses}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => { setShowCreateForm(true); setCreateError(null); setCreateSuccess(null); }}>
              + Create Course
            </Button>
          </div>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <DashboardCard title="Create New Course" subtitle="Assign an instructor after creation" icon={BookOpen}>
            {createSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">{createSuccess}</div>
            )}
            {createError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{createError}</div>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Course Code *</label>
                <input
                  type="text" required
                  value={createForm.code}
                  onChange={e => setCreateForm({ ...createForm, code: e.target.value })}
                  placeholder="e.g. CS301"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Course Title *</label>
                <input
                  type="text" required
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Data Structures"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Short course description"
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Assign Instructor</label>
                <select
                  value={createForm.instructorId}
                  onChange={e => setCreateForm({ ...createForm, instructorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                >
                  <option value="">— Select instructor (optional) —</option>
                  {instructors.map(i => (
                    <option key={i._id} value={i._id}>{i.name} ({i.email})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" size="sm" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Course'}
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DashboardCard>
        )}

        {/* Courses list */}
        <DashboardCard title="All Courses" subtitle="Manage active and archived courses" icon={BookOpen}>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <LoadingState count={4} />
          ) : filtered.length === 0 ? (
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00C8FF]">{c.code}</span>
                        <Badge variant={c.status === 'active' ? 'success' : 'neutral'} size="sm">{c.status}</Badge>
                      </div>
                      <p className="text-sm font-semibold text-white mt-0.5">{c.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {c.instructorId && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {c.instructorId.name || 'Instructor assigned'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/instructor/courses/${c._id}`}
                      className="text-xs font-semibold text-[#00C8FF] hover:underline flex items-center gap-1"
                    >
                      View <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetStatus(c._id, c.status === 'active' ? 'archived' : 'active')}
                    >
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
    </AppLayout>
  );
}
