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
import { coordinatorService, reportsService } from '../../services/phase11.js';
import { 
  Briefcase, 
  Building2, 
  FileText, 
  BookOpen, 
  FileSpreadsheet, 
  Users,
  CheckCircle2,
  Search,
  Download,
  AlertCircle,
  Clock,
  Plus,
  Send,
  XCircle,
  Eye,
  X
} from 'lucide-react';

// Map URL pathname → section ref id
const PATH_TO_SECTION = {
  '/coordinator/companies':    'section-companies',
  '/coordinator/internships':  'section-internships',
  '/coordinator/applications': 'section-applications',
  '/coordinator/reports':      'section-reports',
};

export default function CoordinatorDashboard() {
  const location = useLocation();

  // Section refs for URL-driven scroll
  const sectionRefs = {
    'section-companies':    useRef(null),
    'section-internships':  useRef(null),
    'section-applications': useRef(null),
    'section-reports':      useRef(null),
  };

  // Scroll to the section indicated by the current pathname
  useEffect(() => {
    const targetId = PATH_TO_SECTION[location.pathname];
    if (!targetId) return;
    // Wait for DOM paint before scrolling
    const timer = setTimeout(() => {
      const el = sectionRefs[targetId]?.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Live course and internship counts
  const [courseCount, setCourseCount] = useState(null);
  const [internshipCount, setInternshipCount] = useState(null);

  // Organizations state
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState(null);
  const [orgsPagination, setOrgsPagination] = useState({});
  
  // Organization filters
  const [approvedFilter, setApprovedFilter] = useState('');
  const [orgSearchTerm, setOrgSearchTerm] = useState('');
  const [orgsCurrentPage, setOrgsCurrentPage] = useState(1);
  
  // Approval state
  const [approvingOrgId, setApprovingOrgId] = useState(null);
  const [approveError, setApproveError] = useState(null);
  const [approveSuccess, setApproveSuccess] = useState(null);
  
  // Reports state
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState(null);

  // Applications state (UC-C05, UC-C06, UC-C07)
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState(null);
  const [appsPagination, setAppsPagination] = useState({});
  const [appStatusFilter, setAppStatusFilter] = useState('');
  const [appsCurrentPage, setAppsCurrentPage] = useState(1);

  // Forwarding modal state (UC-C06)
  const [forwardingApp, setForwardingApp] = useState(null);
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardError, setForwardError] = useState(null);
  const [forwardSuccess, setForwardSuccess] = useState(null);

  // Decision modal state (UC-C07)
  const [decisionApp, setDecisionApp] = useState(null);
  const [decisionType, setDecisionType] = useState('Accepted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionSuccess, setDecisionSuccess] = useState(null);

  // Internship creation modal state (UC-C03)
  const [showCreateInternship, setShowCreateInternship] = useState(false);
  const [internshipForm, setInternshipForm] = useState({
    companyId: '',
    title: '',
    type: 'Remote',
    skills: '',
    description: '',
    requirements: '',
    location: '',
    deadline: '',
  });
  const [createInternshipLoading, setCreateInternshipLoading] = useState(false);
  const [createInternshipError, setCreateInternshipError] = useState(null);
  const [createInternshipSuccess, setCreateInternshipSuccess] = useState(null);

  // View forwarded applications modal state (Section 12.3)
  const [forwardedListModal, setForwardedListModal] = useState(null);
  const [forwardedApps, setForwardedApps] = useState([]);
  const [forwardedLoading, setForwardedLoading] = useState(false);

  // Fetch organizations
  const fetchOrganizations = async () => {
    try {
      setOrgsLoading(true);
      setOrgsError(null);
      const params = {
        page: orgsCurrentPage,
        limit: 10,
        ...(approvedFilter !== '' && { approved: approvedFilter }),
        ...(orgSearchTerm && { search: orgSearchTerm }),
      };
      const res = await coordinatorService.listOrganizations(params);
      if (res.success) {
        setOrganizations(res.data || []);
        setOrgsPagination(res.pagination || {});
      }
    } catch (err) {
      setOrgsError(err.message || 'Failed to load organizations.');
      setOrganizations([]);
    } finally {
      setOrgsLoading(false);
    }
  };

  // Fetch applications (UC-C05)
  const fetchApplications = async () => {
    try {
      setAppsLoading(true);
      setAppsError(null);
      const params = {
        page: appsCurrentPage,
        limit: 10,
        ...(appStatusFilter && { status: appStatusFilter }),
      };
      const res = await coordinatorService.listAllApplications(params);
      if (res.success) {
        setApplications(res.data || []);
        setAppsPagination(res.pagination || {});
      }
    } catch (err) {
      setAppsError(err.message || 'Failed to load applications.');
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  };

  // Fetch live counts for stat cards on mount
  useEffect(() => {
    // Active courses count
    import('../../services/api.js').then(({ api }) => {
      api.get('/coordinator/courses').then(res => {
        if (res.success) setCourseCount((res.data || []).filter(c => c.status === 'active').length);
      }).catch(() => {});
      // Open internships count
      api.get('/coordinator/internships').then(res => {
        if (res.success) setInternshipCount((res.data || []).filter(i => i.status === 'open').length);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganizations();
    }, 300);
    return () => clearTimeout(timer);
  }, [approvedFilter, orgSearchTerm, orgsCurrentPage]);

  useEffect(() => {
    fetchApplications();
  }, [appStatusFilter, appsCurrentPage]);

  // Handle Forward Application (UC-C06)
  const handleForwardApplication = async (e) => {
    e.preventDefault();
    if (!forwardingApp) return;
    try {
      setForwardLoading(true);
      setForwardError(null);
      setForwardSuccess(null);
      const res = await coordinatorService.forwardApplication(forwardingApp._id, forwardNotes);
      if (res.success) {
        setForwardSuccess('Application forwarded to employer successfully!');
        fetchApplications();
        setTimeout(() => {
          setForwardingApp(null);
          setForwardNotes('');
          setForwardSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setForwardError(err.message || 'Failed to forward application.');
    } finally {
      setForwardLoading(false);
    }
  };

  // Handle Record Decision (UC-C07)
  const handleRecordDecision = async (e) => {
    e.preventDefault();
    if (!decisionApp) return;
    try {
      setDecisionLoading(true);
      setDecisionError(null);
      setDecisionSuccess(null);
      const res = await coordinatorService.recordCompanyDecision(decisionApp._id, decisionType, decisionNotes);
      if (res.success) {
        setDecisionSuccess(`Company decision recorded as '${decisionType}'!`);
        fetchApplications();
        setTimeout(() => {
          setDecisionApp(null);
          setDecisionNotes('');
          setDecisionSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setDecisionError(err.message || 'Failed to record company decision.');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Handle Create Internship (UC-C03)
  const handleCreateInternship = async (e) => {
    e.preventDefault();
    if (!internshipForm.companyId || !internshipForm.title || !internshipForm.deadline) {
      setCreateInternshipError('Company, title, and future deadline are required.');
      return;
    }
    try {
      setCreateInternshipLoading(true);
      setCreateInternshipError(null);
      setCreateInternshipSuccess(null);
      const skillsArray = typeof internshipForm.skills === 'string'
        ? internshipForm.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await coordinatorService.createInternship({
        ...internshipForm,
        skills: skillsArray,
        requirements: internshipForm.requirements ? [internshipForm.requirements] : [],
      });
      if (res.success) {
        setCreateInternshipSuccess('Internship posted successfully!');
        setInternshipForm({
          companyId: '',
          title: '',
          type: 'Remote',
          skills: '',
          description: '',
          requirements: '',
          location: '',
          deadline: '',
        });
        setTimeout(() => {
          setShowCreateInternship(false);
          setCreateInternshipSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setCreateInternshipError(err.message || 'Failed to create internship.');
    } finally {
      setCreateInternshipLoading(false);
    }
  };

  // Handle View Forwarded Applications (Section 12.3)
  const handleViewForwarded = async (internshipId, internshipTitle) => {
    try {
      setForwardedLoading(true);
      setForwardedListModal({ internshipId, title: internshipTitle });
      const res = await coordinatorService.getForwardedApplications(internshipId);
      if (res.success) {
        setForwardedApps(res.data || []);
      }
    } catch {
      setForwardedApps([]);
    } finally {
      setForwardedLoading(false);
    }
  };

  // Approve organization
  const handleApproveOrganization = async (orgId) => {
    try {
      setApprovingOrgId(orgId);
      setApproveError(null);
      setApproveSuccess(null);
      const res = await coordinatorService.approveOrganization(orgId);
      if (res.success) {
        setApproveSuccess(res.data.alreadyApproved 
          ? 'Organization was already approved.'
          : 'Organization approved successfully!');
        fetchOrganizations(); // Refresh list
        setTimeout(() => setApproveSuccess(null), 3000);
      }
    } catch (err) {
      setApproveError(err.message || 'Failed to approve organization.');
    } finally {
      setApprovingOrgId(null);
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

  const ORG_COLUMNS = [
    { header: 'Organization Name', accessor: 'name' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Email', accessor: 'contactEmail' },
    {
      header: 'Approval Status',
      accessor: 'approved',
      render: (approved) => (
        <Badge variant={approved ? 'success' : 'warning'} size="sm" dot>
          {approved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (_, org) => {
        if (org.approved) {
          return (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </span>
          );
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleApproveOrganization(org._id);
            }}
            disabled={approvingOrgId === org._id}
            className="text-xs font-semibold text-[#00C8FF] hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approvingOrgId === org._id ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </>
            )}
          </button>
        );
      },
    },
  ];

  const APPLICATION_COLUMNS = [
    {
      header: 'Applicant',
      accessor: 'student',
      render: (_, app) => (
        <div>
          <p className="text-white font-medium text-xs">{app.studentId?.name || 'N/A'}</p>
          <p className="text-gray-400 text-[11px]">{app.studentId?.email || ''}</p>
        </div>
      ),
    },
    {
      header: 'Program',
      accessor: 'program',
      render: (_, app) => (
        <span className="text-xs text-gray-300">
          {app.studentId?.program ? `${app.studentId.program} (Yr ${app.studentId.year || '?'})` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Internship',
      accessor: 'internship',
      render: (_, app) => (
        <div>
          <p className="text-[#00C8FF] text-xs font-medium">{app.internshipId?.title || 'N/A'}</p>
          <p className="text-gray-400 text-[11px]">{app.internshipId?.companyId?.name || ''}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status) => {
        const variants = {
          'Submitted': 'neutral',
          'Under review': 'cyan',
          'Forwarded': 'warning',
          'Accepted': 'success',
          'Rejected': 'danger',
          'Withdrawn': 'neutral',
        };
        return <Badge variant={variants[status] || 'neutral'} size="sm">{status}</Badge>;
      },
    },
    {
      header: 'Applied Date',
      accessor: 'appliedAt',
      render: (appliedAt) => (
        <span className="text-xs text-gray-400">
          {appliedAt ? new Date(appliedAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'actions',
      render: (_, app) => {
        return (
          <div className="flex items-center gap-2">
            {(app.status === 'Submitted' || app.status === 'Under review') && (
              <Button
                size="sm"
                onClick={() => {
                  setForwardingApp(app);
                  setForwardError(null);
                  setForwardSuccess(null);
                  setForwardNotes('');
                }}
              >
                <Send className="w-3 h-3 mr-1" />
                Forward
              </Button>
            )}
            {app.status === 'Forwarded' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDecisionApp(app);
                  setDecisionType('Accepted');
                  setDecisionNotes('');
                  setDecisionError(null);
                  setDecisionSuccess(null);
                }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Record Decision
              </Button>
            )}
            {app.internshipId && (
              <button
                onClick={() => handleViewForwarded(app.internshipId._id || app.internshipId, app.internshipId.title || 'Internship')}
                className="text-xs text-gray-400 hover:text-[#00C8FF] flex items-center gap-1 p-1"
                title="View Forwarded Applications"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <WelcomeBanner
          quote="&ldquo;Bridging university ambition with industry innovation.&rdquo;"
          tags={[
            { label: 'Corporate Relations', icon: Building2 },
            { label: 'Internship Placements', icon: Briefcase },
            { label: 'Curriculum Coordinator', icon: BookOpen },
          ]}
        />

        {/* 4 Coordinator Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Active Courses"
            value={courseCount !== null ? String(courseCount) : '—'}
            trend={courseCount !== null ? 'active courses' : ''}
            accentColor="#00C8FF"
            sparklineData={[1,1,2,2,3,3,Math.max(courseCount||1,1)]}
          />
          <StatCard
            icon={Building2}
            label="Partner Organizations"
            value={organizations.filter(o => o.approved).length}
            trend={`${organizations.filter(o => !o.approved).length} pending`}
            accentColor="#10B981"
            sparklineData={[4, 5, 5, 6, 7, 7, 8]}
          />
          <StatCard
            icon={Briefcase}
            label="Open Internships"
            value={internshipCount !== null ? String(internshipCount) : '—'}
            trend={internshipCount !== null ? 'open positions' : ''}
            accentColor="#8CEBFF"
            sparklineData={[1,1,2,2,3,3,Math.max(internshipCount||1,1)]}
          />
          <StatCard
            icon={Download}
            label="Reports"
            value="2"
            trend="CSV exports"
            accentColor="#F59E0B"
            sparklineData={[12, 15, 18, 20, 22, 21, 24]}
          />
        </div>

        {/* Reports Section — id: section-reports */}
        <div ref={sectionRefs['section-reports']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Coordinator Reports & Analytics"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-2">
                <h4 className="font-semibold text-white text-sm">Student Progress Report</h4>
                <p className="text-xs text-gray-400">Export all student enrollment progress and scores</p>
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
            </div>
          </div>
        </DashboardCard>
        </div>{/* end section-reports */}

        {/* Partner Organizations Management — id: section-companies */}
        <div ref={sectionRefs['section-companies']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Partner Organization Approval Workflow"
          subtitle="Review and approve partner organizations for internship placements"
          icon={Building2}
        >
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={orgSearchTerm}
                onChange={(e) => {
                  setOrgSearchTerm(e.target.value);
                  setOrgsCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
              />
            </div>
            <select
              value={approvedFilter}
              onChange={(e) => {
                setApprovedFilter(e.target.value);
                setOrgsCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
            >
              <option value="">All Organizations</option>
              <option value="false">Pending Approval</option>
              <option value="true">Approved Only</option>
            </select>
          </div>

          {approveSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{approveSuccess}</span>
            </div>
          )}

          {approveError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{approveError}</span>
            </div>
          )}

          {orgsError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{orgsError}</span>
            </div>
          )}

          {orgsLoading ? (
            <LoadingState count={5} />
          ) : organizations.length === 0 ? (
            <EmptyState
              title="No Organizations Found"
              description="No organizations match your current filters."
            />
          ) : (
            <>
              <DataTable
                columns={ORG_COLUMNS}
                data={organizations}
                emptyTitle="No Organizations Found"
                emptyMessage="There are currently no organizations registered."
              />
              {/* Pagination */}
              {orgsPagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Page {orgsPagination.currentPage} of {orgsPagination.totalPages} ({orgsPagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOrgsCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!orgsPagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setOrgsCurrentPage(p => p + 1)}
                      disabled={!orgsPagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashboardCard>
        </div>{/* end section-companies */}

        {/* Internship Posting & Creation (UC-C03) — id: section-internships */}
        <div ref={sectionRefs['section-internships']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Internship Placement Management"
          subtitle="Publish verified corporate internship opportunities for students (UC-C03)"
          icon={Briefcase}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] gap-4">
            <div>
              <h4 className="font-semibold text-white text-sm">Post New Internship Opportunity</h4>
              <p className="text-xs text-gray-400 mt-1">
                Attach approved partner organizations to active placement roles with requirements and deadlines.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setCreateInternshipError(null);
                setCreateInternshipSuccess(null);
                setShowCreateInternship(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Post New Internship
            </Button>
          </div>
        </DashboardCard>
        </div>{/* end section-internships */}

        {/* Student Applications Review & Forwarding — id: section-applications */}
        <div ref={sectionRefs['section-applications']} tabIndex={-1} className="outline-none scroll-mt-20">
        <DashboardCard
          title="Student Applications Review & Forwarding"
          subtitle="Screen student applications, forward qualified candidates to employer, and record hiring decisions"
          icon={FileText}
        >
          {/* Status filter */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Filter Status:</span>
              <select
                value={appStatusFilter}
                onChange={(e) => {
                  setAppStatusFilter(e.target.value);
                  setAppsCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1C2948]/60 border border-[#1C2948] text-white text-xs focus:outline-none focus:border-[#00C8FF]"
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted (Pending Review)</option>
                <option value="Under review">Under Review</option>
                <option value="Forwarded">Forwarded to Employer</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchApplications}
            >
              Refresh Applications
            </Button>
          </div>

          {appsError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{appsError}</span>
            </div>
          )}

          {appsLoading ? (
            <LoadingState count={5} />
          ) : applications.length === 0 ? (
            <EmptyState
              title="No Applications Found"
              description="No student applications match the selected status filter."
            />
          ) : (
            <>
              <DataTable
                columns={APPLICATION_COLUMNS}
                data={applications}
                emptyTitle="No Applications Found"
                emptyMessage="No applications currently submitted."
              />
              {/* Pagination */}
              {appsPagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Page {appsPagination.currentPage} of {appsPagination.totalPages} ({appsPagination.totalCount} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAppsCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!appsPagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAppsCurrentPage(p => p + 1)}
                      disabled={!appsPagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DashboardCard>
        </div>{/* end section-applications */}
      </div>
      {/* Create Internship Modal (UC-C03) */}
      {showCreateInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#0D1424] border border-[#1C2948] shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateInternship(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Post New Internship</h3>
            <p className="text-xs text-gray-400 mb-4">Create verified placement for an approved company (UC-C03)</p>

            {createInternshipSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                {createInternshipSuccess}
              </div>
            )}
            {createInternshipError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                {createInternshipError}
              </div>
            )}

            <form onSubmit={handleCreateInternship} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Partner Organization</label>
                <select
                  required
                  value={internshipForm.companyId}
                  onChange={(e) => setInternshipForm({ ...internshipForm, companyId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                >
                  <option value="">Select Approved Company</option>
                  {organizations.filter(o => o.approved).map(org => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Internship Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Engineer Intern"
                  value={internshipForm.title}
                  onChange={(e) => setInternshipForm({ ...internshipForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Placement Type</label>
                  <select
                    value={internshipForm.type}
                    onChange={(e) => setInternshipForm({ ...internshipForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  >
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    required
                    value={internshipForm.deadline}
                    onChange={(e) => setInternshipForm({ ...internshipForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="JavaScript, React, Node.js"
                  value={internshipForm.skills}
                  onChange={(e) => setInternshipForm({ ...internshipForm, skills: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Internship description..."
                  value={internshipForm.description}
                  onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Key Requirements</label>
                <input
                  type="text"
                  placeholder="e.g. 3rd year standing, knowledge of algorithms"
                  value={internshipForm.requirements}
                  onChange={(e) => setInternshipForm({ ...internshipForm, requirements: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreateInternship(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={createInternshipLoading} className="flex-1">
                  {createInternshipLoading ? 'Posting...' : 'Post Internship'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forward Application Modal (UC-C06) */}
      {forwardingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-[#1C2948] shadow-2xl">
            <button
              onClick={() => setForwardingApp(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Forward Application</h3>
            <p className="text-xs text-gray-400 mb-4">
              Forward <span className="text-[#00C8FF]">{forwardingApp.studentId?.name}</span>'s application to employer (UC-C06)
            </p>

            {forwardSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                {forwardSuccess}
              </div>
            )}
            {forwardError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                {forwardError}
              </div>
            )}

            <form onSubmit={handleForwardApplication} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Coordinator Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Notes for employer review..."
                  value={forwardNotes}
                  onChange={(e) => setForwardNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setForwardingApp(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={forwardLoading} className="flex-1">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {forwardLoading ? 'Forwarding...' : 'Forward to Employer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Decision Modal (UC-C07) */}
      {decisionApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0D1424] border border-[#1C2948] shadow-2xl">
            <button
              onClick={() => setDecisionApp(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Record Company Decision</h3>
            <p className="text-xs text-gray-400 mb-4">
              Record outcome for <span className="text-[#00C8FF]">{decisionApp.studentId?.name}</span> (UC-C07)
            </p>

            {decisionSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                {decisionSuccess}
              </div>
            )}
            {decisionError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                {decisionError}
              </div>
            )}

            <form onSubmit={handleRecordDecision} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Decision Outcome</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                >
                  <option value="Accepted">Accepted by Employer</option>
                  <option value="Rejected">Rejected / Position Filled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Decision Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Feedback or offer details..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setDecisionApp(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={decisionLoading} className="flex-1">
                  {decisionLoading ? 'Recording...' : 'Record Decision'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Forwarded Applications Modal (Section 12.3) */}
      {forwardedListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl p-6 rounded-2xl bg-[#0D1424] border border-[#1C2948] shadow-2xl max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setForwardedListModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Forwarded Applications</h3>
            <p className="text-xs text-gray-400 mb-4">{forwardedListModal.title}</p>

            {forwardedLoading ? (
              <LoadingState count={3} />
            ) : forwardedApps.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No applications currently forwarded for this position.</p>
            ) : (
              <div className="divide-y divide-[#1C2948]">
                {forwardedApps.map(app => (
                  <div key={app._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{app.studentId?.name || 'Student'}</p>
                      <p className="text-xs text-gray-400">{app.studentId?.email} · {app.studentId?.program}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={app.status === 'Accepted' ? 'success' : app.status === 'Rejected' ? 'danger' : 'warning'} size="sm">
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
