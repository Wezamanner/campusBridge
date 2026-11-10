import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { 
  BookOpen, 
  CheckSquare, 
  Users, 
  AlertTriangle, 
  GraduationCap, 
  FileCheck2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api.js';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await api.get('/courses');
        if (res.success && Array.isArray(res.data)) {
          setCourses(res.data);
        }
      } catch (err) {
        console.error('Failed to load instructor courses for dashboard:', err);
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  const totalAssigned = courses.length;
  const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrolledStudentsCount || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="“Teaching is the greatest act of optimism.”"
          tags={[
            { label: 'Course Lead', icon: BookOpen },
            { label: 'Evaluation Queue', icon: FileCheck2 },
            { label: 'Mentor', icon: GraduationCap },
          ]}
        />

        {/* 4 Instructor Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Assigned Courses"
            value={loadingCourses ? '...' : String(totalAssigned)}
            trend={totalAssigned > 0 ? `${totalAssigned} active portfolio` : '0 assigned'}
            accentColor="#00C8FF"
            sparklineData={[1, 2, 2, 3, 3, 4, Math.max(totalAssigned, 1)]}
          />
          <StatCard
            icon={CheckSquare}
            label="Submissions to Grade"
            value="Phase 8"
            trend="Grading Queue"
            accentColor="#F59E0B"
            sparklineData={[0, 0, 0, 0, 0, 0, 0]}
          />
          <StatCard
            icon={Users}
            label="Enrolled Students"
            value={loadingCourses ? '...' : String(totalEnrolled)}
            trend={totalEnrolled > 0 ? `${totalEnrolled} total roster` : '0 enrolled'}
            accentColor="#10B981"
            sparklineData={[0, 10, 25, 40, 60, 90, Math.max(totalEnrolled, 1)]}
          />
          <StatCard
            icon={AlertTriangle}
            label="At-Risk Students"
            value="Phase 10"
            trend="Monitoring Queue"
            accentColor="#F43F5E"
            sparklineData={[0, 0, 0, 0, 0, 0, 0]}
          />
        </div>

        {/* Assigned Courses Portfolio Card */}
        <DashboardCard
          title="My Teaching Courses"
          subtitle="Courses assigned to you for teaching and instruction"
          icon={BookOpen}
          actionText="View All Courses"
          actionLink="/instructor/courses"
        >
          {loadingCourses ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-300">No Courses Assigned Yet</p>
              <p className="text-xs text-gray-400">Academic Coordinators assign courses to instructors.</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.slice(0, 3).map((course) => (
                <Link
                  key={course.id}
                  to={`/instructor/courses/${course.id}`}
                  className="p-4 rounded-xl border border-[#1C2948] hover:border-[#00C8FF]/50 bg-[#101735]/60 hover:bg-[#101735] transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#00C8FF]/15 text-[#00C8FF]">
                        {course.code}
                      </span>
                      <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {course.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm text-white group-hover:text-[#00C8FF] transition-colors truncate">
                      {course.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#1C2948]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#00C8FF]" />
                      <span>{course.enrolledStudentsCount || 0} enrolled</span>
                    </span>
                    <span className="text-[#00C8FF] font-semibold group-hover:translate-x-0.5 transform transition-transform">
                      Workspace &rarr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
