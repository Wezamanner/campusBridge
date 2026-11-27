import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout.jsx';
import WelcomeBanner from '../../components/dashboard/WelcomeBanner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { adminService, reportsService } from '../../services/phase11.js';
import { 
  Users, 
  ShieldCheck, 
  Sliders, 
  Megaphone, 
  UserPlus, 
  Activity,
  CheckCircle2,
  Edit3,
  Search,
  Filter,
  Download,
  X,
  Save,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

const ADMIN_PATH_TO_SECTION = {
  '/admin/reports':       'section-reports',
  '/admin/users':         'section-users',
  '/admin/settings':      'section-settings',
  '/admin/announcements': 'section-announcements',
  '/admin/content':       'section-content',
};

export default function AdminDashboard() {
  const location = useLocation();

  const sectionRefs = {
    'section-reports':       useRef(null),
    'section-users':         useRef(null),
    'section-settings':      useRef(null),
    'section-announcements': useRef(null),
    'section-content':       useRef(null),
  };

  useEffect(() => {
    const targetId = ADMIN_PATH_TO_SECTION[location.pathname];
    if (!targetId) return;
    const timer = setTimeout(() => {
      const el = sectionRefs[targetId]?.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [pagination, setPagination] = useState({});
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);
  
  // Reports state
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Settings & Registration state (UC-A03, FR-24)
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState(null);

  // Announcements state (UC-A03, UC-A04, FR-24, FR-46)
  const [announcements, setAnnouncements] = useState([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [announcementAudience, setAnnouncementAudience] = useState('both');
  const [announcementEndsAt, setAnnouncementEndsAt] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementFeedback, setAnnouncementFeedback] = useState(null);

  // Announcement edit/delete/preview state (FR-47)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null); // announcement object
  const [editAnnMsg, setEditAnnMsg]           = useState('');
  const [editAnnAudience, setEditAnnAudience] = useState('both');
  const [editAnnEndsAt, setEditAnnEndsAt]     = useState('');
  const [editAnnPublished, setEditAnnPublished] = useState(true);
  const [editAnnLoading, setEditAnnLoading]   = useState(false);
  const [editAnnError, setEditAnnError]       = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // announcement _id to delete
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [previewData, setPreviewData]         = useState(null); // preview object
  const [previewLoading, setPreviewLoading]   = useState(false);

  // Staff creation state (UC-A02)
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'instructor', password: '', department: '' });
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null);
  const [staffSuccess, setStaffSuccess] = useState(null);

  // Public website content state (UC-A04, FR-47)
  const [publicContent, setPublicContent] = useState({
    heroTitle: 'Bridging Academic Ambition with Real-World Industry',
    heroSubtitle: 'Discover university courses, industry-grade projects, and verified career internships.',
    aboutText: 'CampusBridge connects students, faculty, and corporate recruiters in one unified platform.',
  });
  const [contentLoading, setContentLoading] = useState(false);
  const [contentMsg, setContentMsg] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const params = {
        page: currentPage,
        limit: 10,
        ...(roleFilter && { role: roleFilter }),
        ...(activeFilter !== '' && { active: activeFilter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const res = await adminService.listUsers(params);
      if (res.success) {
        setUsers(res.data || []);
        setPagination(res.pagination || {});
      }
    } catch (err) {
      setUsersError(err.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSettingsAndAnnouncements = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        adminService.getSettings().catch(() => null),
        adminService.getAnnouncements().catch(() => null),
      ]);
      if (sRes?.success && sRes.data) {
        setRegistrationOpen(sRes.data.registrationOpen !== false);
        if (sRes.data.publicContent) {
          setPublicContent({
            heroTitle: sRes.data.publicContent.heroTitle || 'Bridging Academic Ambition with Real-World Industry',
            heroSubtitle: sRes.data.publicContent.heroSubtitle || 'Discover university courses, industry-grade projects, and verified career internships.',
            aboutText: sRes.data.publicContent.aboutText || 'CampusBridge connects students, faculty, and corporate recruiters in one unified platform.',
          });
        }
      }
      if (aRes?.success && aRes.data) {
        setAnnouncements(aRes.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchSettingsAndAnnouncements();
  }, []);

  const handleToggleRegistration = async () => {
    try {
      setSettingsLoading(true);
      setSettingsMsg(null);
      const nextVal = !registrationOpen;
      const res = await adminService.updateSettings({ registrationOpen: nextVal });
      if (res.success) {
        setRegistrationOpen(nextVal);
        setSettingsMsg(`Student self-registration is now ${nextVal ? 'OPEN' : 'CLOSED'}.`);
        setTimeout(() => setSettingsMsg(null), 3000);
      }
    } catch (err) {
      setSettingsMsg('Failed to update registration setting.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementMsg.trim() || !announcementEndsAt) {
      setAnnouncementFeedback({ type: 'error', text: 'Message and expiry date are required.' });
      return;
    }
    try {
      setAnnouncementLoading(true);
      setAnnouncementFeedback(null);
      const res = await adminService.createAnnouncement({
        message: announcementMsg,
        audience: announcementAudience,
        endsAt: new Date(announcementEndsAt).toISOString(),
        published: true,
      });
      if (res.success) {
        setAnnouncementFeedback({ type: 'success', text: 'Announcement published successfully!' });
        setAnnouncementMsg('');
        setAnnouncementEndsAt('');
        fetchSettingsAndAnnouncements();
        setTimeout(() => setAnnouncementFeedback(null), 3000);
      }
    } catch (err) {
      setAnnouncementFeedback({ type: 'error', text: err.message || 'Failed to publish announcement.' });
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // ── Preview (FR-47) ──────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!announcementMsg.trim()) {
      setAnnouncementFeedback({ type: 'error', text: 'Message is required before previewing.' });
      return;
    }
    if (!announcementEndsAt) {
      setAnnouncementFeedback({ type: 'error', text: 'Expiry date is required before previewing.' });
      return;
    }
    try {
      setPreviewLoading(true);
      setAnnouncementFeedback(null);
      const res = await adminService.previewAnnouncement({
        message: announcementMsg,
        audience: announcementAudience,
        endsAt: new Date(announcementEndsAt).toISOString(),
        published: true,
      });
      if (res.success) setPreviewData(res.data);
    } catch (err) {
      setAnnouncementFeedback({ type: 'error', text: err.message || 'Preview failed.' });
    } finally { setPreviewLoading(false); }
  };

  // ── Open edit modal prepopulated ─────────────────────────────────────────
  const openEditAnnouncement = (a) => {
    setEditingAnnouncement(a);
    setEditAnnMsg(a.message || '');
    setEditAnnAudience(a.audience || 'both');
    setEditAnnEndsAt(a.endsAt ? a.endsAt.slice(0, 10) : '');
    setEditAnnPublished(a.published !== false);
    setEditAnnError(null);
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    if (!editAnnMsg.trim() || !editAnnEndsAt) {
      setEditAnnError('Message and expiry date are required.');
      return;
    }
    try {
      setEditAnnLoading(true); setEditAnnError(null);
      const res = await adminService.updateAnnouncement(editingAnnouncement._id, {
        message:   editAnnMsg.trim(),
        audience:  editAnnAudience,
        endsAt:    new Date(editAnnEndsAt).toISOString(),
        published: editAnnPublished,
      });
      if (res.success) {
        setEditingAnnouncement(null);
        fetchSettingsAndAnnouncements();
        setAnnouncementFeedback({ type: 'success', text: 'Announcement updated successfully.' });
        setTimeout(() => setAnnouncementFeedback(null), 3000);
      } else throw new Error(res.message || 'Update failed.');
    } catch (err) { setEditAnnError(err.message); }
    finally { setEditAnnLoading(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDeleteAnnouncement = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleteLoading(true);
      const res = await adminService.deleteAnnouncement(confirmDeleteId);
      if (res.success) {
        setConfirmDeleteId(null);
        fetchSettingsAndAnnouncements();
        setAnnouncementFeedback({ type: 'success', text: 'Announcement deleted.' });
        setTimeout(() => setAnnouncementFeedback(null), 3000);
      }
    } catch (err) {
      setAnnouncementFeedback({ type: 'error', text: err.message || 'Delete failed.' });
      setConfirmDeleteId(null);
    } finally { setDeleteLoading(false); }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setStaffLoading(true);
      setStaffError(null);
      setStaffSuccess(null);
      const res = await adminService.createStaffUser({
        name: staffForm.name,
        email: staffForm.email,
        role: staffForm.role,
        passwordHash: staffForm.password,
        department: staffForm.department,
      });
      if (res.success) {
        setStaffSuccess(`Staff account created for ${res.data.name}!`);
        setStaffForm({ name: '', email: '', role: 'instructor', password: '', department: '' });
        fetchUsers();
        setTimeout(() => {
          setShowStaffModal(false);
          setStaffSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setStaffError(err.message || 'Failed to create staff account.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSavePublicContent = async (e) => {
    e.preventDefault();
    try {
      setContentLoading(true);
      setContentMsg(null);
      const res = await adminService.updatePublicContent(publicContent);
      if (res.success) {
        setContentMsg('Public website content saved and published!');
        setTimeout(() => setContentMsg(null), 3000);
      }
    } catch (err) {
      setContentMsg(err.message || 'Failed to update public content.');
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [roleFilter, activeFilter, searchTerm, currentPage]);

  // Open edit modal
  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      active: user.active !== undefined ? user.active : true,
      department: user.department || '',
      program: user.program || '',
      year: user.year || 1,
    });
    setEditError(null);
    setEditSuccess(false);
  };

  // Submit user update
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setEditLoading(true);
      setEditError(null);
      setEditSuccess(false);
      
      const updates = {};
      if (editForm.name !== editingUser.name) updates.name = editForm.name;
      if (editForm.email !== editingUser.email) updates.email = editForm.email;
      if (editForm.role !== editingUser.role) updates.role = editForm.role;
      if (editForm.active !== editingUser.active) updates.active = editForm.active;
      if (editForm.role === 'instructor' && editForm.department !== editingUser.department) {
        updates.department = editForm.department;
      }
      if (editForm.role === 'student') {
        if (editForm.program !== editingUser.program) updates.program = editForm.program;
        if (editForm.year !== editingUser.year) updates.year = editForm.year;
      }

      if (Object.keys(updates).length === 0) {
        setEditError('No changes detected.');
        setEditLoading(false);
        return;
      }

      const res = await adminService.updateUser(editingUser._id, updates);
      if (res.success) {
        setEditSuccess(true);
        setTimeout(() => {
          setEditingUser(null);
          setEditSuccess(false);
          fetchUsers(); // Refresh list
        }, 1500);
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update user.');
    } finally {
      setEditLoading(false);
    }
  };

  // Download progress report
  const handleDownloadProgressReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError(null);
      await reportsService.downloadProgressReport();
    } catch (err) {
      setReportError(err.message || 'Failed to download progress report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Download applications report
  const handleDownloadApplicationsReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError(null);
      await reportsService.downloadApplicationsReport();
    } catch (err) {
      setReportError(err.message || 'Failed to download applications report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Download user directory report (UC-A05, FR-18, FR-26)
  const handleDownloadUsersReport = async () => {
    try {
      setDownloadingReport(true);
      setReportError(null);
      await reportsService.downloadUsersReport();
    } catch (err) {
      setReportError(err.message || 'Failed to download user directory report.');
    } finally {
      setDownloadingReport(false);
    }
  };

  const USER_COLUMNS = [
    { header: 'User Name', accessor: 'name' },
    { header: 'Email Address', accessor: 'email' },
    {
      header: 'Role',
      accessor: 'role',
      render: (role) => {
        const variants = {
          student: 'cyan',
          instructor: 'success',
          coordinator: 'warning',
          admin: 'purple',
        };
        return <Badge variant={variants[role] || 'neutral'} size="sm">{role}</Badge>;
      },
    },
    {
      header: 'Account Status',
      accessor: 'active',
      render: (active) => (
        <span className={`text-xs font-semibold flex items-center gap-1 ${
          active ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {active ? 'Active' : 'Deactivated'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (_, user) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEditUser(user);
          }}
          className="text-xs font-semibold text-[#00C8FF] hover:underline cursor-pointer flex items-center gap-1"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit User
        </button>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="&ldquo;Security, reliability, and precision at university scale.&rdquo;"
          tags={[
            { label: 'Super Administrator', icon: ShieldCheck },
            { label: 'Security & Access', icon: Sliders },
            { label: 'System Health', icon: Activity },
          ]}
        />

        {/* 4 Admin Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Accounts"
            value={pagination.total || '0'}
            trend={`${users.filter(u => u.active).length} active`}
            accentColor="#00C8FF"
            sparklineData={[300, 315, 320, 335, 340, 348, 354]}
          />
          <StatCard
            icon={ShieldCheck}
            label="Staff Members"
            value={users.filter(u => ['instructor', 'coordinator', 'admin'].includes(u.role)).length}
            trend="Active faculty"
            accentColor="#A855F7"
            sparklineData={[24, 25, 25, 26, 26, 27, 28]}
          />
          <StatCard
            icon={Download}
            label="Reports"
            value="2"
            trend="CSV exports"
            accentColor="#10B981"
            sparklineData={[1, 1, 1, 2, 2, 1, 1]}
          />
          <StatCard
            icon={Activity}
            label="System Health"
            value="100%"
            trend="DB Connected"
            accentColor="#00C8FF"
            sparklineData={[99, 100, 100, 99, 100, 100, 100]}
          />
        </div>

        {/* Reports Section — id: section-reports */}
        <div ref={sectionRefs['section-reports']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="System Reports & Analytics"
          subtitle="Export CSV reports for progress tracking and applications monitoring"
          icon={Download}
        >
          <div className="space-y-3">
            {reportError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{reportError}</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-2">
                <h4 className="font-semibold text-white text-sm">Student Progress Report</h4>
                <p className="text-xs text-gray-400">Export enrollment progress, submission counts, and scores</p>
                <Button
                  size="sm"
                  onClick={handleDownloadProgressReport}
                  disabled={downloadingReport}
                  className="w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {downloadingReport ? 'Downloading...' : 'Download Progress CSV'}
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-2">
                <h4 className="font-semibold text-white text-sm">Applications Report</h4>
                <p className="text-xs text-gray-400">Export internship applications with status and details</p>
                <Button
                  size="sm"
                  onClick={handleDownloadApplicationsReport}
                  disabled={downloadingReport}
                  className="w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {downloadingReport ? 'Downloading...' : 'Download Applications CSV'}
                </Button>
              </div>
              <div className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-2">
                <h4 className="font-semibold text-white text-sm">User Directory Report</h4>
                <p className="text-xs text-gray-400">Export system user accounts, roles, and status (UC-A05)</p>
                <Button
                  size="sm"
                  onClick={handleDownloadUsersReport}
                  disabled={downloadingReport}
                  className="w-full"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {downloadingReport ? 'Downloading...' : 'Download Users CSV'}
                </Button>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Users Management Table — id: section-users */}
        </div>{/* end section-reports */}
        <div ref={sectionRefs['section-users']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="User Accounts & Provisioning"
          subtitle="Manage student, instructor, and coordinator credentials, roles, and status"
          icon={Users}
        >
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              onClick={() => {
                setStaffError(null);
                setStaffSuccess(null);
                setShowStaffModal(true);
              }}
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Provision Staff Account
            </Button>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="coordinator">Coordinator</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
            >
              <option value="">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Deactivated Only</option>
            </select>
          </div>

          {usersError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{usersError}</span>
            </div>
          )}

          {usersLoading ? (
            <LoadingState count={5} />
          ) : users.length === 0 ? (
            <EmptyState
              title="No Users Found"
              description="No users match your current filters."
            />
          ) : (
            <>
              <DataTable
                columns={USER_COLUMNS}
                data={users}
                emptyTitle="No Users Found"
                emptyMessage="There are currently no users registered in the system."
              />
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Page {pagination.currentPage} of {pagination.totalPages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashboardCard>

        {/* Platform Settings & Self-Registration — id: section-settings */}
        </div>{/* end section-users */}
        <div ref={sectionRefs['section-settings']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Platform Settings & Registration Control"
          subtitle="Configure system-wide student self-registration availability (FR-24, UC-A03)"
          icon={Sliders}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] gap-4">
            <div>
              <h4 className="font-semibold text-white text-sm">Student Self-Registration</h4>
              <p className="text-xs text-gray-400 mt-1">
                When enabled, new students can register via the public portal. When disabled, public registration is blocked and hidden.
              </p>
              {settingsMsg && (
                <p className="text-xs font-semibold text-emerald-400 mt-2">{settingsMsg}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                registrationOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {registrationOpen ? 'OPEN' : 'CLOSED'}
              </span>
              <Button
                size="sm"
                variant={registrationOpen ? 'danger' : 'primary'}
                onClick={handleToggleRegistration}
                disabled={settingsLoading}
              >
                {settingsLoading ? 'Updating...' : (registrationOpen ? 'Turn Off Registration' : 'Turn On Registration')}
              </Button>
            </div>
          </div>
        </DashboardCard>

        {/* Announcements Management — id: section-announcements */}
        </div>{/* end section-settings */}
        <div ref={sectionRefs['section-announcements']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Campus Announcements"
          subtitle="Publish global notices to students, instructors, and public visitors (FR-24, UC-A03, UC-A04)"
          icon={Megaphone}
        >
          <div className="space-y-4">
            <form onSubmit={handleCreateAnnouncement} className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-3">
              <h4 className="font-semibold text-white text-sm">Publish New Announcement</h4>
              {announcementFeedback && (
                <div className={`p-2.5 rounded-lg text-xs font-medium ${
                  announcementFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  {announcementFeedback.text}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Message (max 200 chars)</label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Enter system announcement..."
                  value={announcementMsg}
                  onChange={(e) => setAnnouncementMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Target Audience</label>
                  <select
                    value={announcementAudience}
                    onChange={(e) => setAnnouncementAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  >
                    <option value="both">Both (Public Portal & Dashboards)</option>
                    <option value="dashboard">Authenticated Dashboards Only</option>
                    <option value="public">Public Visitors Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">End / Expiry Date</label>
                  <input
                    type="date"
                    value={announcementEndsAt}
                    onChange={(e) => setAnnouncementEndsAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={announcementLoading}>
                  <Megaphone className="w-3.5 h-3.5 mr-1.5" />
                  {announcementLoading ? 'Publishing...' : 'Publish Announcement'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={previewLoading}
                  onClick={handlePreview}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  {previewLoading ? 'Loading...' : 'Preview'}
                </Button>
              </div>
              {previewData && (
                <div className="mt-3 p-3 rounded-xl bg-[#101735] border border-[#00C8FF]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00C8FF] uppercase tracking-wider">Preview</span>
                    <button onClick={() => setPreviewData(null)} className="text-gray-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-white font-medium">{previewData.message}</p>
                  <p className="text-xs text-gray-400">
                    Audience: <span className="text-[#00C8FF]">{previewData.audience}</span>
                    {previewData.endsAt && (
                      <> · Expires: {new Date(previewData.endsAt).toLocaleDateString()}</>
                    )}
                  </p>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Draft Preview — not published
                  </span>
                </div>
              )}
            </form>

            {/* List Announcements */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Published Announcements</h5>
              {announcements.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No announcements currently published.</p>
              ) : (
                <div className="divide-y divide-[#1C2948]">
                  {announcements.map((a) => (
                    <div key={a._id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{a.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Audience: <span className="text-[#00C8FF]">{a.audience}</span> · Expires: {new Date(a.endsAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={a.published ? 'success' : 'neutral'} size="sm">
                          {a.published ? 'Published' : 'Draft'}
                        </Badge>
                        <button
                          onClick={() => openEditAnnouncement(a)}
                          className="p-1.5 rounded-lg hover:bg-[#00C8FF]/10 text-gray-400 hover:text-[#00C8FF] transition-colors"
                          title="Edit announcement"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(a._id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DashboardCard>
        </div>{/* end section-announcements */}

        {/* Public Website Content — id: section-content */}
        <div ref={sectionRefs['section-content']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Public Website Content Management"
          subtitle="Configure marketing text blocks on the public landing page (FR-46, FR-47, UC-A04)"
          icon={Sliders}
        >
          <form onSubmit={handleSavePublicContent} className="space-y-3 p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948]">
            {contentMsg && (
              <p className="text-xs font-semibold text-emerald-400">{contentMsg}</p>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Hero Title</label>
              <input
                type="text"
                value={publicContent.heroTitle}
                onChange={(e) => setPublicContent({ ...publicContent, heroTitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Hero Subtitle</label>
              <textarea
                rows={2}
                value={publicContent.heroSubtitle}
                onChange={(e) => setPublicContent({ ...publicContent, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">About Section Text</label>
              <textarea
                rows={3}
                value={publicContent.aboutText}
                onChange={(e) => setPublicContent({ ...publicContent, aboutText: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
              />
            </div>
            <Button type="submit" size="sm" disabled={contentLoading}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {contentLoading ? 'Saving...' : 'Save and Publish Content'}
            </Button>
          </form>
        </DashboardCard>
        </div>{/* end section-content */}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1C2948] rounded-2xl border border-[#00C8FF]/30 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#1C2948] flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Edit User Account</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg hover:bg-[#101735]/60 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="p-4 sm:p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              {editSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>User updated successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {editForm.role === 'instructor' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>
              )}

              {editForm.role === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Program</label>
                    <input
                      type="text"
                      value={editForm.program}
                      onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Year</label>
                    <select
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: parseInt(e.target.value, 10) })}
                      className="w-full px-4 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                    >
                      {[1, 2, 3, 4, 5, 6].map(y => (
                        <option key={y} value={y}>Year {y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="w-4 h-4 rounded border-[#1C2948] bg-[#101735] text-[#00C8FF] focus:ring-[#00C8FF]"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-300">
                  Account Active
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={editLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading || editSuccess}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Staff Provisioning Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-[#1C2948] shadow-2xl">
            <button
              onClick={() => setShowStaffModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Provision Staff Account</h3>
            <p className="text-xs text-gray-400 mb-4">Create faculty or coordinator account (UC-A02)</p>

            {staffSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                {staffSuccess}
              </div>
            )}
            {staffError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                {staffError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Staff Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                >
                  <option value="instructor">Instructor</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>
              {staffForm.role === 'instructor' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Initial Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowStaffModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={staffLoading} className="flex-1">
                  {staffLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal (FR-47) */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1C2948] rounded-2xl border border-[#00C8FF]/30 shadow-2xl max-w-md w-full">
            <div className="p-5 border-b border-[#1C2948] flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Announcement</h3>
              <button
                onClick={() => setEditingAnnouncement(null)}
                className="p-1 rounded-lg hover:bg-[#101735]/60 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAnnouncement} className="p-5 space-y-3">
              {editAnnError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {editAnnError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Message (max 200 chars)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={editAnnMsg}
                  onChange={(e) => setEditAnnMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Audience</label>
                  <select
                    value={editAnnAudience}
                    onChange={(e) => setEditAnnAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  >
                    <option value="both">Both</option>
                    <option value="dashboard">Dashboards Only</option>
                    <option value="public">Public Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={editAnnEndsAt}
                    onChange={(e) => setEditAnnEndsAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditAnnPublished(!editAnnPublished)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${editAnnPublished ? 'bg-emerald-500' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editAnnPublished ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs font-medium text-gray-300">
                  {editAnnPublished ? 'Published' : 'Draft (unpublished)'}
                </span>
              </div>
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingAnnouncement(null)}
                  disabled={editAnnLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={editAnnLoading} className="flex-1">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {editAnnLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Announcement Confirmation (FR-47) */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1C2948] rounded-2xl border border-rose-500/30 shadow-2xl max-w-sm w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Announcement</h3>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Are you sure you want to permanently delete this announcement?
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleteLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeleteAnnouncement}
                disabled={deleteLoading}
                className="flex-1"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
