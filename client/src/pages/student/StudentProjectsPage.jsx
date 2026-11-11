import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { projectsService } from '../../services/phase11.js';
import {
  FolderKanban,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

export default function StudentProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', dueDate: '', status: 'active' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await projectsService.list();
      if (res.success) {
        setProjects(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenCreate = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', dueDate: '', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      dueDate: project.dueDate ? new Date(project.dueDate).toISOString().slice(0, 10) : '',
      status: project.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingProject) {
        await projectsService.update(editingProject._id, formData);
      } else {
        await projectsService.create(formData);
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    try {
      await projectsService.delete(id);
      fetchProjects();
    } catch (err) {
      alert(err.message || 'Failed to archive project.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'on_hold':
        return <Badge variant="warning">On Hold</Badge>;
      default:
        return <Badge variant="info">Active</Badge>;
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
                <FolderKanban className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Personal Projects</h1>
            </div>
            <p className="text-xs text-gray-400">
              Track, organize, and manage your academic and independent extracurricular projects.
            </p>
          </div>

          <Button icon={Plus} onClick={handleOpenCreate}>
            New Project
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState count={3} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No Projects Yet"
            description="Create your first personal project to organize tasks, track milestones, and showcase your work."
            icon={FolderKanban}
            actionText="Create Project"
            onActionClick={handleOpenCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <DashboardCard key={project._id} className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-white hover:text-[#00C8FF] transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-3 min-h-[36px]">
                    {project.description || 'No description provided.'}
                  </p>

                  {project.dueDate && (
                    <div className="flex items-center text-xs text-gray-400 gap-1.5 pt-2 border-t border-[#1C2948]">
                      <Calendar className="w-3.5 h-3.5 text-[#00C8FF]" />
                      <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-[#1C2948]">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleOpenEdit(project)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDelete(project._id)}
                  >
                    Archive
                  </Button>
                </div>
              </DashboardCard>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#101735] border border-[#1C2948] shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">
                {editingProject ? 'Edit Project' : 'Create Personal Project'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Full-Stack Portfolio App"
                    className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of project goals and scope..."
                    className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    >
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Target Due Date</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    />
                  </div>
                </div>

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
                    {editingProject ? 'Save Changes' : 'Create Project'}
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
