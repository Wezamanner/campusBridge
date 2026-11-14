import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import Badge from '../ui/Badge.jsx';
import { FolderKanban, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectsWidget({ className = '' }) {
  return (
    <DashboardCard
      title="Your Projects"
      icon={FolderKanban}
      actionText="View All"
      actionLink="/student/projects"
      className={className}
    >
      <div className="p-4 rounded-xl bg-[#101735]/80 border border-[#1C2948] hover:border-[#00C8FF]/50 transition-all space-y-3 group">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-sm text-white dark:text-white light:text-gray-900 group-hover:text-[#00C8FF] transition-colors">
                Rihla Ventures Bootcamp System
              </h4>
              <Badge variant="success" size="sm" dot>
                Active
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              A modern bootcamp management system for university students.
            </p>
          </div>

          <Link
            to="/student/projects"
            className="text-gray-400 hover:text-[#00C8FF] p-1 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Tech Stack Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {['React', 'Node.js', 'MongoDB', 'Tailwind'].map((tech) => (
            <span
              key={tech}
              className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#1C2948]/80 text-[#8CEBFF] border border-[#1C2948]"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
