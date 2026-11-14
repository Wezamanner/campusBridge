/**
 * At-Risk Student Monitoring API Service
 *
 * Phase 10 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability: UC-I03, FR-16, FR-44
 *
 * All requests use the shared api utility (Bearer JWT injected automatically).
 * No student IDs or instructor IDs are hard-coded or client-trusted.
 */

import { api } from './api.js';

/**
 * Retrieve all at-risk students across the authenticated instructor's assigned courses.
 * @param {{ courseCode?: string, flag?: 'lowProgress'|'missedDeadlines'|'inactivity' }} [filters]
 * @returns {Promise<{ atRiskStudents, summary, dataAvailability }>}
 */
export async function fetchAtRiskStudents(filters = {}) {
  const params = new URLSearchParams();
  if (filters.courseCode) params.append('courseCode', filters.courseCode.toUpperCase());
  if (filters.flag) params.append('flag', filters.flag);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await api.get(`/instructor/at-risk${query}`);
  return response.data;
}

/**
 * Retrieve full at-risk assessment for a single student in a specific course.
 * @param {string} studentId — MongoDB ObjectId
 * @param {string} courseId  — MongoDB ObjectId
 * @returns {Promise<SingleStudentAssessment>}
 */
export async function fetchStudentAtRiskDetail(studentId, courseId) {
  const response = await api.get(`/instructor/at-risk/${studentId}?courseId=${courseId}`);
  return response.data;
}

/**
 * Retrieve lightweight monitoring summary for the instructor dashboard stat card.
 * @returns {Promise<{ summary, dataAvailability }>}
 */
export async function fetchAtRiskSummary() {
  const response = await api.get('/instructor/at-risk/summary');
  return response.data;
}

/**
 * Retrieve metadata about all defined risk indicators and their data availability.
 * @returns {Promise<{ indicators: Indicator[] }>}
 */
export async function fetchRiskIndicators() {
  const response = await api.get('/instructor/at-risk/indicators');
  return response.data;
}
