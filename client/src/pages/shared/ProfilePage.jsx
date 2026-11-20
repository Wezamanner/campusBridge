/**
 * ProfilePage — Shared profile and preferences page for instructor, coordinator, and admin.
 *
 * SRS Traceability:
 *   FR-03  — All roles can view and edit their profile information.
 *   FR-38  — Profile and preferences page (name, department, theme preference).
 *   FR-39  — Theme switching: saved to user account, restored on next visit.
 *   UC-G02 — Manage profile and preferences (all roles).
 *
 * This page intentionally omits CV (FR-23, student-only) and program/year/skills
 * (student-specific fields). It exposes:
 *   - Name (all roles)
 *   - Email (read-only)
 *   - Department (instructor/coordinator/admin)
 *   - Theme preference (all roles)
 */
import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  Building2,
  Moon,
  Sun,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import AppLayout from '../../layouts/AppLayout.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';

const ROLE_LABELS = {
  instructor: 'Instructor',
  coordinator: 'Coordinator',
  admin: 'Administrator',
  student: 'Student',
};

export default function ProfilePage() {
  const { updateCurrentUser } = useAuth();
  const { theme: activeTheme, setTheme: setActiveTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Editable form state
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [themePreference, setThemePreference] = useState('dark');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const response = await api.get('/profile');
      if (response.success && response.data) {
        populateForm(response.data);
      } else {
        throw new Error(response.message || 'Failed to load profile.');
      }
    } catch (err) {
      setPageError(err.data?.message || err.message || 'Unable to retrieve profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const populateForm = (data) => {
    setProfile(data);
    setName(data.name || '');
    setDepartment(data.department || '');
    const prefTheme = data.preferences?.theme || 'dark';
    setThemePreference(prefTheme);
    // Sync global theme context with the server-stored value
    if (prefTheme !== activeTheme && typeof setActiveTheme === 'function') {
      setActiveTheme(prefTheme);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (profile) {
      populateForm(profile);
      setFieldErrors({});
      setSuccessMessage(null);
      setPageError(null);
    }
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      errors.name = 'Full name must be between 2 and 100 characters.';
    }
    if (department.trim().length > 100) {
      errors.department = 'Department cannot exceed 100 characters.';
    }
    if (themePreference !== 'dark' && themePreference !== 'light') {
      errors.theme = 'Theme must be "dark" or "light".';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSuccessMessage(null);
    setPageError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        department: department.trim(),
        preferences: { theme: themePreference },
      };
      const response = await api.put('/profile', payload);
      if (response.success && response.data) {
        setSuccessMessage('Profile and preferences saved.');
        setProfile(response.data);
        populateForm(response.data);
        if (typeof updateCurrentUser === 'function') {
          updateCurrentUser({ name: response.data.name });
        }
        if (typeof setActiveTheme === 'function') {
          setActiveTheme(themePreference);
        }
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        throw new Error(response.message || 'Failed to update profile.');
      }
    } catch (err) {
      if (err.data?.errors) setFieldErrors(err.data.errors);
      setPageError(err.data?.message || err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading profile..." />
      </AppLayout>
    );
  }

  const roleLabel = ROLE_LABELS[profile?.role] || profile?.role || 'User';

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Profile &amp; Preferences
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Manage your account details and display theme (FR-38, FR-39)
            </p>
          </div>
          <Badge variant={profile?.role === 'admin' ? 'purple' : profile?.role === 'coordinator' ? 'warning' : 'success'} size="md">
            {roleLabel}
          </Badge>
        </div>

        {/* Alerts */}
        {pageError && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <span className="font-medium">{pageError}</span>
          </div>
        )}
        {successMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Profile summary banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[#00C8FF]/30 bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] p-6 shadow-glow-cyan-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] text-[#101735] font-black text-xl flex items-center justify-center shadow-glow-cyan-md">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : roleLabel.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">{profile?.name || roleLabel}</h2>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email}
                </p>
                {profile?.department && (
                  <p className="text-xs text-[#8CEBFF]/80 mt-0.5">
                    {profile.department}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="neutral" size="md">
              Theme: {profile?.preferences?.theme || 'dark'}
            </Badge>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left column */}
            <div className="lg:col-span-8 space-y-8">
              {/* Account details */}
              <DashboardCard
                title="Account Details"
                subtitle="Name and department information"
                icon={User}
              >
                <div className="p-6 space-y-6">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                      Full Name <span className="text-[#00C8FF]">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                      }}
                      placeholder="e.g. Dr. Sarah Ahmed"
                      maxLength={100}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                        bg-[#101735]/60 text-white
                        ${fieldErrors.name ? 'border-rose-500' : 'border-[#1C2948] focus:border-[#00C8FF]'}`}
                    />
                    {fieldErrors.name && (
                      <p className="text-xs text-rose-400">{fieldErrors.name}</p>
                    )}
                  </div>
                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value);
                        if (fieldErrors.department) setFieldErrors({ ...fieldErrors, department: null });
                      }}
                      placeholder="e.g. Computer Science, Engineering"
                      maxLength={100}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all
                        bg-[#101735]/60 text-white
                        ${fieldErrors.department ? 'border-rose-500' : 'border-[#1C2948] focus:border-[#00C8FF]'}`}
                    />
                    {fieldErrors.department && (
                      <p className="text-xs text-rose-400">{fieldErrors.department}</p>
                    )}
                  </div>
                </div>
              </DashboardCard>

              {/* Theme preference (FR-38, FR-39) */}
              <DashboardCard
                title="Theme & Display Preferences"
                subtitle="Your choice is saved to your account and restored on each login (FR-38, FR-39)"
                icon={Sparkles}
              >
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('dark')}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        themePreference === 'dark'
                          ? 'border-[#00C8FF] bg-[#00C8FF]/10 shadow-glow-cyan-sm'
                          : 'border-[#1C2948] hover:border-[#00C8FF]/40 bg-[#101735]/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#101735] border border-[#00C8FF]/30 text-[#00C8FF] flex items-center justify-center flex-shrink-0">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Dark Theme</span>
                          {themePreference === 'dark' && (
                            <Badge variant="cyan" size="sm">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Deep navy background with cyan accents.
                        </p>
                      </div>
                    </button>
                    {/* Light */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('light')}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        themePreference === 'light'
                          ? 'border-[#00C8FF] bg-[#00C8FF]/10 shadow-glow-cyan-sm'
                          : 'border-[#1C2948] hover:border-[#00C8FF]/40 bg-[#101735]/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">Light Theme</span>
                          {themePreference === 'light' && (
                            <Badge variant="cyan" size="sm">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Clean white background with high-contrast text.
                        </p>
                      </div>
                    </button>
                  </div>
                  {fieldErrors.theme && (
                    <p className="text-xs text-rose-400 mt-2">{fieldErrors.theme}</p>
                  )}
                </div>
              </DashboardCard>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  icon={RotateCcw}
                  onClick={handleReset}
                  disabled={saving}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  isLoading={saving}
                >
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Right column — read-only identity */}
            <div className="lg:col-span-4">
              <DashboardCard
                title="Security & Identity"
                subtitle="System-managed credentials (read-only)"
                icon={Shield}
              >
                <div className="p-6 space-y-4">
                  {/* Email */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Email</span>
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 text-xs font-mono text-gray-300 truncate select-all">
                      {profile?.email || 'N/A'}
                    </div>
                  </div>
                  {/* Role */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Role</span>
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#00C8FF] uppercase">{profile?.role}</span>
                      <Badge variant="cyan" size="sm">Assigned</Badge>
                    </div>
                  </div>
                  {/* Status */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                    <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 flex items-center justify-between">
                      <span className="text-xs text-gray-300">
                        {profile?.active ? 'Active' : 'Deactivated'}
                      </span>
                      <Badge variant={profile?.active ? 'success' : 'danger'} size="sm" dot>
                        {profile?.active ? 'Active' : 'Deactivated'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DashboardCard>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
