import api from './api.js';

export const projectsService = {
  list: (status) => api.get(status ? `/projects?status=${encodeURIComponent(status)}` : '/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

export const tasksService = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.priority) q.append('priority', params.priority);
    if (params.projectId) q.append('projectId', params.projectId);
    const queryString = q.toString();
    return api.get(queryString ? `/tasks?${queryString}` : '/tasks');
  },
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export const internshipsService = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search || params.q) q.append('q', params.search || params.q);
    if (params.skills) q.append('skills', params.skills);
    if (params.type) q.append('type', params.type);
    if (params.page) q.append('page', params.page);
    const queryString = q.toString();
    return api.get(queryString ? `/internships?${queryString}` : '/internships');
  },
  getById: (id) => api.get(`/internships/${id}`),
  apply: (id, data) => api.post(`/internships/${id}/applications`, data),
  myApplications: (status) =>
    api.get(status ? `/applications?status=${encodeURIComponent(status)}` : '/applications'),
  withdrawApplication: (id) => api.patch(`/applications/${id}/status`, { status: 'Withdrawn' }),
};

export const aiService = {
  generateStudyPlan: (availableHours = 3) => api.post('/ai/study-plan', { availableHours }),
  ask: (question) => api.post('/ai/ask', { question }),
  getInternshipMatches: () => api.get('/ai/internship-matches'),
};

export const achievementsService = {
  getBadges: () => api.get('/achievements'),
  getRankings: () => api.get('/rankings'),
};

export const messagesService = {
  getConversations: () => api.get('/messages/conversations'),
  getThread: (userId, page = 1) => api.get(`/messages/with/${userId}?page=${page}`),
  send: (recipientId, body) => api.post('/messages', { recipientId, body }),
};

export const notificationsService = {
  list: (unreadOnly = false) => api.get(unreadOnly ? '/notifications?unread=true' : '/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const activityService = {
  getRecent: (limit = 10) => api.get(`/activity/recent?limit=${limit}`),
  getWeekly: () => api.get('/activity/weekly'),
};

export const searchService = {
  search: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12.5 Services: Admin, Coordinator, and Reports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin Services - User Management (FR-22)
 * Authorization: Admin only
 */
export const adminService = {
  /**
   * List users with filtering and pagination
   * @param {Object} params - Query parameters (role, active, search, page, limit, sortBy, sortOrder, includeDeleted)
   * @returns {Promise<{success: boolean, data: Array, pagination: Object}>}
   */
  listUsers: (params = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.append('role', params.role);
    if (params.active !== undefined) q.append('active', params.active.toString());
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortOrder) q.append('sortOrder', params.sortOrder);
    if (params.includeDeleted) q.append('includeDeleted', 'true');
    const queryString = q.toString();
    return api.get(queryString ? `/admin/users?${queryString}` : '/admin/users');
  },

  /**
   * Update user profile, role, or active status
   * @param {string} userId - Target user ID
   * @param {Object} updates - Fields to update (role, active, name, email, department, program, year)
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  updateUser: (userId, updates) => {
    return api.patch(`/admin/users/${userId}`, updates);
  },

  // Phase 13.1: Staff Account Creation
  /**
    * Create staff account (instructor or coordinator)
    * @param {Object} userData - User details (name, email, role, passwordHash, department)
    * @returns {Promise<{success: boolean, data: Object}>}
    */
  createStaffUser: (userData) => {
    return api.post('/admin/users', userData);
  },

  // Phase 14: Settings and Public Content Management
  /**
   * Get admin system settings (UC-A03)
   */
  getSettings: () => {
    return api.get('/admin/settings');
  },

  /**
   * Update admin system settings (UC-A03, FR-24)
   * @param {Object} settings - { registrationOpen }
   */
  updateSettings: (settings) => {
    return api.put('/admin/settings', settings);
  },

  /**
   * Get all announcements for admin (UC-A03, UC-A04)
   */
  getAnnouncements: (params = {}) => {
    const q = new URLSearchParams();
    if (params.published !== undefined) q.append('published', params.published.toString());
    if (params.audience) q.append('audience', params.audience);
    const queryString = q.toString();
    return api.get(queryString ? `/admin/announcements?${queryString}` : '/admin/announcements');
  },

  /**
   * Create announcement (UC-A03, FR-24)
   * @param {Object} data - { message, audience, startsAt, endsAt, published }
   */
  createAnnouncement: (data) => {
    return api.post('/admin/announcements', data);
  },
  /**
   * Update an existing announcement (FR-47)
   * @param {string} id - Announcement ID
   * @param {Object} updates - { message, audience, startsAt, endsAt, published }
   */
  updateAnnouncement: (id, updates) => {
    return api.put(`/admin/announcements/${id}`, updates);
  },
  /**
   * Delete an announcement (FR-47)
   * @param {string} id - Announcement ID
   */
  deleteAnnouncement: (id) => {
    return api.delete(`/admin/announcements/${id}`);
  },

  /**
   * Preview an announcement before publishing (FR-47)
   * @param {Object} data - { message, audience, endsAt }
   */
  previewAnnouncement: (data) => {
    return api.post('/admin/announcements/preview', data);
  },

  /**
   * Update public website content (UC-A04, FR-47)
   * @param {Object} content - { heroTitle, heroSubtitle, aboutText, announcementBanner }
   */
  updatePublicContent: (content) => {
    return api.put('/admin/public/content', content);
  },
};

/**
 * Coordinator Services - Organization Management (FR-13, UC-C02)
 * Authorization: Coordinator only
 */
export const coordinatorService = {
  /**
   * List partner organizations with filtering and pagination
   * @param {Object} params - Query parameters (approved, search, page, limit)
   * @returns {Promise<{success: boolean, data: Array, pagination: Object}>}
   */
  listOrganizations: (params = {}) => {
    const q = new URLSearchParams();
    if (params.approved !== undefined) q.append('approved', params.approved.toString());
    if (params.search) q.append('search', params.search);
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    const queryString = q.toString();
    return api.get(queryString ? `/coordinator/organizations?${queryString}` : '/coordinator/organizations');
  },

  /**
   * Approve a partner organization (idempotent)
   * @param {string} organizationId - Organization ID to approve
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  approveOrganization: (organizationId) => {
    return api.patch(`/coordinator/organizations/${organizationId}/approve`);
  },

  // Phase 13.1: Internship & Application Management
  /**
   * Create new internship posting (UC-C03)
   * @param {Object} data - Internship details
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  createInternship: (data) => {
    return api.post('/coordinator/internships', data);
  },

  /**
   * List all applications (UC-C05)
   * @param {Object} params - Query parameters (status, internshipId, page, limit)
   * @returns {Promise<{success: boolean, data: Array, pagination: Object}>}
   */
  listAllApplications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.internshipId) q.append('internshipId', params.internshipId);
    if (params.studentId) q.append('studentId', params.studentId);  // D3: studentId filter
    if (params.page) q.append('page', params.page.toString());
    if (params.limit) q.append('limit', params.limit.toString());
    const queryString = q.toString();
    return api.get(queryString ? `/coordinator/applications?${queryString}` : '/coordinator/applications');
  },

  /**
   * Forward application to company (UC-C06)
   * @param {string} applicationId - Application ID
   * @param {string} notes - Optional coordinator notes
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  forwardApplication: (applicationId, notes = '') => {
    return api.patch(`/coordinator/applications/${applicationId}/forward`, { notes });
  },

  /**
   * Record company decision (UC-C07)
   * @param {string} applicationId - Application ID
   * @param {string} decision - 'Accepted' or 'Rejected'
   * @param {string} notes - Optional decision notes
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  recordCompanyDecision: (applicationId, decision, notes = '') => {
    return api.patch(`/coordinator/applications/${applicationId}/decision`, { decision, notes });
  },

  /**
   * Get forwarded applications for an internship (Section 12.3)
   * @param {string} internshipId - Internship ID
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  getForwardedApplications: (internshipId) => {
    return api.get(`/internships/${internshipId}/forwarded`);
  },
};

/**
 * Reports Services - CSV Export Generation (FR-18, FR-26)
 * Authorization: Progress (instructor/coordinator/admin), Applications (coordinator/admin)
 */
export const reportsService = {
  /**
   * Download student progress report as CSV
   * Instructors see only assigned courses; coordinators/admins see all.
   * @param {Object} params - Query parameters (courseCode)
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  downloadProgressReport: (params = {}) => {
    const q = new URLSearchParams();
    if (params.courseCode) q.append('courseCode', params.courseCode);
    const queryString = q.toString();
    const endpoint = queryString ? `/reports/progress?${queryString}` : '/reports/progress';
    return api.download(endpoint, `progress-report-${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Download internship applications report as CSV
   * @param {Object} params - Query parameters (status, startDate, endDate)
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  downloadApplicationsReport: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    const queryString = q.toString();
    const endpoint = queryString ? `/reports/applications?${queryString}` : '/reports/applications';
    return api.download(endpoint, `applications-report-${new Date().toISOString().split('T')[0]}.csv`);
  },

  /**
   * Download user directory report as CSV (UC-A05, FR-18, FR-26)
   * @param {Object} params - Query parameters (role, active)
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  downloadUsersReport: (params = {}) => {
    const q = new URLSearchParams();
    if (params.role) q.append('role', params.role);
    if (params.active !== undefined) q.append('active', params.active.toString());
    const queryString = q.toString();
    const endpoint = queryString ? `/reports/users?${queryString}` : '/reports/users';
    return api.download(endpoint, `users-report-${new Date().toISOString().split('T')[0]}.csv`);
  },
};

/**
 * Public and General Services (UC-G01 to UC-G07, FR-24, FR-46)
 */
export const publicService = {
  /**
   * Get public system settings
   */
  getSettings: () => {
    return api.get('/settings');
  },

  /**
   * Get public website content and active announcements
   */
  getContent: () => {
    return api.get('/public/content');
  },

  /**
   * Get active dashboard announcements for authenticated user
   */
  getDashboardAnnouncements: () => {
    return api.get('/announcements');
  },
};
