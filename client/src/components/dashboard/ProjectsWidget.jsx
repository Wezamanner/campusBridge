import React, { useState, useEffect } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import Badge from '../ui/Badge.jsx';
import { FolderKanban, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { projectsService } from '../../services/phase11.js';

const statusVariant = (s) =>
  s === 'active' ? 'success' : s === 'completed' ? 'cyan' : 'neutral';

export default function ProjectsWidget({ className = '' }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsService.list()
      .then(res => { if (res.success) setProjects((res.data || []).slice(0, 2)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardCard
      title="Your Projects"
      icon={FolderKanban}
      actionText="View All"
      actionLink="/student/projects"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-[#00C8FF] animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-6 text-center">
          <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--cb-text-muted)' }} />
          <p className="text-xs mb-3" style={{ color: 'var(--cb-text-muted)' }}>
            No projects yet. Start one from the Projects page.
          </p>
          <Link
            to="/student/projects"
            className="text-xs font-semibold text-[#00C8FF] hover:underline"
          >
            + Create Project
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p._id}
              className="p-4 rounded-xl border hover:border-[#00C8FF]/50 transition-all space-y-2 group"
              style={{ backgroundColor: 'var(--cb-bg)', borderColor: 'var(--cb-border)' }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm group-hover:text-[#00C8FF] transition-colors truncate" style={{ color: 'var(--cb-text)' }}>
                      {p.title}
                    </h4>
                    <Badge variant={statusVariant(p.status)} size="sm" dot>
                      {p.status || 'active'}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-xs line-clamp-1" style={{ color: 'var(--cb-text-muted)' }}>
                      {p.description}
                    </p>
                  )}
                </div>
                <Link to="/student/projects" className="p-1 transition-colors text-gray-400 hover:text-[#00C8FF]">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              {p.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.technologies.slice(0, 4).map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#1C2948]/80 text-[#8CEBFF] border border-[#1C2948]">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
