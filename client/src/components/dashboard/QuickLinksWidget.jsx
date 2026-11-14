import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { Zap, FolderKanban, Briefcase, BookOpen, Bell, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { name: 'Profile & CV', icon: User,         path: '/student/profile' },
  { name: 'Learning',     icon: BookOpen,      path: '/student/courses' },
  { name: 'Projects',     icon: FolderKanban,  path: '/student/projects' },
  { name: 'Internships',  icon: Briefcase,     path: '/student/internships' },
  { name: 'Notifications',icon: Bell,          path: '/student/notifications' },
];

export default function QuickLinksWidget({ className = '' }) {
  return (
    <DashboardCard title="Quick Links" icon={Zap} className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.path} to={link.path}>
              <div
                className="p-3 rounded-xl hover:border-[#00C8FF]/50 hover:shadow-glow-cyan-sm transition-all duration-200 flex items-center space-x-2.5 group"
                style={{ border: '1px solid var(--cb-border)', backgroundColor: 'var(--cb-bg)' }}
              >
                <div className="p-2 rounded-lg bg-[#00C8FF]/10 text-[#00C8FF] group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold group-hover:text-[#00C8FF] transition-colors truncate"
                  style={{ color: 'var(--cb-text)' }}>
                  {link.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
