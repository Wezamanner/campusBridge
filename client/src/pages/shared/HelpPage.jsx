/**
 * HelpPage — Shared Help & Support page (FR-52 / UC-G07)
 *
 * SRS Traceability:
 *   FR-52 — Help and Support navigation item
 *   UC-G07 — Users access role-appropriate FAQ and support contact
 *
 * Data source: GET /api/v1/help (authenticated)
 * Renders role-scoped FAQ entries and a support contact.
 * Available to all four roles via their own /help routes.
 *
 * Features:
 *   - Role-scoped FAQ loaded from backend
 *   - Inline search/filter across FAQ question text
 *   - Accordion expand/collapse per FAQ item
 *   - Loading, error, and empty states
 *   - Fully responsive layout
 *   - Dark/light theme support
 */
import React, { useState, useEffect } from 'react';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { api } from '../../services/api.js';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Search,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export default function HelpPage() {
  const [faqs, setFaqs]               = useState([]);
  const [supportContact, setSupport]  = useState('');
  const [note, setNote]               = useState('');
  const [role, setRole]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [openIndex, setOpenIndex]     = useState(null);  // accordion
  const [searchTerm, setSearchTerm]   = useState('');

  useEffect(() => {
    const fetchHelp = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/help');
        if (res.success && res.data) {
          setFaqs(res.data.faqs || []);
          setSupport(res.data.supportContact || '');
          setNote(res.data.note || '');
          setRole(res.data.role || '');
        } else {
          throw new Error(res.message || 'Failed to load help content.');
        }
      } catch (err) {
        setError(err.data?.message || err.message || 'Unable to load help content.');
      } finally {
        setLoading(false);
      }
    };
    fetchHelp();
  }, []);

  const filteredFaqs = faqs.filter(
    (faq) =>
      !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleItem = (idx) => setOpenIndex(openIndex === idx ? null : idx);

  const roleLabelMap = {
    student:     'Student',
    instructor:  'Instructor',
    coordinator: 'Coordinator',
    admin:       'Administrator',
  };
  const roleLabel = roleLabelMap[role] || 'User';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#00C8FF] flex-shrink-0" />
            Help &amp; Support
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Frequently asked questions for <span className="text-[#00C8FF] font-semibold">{roleLabel}</span> users
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* FAQ Card */}
        <DashboardCard
          title="Frequently Asked Questions"
          subtitle={`${filteredFaqs.length} ${filteredFaqs.length === 1 ? 'article' : 'articles'} available`}
          icon={BookOpen}
        >
          {loading ? (
            <LoadingState count={4} />
          ) : faqs.length === 0 ? (
            <EmptyState
              title="No help content available"
              description="Help articles for your role have not been configured yet."
            />
          ) : (
            <div className="space-y-3">
              {/* Search box */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setOpenIndex(null); // reset accordion when searching
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#101735] border border-[#1C2948] text-white text-sm focus:outline-none focus:border-[#00C8FF] placeholder-gray-500"
                />
              </div>

              {/* FAQ items */}
              {filteredFaqs.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">
                  No articles match &ldquo;{searchTerm}&rdquo;.
                </p>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isOpen = openIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border transition-all"
                      style={{
                        borderColor: isOpen ? 'rgba(0,200,255,0.4)' : 'var(--cb-border)',
                        backgroundColor: isOpen ? 'rgba(0,200,255,0.05)' : 'var(--cb-bg)',
                      }}
                    >
                      {/* Question row */}
                      <button
                        onClick={() => toggleItem(idx)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--cb-text)' }}>
                          <HelpCircle className="w-4 h-4 text-[#00C8FF] flex-shrink-0" />
                          {faq.question}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 text-[#00C8FF] flex-shrink-0" />
                          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        }
                      </button>

                      {/* Answer */}
                      {isOpen && (
                        <div
                          className="px-4 pb-4 text-sm leading-relaxed border-t"
                          style={{ color: 'var(--cb-text-muted)', borderColor: 'var(--cb-border)' }}
                        >
                          <p className="pt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DashboardCard>

        {/* Support contact */}
        {!loading && !error && supportContact && (
          <DashboardCard
            title="Contact Support"
            subtitle="Reach out if you need further assistance"
            icon={Mail}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cb-text-muted)' }}>
                <Mail className="w-4 h-4 text-[#00C8FF] flex-shrink-0" />
                <span>Platform support:</span>
                <a
                  href={`mailto:${supportContact}`}
                  className="font-semibold text-[#00C8FF] hover:underline break-all"
                >
                  {supportContact}
                </a>
              </div>
            </div>
            {note && (
              <p className="text-xs mt-3" style={{ color: 'var(--cb-text-faint)' }}>
                {note}
              </p>
            )}
          </DashboardCard>
        )}
      </div>
    </AppLayout>
  );
}
