import React, { useState, useEffect } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { Activity, CheckCircle, Edit3, BookOpen, Users, Loader2 } from 'lucide-react';
import { activityService } from '../../services/phase11.js';

const ICON_MAP = {
  submission: CheckCircle,
  course: BookOpen,
  profile: Edit3,
  enrollment: Users,
  default: Activity,
};

const COLOR_MAP = {
  submission: '#10B981',
  course: '#00C8FF',
  profile: '#8CEBFF',
  enrollment: '#A855F7',
  default: '#00C8FF',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentActivityWidget({ className = '' }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityService.getRecent(5)
      .then(res => { if (res.success) setActivities(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardCard
      title="Recent Activity"
      icon={Activity}
      actionText="View All"
      actionLink="/student/analytics"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-[#00C8FF] animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-6 text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--cb-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
            Your activity will appear here as you use the platform.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((act, idx) => {
            const type = act.type || 'default';
            const Icon = ICON_MAP[type] || ICON_MAP.default;
            const color = COLOR_MAP[type] || COLOR_MAP.default;
            return (
              <div key={act._id || idx} className="flex items-center justify-between space-x-3 text-xs">
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold truncate" style={{ color: 'var(--cb-text)' }}>
                    {act.description || act.message || act.action || 'Activity recorded'}
                  </span>
                </div>
                <span className="text-[11px] flex-shrink-0 font-medium" style={{ color: 'var(--cb-text-muted)' }}>
                  {timeAgo(act.createdAt || act.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
