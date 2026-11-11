/**
 * Search Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-42 (Global search across courses, internships)
 *   ASM-06 (Search results must respect role-based visibility)
 *
 * Authorization:
 *   - All authenticated users may search.
 *   - Results are scoped by the caller's role (ASM-06).
 *   - Students: see active courses (with enrollment status) + open internships.
 *   - Instructors: see active courses.
 *   - Coordinators/Admins: see all.
 *
 * NOTE: Search over assignments, grades, submissions is blocked until
 *       Phases 6, 7, 8 are implemented. These entities are excluded.
 */

import { Course } from '../models/Course.js';
import { Internship } from '../models/Internship.js';
import { Enrollment } from '../models/Enrollment.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { escapeRegex } from '../utils/validation.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/search?q=
// Global search (FR-42, ASM-06)
// ─────────────────────────────────────────────────────────────────────────────
export const globalSearch = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters.',
      });
    }

    const safeQ = escapeRegex(q);
    const regex = new RegExp(safeQ, 'i');
    const results = { courses: [], internships: [], projects: [], tasks: [] };

    // ── Courses ──────────────────────────────────────────────────────────────
    const courseFilter = {
      status: 'active',
      $or: [{ title: regex }, { code: regex }, { description: regex }],
    };

    // Instructors only see their own courses in search per access control
    if (req.user.role === 'instructor') {
      courseFilter.instructorId = req.user._id;
    }

    const courses = await Course.find(courseFilter)
      .populate('instructorId', 'firstName lastName')
      .select('-resources')
      .limit(10)
      .lean();

    if (req.user.role === 'student' && courses.length > 0) {
      const enrollments = await Enrollment.find({
        studentId: req.user._id,
        courseId: { $in: courses.map((c) => c._id) },
      })
        .select('courseId')
        .lean();
      const enrolledSet = new Set(enrollments.map((e) => e.courseId.toString()));
      results.courses = courses.map((c) => ({
        ...c,
        isEnrolled: enrolledSet.has(c._id.toString()),
        _type: 'course',
      }));
    } else {
      results.courses = courses.map((c) => ({ ...c, _type: 'course' }));
    }

    // ── Internships ───────────────────────────────────────────────────────────
    // All roles may search open internships (FR-10)
    const internshipFilter = {
      status: 'open',
      $or: [{ title: regex }, { description: regex }, { location: regex }],
    };

    const internships = await Internship.find(internshipFilter)
      .populate('companyId', 'name')
      .select('title type location skills deadline status companyId')
      .limit(10)
      .lean();

    results.internships = internships.map((i) => ({ ...i, _type: 'internship' }));

    // ── Personal Projects & Tasks (Student only, ASM-02 & ASM-06) ────────────
    if (req.user.role === 'student') {
      const [projects, tasks] = await Promise.all([
        Project.find({
          ownerId: req.user._id,
          archived: false,
          $or: [{ name: regex }, { description: regex }],
        })
          .select('name description status dueDate')
          .limit(5)
          .lean(),
        Task.find({
          ownerId: req.user._id,
          title: regex,
        })
          .select('title priority status dueDate projectId')
          .limit(5)
          .lean(),
      ]);

      results.projects = projects.map((p) => ({ ...p, _type: 'project' }));
      results.tasks = tasks.map((t) => ({ ...t, _type: 'task' }));
    }

    const totalResults =
      results.courses.length +
      results.internships.length +
      results.projects.length +
      results.tasks.length;

    return res.status(200).json({
      success: true,
      message: `Search returned ${totalResults} result(s) for "${q}".`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};
