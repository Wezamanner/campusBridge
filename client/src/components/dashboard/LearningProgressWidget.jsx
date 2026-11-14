import React, { useState, useEffect } from 'react';
import DashboardCard from '../ui/DashboardCard.jsx';
import { BookOpen, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

const COURSE_COLORS = ['#10B981', '#00C8FF', '#A855F7', '#06B6D4', '#F59E0B', '#EF4444'];

export default function LearningProgressWidget({ className = '' }) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/progress')
      .then(res => {
        if (res.success) setProgressData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Derive display values from real data
  const courses = progressData?.courses || [];
  const overallPercent = progressData?.overallPercent ??
    (courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + (c.completionPercent || 0), 0) / courses.length)
      : null);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = overallPercent != null
    ? circumference - (overallPercent / 100) * circumference
    : circumference;

  return (
    <DashboardCard
      title="Learning Progress"
      icon={BookOpen}
      actionText="View Details"
      actionLink="/student/courses"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#00C8FF] animate-spin" />
        </div>
      ) : overallPercent == null ? (
        <div className="py-6 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--cb-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
            Enrol in courses to see your learning progress here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Progress Ring */}
          <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} stroke="var(--cb-border)" strokeWidth="9" fill="transparent" />
              <circle
                cx="50" cy="50" r={radius}
                stroke="url(#cyanGradientLP)"
                strokeWidth="9"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="cyanGradientLP" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8CEBFF" />
                  <stop offset="100%" stopColor="#00C8FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--cb-text)' }}>
                {overallPercent}%
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cb-text-muted)' }}>
                Overall
              </span>
            </div>
          </div>

          {/* Course Breakdown */}
          {courses.length > 0 ? (
            <div className="flex-1 w-full space-y-3">
              {courses.slice(0, 4).map((course, idx) => {
                const pct = course.completionPercent || 0;
                const color = COURSE_COLORS[idx % COURSE_COLORS.length];
                return (
                  <div key={course.courseId || idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center space-x-2" style={{ color: 'var(--cb-text-muted)' }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate max-w-[120px]">{course.courseCode || course.courseTitle || 'Course'}</span>
                      </span>
                      <span className="font-bold" style={{ color: 'var(--cb-text)' }}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cb-border)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--cb-text-muted)' }}>
              Course breakdown will appear once you are enrolled.
            </p>
          )}
        </div>
      )}
    </DashboardCard>
  );
}
