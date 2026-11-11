import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  GraduationCap, 
  Calendar, 
  Code2, 
  Moon, 
  Sun, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  Lock, 
  FileText,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import CvManagement from '../../components/student/CvManagement.jsx';

export default function StudentProfilePage() {
  const { user: authUser, updateCurrentUser } = useAuth();
  const { theme: activeTheme, setTheme: setActiveTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Editable Form State
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [skills, setSkills] = useState([]);
  const [themePreference, setThemePreference] = useState('dark');

  // Skill input temporary state
  const [newSkill, setNewSkill] = useState('');
  const [skillError, setSkillError] = useState('');

  // Fetch student profile on mount
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
      console.error('Fetch profile error:', err);
      setPageError(err.data?.message || err.message || 'Unable to retrieve student profile.');
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
    setProgram(data.program || '');
    setYear(data.year !== undefined && data.year !== null ? String(data.year) : '');
    setSkills(Array.isArray(data.skills) ? [...data.skills] : []);
    
    const prefTheme = data.preferences?.theme || 'dark';
    setThemePreference(prefTheme);

    // Synchronize global theme context if necessary
    if (prefTheme !== activeTheme && typeof setActiveTheme === 'function') {
      setActiveTheme(prefTheme);
    }
  };

  // Reset form to server-loaded profile values
  const handleReset = () => {
    if (profile) {
      populateForm(profile);
      setFieldErrors({});
      setSkillError('');
      setSuccessMessage(null);
      setPageError(null);
    }
  };

  // Add skill tag
  const handleAddSkill = (e) => {
    e?.preventDefault();
    setSkillError('');

    const trimmed = newSkill.trim();
    if (!trimmed) return;

    if (trimmed.length < 2 || trimmed.length > 30) {
      setSkillError('Skill must be between 2 and 30 characters.');
      return;
    }

    if (skills.length >= 15) {
      setSkillError('Maximum of 15 skills allowed.');
      return;
    }

    const lower = trimmed.toLowerCase();
    if (skills.some((s) => s.toLowerCase() === lower)) {
      setSkillError(`Skill "${trimmed}" is already added.`);
      return;
    }

    setSkills([...skills, trimmed]);
    setNewSkill('');
  };

  // Remove skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
    setSkillError('');
  };

  // Client-side validation prior to sending
  const validateForm = () => {
    const errors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      errors.name = 'Full name must be between 2 and 100 characters.';
    }

    if (program.trim().length > 100) {
      errors.program = 'Degree program cannot exceed 100 characters.';
    }

    if (year !== '') {
      const parsedYear = Number(year);
      if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 7) {
        errors.year = 'Academic year must be an integer between 1 and 7.';
      }
    }

    if (skills.length > 15) {
      errors.skills = 'Skills cannot exceed 15 items.';
    }

    if (themePreference !== 'dark' && themePreference !== 'light') {
      errors.theme = 'Theme preference must be either "dark" or "light".';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSuccessMessage(null);
    setPageError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Build strictly allowlisted payload per SRS & Backend Controller
      const payload = {
        name: name.trim(),
        program: program.trim(),
        skills: skills,
        preferences: {
          theme: themePreference,
        },
      };

      if (year !== '') {
        payload.year = parseInt(year, 10);
      }

      const response = await api.put('/profile', payload);

      if (response.success && response.data) {
        setSuccessMessage('Profile and preferences updated successfully.');
        setProfile(response.data);
        populateForm(response.data);

        // Synchronize AuthContext so topbar reflects updated name immediately
        if (typeof updateCurrentUser === 'function') {
          updateCurrentUser({ name: response.data.name });
        }

        // Apply theme immediately to UI
        if (typeof setActiveTheme === 'function') {
          setActiveTheme(themePreference);
        }
      } else {
        throw new Error(response.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Update profile error:', err);
      if (err.data?.errors) {
        setFieldErrors(err.data.errors);
      }
      setPageError(err.data?.message || err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Callback when CV is updated via CvManagement component
  const handleCvUpdated = (newCvData) => {
    setProfile((prev) => (prev ? { ...prev, cv: newCvData } : prev));
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading student profile..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Page Header */}
        <PageHeader
          title="Student Profile & CV"
          subtitle="Manage your academic credentials, technical skills, curriculum vitae, and platform theme preferences."
          badge={
            <Badge variant="cyan" size="md">
              FR-03 &bull; Student Module
            </Badge>
          }
        />

        {/* Global Notifications */}
        {pageError && (
          <div className="flex items-start space-x-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 font-medium">{pageError}</div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start space-x-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Top Profile Summary Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[#00C8FF]/30 bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] p-6 shadow-glow-cyan-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00C8FF] to-[#8CEBFF] text-[#101735] font-black text-2xl flex items-center justify-center shadow-glow-cyan-md">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : 'ST'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-3 flex-wrap">
                  <h2 className="text-xl font-extrabold text-white">
                    {profile?.name || 'Student Profile'}
                  </h2>
                  <Badge variant="cyan" size="sm">
                    {profile?.role || 'student'}
                  </Badge>
                  {profile?.active && (
                    <Badge variant="success" size="sm" dot>
                      Active Account
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#8CEBFF]/80">
                  {profile?.program || 'Academic Program Not Specified'} &bull;{' '}
                  {profile?.year ? `Year ${profile.year}` : 'Year N/A'}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile?.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge variant="neutral" size="md">
                Theme: {profile?.preferences?.theme || 'dark'}
              </Badge>
              {profile?.cv ? (
                <Badge variant="success" size="md" dot>
                  CV Attached
                </Badge>
              ) : (
                <Badge variant="warning" size="md">
                  No CV
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal & Academic Details Card */}
              <DashboardCard
                title="Academic & Personal Details"
                subtitle="Information visible to instructors and verified partner organizations"
                icon={User}
              >
                <div className="p-6 space-y-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 dark:text-gray-300 light:text-gray-700">
                      Full Name <span className="text-[#00C8FF]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null });
                        }}
                        placeholder="e.g. Sabrin Abdu"
                        maxLength={100}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none
                          bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                          light:bg-gray-50 light:text-gray-900 light:border-gray-300
                          ${
                            fieldErrors.name
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-[#1C2948] focus:border-[#00C8FF]'
                          }`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="text-xs text-rose-400 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>

                  {/* Degree Program */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 dark:text-gray-300 light:text-gray-700">
                      Academic Degree Program
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={program}
                        onChange={(e) => {
                          setProgram(e.target.value);
                          if (fieldErrors.program) setFieldErrors({ ...fieldErrors, program: null });
                        }}
                        placeholder="e.g. Software Engineering, Computer Science"
                        maxLength={100}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none
                          bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                          light:bg-gray-50 light:text-gray-900 light:border-gray-300
                          ${
                            fieldErrors.program
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-[#1C2948] focus:border-[#00C8FF]'
                          }`}
                      />
                    </div>
                    {fieldErrors.program && (
                      <p className="text-xs text-rose-400 mt-1">{fieldErrors.program}</p>
                    )}
                  </div>

                  {/* Academic Year Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 dark:text-gray-300 light:text-gray-700">
                      Academic Study Year (1 to 7)
                    </label>
                    <div className="relative">
                      <select
                        value={year}
                        onChange={(e) => {
                          setYear(e.target.value);
                          if (fieldErrors.year) setFieldErrors({ ...fieldErrors, year: null });
                        }}
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-all outline-none
                          bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                          light:bg-gray-50 light:text-gray-900 light:border-gray-300
                          ${
                            fieldErrors.year
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-[#1C2948] focus:border-[#00C8FF]'
                          }`}
                      >
                        <option value="">Not Specified</option>
                        <option value="1">Year 1 (Freshman)</option>
                        <option value="2">Year 2 (Sophomore)</option>
                        <option value="3">Year 3 (Junior)</option>
                        <option value="4">Year 4 (Senior)</option>
                        <option value="5">Year 5 (Extended / Engineering)</option>
                        <option value="6">Year 6 (Postgraduate / Professional)</option>
                        <option value="7">Year 7</option>
                      </select>
                    </div>
                    {fieldErrors.year && (
                      <p className="text-xs text-rose-400 mt-1">{fieldErrors.year}</p>
                    )}
                  </div>
                </div>
              </DashboardCard>

              {/* Technical Skills Card */}
              <DashboardCard
                title="Technical & Professional Skills"
                subtitle="Highlight up to 15 key programming languages, tools, or domain specialties"
                icon={Code2}
              >
                <div className="p-6 space-y-5">
                  {/* Skill Tag Input */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => {
                          setNewSkill(e.target.value);
                          setSkillError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="e.g. React.js, Node.js, Python, MongoDB"
                        maxLength={30}
                        disabled={skills.length >= 15}
                        className="flex-1 px-4 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-sm outline-none transition-all
                          bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                          light:bg-gray-50 light:text-gray-900 light:border-gray-300 disabled:opacity-50"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={Plus}
                        onClick={handleAddSkill}
                        disabled={skills.length >= 15 || !newSkill.trim()}
                      >
                        Add Skill
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>Press Enter or click "Add Skill" to add tags. (2–30 chars each)</span>
                      <span className={skills.length >= 15 ? 'text-amber-400 font-bold' : ''}>
                        {skills.length} / 15 skills
                      </span>
                    </div>

                    {skillError && (
                      <p className="text-xs text-rose-400 animate-fadeIn">{skillError}</p>
                    )}
                    {fieldErrors.skills && (
                      <p className="text-xs text-rose-400 animate-fadeIn">{fieldErrors.skills}</p>
                    )}
                  </div>

                  {/* Skills Badges Container */}
                  <div className="min-h-[60px] p-4 rounded-xl border border-[#1C2948] dark:border-[#1C2948] light:border-gray-200 bg-[#101735]/30 flex flex-wrap gap-2 items-center">
                    {skills.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No technical skills added yet. Add tags above to showcase your capabilities.
                      </p>
                    ) : (
                      skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold
                            bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30 transition-all hover:border-[#00C8FF]"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="text-[#00C8FF]/60 hover:text-rose-400 transition-colors"
                            title={`Remove ${skill}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </DashboardCard>

              {/* Theme & Appearance Preference Card (FR-39) */}
              <DashboardCard
                title="Theme & Display Preferences"
                subtitle="Choose your preferred visual theme for the CampusBridge environment"
                icon={Sparkles}
              >
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark Theme Option */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('dark')}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start space-x-3 ${
                        themePreference === 'dark'
                          ? 'border-[#00C8FF] bg-[#00C8FF]/10 shadow-glow-cyan-sm'
                          : 'border-[#1C2948] hover:border-[#00C8FF]/40 bg-[#101735]/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#101735] border border-[#00C8FF]/30 text-[#00C8FF] flex items-center justify-center flex-shrink-0">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">Dark Theme</span>
                          {themePreference === 'dark' && (
                            <Badge variant="cyan" size="sm">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Deep navy (#101735) with glowing electric cyan accents. Ideal for low-light coding.
                        </p>
                      </div>
                    </button>

                    {/* Light Theme Option */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('light')}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start space-x-3 ${
                        themePreference === 'light'
                          ? 'border-[#00C8FF] bg-[#00C8FF]/10 shadow-glow-cyan-sm'
                          : 'border-[#1C2948] hover:border-[#00C8FF]/40 bg-[#101735]/40'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-300 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white dark:text-white light:text-gray-900">
                            Light Theme
                          </span>
                          {themePreference === 'light' && (
                            <Badge variant="cyan" size="sm">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Clean soft white (#F5F8FC) background with high-contrast text and crisp cyan highlights.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </DashboardCard>

              {/* Form Action Controls */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  icon={RotateCcw}
                  onClick={handleReset}
                  disabled={saving}
                >
                  Reset Changes
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={Save}
                  isLoading={saving}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: CV Management & Read-Only Identity (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            {/* Curriculum Vitae (CV) Management Card (FR-23 & FR-38) */}
            <DashboardCard
              title="Curriculum Vitae (CV)"
              subtitle="Upload and manage your CV for internship matching"
              icon={FileText}
            >
              <div className="p-6">
                <CvManagement
                  cv={profile?.cv}
                  onCvUpdated={handleCvUpdated}
                />
              </div>
            </DashboardCard>

            {/* Read-Only Account Security & Identity Card */}
            <DashboardCard
              title="Security & Account Identity"
              subtitle="System verified credentials (read-only per university policy)"
              icon={Shield}
            >
              <div className="p-6 space-y-4">
                {/* Registered Email */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Registered Email
                    </span>
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 text-xs font-mono text-gray-300 truncate select-all">
                    {profile?.email || 'N/A'}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Official university email used for authentication and notifications.
                  </p>
                </div>

                {/* System Role */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Platform Role
                    </span>
                    <Lock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00C8FF] uppercase">
                      {profile?.role || 'student'}
                    </span>
                    <Badge variant="cyan" size="sm">
                      Assigned
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Role permissions are strictly managed by system administrators.
                  </p>
                </div>

                {/* Account Status */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Account Status
                  </span>
                  <div className="p-3 rounded-xl border border-[#1C2948] bg-[#101735]/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-300">
                      {profile?.active ? 'Active Account' : 'Deactivated Account'}
                    </span>
                    <Badge variant={profile?.active ? 'success' : 'danger'} size="sm" dot>
                      {profile?.active ? 'Active' : 'Deactivated'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Account access status on the CampusBridge platform.
                  </p>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
