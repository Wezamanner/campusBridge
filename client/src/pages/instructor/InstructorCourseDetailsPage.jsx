import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  GraduationCap, 
  FileText, 
  Search,
  Sparkles,
  Info,
  Upload,
  Download,
  ExternalLink,
  File,
  PlusCircle,
  Link2,
  FolderPlus
} from 'lucide-react';
import { api } from '../../services/api.js';
import AppLayout from '../../layouts/AppLayout.jsx';
import PageHeader from '../../components/navigation/PageHeader.jsx';
import DashboardCard from '../../components/ui/DashboardCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function InstructorCourseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');

  // Course Resources States (Phase 5)
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState('document');
  const [selectedFile, setSelectedFile] = useState(null);
  const [resourceLink, setResourceLink] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resourceError, setResourceError] = useState(null);
  const [resourceSuccess, setResourceSuccess] = useState(null);

  // Assignment Management States (Phase 6, FR-06)
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [assignmentMaxScore, setAssignmentMaxScore] = useState(100);
  const [assignmentAllowLate, setAssignmentAllowLate] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState(null);

  const fetchCourseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/courses/${id}`);
      if (response.success && response.data) {
        setCourse(response.data);
      } else {
        throw new Error(response.message || 'Failed to retrieve course details.');
      }
    } catch (err) {
      console.error('Fetch course details error:', err);
      setError(err.data?.message || err.message || 'Unable to access course workspace.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const response = await api.get(`/courses/${id}/resources`);
      if (response.success && Array.isArray(response.data)) {
        setResources(response.data);
      }
    } catch (err) {
      console.error('Fetch resources error:', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const response = await api.get(`/assignments?courseId=${id}`);
      if (response.success && Array.isArray(response.data)) {
        setAssignments(response.data);
      }
    } catch (err) {
      console.error('Fetch assignments error:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourseDetails();
      fetchResources();
      fetchAssignments();
    }
  }, [id]);

  const handleCreateResource = async (e) => {
    e.preventDefault();
    if (uploading) return;

    setResourceError(null);
    setResourceSuccess(null);

    if (!resourceTitle.trim()) {
      setResourceError('Please enter a title for the learning resource.');
      return;
    }

    if (uploadMode === 'file' && !selectedFile) {
      setResourceError('Please select a file to upload (max 10 MB).');
      return;
    }

    if (uploadMode === 'link' && !resourceLink.trim()) {
      setResourceError('Please enter a valid URL link (e.g., https://...).');
      return;
    }

    setUploading(true);

    try {
      let response;
      if (uploadMode === 'file') {
        const formData = new FormData();
        formData.append('title', resourceTitle.trim());
        formData.append('type', resourceType);
        formData.append('file', selectedFile);
        response = await api.post(`/courses/${id}/resources`, formData);
      } else {
        response = await api.post(`/courses/${id}/resources`, {
          title: resourceTitle.trim(),
          type: resourceType || 'link',
          url: resourceLink.trim(),
        });
      }

      if (response.success && response.data) {
        setResourceSuccess('Learning resource added successfully!');
        setResources((prev) => [...prev, response.data]);
        setResourceTitle('');
        setSelectedFile(null);
        setResourceLink('');
      } else {
        throw new Error(response.message || 'Failed to add resource.');
      }
    } catch (err) {
      console.error('Resource upload error:', err);
      setResourceError(err.data?.message || err.message || 'Unable to upload resource.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (resource) => {
    if (resource.url?.startsWith('http://') || resource.url?.startsWith('https://')) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await api.download(
        `/courses/${id}/resources/${resource._id}/download`,
        `${resource.title || 'course-resource'}`
      );
    } catch (err) {
      console.error('Download error:', err);
      setResourceError(err.data?.message || err.message || 'Failed to download resource.');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (creatingAssignment) return;

    setAssignmentError(null);
    setAssignmentSuccess(null);

    const trimmedTitle = assignmentTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 3) {
      setAssignmentError('Assignment title must be at least 3 characters long.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setAssignmentError('Assignment title cannot exceed 200 characters.');
      return;
    }

    const trimmedDesc = assignmentDescription.trim();
    if (!trimmedDesc) {
      setAssignmentError('Assignment instructions/description are required.');
      return;
    }

    if (!assignmentDeadline) {
      setAssignmentError('Assignment submission deadline is required.');
      return;
    }

    const deadlineDate = new Date(assignmentDeadline);
    if (isNaN(deadlineDate.getTime())) {
      setAssignmentError('Deadline must be a valid date and time.');
      return;
    }
    if (deadlineDate.getTime() <= Date.now()) {
      setAssignmentError('Assignment deadline must be a future date and time.');
      return;
    }

    const score = Number(assignmentMaxScore);
    if (!Number.isFinite(score) || score < 1 || score > 100) {
      setAssignmentError('Maximum score must be a number between 1 and 100.');
      return;
    }

    setCreatingAssignment(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: trimmedDesc,
        deadline: deadlineDate.toISOString(),
        maxScore: score,
        allowLate: Boolean(assignmentAllowLate),
      };

      const response = await api.post(`/courses/${id}/assignments`, payload);
      if (response.success) {
        setAssignmentSuccess('Assignment created successfully and enrolled students have been notified.');
        setAssignmentTitle('');
        setAssignmentDescription('');
        setAssignmentDeadline('');
        setAssignmentMaxScore(100);
        setAssignmentAllowLate(false);
        fetchAssignments();
      } else {
        throw new Error(response.message || 'Failed to create assignment.');
      }
    } catch (err) {
      console.error('Create assignment error:', err);
      setAssignmentError(err.data?.message || err.message || 'Unable to create assignment.');
    } finally {
      setCreatingAssignment(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <LoadingState text="Loading course workspace..." />
      </AppLayout>
    );
  }

  if (error || !course) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/instructor/courses')}
          >
            Back to Courses
          </Button>

          <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Course Access Restricted</h2>
            <p className="text-sm text-rose-300 max-w-md mx-auto">
              {error || 'The requested course does not exist or you do not have teaching authorization for it.'}
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/instructor/courses')}
            >
              Return to My Courses
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const enrolledStudents = Array.isArray(course.enrolledStudents) ? course.enrolledStudents : [];

  const filteredStudents = enrolledStudents.filter((student) => {
    const q = rosterSearch.toLowerCase();
    return (
      student.name?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q) ||
      student.program?.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fadeIn">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/instructor/courses"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-[#00C8FF] hover:text-[#8CEBFF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assigned Courses</span>
          </Link>

          <Badge variant={course.status === 'active' ? 'success' : 'neutral'} size="md" dot>
            Status: {course.status}
          </Badge>
        </div>

        {/* Page Header */}
        <PageHeader
          title={`${course.code} — ${course.title}`}
          subtitle={course.description || 'Teaching course workspace and authorized student roster.'}
          badge={
            <span className="px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
              {course.code}
            </span>
          }
        />

        {/* Course Overview & Identity Banner */}
        <div className="p-6 rounded-2xl border border-[#00C8FF]/30 bg-gradient-to-r from-[#101735] via-[#1C2948] to-[#101735] shadow-glow-cyan-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-extrabold text-white">Course Overview</h2>
                <Badge variant="cyan" size="sm">
                  {course.status}
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-[#8CEBFF]/90 leading-relaxed max-w-3xl">
                {course.description || 'No additional syllabus description registered for this course.'}
              </p>
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="p-4 rounded-xl border border-[#1C2948] bg-[#101735]/80 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Enrolled Students
                </span>
                <p className="text-2xl font-black text-[#00C8FF] mt-0.5">
                  {course.enrolledStudentsCount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Academic Ownership Note */}
          <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-[#00C8FF]/20 bg-[#00C8FF]/5 text-[#8CEBFF] text-xs">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#00C8FF]" />
            <div className="leading-relaxed">
              <span className="font-bold text-white">Coordinator Ownership Boundary:</span> Course creation, 
              archiving, and faculty assignments are administered by Academic Coordinators. Assigned instructors hold teaching authority over course resources and grading.
            </div>
          </div>
        </div>

        {/* Enrolled Students Roster Card */}
        <DashboardCard
          title="Enrolled Student Roster"
          subtitle="Students currently registered and actively participating in this course"
          icon={Users}
        >
          <div className="p-6 space-y-5">
            {/* Roster Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter roster by student name, email, or program..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none transition-all
                    bg-[#101735]/60 dark:bg-[#101735]/60 text-white dark:text-white
                    light:bg-white light:text-gray-900 light:border-gray-300"
                />
              </div>

              <div className="text-xs text-gray-400 font-medium">
                Showing <span className="font-bold text-[#00C8FF]">{filteredStudents.length}</span> of {enrolledStudents.length} enrolled students
              </div>
            </div>

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[#1C2948] bg-[#101735]/20 space-y-2">
                <Users className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-sm font-semibold text-gray-300">
                  {enrolledStudents.length === 0 ? "No Students Enrolled Yet" : "No Matching Students"}
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {enrolledStudents.length === 0
                    ? "Students will appear in this roster once they enroll in this active course through the course catalog."
                    : "No students match the search filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#1C2948] dark:border-[#1C2948] light:border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2948] bg-[#101735]/80 text-gray-400 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Degree Program</th>
                      <th className="py-3 px-4">Academic Year</th>
                      <th className="py-3 px-4">Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2948] text-gray-300">
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.id} 
                        className="hover:bg-[#1C2948]/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00C8FF]/20 to-[#8CEBFF]/10 text-[#00C8FF] font-bold text-xs flex items-center justify-center border border-[#00C8FF]/30">
                              {student.name ? student.name.slice(0, 2).toUpperCase() : 'ST'}
                            </div>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400">
                          {student.email}
                        </td>
                        <td className="py-3 px-4">
                          {student.program || 'Not Specified'}
                        </td>
                        <td className="py-3 px-4">
                          {student.year ? `Year ${student.year}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {formatDate(student.enrolledAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Course Learning Resources (FR-04, Phase 5) */}
        <DashboardCard
          title="Course Learning Resources"
          subtitle="Upload and manage lecture slides, documents, reading materials, and external links for enrolled students (FR-04)."
          icon={FileText}
          badge={
            <Badge variant="cyan" size="sm">
              {resources.length} {resources.length === 1 ? 'Resource' : 'Resources'}
            </Badge>
          }
        >
          <div className="p-6 space-y-6">
            {/* Feedback Alerts */}
            {resourceError && (
              <div className="flex items-start space-x-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 font-medium">{resourceError}</div>
                <button 
                  onClick={() => setResourceError(null)}
                  className="font-semibold text-rose-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {resourceSuccess && (
              <div className="flex items-start space-x-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <div className="flex-1 font-medium">{resourceSuccess}</div>
                <button 
                  onClick={() => setResourceSuccess(null)}
                  className="font-semibold text-emerald-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Resource Upload Form */}
            <form onSubmit={handleCreateResource} className="p-5 rounded-xl border border-[#1C2948] bg-[#101735]/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C2948]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-[#00C8FF]" />
                  <span>Add New Learning Material</span>
                </h4>

                <div className="flex rounded-lg p-0.5 bg-[#1C2948]/60 border border-[#1C2948] text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      uploadMode === 'file'
                        ? 'bg-[#00C8FF] text-[#101735] font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('link')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      uploadMode === 'link'
                        ? 'bg-[#00C8FF] text-[#101735] font-bold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    External Link
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Resource Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    placeholder="e.g. Week 3: RESTful Microservices & Architecture Slides"
                    maxLength={150}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                  />
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Category Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                  >
                    <option value="slides">Slides (PowerPoint / PDF)</option>
                    <option value="document">Document (Word / Text / Notes)</option>
                    <option value="pdf">PDF Handbook / Article</option>
                    <option value="link">External Web Link</option>
                    <option value="video">Video Lecture Reference</option>
                    <option value="other">Other (ZIP Archive / Code)</option>
                  </select>
                </div>
              </div>

              {uploadMode === 'file' ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center justify-between">
                    <span>Select File (Max 10 MB)</span>
                    <span className="text-gray-400 font-mono text-[10px]">PDF, Word, PPT, ZIP, TXT</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="file"
                      id="resourceFileInput"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
                    />
                    <label
                      htmlFor="resourceFileInput"
                      className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1C2948] hover:bg-[#1C2948]/80 text-white border border-[#00C8FF]/30 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#00C8FF]" />
                      <span>{selectedFile ? 'Change File' : 'Browse File...'}</span>
                    </label>
                    <span className="text-xs text-gray-400 truncate max-w-md">
                      {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'No file chosen yet'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Resource URL <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Link2 className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="url"
                      value={resourceLink}
                      onChange={(e) => setResourceLink(e.target.value)}
                      placeholder="https://example.com/lecture-notes"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Upload}
                  isLoading={uploading}
                >
                  Upload Learning Resource
                </Button>
              </div>
            </form>

            {/* Existing Resources List */}
            {resourcesLoading ? (
              <LoadingState text="Loading course resources..." />
            ) : resources.length === 0 ? (
              <EmptyState
                title="No Learning Resources Uploaded"
                message="You have not uploaded any documents, slides, or links to this course yet. Use the form above to add materials for your students."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#1C2948] dark:border-[#1C2948] light:border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2948] bg-[#101735]/80 text-gray-400 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Date Uploaded</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2948] text-gray-300">
                    {resources.map((resItem) => {
                      const isExternal = resItem.url?.startsWith('http://') || resItem.url?.startsWith('https://');

                      return (
                        <tr key={resItem._id} className="hover:bg-[#1C2948]/40 transition-colors">
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30">
                              {resItem.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-[#8CEBFF]" />
                              <span>{resItem.title}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400">
                            {formatDate(resItem.addedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isExternal ? (
                              <a
                                href={resItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C2948] hover:bg-[#1C2948]/80 text-[#00C8FF] border border-[#00C8FF]/30 transition-all"
                              >
                                <span>Open Link</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <button
                                onClick={() => handleDownload(resItem)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00C8FF]/15 text-[#00C8FF] border border-[#00C8FF]/30 hover:bg-[#00C8FF]/25 transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Course Assignments Management (FR-06) */}
        <DashboardCard
          title="Course Assignments"
          subtitle="Create and manage coursework assignments, deadlines, instructions, and scoring"
          icon={GraduationCap}
        >
          <div className="space-y-6">
            {assignmentError && (
              <div className="flex items-start space-x-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1 font-medium">{assignmentError}</div>
                <button 
                  onClick={() => setAssignmentError(null)}
                  className="font-semibold text-rose-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {assignmentSuccess && (
              <div className="flex items-start space-x-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <div className="flex-1 font-medium">{assignmentSuccess}</div>
                <button 
                  onClick={() => setAssignmentSuccess(null)}
                  className="font-semibold text-emerald-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Assignment Creation Form */}
            <form onSubmit={handleCreateAssignment} className="p-5 rounded-xl border border-[#1C2948] bg-[#101735]/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1C2948]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <PlusCircle className="w-4 h-4 text-[#00C8FF]" />
                  <span>Create New Assignment</span>
                </h4>
                <span className="text-[11px] text-gray-400">
                  SRS FR-06 Authoring
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Assignment Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g. Lab 1: REST API Architecture & Express Services"
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                  />
                </div>

                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Maximum Score (1 - 100) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={assignmentMaxScore}
                    onChange={(e) => setAssignmentMaxScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Instructions & Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={assignmentDescription}
                  onChange={(e) => setAssignmentDescription(e.target.value)}
                  placeholder="Detailed instructions, deliverables, requirements, and evaluation criteria for students..."
                  className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white resize-y"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6 space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">
                    Submission Deadline <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C2948] focus:border-[#00C8FF] text-xs outline-none bg-[#101735] text-white"
                  />
                </div>

                <div className="md:col-span-6 flex items-center pt-4 sm:pt-5 space-x-2.5">
                  <input
                    type="checkbox"
                    id="allowLateToggle"
                    checked={assignmentAllowLate}
                    onChange={(e) => setAssignmentAllowLate(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 text-[#00C8FF] focus:ring-0 focus:ring-offset-0 bg-[#101735] cursor-pointer"
                  />
                  <label htmlFor="allowLateToggle" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                    Allow late submissions past deadline
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={PlusCircle}
                  isLoading={creatingAssignment}
                >
                  Create Assignment
                </Button>
              </div>
            </form>

            {/* Published Assignments List */}
            {assignmentsLoading ? (
              <LoadingState text="Loading course assignments..." />
            ) : assignments.length === 0 ? (
              <EmptyState
                title="No Course Assignments Created"
                message="No assignments have been published for this course yet. Use the form above to add an assignment for your students."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#1C2948] dark:border-[#1C2948] light:border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1C2948] bg-[#101735]/80 text-gray-400 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Title & Instructions</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4">Max Score</th>
                      <th className="py-3 px-4">Late Policy</th>
                      <th className="py-3 px-4">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C2948] text-gray-300">
                    {assignments.map((item) => {
                      const isPastDeadline = new Date(item.deadline) < new Date();
                      return (
                        <tr key={item.id} className="hover:bg-[#1C2948]/40 transition-colors">
                          <td className="py-3 px-4 max-w-xs sm:max-w-md">
                            <div className="font-semibold text-white flex items-center space-x-2">
                              <GraduationCap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 pl-6">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Clock className={`w-3.5 h-3.5 ${isPastDeadline ? 'text-rose-400' : 'text-amber-400'}`} />
                              <span className={isPastDeadline ? 'text-rose-400 font-semibold' : 'text-gray-300'}>
                                {formatDateTime(item.deadline)}
                              </span>
                            </div>
                            {isPastDeadline && (
                              <span className="text-[10px] text-rose-400 font-mono block pl-5">Past Due</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-white">{item.maxScore}</span>
                            <span className="text-gray-400 text-[10px] ml-1">pts</span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {item.allowLate ? (
                              <Badge variant="emerald" size="sm">Allowed</Badge>
                            ) : (
                              <Badge variant="gray" size="sm">Disallowed</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-gray-400">
                            {formatDate(item.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>
    </AppLayout>
  );
}
