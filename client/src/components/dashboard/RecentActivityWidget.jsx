import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { Activity, CheckCircle, Edit3, BookOpen, Users } from 'lucide-react';

const ACTIVITIES = [
  {
    title: 'Completed: Hydraulics II Practice',
    time: '2h ago',
    icon: CheckCircle,
    color: '#10B981',
  },
  {
    title: 'Updated: Portfolio Design',
    time: '4h ago',
    icon: Edit3,
    color: '#00C8FF',
  },
  {
    title: 'Studied: Surah Ad-Dukhan',
    time: '6h ago',
    icon: BookOpen,
    color: '#8CEBFF',
  },
  {
    title: 'Joined: CampusBridge Tech Community',
    time: '1d ago',
    icon: Users,
    color: '#A855F7',
  },
];

export default function RecentActivityWidget({ className = '' }) {
  return (
    <DashboardCard
      title="Recent Activity"
      icon={Activity}
      actionText="View All"
      actionLink="/student/analytics"
      className={className}
    >
      <div className="space-y-4">
        {ACTIVITIES.map((act, idx) => {
          const Icon = act.icon;
          return (
            <div key={idx} className="flex items-center justify-between space-x-3 text-xs">
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${act.color}15`,
                    color: act.color,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-white dark:text-white light:text-gray-900 truncate">
                  {act.title}
                </span>
              </div>

              <span className="text-[11px] text-gray-400 flex-shrink-0 font-medium">
                {act.time}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
