import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  GraduationCap,
  BookOpen,
  Briefcase,
  Users,
  ArrowRight,
  LogIn,
  Moon,
  Sun,
  Megaphone,
  ClipboardList,
  Bell,
  TrendingUp,
  MessageSquare,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
  Info,
} from 'lucide-react';

// ─── small reusable primitives ────────────────────────────────────────────────

function Badge({ children, color = 'cyan' }) {
  const map = {
    cyan:   'bg-[#00C8FF]/10 text-[#00C8FF] border border-[#00C8FF]/20',
    slate:  'bg-[#1C2948] text-[#8CEBFF] border border-[#1C2948]',
    indigo: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    rose:   'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${map[color]}`}>
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div className="text-center space-y-2 mb-10">
      {eyebrow && <Badge color="slate">{eyebrow}</Badge>}
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h2>
      {sub && <p className="text-sm opacity-60 max-w-xl mx-auto leading-relaxed">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon = Info, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 opacity-50 space-y-3">
      <Icon className="w-10 h-10" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  // settings + public content
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [publicContent, setPublicContent] = useState({});

  // real data from public endpoints
  const [internships, setInternships]     = useState({ loading: true, data: [], error: null });
  const [announcements, setAnnouncements] = useState({ loading: true, data: [], error: null });

  useEffect(() => {
    // Derive the scheme+host only from VITE_API_BASE_URL so we can prepend /api/v1 ourselves.
    // VITE_API_BASE_URL is expected to be "https://host.onrender.com/api/v1".
    // Strip the /api/v1 suffix so paths like /api/v1/settings don't double up.
    const rawBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
    const API = rawBase.endsWith('/api/v1') ? rawBase.slice(0, -'/api/v1'.length) : rawBase;

    // settings
    fetch(`${API}/api/v1/settings`)
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setRegistrationOpen(j.data.registrationOpen !== false); })
      .catch(() => {});

    // public content blocks
    fetch(`${API}/api/v1/public/content`)
      .then(r => r.json())
      .then(j => { if (j.success && j.data?.publicContent) setPublicContent(j.data.publicContent); })
      .catch(() => {});

    // real internship listings
    fetch(`${API}/api/v1/public/internships`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => setInternships({ loading: false, data: j.internships ?? [], error: null }))
      .catch(e => setInternships({ loading: false, data: [], error: e.message }));

    // real announcements
    fetch(`${API}/api/v1/public/announcements`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(j => setAnnouncements({ loading: false, data: j.announcements ?? [], error: null }))
      .catch(e => setAnnouncements({ loading: false, data: [], error: e.message }));
  }, []);

  const getDashboardPath = () => {
    const routes = { student: '/student/dashboard', instructor: '/instructor/dashboard', coordinator: '/coordinator/dashboard', admin: '/admin/dashboard' };
    return routes[user?.role] ?? '/login';
  };

  // ── derived values ──────────────────────────────────────────────────────────
  const heroTitle    = publicContent.heroTitle    || 'Connecting University Learning with Real-World Industry';
  const heroSubtitle = publicContent.heroSubtitle || 'CampusBridge unifies coursework, assignment grading, internship discovery, and progress tracking within a secure role-based ecosystem.';

  // ── colour palette helpers ───────────────────────────────────────────────────
  const card  = isDark ? 'bg-[#1C2948]/50 border-[#1C2948]' : 'bg-white border-gray-200';
  const page  = isDark ? 'bg-[#101735] text-[#F5F8FC]'       : 'bg-[#F5F8FC] text-[#101735]';
  const divider = isDark ? 'border-[#1C2948]'                 : 'border-gray-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${page}`}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between ${
        isDark ? 'bg-[#101735]/90 border-[#1C2948]' : 'bg-white/90 border-gray-200'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/brolf-tech-logo.jpg"
            alt="Brolf Tech"
            className="w-10 h-10 rounded-xl object-cover shadow-glow-cyan-sm"
          />
          <div>
            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-[#8CEBFF] to-[#00C8FF] bg-clip-text text-transparent">
              CampusBridge
            </span>
            <span className="block text-[10px] text-[#00C8FF] font-semibold tracking-widest uppercase leading-none">
              University Platform
            </span>
          </div>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`p-2 rounded-lg border transition-colors ${
              isDark ? 'border-[#1C2948] bg-[#1C2948]/60 text-[#8CEBFF] hover:border-[#00C8FF]' : 'border-gray-200 bg-white text-gray-600 hover:border-[#00C8FF]'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#00C8FF] text-[#101735] hover:opacity-90 shadow-glow-cyan-sm transition-opacity"
              >
                Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button onClick={logout} className="text-xs opacity-50 hover:opacity-80 px-2">
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark ? 'border-[#1C2948] text-[#8CEBFF] hover:border-[#00C8FF]' : 'border-gray-200 text-gray-700 hover:border-[#00C8FF]'
                }`}
              >
                Sign In
              </Link>
              {registrationOpen ? (
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-90 shadow-glow-cyan-sm transition-opacity"
                >
                  Register
                </Link>
              ) : (
                <span className="px-4 py-2 rounded-xl text-xs font-semibold opacity-40 border border-dashed border-current">
                  Registration closed
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── ANNOUNCEMENT BANNER (real data) ─────────────────────────────────── */}
      {!announcements.loading && announcements.data.length > 0 && (
        <div className={`px-6 py-2.5 text-center text-xs font-medium flex items-center justify-center gap-2 border-b ${
          isDark ? 'bg-[#00C8FF]/10 border-[#1C2948] text-[#8CEBFF]' : 'bg-[#00C8FF]/5 border-blue-100 text-[#007ba8]'
        }`}>
          <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="line-clamp-1">{announcements.data[0].title}</span>
          {announcements.data.length > 1 && (
            <span className="opacity-50">+{announcements.data.length - 1} more</span>
          )}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-5 md:px-8 pb-20 space-y-16 sm:space-y-20">

        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section className="pt-16 md:pt-24 text-center space-y-6">
          <Badge color="slate">Academic · Industry · Outcomes</Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto">
            {heroTitle}
          </h1>

          <p className="max-w-2xl mx-auto text-sm md:text-base opacity-70 leading-relaxed">
            {heroSubtitle}
          </p>

          {!registrationOpen && !isAuthenticated && (
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs border ${
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              New student registrations are currently closed. Contact your institution to request access.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link
                to={getDashboardPath()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-90 shadow-glow-cyan transition-opacity"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                {registrationOpen && (
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-90 shadow-glow-cyan transition-opacity"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                <Link
                  to="/login"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-colors ${
                    isDark ? 'border-[#1C2948] bg-[#1C2948]/60 text-[#8CEBFF] hover:border-[#00C8FF]' : 'border-gray-200 bg-white text-gray-700 hover:border-[#00C8FF]'
                  }`}
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
              </>
            )}
          </div>
        </section>

        {/* ── PLATFORM FEATURES ───────────────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="What's inside"
            title="Everything you need, integrated"
            sub="Built around real academic workflows — from first lecture to industry placement."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: BookOpen,       color: 'text-[#00C8FF]',  bg: 'bg-[#00C8FF]/10', title: 'Course & Learning Management', desc: 'Instructors post resources, manage syllabi, and track class progress. Students access materials and study at their own pace.' },
              { icon: ClipboardList,  color: 'text-[#8CEBFF]',  bg: 'bg-[#8CEBFF]/10', title: 'Assignment Submission & Grading', desc: 'Students submit work directly in the platform. Instructors grade with feedback and the grade book updates automatically.' },
              { icon: Briefcase,      color: 'text-indigo-400', bg: 'bg-indigo-500/10', title: 'Internship Discovery & Applications', desc: 'Coordinators post verified opportunities. Students browse and apply; coordinators track forwarding and company decisions.' },
              { icon: TrendingUp,     color: 'text-emerald-400',bg: 'bg-emerald-500/10',title: 'Student Progress Tracking', desc: 'Instructors monitor at-risk students. Personal dashboards surface grades, submission history, and upcoming deadlines.' },
              { icon: Bell,           color: 'text-amber-400',  bg: 'bg-amber-500/10',  title: 'Notifications & Announcements', desc: 'Administrators publish platform-wide announcements. Role-specific notifications keep every stakeholder informed in real time.' },
              { icon: MessageSquare,  color: 'text-rose-400',   bg: 'bg-rose-500/10',   title: 'Messaging & Collaboration', desc: 'Students and instructors communicate within the platform, keeping all academic conversations organised and accessible.' },
            ].map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className={`p-5 rounded-2xl border transition-colors ${card}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{title}</h3>
                <p className="text-xs opacity-60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── OPEN INTERNSHIPS (real data) ─────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Opportunities"
            title="Open Internship Listings"
            sub="Verified positions posted by partner organisations. Sign in or register to apply."
          />

          {internships.loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#00C8FF]" />
            </div>
          )}

          {!internships.loading && internships.error && (
            <EmptyState icon={AlertCircle} message="Could not load internship listings right now." />
          )}

          {!internships.loading && !internships.error && internships.data.length === 0 && (
            <EmptyState icon={Briefcase} message="No open internships at the moment. Check back soon." />
          )}

          {!internships.loading && !internships.error && internships.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {internships.data.slice(0, 6).map((item, i) => (
                <div key={item._id ?? i} className={`p-5 rounded-2xl border flex flex-col gap-3 ${card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm leading-snug">{item.title}</h3>
                    <Badge color="cyan">Open</Badge>
                  </div>

                  {item.company && (
                    <p className="text-xs font-semibold text-[#00C8FF] opacity-80">{item.company}</p>
                  )}

                  {item.description && (
                    <p className="text-xs opacity-60 leading-relaxed line-clamp-2">{item.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs opacity-55">
                    {item.location && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                    )}
                    {item.duration && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.duration}</span>
                    )}
                    {item.applicationDeadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Deadline: {new Date(item.applicationDeadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <Link
                    to={registrationOpen ? '/register' : '/login'}
                    className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#00C8FF] hover:opacity-80 transition-opacity"
                  >
                    {registrationOpen ? 'Register to apply' : 'Sign in to apply'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {!internships.loading && internships.data.length > 6 && (
            <p className="text-center text-xs opacity-50 mt-4">
              Showing 6 of {internships.data.length} listings. Sign in to view all.
            </p>
          )}
        </section>

        {/* ── ANNOUNCEMENTS (real data) ────────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Announcements"
            title="Latest from the Institution"
          />

          {announcements.loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#00C8FF]" />
            </div>
          )}

          {!announcements.loading && announcements.error && (
            <EmptyState icon={AlertCircle} message="Could not load announcements right now." />
          )}

          {!announcements.loading && !announcements.error && announcements.data.length === 0 && (
            <EmptyState icon={Megaphone} message="No public announcements at the moment." />
          )}

          {!announcements.loading && !announcements.error && announcements.data.length > 0 && (
            <div className="space-y-3 max-w-3xl mx-auto">
              {announcements.data.map((ann, i) => {
                const priorityColor = ann.priority === 'high' ? 'rose' : ann.priority === 'medium' ? 'amber' : 'cyan';
                return (
                  <div key={ann._id ?? i} className={`p-4 rounded-xl border flex items-start gap-4 ${card}`}>
                    <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                      priorityColor === 'rose'  ? 'bg-rose-500/10'  :
                      priorityColor === 'amber' ? 'bg-amber-500/10' : 'bg-[#00C8FF]/10'
                    }`}>
                      <Megaphone className={`w-4 h-4 ${
                        priorityColor === 'rose'  ? 'text-rose-400'  :
                        priorityColor === 'amber' ? 'text-amber-400' : 'text-[#00C8FF]'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{ann.title}</span>
                        {ann.priority && ann.priority !== 'low' && (
                          <Badge color={priorityColor}>{ann.priority}</Badge>
                        )}
                      </div>
                      {ann.content && (
                        <p className="text-xs opacity-60 leading-relaxed line-clamp-2">{ann.content}</p>
                      )}
                      {ann.publishedAt && (
                        <p className="text-[10px] opacity-40 mt-1">
                          {new Date(ann.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
        <section>
          <SectionHeading
            eyebrow="Workflows"
            title="How CampusBridge works"
            sub="Each role has a focused workspace. All roles connect through shared data."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                role: 'Student',
                icon: GraduationCap,
                color: 'text-[#00C8FF]',
                bg: 'bg-[#00C8FF]/10',
                steps: [
                  'Register and log in with your university email.',
                  'Browse enrolled courses and access learning materials.',
                  'Submit assignments and track grades.',
                  'Discover internship listings and submit applications.',
                  'Monitor personal progress and achievements.',
                ],
              },
              {
                role: 'Instructor',
                icon: BookOpen,
                color: 'text-[#8CEBFF]',
                bg: 'bg-[#8CEBFF]/10',
                steps: [
                  'Access assigned courses and upload resources.',
                  'Create assignments with deadlines and point values.',
                  'Review student submissions in a grading queue.',
                  'Provide written feedback alongside grades.',
                  'Monitor at-risk students who may need support.',
                ],
              },
              {
                role: 'Coordinator',
                icon: Briefcase,
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
                steps: [
                  'Register partner companies and manage approvals.',
                  'Post internship opportunities with clear deadlines.',
                  'Review student applications and forward to companies.',
                  'Record company decisions (accepted or rejected).',
                  'Generate placement reports for the institution.',
                ],
              },
            ].map(({ role, icon: Icon, color, bg, steps }) => (
              <div key={role} className={`p-5 rounded-2xl border ${card}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="font-bold">{role}</span>
                </div>
                <ol className="space-y-2.5">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs opacity-70 leading-relaxed">
                      <span className={`mt-0.5 font-bold text-[10px] flex-shrink-0 ${color}`}>{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────────────── */}
        {!isAuthenticated && (
          <section className={`rounded-2xl border p-8 md:p-12 text-center space-y-5 ${
            isDark ? 'bg-gradient-to-br from-[#1C2948] to-[#101735] border-[#1C2948]' : 'bg-gradient-to-br from-blue-50 to-white border-blue-100'
          }`}>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Ready to get started?</h2>
            <p className="text-sm opacity-60 max-w-md mx-auto">
              {registrationOpen
                ? 'Create your account today and connect your academic journey with real industry opportunities.'
                : 'Registration is currently managed by your institution. Sign in if you already have an account.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {registrationOpen && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00C8FF] to-[#8CEBFF] text-[#101735] hover:opacity-90 shadow-glow-cyan transition-opacity"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link
                to="/login"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-colors ${
                  isDark ? 'border-[#1C2948] bg-[#1C2948]/60 text-[#8CEBFF] hover:border-[#00C8FF]' : 'border-gray-200 bg-white text-gray-700 hover:border-[#00C8FF]'
                }`}
              >
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
            </div>
          </section>
        )}

        {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
        <footer className={`pt-8 border-t text-xs ${divider}`}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 opacity-50">
            <div className="flex items-center gap-2">
              <img src="/brolf-tech-logo.jpg" alt="Brolf Tech" className="w-5 h-5 rounded object-cover" />
              <span>CampusBridge &copy; 2026</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login"    className="hover:opacity-80">Sign In</Link>
              {registrationOpen && <Link to="/register" className="hover:opacity-80">Register</Link>}
            </div>
            <span>Brolf Tech Remote Internship Challenge</span>
          </div>
        </footer>

      </main>
    </div>
  );
}
