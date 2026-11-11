/**
 * Internships & Applications Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-10 (Browse internship listings) · FR-11 (Apply for internships)
 *   FR-12 (Track/withdraw application) · FR-13 (Application status workflow)
 *
 * Authorization:
 *   - All authenticated users may browse open internships.
 *   - Only students may apply, track their own applications, or withdraw.
 *   - Students may only withdraw their own applications (student-side of FR-12).
 *   - Coordinator/admin status updates are out of scope for Phase 11.
 */

import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { escapeRegex, sanitizeMetadata } from '../utils/validation.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/internships
// Browse open internship listings (FR-10, all roles)
// ─────────────────────────────────────────────────────────────────────────────
export const listInternships = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { status: 'open' };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.skills) {
      // Filter by skill safely (case-insensitive escaped regex)
      const safeSkill = escapeRegex(req.query.skills.trim());
      filter.skills = { $elemMatch: { $regex: safeSkill, $options: 'i' } };
    }

    if (req.query.q) {
      const safeTerm = escapeRegex(req.query.q.trim());
      const regex = new RegExp(safeTerm, 'i');
      filter.$or = [{ title: regex }, { description: regex }, { location: regex }];
    }

    const [internships, total] = await Promise.all([
      Internship.find(filter)
        .populate('companyId', 'name website')
        .sort({ deadline: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Internship.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Internship listings retrieved successfully.',
      data: internships,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/internships/:id
// View internship details (FR-10, all roles)
// ─────────────────────────────────────────────────────────────────────────────
export const getInternship = async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('companyId', 'name website')
      .lean();

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found.' });
    }

    // If student, include their own application status if any
    let myApplication = null;
    if (req.user.role === 'student') {
      myApplication = await Application.findOne({
        internshipId: internship._id,
        studentId: req.user._id,
      })
        .select('status appliedAt history')
        .lean();
    }

    return res.status(200).json({
      success: true,
      message: 'Internship details retrieved successfully.',
      data: { ...internship, myApplication },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/internships/:id/applications
// Apply for an internship (student only, FR-11)
// Requires CV to be uploaded on student profile.
// ─────────────────────────────────────────────────────────────────────────────
export const applyForInternship = async (req, res, next) => {
  try {
    const internship = await Internship.findById(req.params.id).lean();

    if (!internship) {
      return res.status(404).json({ success: false, message: 'Internship not found.' });
    }

    if (internship.status !== 'open') {
      return res
        .status(409)
        .json({ success: false, message: 'This internship is no longer accepting applications.' });
    }

    if (new Date() > new Date(internship.deadline)) {
      return res
        .status(409)
        .json({ success: false, message: 'The application deadline has passed.' });
    }

    // Require student to have a CV on their profile (FR-11)
    const student = await User.findById(req.user._id).select('cv').lean();
    if (!student.cv || !student.cv.path) {
      return res.status(422).json({
        success: false,
        message:
          'You must upload a CV to your profile before applying for internships (FR-11).',
      });
    }

    const { message } = req.body;
    if (!message || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A cover letter message (minimum 10 characters) is required.',
      });
    }

    // Duplicate application check (unique index)
    const existing = await Application.findOne({
      internshipId: internship._id,
      studentId: req.user._id,
    }).lean();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this internship.',
      });
    }

    const application = await Application.create({
      internshipId: internship._id,
      studentId: req.user._id,
      message: message.trim(),
      cv: student.cv,
      status: 'Submitted',
      history: [{ status: 'Submitted', byUserId: req.user._id }],
    });

    // Log activity — FR-35
    await ActivityLog.create({
      userId: req.user._id,
      action: 'APPLY_INTERNSHIP',
      targetType: 'Application',
      targetId: application._id,
      meta: sanitizeMetadata({ internshipTitle: internship.title }),
    });

    // In-app notification for student — FR-11, FR-14 (non-blocking)
    try {
      await Notification.create({
        userId: req.user._id,
        type: 'application',
        title: 'Application Submitted',
        message: `Your application for "${internship.title}" has been submitted successfully.`,
        link: '/student/applications',
      });
    } catch (notifErr) {
      // Non-blocking notification dispatch
    }

    // In-app notification for coordinator — FR-11 (non-blocking)
    if (internship.createdBy) {
      try {
        await Notification.create({
          userId: internship.createdBy,
          type: 'application',
          title: 'New Internship Application',
          message: `A student submitted an application for "${internship.title}".`,
          link: '/coordinator/applications',
        });
      } catch (notifErr) {
        // Non-blocking notification dispatch
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      data: application,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already applied for this internship.',
      });
    }
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/applications
// List the authenticated student's own applications (FR-12)
// ─────────────────────────────────────────────────────────────────────────────
export const listMyApplications = async (req, res, next) => {
  try {
    const filter = { studentId: req.user._id };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const applications = await Application.find(filter)
      .populate('internshipId', 'title type location deadline status')
      .sort({ appliedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully.',
      data: applications,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/v1/applications/:id/status
// Student withdraws their own application (FR-12)
// Students may ONLY transition to 'Withdrawn'; coordinator transitions are out of scope here.
// ─────────────────────────────────────────────────────────────────────────────
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      studentId: req.user._id,
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required.' });
    }

    // Students can only withdraw
    if (status !== 'Withdrawn') {
      return res.status(403).json({
        success: false,
        message: 'Students may only withdraw their own applications.',
      });
    }

    if (!application.canTransitionTo(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot transition from '${application.status}' to '${status}'.`,
      });
    }

    application.status = status;
    application.history.push({
      status,
      byUserId: req.user._id,
      notes: notes?.trim() || '',
    });
    await application.save();

    // Log activity — FR-35
    await ActivityLog.create({
      userId: req.user._id,
      action: 'UPDATE_APPLICATION',
      targetType: 'Application',
      targetId: application._id,
      meta: sanitizeMetadata({ newStatus: status }),
    });

    // In-app notification for student — FR-11, FR-14 (non-blocking)
    try {
      await Notification.create({
        userId: req.user._id,
        type: 'application',
        title: 'Application Withdrawn',
        message: 'You have withdrawn your internship application.',
        link: '/student/applications',
      });
    } catch (notifErr) {
      // Non-blocking notification dispatch
    }

    return res.status(200).json({
      success: true,
      message: 'Application status updated successfully.',
      data: application,
    });
  } catch (err) {
    next(err);
  }
};
