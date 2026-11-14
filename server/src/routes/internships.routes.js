/**
 * Internships & Applications Routes
 * Phase 11 — FR-10, FR-11, FR-12, FR-13
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  listInternships,
  getInternship,
  applyForInternship,
  listMyApplications,
  updateApplicationStatus,
} from '../controllers/internships.controller.js';
import { getForwardedApplications } from '../controllers/reports.controller.js';
import { Internship } from '../models/Internship.js';

const router = Router();

// Create internship — coordinator & admin only
router.post('/', authenticate, authorize('coordinator', 'admin'), async (req, res, next) => {
  try {
    const {
      title, company, companyId,
      description, location, duration,
      requirements, applicationDeadline, startDate,
      type, skills,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    // Resolve companyId — use provided or auto-create a placeholder for test/demo use
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && company) {
      const { PartnerOrganization } = await import('../models/PartnerOrganization.js');
      let org = await PartnerOrganization.findOne({ name: company.trim() });
      if (!org) {
        org = await PartnerOrganization.create({
          name: company.trim(),
          contactPerson: 'TBD',
          email: `contact@testcompany.edu`,
          approved: true,
          approvedBy: req.user._id,
          createdBy: req.user._id,
        });
      }
      resolvedCompanyId = org._id;
    }

    if (!resolvedCompanyId) {
      return res.status(400).json({ success: false, message: 'Company name or companyId is required.' });
    }

    const deadline = applicationDeadline ? new Date(applicationDeadline)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const internship = new Internship({
      title: title.trim(),
      companyId: resolvedCompanyId,
      createdBy: req.user._id,
      type: type || 'Remote',
      skills: Array.isArray(skills) ? skills : (skills ? [skills] : ['General']),
      description: description ? description.trim() : title.trim(),
      requirements: Array.isArray(requirements) ? requirements : (requirements ? [requirements] : ['Open to all students']),
      location: location ? location.trim() : '',
      deadline,
      status: 'open',
    });

    await internship.save();
    res.status(201).json({ success: true, message: 'Internship created successfully.', internship });
  } catch (error) {
    next(error);
  }
});

// Browse open internships — all roles
router.get('/', authenticate, listInternships);
router.get('/:id', authenticate, getInternship);

// Forwarded applications for internship — coordinator & admin (Section 12.3)
router.get('/:id/forwarded', authenticate, authorize('coordinator', 'admin'), getForwardedApplications);

// Apply for internship — students only (FR-11)
router.post('/:id/applications', authenticate, authorize('student'), applyForInternship);

export default router;
