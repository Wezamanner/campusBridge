import React, { useState, useEffect } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import Badge from '../ui/Badge.jsx';
import { CheckSquare, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { tasksService } from '../../services/phase11.js';

const priorityVariant = (p) =>
  p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'success';

export default function UpcomingTasksWidget({ className = '' }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksService.list({ status: 'pending' })
      .then(res => { if (res.success) setTasks((res.data || []).slice(0, 5)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await tasksService.update(task._id, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    } catch { /* silent */ }
  };

  return (
    <DashboardCard
      title="Upcoming Tasks"
      icon={CheckSquare}
      actionText="View All"
      actionLink="/student/tasks"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-[#00C8FF] animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-6 text-center">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--cb-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
            No pending tasks. Add tasks from the Tasks page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.status === 'completed';
            return (
              <div
                key={task._id}
                onClick={() => toggle(task)}
                className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-[#00C8FF]/30 transition-all cursor-pointer group"
                style={{ backgroundColor: done ? 'transparent' : 'var(--cb-bg)', opacity: done ? 0.6 : 1 }}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <button type="button" className="text-[#00C8FF]">
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      : <Circle className="w-4 h-4 text-gray-500 group-hover:text-[#00C8FF]" />}
                  </button>
                  <span
                    className={`text-xs font-semibold truncate ${done ? 'line-through' : ''}`}
                    style={{ color: done ? 'var(--cb-text-muted)' : 'var(--cb-text)' }}
                  >
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                  {task.dueDate && (
                    <span className="text-[11px] font-medium" style={{ color: 'var(--cb-text-muted)' }}>
                      {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {task.priority && (
                    <Badge variant={priorityVariant(task.priority)} size="sm">{task.priority}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}
