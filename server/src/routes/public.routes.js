import { Router } from 'express';
import { getPublicContent } from '../controllers/settings.controller.js';
import { Internship } from '../models/Internship.js';
import { Project } from '../models/Project.js';
import { Announcement } from '../models/Announcement.js';

const router = Router();

// GET /api/v1/public/content — Public read of landing page content and active public announcements
router.get('/content', getPublicContent);

// GET /api/v1/public/internships — Public list of open internships
router.get('/internships', async (req, res, next) => {
  try {
    const internships = await Internship.find({ status: 'open' })
      .populate('companyId', 'name')
      .select('title type skills description location deadline companyId createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    // Normalise for the frontend: flatten companyId.name → company, deadline → applicationDeadline
    const normalised = internships.map(i => ({
      _id:                 i._id,
      title:               i.title,
      company:             i.companyId?.name ?? null,
      description:         i.description,
      location:            i.location,
      duration:            i.type,          // e.g. "Remote" / "Hybrid" / "On-site"
      applicationDeadline: i.deadline,
      requirements:        i.skills,
    }));

    res.status(200).json({
      success: true,
      message: 'Public internships retrieved successfully.',
      count: normalised.length,
      internships: normalised,
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

// GET /api/v1/public/announcements — Non-expired announcements targeting public or both
router.get('/announcements', async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      published: true,
      audience: { $in: ['public', 'both'] },
      startsAt: { $lte: now },
      endsAt:   { $gt:  now },
    })
      .select('message audience startsAt endsAt')
      .sort({ startsAt: -1 })
      .limit(20);

    // Normalise field names for the frontend: expose `title` and `publishedAt`
    // so the landing page doesn't need to know the internal schema.
    const normalised = announcements.map(a => ({
      _id:         a._id,
      title:       a.message,
      content:     a.message,   // expose full text as content too
      publishedAt: a.startsAt,
      priority:    'low',   // Announcement model has no priority; default to low
    }));

    res.status(200).json({
      success: true,
      message: 'Public announcements retrieved successfully.',
      count: normalised.length,
      announcements: normalised,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
