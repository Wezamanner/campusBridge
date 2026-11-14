import React, { useState } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import Badge from '../ui/Badge.jsx';
import { CheckSquare, CheckCircle2, Circle } from 'lucide-react';

const INITIAL_TASKS = [
  {
    id: 1,
    title: 'Finish Hydraulics II Exam Prep',
    date: 'Nov 6',
    priority: 'high',
    done: false,
  },
  {
    id: 2,
    title: 'Complete Portfolio Admin Page',
    date: 'Nov 7',
    priority: 'medium',
    done: false,
  },
  {
    id: 3,
    title: "Muraja'a 2 Juz",
    date: 'Nov 8',
    priority: 'low',
    done: true,
  },
  {
    id: 4,
    title: 'Practice Python Problems',
    date: 'Nov 8',
    priority: 'medium',
    done: false,
  },
];

export default function UpcomingTasksWidget({ className = '' }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <DashboardCard
      title="Upcoming Tasks"
      icon={CheckSquare}
      actionText="View All"
      actionLink="/student/tasks"
      className={className}
    >
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className={`flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-[#00C8FF]/30 transition-all cursor-pointer group ${
              task.done
                ? 'opacity-60 bg-[#101735]/40'
                : 'bg-[#101735]/70 hover:bg-[#101735]'
            }`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <button
                type="button"
                className="text-[#00C8FF] group-hover:scale-110 transition-transform"
                aria-label="Toggle task completion"
              >
                {task.done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-500 group-hover:text-[#00C8FF]" />
                )}
              </button>

              <span
                className={`text-xs font-semibold truncate ${
                  task.done
                    ? 'line-through text-gray-400'
                    : 'text-white dark:text-white light:text-gray-900'
                }`}
              >
                {task.title}
              </span>
            </div>

            <div className="flex items-center space-x-2.5 flex-shrink-0 ml-2">
              <span className="text-[11px] text-gray-400 font-medium">
                {task.date}
              </span>
              <Badge variant={getPriorityVariant(task.priority)} size="sm">
                {task.priority}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
