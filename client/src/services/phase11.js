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
