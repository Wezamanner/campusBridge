import React from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { BookOpen } from 'lucide-react';

export default function LearningProgressWidget({
  overallPercent = 70,
  courses = [
    { title: 'Quran & Islamic Studies', percent: 90, color: '#10B981' },
    { title: 'Programming', percent: 70, color: '#00C8FF' },
    { title: 'English', percent: 60, color: '#A855F7' },
    { title: 'Water Resources Eng.', percent: 65, color: '#06B6D4' },
  ],
  className = '',
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <DashboardCard
      title="Learning Progress"
      icon={BookOpen}
      actionText="View Details"
      actionLink="/student/courses"
      className={className}
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Circular Progress Ring */}
        <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-[#101735] dark:stroke-[#101735] light:stroke-gray-100"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="url(#cyanGradient)"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8CEBFF" />
                <stop offset="100%" stopColor="#00C8FF" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Percentage Display */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white dark:text-white light:text-gray-900 tracking-tight">
              {overallPercent}%
            </span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Overall Progress
            </span>
          </div>
        </div>

        {/* Course Progress Breakdown List */}
        <div className="flex-1 w-full space-y-3">
          {courses.map((course, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-gray-300 dark:text-gray-300 light:text-gray-700">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <span>{course.title}</span>
                </span>
                <span className="font-bold text-white dark:text-white light:text-gray-900">
                  {course.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-[#101735] dark:bg-[#101735] light:bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${course.percent}%`,
                    backgroundColor: course.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
