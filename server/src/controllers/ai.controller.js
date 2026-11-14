/**
 * AI Learning Assistant Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-19 (AI Study Plan Generator) · FR-20 (AI Question Answering)
 *   FR-21 (AI Internship Skill Matching)
 *
 * Constraint CON-05 Compliance:
 *   - Read-only educational assistance.
 *   - Does not modify database records.
 *   - Every response includes an explicit guidance notice / disclaimer.
 *   - Student-only educational support per Module M8 and Section 12.3.
 */

import { Enrollment } from '../models/Enrollment.js';
import { Course } from '../models/Course.js';
import { Assignment } from '../models/Assignment.js';
import { Internship } from '../models/Internship.js';
import { User } from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/study-plan
// Generate an adaptive study plan based on enrolled courses and deadlines (FR-19)
// ─────────────────────────────────────────────────────────────────────────────
export const generateStudyPlan = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const parsed = parseInt(req.body.availableHours, 10);
    const availableHours = isNaN(parsed) ? 3 : Math.max(1, Math.min(12, parsed));

    // 1. Fetch student's enrolled courses
    const enrollments = await Enrollment.find({ studentId }).select('courseId').lean();
    const courseIds = enrollments.map((e) => e.courseId);

    const courses = await Course.find({ _id: { $in: courseIds }, status: 'active' })
      .select('code title')
      .lean();

    // 2. Fetch upcoming assignments for these courses
    const now = new Date();
    const upcomingAssignments = await Assignment.find({
      courseId: { $in: courseIds },
      deadline: { $gte: now },
    })
      .select('title courseId deadline')
      .sort({ deadline: 1 })
      .limit(5)
      .lean();

    // 3. Synthesize study schedule blocks
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const plan = [];
    const numDays = Math.min(7, Math.max(3, Math.ceil(availableHours * 1.5)));

    for (let i = 0; i < numDays; i++) {
      const dayName = `Day ${i + 1} (${days[i % 7]})`;
      const assignedCourse = courses.length > 0 ? courses[i % courses.length] : null;
      const relatedAssignment = upcomingAssignments.find(
        (a) => assignedCourse && a.courseId.toString() === assignedCourse._id.toString()
      );

      const topics = assignedCourse
        ? [`Review lecture concepts for ${assignedCourse.code} — ${assignedCourse.title}`, `Work through practice exercises and lab modules`]
        : ['General coursework and foundational concept review'];

      plan.push({
        day: dayName,
        allocatedHours: Math.round((availableHours / numDays) * 10) / 10 || 1,
        courseCode: assignedCourse ? assignedCourse.code : 'GEN101',
        topics,
        assignment: relatedAssignment ? relatedAssignment.title : 'Self-paced concept study',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Study plan generated.',
      data: {
        guidanceNotice: 'This study plan is AI-generated for guidance only.',
        availableHours,
        enrolledCoursesCount: courses.length,
        plan,
      },
      pagination: null,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/ai/ask
// Educational Q&A support for student course concepts (FR-20)
// ─────────────────────────────────────────────────────────────────────────────
export const askQuestion = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A valid question string (minimum 3 characters) is required.',
      });
    }

    const trimmed = question.trim().toLowerCase();

    // Generate responsive educational explanations based on core course domains
    let answer = '';
    if (trimmed.includes('authenticate') || trimmed.includes('authorize')) {
      answer = 'Authentication verifies the identity of the user (e.g. via JWT tokens), while authorization determines whether the identified user has permission to access a specific route or perform an action.';
    } else if (trimmed.includes('rest') || trimmed.includes('api')) {
      answer = 'REST (Representational State Transfer) is an architectural style for networked applications using standard HTTP verbs (GET, POST, PUT, PATCH, DELETE) and stateless client-server communication.';
    } else if (trimmed.includes('deadline') || trimmed.includes('late')) {
      answer = 'Assignments have deadline timestamps set by the instructor. If late submissions are permitted (allowLate: true), you may still submit after the deadline, though late policies may apply.';
    } else if (trimmed.includes('internship') || trimmed.includes('cv')) {
      answer = 'To apply for an internship on CampusBridge, upload a valid PDF or Word CV (up to 2MB) to your profile and draft a cover message. Academic Coordinators review and forward applications.';
    } else if (trimmed.includes('progress') || trimmed.includes('grade')) {
      answer = 'Course progress is calculated from the proportion of completed assignments. Once your instructor evaluates and grades your submissions, your average score and progress analytics are recalculated.';
    } else {
      answer = `To master "${question.trim()}", focus on core fundamentals, review lecture slides, and build hands-on practice implementations. Consult your course instructor or coordinator for specific grading criteria.`;
    }

    return res.status(200).json({
      success: true,
      message: 'AI answer generated.',
      data: {
        guidanceNotice: 'AI responses are for educational support. Refer to instructor lectures for definitive criteria.',
        question: question.trim(),
        answer,
      },
      pagination: null,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/ai/internship-matches
// Match student profile skills against open internships (FR-21)
// ─────────────────────────────────────────────────────────────────────────────
export const getInternshipMatches = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id).select('skills').lean();
    const studentSkills = (student?.skills || []).map((s) => s.toLowerCase().trim());

    const openInternships = await Internship.find({ status: 'open' })
      .populate('companyId', 'name')
      .lean();

    const matches = [];

    for (const item of openInternships) {
      const requiredSkills = item.skills || [];
      const matched = [];
      const missing = [];

      for (const reqSkill of requiredSkills) {
        const normalized = reqSkill.toLowerCase().trim();
        if (studentSkills.some((s) => s.includes(normalized) || normalized.includes(s))) {
          matched.push(reqSkill);
        } else {
          missing.push(reqSkill);
        }
      }

      const matchRatio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0;
      const score = Math.round(matchRatio * 100);

      matches.push({
        internshipId: item._id.toString(),
        title: item.title,
        companyName: item.companyId ? item.companyId.name : 'Partner Organization',
        type: item.type,
        location: item.location || 'Remote',
        deadline: item.deadline ? item.deadline.toISOString() : null,
        matchPercentage: score,
        matchedSkills: matched,
        missingSkills: missing,
      });
    }

    // Rank matches by score descending
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    return res.status(200).json({
      success: true,
      message: 'Internship matches retrieved.',
      data: {
        guidanceNotice: 'Skill match scores are heuristic indicators based on profile keywords.',
        studentSkillCount: studentSkills.length,
        matches,
      },
      pagination: null,
    });
  } catch (err) {
    next(err);
  }
};
