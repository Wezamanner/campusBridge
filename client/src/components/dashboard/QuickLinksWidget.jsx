import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { 
  Zap, 
  Code2, 
  Terminal, 
  Trophy, 
  FileText, 
  Globe, 
  Settings 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { name: 'GitHub', icon: Code2, path: 'https://github.com', external: true },
  { name: 'LeetCode', icon: Terminal, path: 'https://leetcode.com', external: true },
  { name: 'Online Judge', icon: Trophy, path: '/student/achievements', external: false },
  { name: 'Docs', icon: FileText, path: '/student/courses', external: false },
  { name: 'Portfolio', icon: Globe, path: '/student/projects', external: false },
  { name: 'Settings', icon: Settings, path: '/settings', external: false },
];

export default function QuickLinksWidget({ className = '' }) {
  return (
    <DashboardCard
      title="Quick Links"
      icon={Zap}
      className={className}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {QUICK_LINKS.map((link, idx) => {
          const Icon = link.icon;
          const content = (
            <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/70 hover:border-[#00C8FF]/50 hover:bg-[#101735] hover:shadow-glow-cyan-sm transition-all duration-200 flex items-center space-x-2.5 group">
              <div className="p-2 rounded-lg bg-[#00C8FF]/10 text-[#00C8FF] group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-white dark:text-white light:text-gray-900 group-hover:text-[#00C8FF] transition-colors truncate">
                {link.name}
              </span>
            </div>
          );

          if (link.external) {
            return (
              <a
                key={idx}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={idx} to={link.path}>
              {content}
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
}
