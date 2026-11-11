import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { internshipsService } from '../../services/phase11.js';
import {
  FileText,
  Calendar,
  Building2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await internshipsService.myApplications();
      if (res.success) {
        setApplications(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;
    try {
      setWithdrawingId(id);
      await internshipsService.withdrawApplication(id);
      fetchApplications();
    } catch (err) {
      alert(err.message || 'Failed to withdraw application.');
    } finally {
      setWithdrawingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Submitted':
        return <Badge variant="info">Submitted</Badge>;
      case 'Under review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'Forwarded':
        return <Badge variant="primary">Forwarded</Badge>;
      case 'Accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'Rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'Withdrawn':
        return <Badge variant="neutral">Withdrawn</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const canWithdraw = (status) => {
    return status !== 'Accepted' && status !== 'Rejected' && status !== 'Withdrawn';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101735] via-[#141E43] to-[#101735] border border-[#1C2948]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">My Internship Applications</h1>
            </div>
            <p className="text-xs text-gray-400">
              Track the progress, coordinator review stages, and status updates for your submitted applications.
            </p>
          </div>

          <Link
            to="/student/internships"
            className="inline-flex items-center text-xs font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-95 transition-all gap-1.5"
          >
            <span>Browse Internships</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState count={3} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            title="No Applications Submitted"
            description="You have not applied for any internships yet. Explore open postings from industry partners to get started."
            icon={FileText}
            actionText="View Internships"
            onActionClick={() => (window.location.href = '/student/internships')}
          />
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <DashboardCard key={app._id}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-base text-white">
                        {app.internshipId?.title || 'Internship Application'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#00C8FF]" />
                        <span>Applied on: {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}</span>
                      </span>

                      {app.internshipId?.type && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00C8FF]/10 text-[#00C8FF]">
                          {app.internshipId.type}
                        </span>
                      )}
                    </div>

                    {app.message && (
                      <p className="text-xs text-gray-300 italic pt-1 max-w-xl line-clamp-2">
                        "{app.message}"
                      </p>
                    )}
                  </div>

                  {canWithdraw(app.status) && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={XCircle}
                      isLoading={withdrawingId === app._id}
                      onClick={() => handleWithdraw(app._id)}
                    >
                      Withdraw Application
                    </Button>
                  )}
                </div>
              </DashboardCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
