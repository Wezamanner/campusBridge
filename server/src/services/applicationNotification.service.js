/**
 * Application Notification Service & Event Integration
 *
 * Phase 12 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-14 (Users are notified of application updates)
 *   FR-11, FR-12 (Internship Application Lifecycle)
 *
 * Cross-Team Responsibility Contract:
 *   Developer 3 (Coordinator) owns the review and status change workflow.
 *   This service implements the event consumer that creates the in-app notification
 *   for the student when Developer 3 emits the agreed APPLICATION_STATUS_CHANGED event.
 */

import EventEmitter from 'events';
import { Notification } from '../models/Notification.js';

export const applicationEvents = new EventEmitter();

/**
 * Handle application status changed event emitted by Coordinator workflow.
 *
 * @param {Object} payload
 * @param {string} payload.applicationId - Unique ID of the application
 * @param {string} payload.studentId - User ID of the student
 * @param {string} [payload.previousStatus] - Previous status before transition
 * @param {string} payload.newStatus - Updated status ('Under review', 'Forwarded', 'Accepted', 'Rejected', 'Withdrawn')
 * @param {string} [payload.internshipId] - Associated internship ID
 * @param {string} [payload.internshipTitle] - Associated internship job title
 * @param {Date|string} [payload.timestamp] - Time of status change
 * @returns {Promise<Object>} Result object with status and created/existing notification
 */
export async function handleApplicationStatusChanged(payload) {
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid event payload' };
  }

  const {
    applicationId,
    studentId,
    newStatus,
    internshipTitle = 'the internship',
    internshipId = null,
  } = payload;

  if (!applicationId || !studentId || !newStatus) {
    return {
      success: false,
      error: 'Missing required fields in payload (applicationId, studentId, newStatus required)',
    };
  }

  const expectedTitle = `Application ${newStatus}`;
  const targetLink = '/student/applications';

  try {
    // Deduplication check: verify student has not already received notification for this application and status
    const existing = await Notification.findOne({
      userId: studentId,
      type: 'application',
      title: expectedTitle,
      link: targetLink,
    }).lean();

    if (existing) {
      return {
        success: true,
        duplicate: true,
        message: 'Notification already dispatched for this status transition.',
        notification: existing,
      };
    }

    // Build human-friendly message based on status
    let messageText = `Your application for "${internshipTitle}" has been updated to "${newStatus}".`;
    if (newStatus === 'Forwarded') {
      messageText = `Your application for "${internshipTitle}" has been forwarded to the partner employer.`;
    } else if (newStatus === 'Accepted') {
      messageText = `Congratulations! Your application for "${internshipTitle}" was accepted.`;
    } else if (newStatus === 'Rejected') {
      messageText = `Update regarding your application for "${internshipTitle}": The position has been filled.`;
    }

    const notification = await Notification.create({
      userId: studentId,
      type: 'application',
      title: expectedTitle,
      message: messageText,
      link: targetLink,
    });

    return {
      success: true,
      duplicate: false,
      notification,
    };
  } catch (err) {
    console.error('[Application Notification Dispatch Error]:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// Wire the event emitter listener
applicationEvents.on('APPLICATION_STATUS_CHANGED', async (payload) => {
  try {
    await handleApplicationStatusChanged(payload);
  } catch (err) {
    console.error('[Application Event Bus Listener Error]:', err.message);
  }
});
