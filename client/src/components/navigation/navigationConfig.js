import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  CheckSquare,
  LineChart,
  MessageSquare,
  Bell,
  Briefcase,
  Users,
  Building2,
  FileText,
  FileSpreadsheet,
  Sliders,
  Megaphone,
  Globe,
  Settings,
  HelpCircle,
} from 'lucide-react';

export const ROLE_NAVIGATION = {
  student: [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/student/projects', icon: FolderKanban },
    { name: 'Learning', path: '/student/courses', icon: BookOpen },
    { name: 'Tasks', path: '/student/tasks', icon: CheckSquare },
    { name: 'Analytics', path: '/student/analytics', icon: LineChart },
    { name: 'Messages', path: '/student/messages', icon: MessageSquare, badge: 3 },
    { name: 'Notifications', path: '/student/notifications', icon: Bell, badge: 2 },
  ],
  instructor: [
    { name: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
    { name: 'My Courses', path: '/instructor/courses', icon: BookOpen },
    { name: 'Grading Queue', path: '/instructor/grading', icon: CheckSquare, badge: 5 },
    { name: 'Students', path: '/instructor/students', icon: Users },
    { name: 'Messages', path: '/instructor/messages', icon: MessageSquare },
    { name: 'Notifications', path: '/instructor/notifications', icon: Bell },
  ],
  coordinator: [
    { name: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard },
    { name: 'Courses', path: '/coordinator/courses', icon: BookOpen },
    { name: 'Companies', path: '/coordinator/companies', icon: Building2 },
    { name: 'Internships', path: '/coordinator/internships', icon: Briefcase },
    { name: 'Applications', path: '/coordinator/applications', icon: FileText, badge: 4 },
    { name: 'Reports', path: '/coordinator/reports', icon: FileSpreadsheet },
    { name: 'Messages', path: '/coordinator/messages', icon: MessageSquare },
    { name: 'Notifications', path: '/coordinator/notifications', icon: Bell },
  ],
  admin: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Settings', path: '/admin/settings', icon: Sliders },
    { name: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    { name: 'Public Site', path: '/admin/content', icon: Globe },
    { name: 'Reports', path: '/admin/reports', icon: FileSpreadsheet },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
  ],
};

export const COMMON_NAVIGATION = [
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Help & Support', path: '/help', icon: HelpCircle },
];
