import { Router } from 'express';
import { getPublicContent } from '../controllers/settings.controller.js';
import { Internship } from '../models/Internship.js';
import { Project } from '../models/Project.js';
import { Announcement } from '../models/Announcement.js';

const router = Router();

// GET /api/v1/public/content — Public read of landing page content and active public announcements
router.get('/content', getPublicContent);

// GET /api/v1/public/internships — Public list of active internships
router.get('/internships', async (req, res, next) => {
  try {
    const internships = await Internship.find({ deletedAt: null, status: 'active' })
      .select('title company description location duration requirements applicationDeadline startDate')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      message: 'Public internships retrieved successfully.',
      count: internships.length,
      internships,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/public/projects — Public list of published projects
router.get('/projects', async (req, res, next) => {
  try {
    const projects = await Project.find({ deletedAt: null, visibility: 'public' })
      .populate('students', 'name email program')
      .select('title description technologies status students createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      message: 'Public projects retrieved successfully.',
      count: projects.length,
      projects,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/public/announcements — Public announcements
router.get('/announcements', async (req, res, next) => {
  try {
    const announcements = await Announcement.find({
      deletedAt: null,
      visibility: 'public',
      publishedAt: { $lte: new Date() },
    })
      .select('title content priority publishedAt')
      .sort({ publishedAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      message: 'Public announcements retrieved successfully.',
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
