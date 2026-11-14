import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { internshipsService } from '../../services/phase11.js';
import {
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentInternshipsPage() {
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const fetchInternships = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await internshipsService.list({
        search: searchTerm,
        type: typeFilter,
      });
      if (res.success) {
        setInternships(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load internships.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInternships();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, typeFilter]);

  const handleOpenApply = (item) => {
    setSelectedInternship(item);
    setApplicationMessage('');
    setApplySuccess(false);
    setApplyError(null);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!applicationMessage.trim() || applicationMessage.trim().length < 10) {
      setApplyError('Please write a message with at least 10 characters.');
      return;
    }

    try {
      setApplying(true);
      setApplyError(null);
      const res = await internshipsService.apply(selectedInternship._id, {
        message: applicationMessage.trim(),
      });
      if (res.success) {
        setApplySuccess(true);
      }
    } catch (err) {
      setApplyError(err.message || 'Failed to submit application. Make sure you have uploaded a CV on your profile.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#101735] via-[#141E43] to-[#101735] border border-[#1C2948]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00C8FF]/10 text-[#00C8FF] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Internship Opportunities</h1>
            </div>
            <p className="text-xs text-gray-400">
              Browse approved industry partner positions, apply with your verified CV, and track reviews.
            </p>
          </div>

          <Link
            to="/student/applications"
            className="inline-flex items-center text-xs font-semibold px-4 py-2.5 rounded-xl bg-[#1C2948] text-[#8CEBFF] border border-[#1C2948] hover:border-[#00C8FF]/50 transition-all gap-2"
          >
            <FileText className="w-4 h-4 text-[#00C8FF]" />
            <span>My Applications</span>
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#101735]/80 border border-[#1C2948] text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, skill, or keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1C2948] text-white border border-[#1C2948] focus:outline-none focus:border-[#00C8FF]"
          >
            <option value="">All Work Modes</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="On-site">On-site</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingState count={3} />
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : internships.length === 0 ? (
          <EmptyState
            title="No Internships Available"
            description="No active internship opportunities currently match your search criteria. Check back soon for new postings."
            icon={Briefcase}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {internships.map((item) => (
              <DashboardCard key={item._id} className="flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-[#00C8FF]/15 text-[#00C8FF]">
                      {item.type}
                    </span>
                    <Badge variant={item.status === 'open' ? 'success' : 'neutral'}>
                      {item.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-white hover:text-[#00C8FF] transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#00C8FF]" />
                      <span>{item.companyId?.name || 'Partner Company'}</span>
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Skills badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(item.skills || []).slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1C2948] text-gray-300"
                      >
                        {skill}
                      </span>
                    ))}
                    {(item.skills || []).length > 4 && (
                      <span className="text-[10px] text-gray-500">
                        +{(item.skills || []).length - 4} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#1C2948]">
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#00C8FF]" />
                        <span className="truncate max-w-[120px]">{item.location}</span>
                      </span>
                    )}

                    {item.deadline && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Deadline: {new Date(item.deadline).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-[#1C2948]">
                  <Button
                    className="w-full"
                    icon={Send}
                    onClick={() => handleOpenApply(item)}
                  >
                    Apply Now
                  </Button>
                </div>
              </DashboardCard>
            ))}
          </div>
        )}

        {/* Apply Modal */}
        {selectedInternship && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-[#101735] border border-[#1C2948] shadow-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Apply for Internship</h3>
                  <p className="text-xs text-[#00C8FF] font-semibold">
                    {selectedInternship.title} — {selectedInternship.companyId?.name || 'Partner Company'}
                  </p>
                </div>
                <Badge variant="info">{selectedInternship.type}</Badge>
              </div>

              {applySuccess ? (
                <div className="p-6 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Application Submitted!</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Your application and profile CV have been submitted. You can track coordinator review status on the Applications page.
                  </p>
                  <Button onClick={() => setSelectedInternship(null)}>Close</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs">
                  {applyError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{applyError}</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#1C2948]/40 border border-[#1C2948] space-y-1">
                    <p className="text-gray-300 font-semibold flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#00C8FF]" />
                      <span>CV Attachment</span>
                    </p>
                    <p className="text-gray-400 text-[11px]">
                      Your application will automatically attach the verified CV document uploaded to your Student Profile.
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Cover Letter / Application Message *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={applicationMessage}
                      onChange={(e) => setApplicationMessage(e.target.value)}
                      placeholder="Explain your relevant skills, course projects, and interest in this role (minimum 10 characters)..."
                      className="w-full px-3 py-2 rounded-xl bg-[#1C2948]/60 border border-[#1C2948] text-white focus:outline-none focus:border-[#00C8FF]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedInternship(null)}
                      disabled={applying}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={applying} icon={Send}>
                      Submit Application
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
