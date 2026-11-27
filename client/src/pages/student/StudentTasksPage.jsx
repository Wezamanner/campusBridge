import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { tasksService, projectsService } from '../../services/phase11.js';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Filter,
  AlertCircle,
} from 'lucide-react';

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', priority: 'medium', dueDate: '', projectId: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tasksService.list({
        status: statusFilter,
        priority: priorityFilter,
      });
      if (res.success) {
        setTasks(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await projectsService.list('active');
        if (res.success) setProjects(res.data || []);
      } catch {
        // Non-critical if projects list fails
      }
    };
    loadProjects();
  }, []);

  const handleToggle = async (task) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t))
      );
      await tasksService.update(task._id, { status: nextStatus });
    } catch (err) {
      alert(err.message || 'Failed to update task.');
      fetchTasks();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksService.delete(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        projectId: formData.projectId || null,
      };
      await tasksService.create(payload);
      setIsModalOpen(false);
      setFormData({ title: '', priority: 'medium', dueDate: '', projectId: '' });
      fetchTasks();
    } catch (err) {
      alert(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high':
        return <Badge variant="danger">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="neutral">{p}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101735] via-[#141E43] to-[#101735] border border-[#1C2948]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Personal Tasks</h1>
            </div>
            <p className="text-xs text-gray-400">
              Manage your daily study priorities, assignments prep, and project milestones.
            </p>
          </div>

          <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Filter className="w-3.5 h-3.5 text-[#00C8FF]" />
            <span>Filter by:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#1C2948] text-white border border-[#1C2948] focus:outline-none focus:border-[#00C8FF]"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="done">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#1C2948] text-white border border-[#1C2948] focus:outline-none focus:border-[#00C8FF]"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        {/* Tasks List */}
        {loading ? (
          <LoadingState count={4} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No Tasks Found"
            description="You don't have any tasks matching the current filters. Add a new task to stay organized."
            icon={CheckSquare}
            actionText="Create Task"
            onActionClick={() => setIsModalOpen(true)}
          />
        ) : (
          <DashboardCard>
            <div className="divide-y divide-[#1C2948]">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={`flex items-center justify-between p-3.5 hover:bg-[#1C2948]/30 transition-all group ${
                    task.status === 'done' ? 'opacity-60 bg-[#101735]/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(task)}
                      className="text-[#00C8FF] hover:scale-110 transition-transform"
                    >
                      {task.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-500 group-hover:text-[#00C8FF]" />
                      )}
                    </button>

                    <span
                      className={`text-sm font-semibold truncate ${
                        task.status === 'done' ? 'line-through text-gray-400' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {task.dueDate && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#00C8FF]" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}

                    {getPriorityBadge(task.priority)}

                    <button
                      type="button"
                      onClick={() => handleDelete(task._id)}
                      className="p-1 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md p-4 sm:p-6 rounded-2xl bg-[#101735] border border-[#1C2948] shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Create New Task</h3>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Study React Hooks & Context"
                    className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    />
                  </div>
                </div>

                {projects.length > 0 && (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Associated Project</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    >
                      <option value="">None (Standalone Task)</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={submitting}>
                    Create Task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
