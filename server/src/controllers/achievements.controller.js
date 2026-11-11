/**
 * Achievements & Cohort Rankings Controller
 *
 * Phase 11 — CampusBridge SRS v2.0 Compliance
 *
 * SRS Traceability:
 *   FR-17 (Achievement badges and student cohort rankings)
 *
 * Business Rules:
 *   - Badges are awarded for milestones (first submission, task master, early bird, etc.).
 *   - Rankings rank students by average submission score.
 *   - FR-17 Privacy Rule: Leaderboard displays first name and last initial ONLY (e.g. "Alex R."),
 *     never exposing full last names or private contact info.
 */

import { Achievement } from '../models/Achievement.js';
import { User } from '../models/User.js';
import { Progress } from '../models/Progress.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
import { Task } from '../models/Task.js';
import { Project } from '../models/Project.js';
import { Application } from '../models/Application.js';

// Format name for FR-17 privacy: "Alex R."
function formatDisplayName(user) {
  if (!user) return 'Student';
  const first = user.firstName || (user.name ? user.name.split(' ')[0] : 'Student');
  const last = user.lastName || (user.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(-1)[0] : '');
  const initial = last ? `${last.charAt(0).toUpperCase()}.` : '';
  return initial ? `${first} ${initial}` : first;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/achievements
// Retrieve achievement badges for the authenticated student (FR-17)
// ─────────────────────────────────────────────────────────────────────────────
export const getAchievements = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Check and auto-award milestone badges based on real student records
    const [hasSubmission, doneTasksCount, hasProject, hasApp, hasHighProgress] = await Promise.all([
      Submission.exists({ studentId: userId }),
      Task.countDocuments({ ownerId: userId, status: 'done' }),
      Project.exists({ ownerId: userId, archived: false }),
      Application.exists({ studentId: userId }),
      Progress.exists({ studentId: userId, averageScore: { $gte: 90 } }),
    ]);

    const awardsToEvaluate = [];

    if (hasSubmission) {
      awardsToEvaluate.push({
        badgeId: 'FIRST_SUBMISSION',
        title: 'First Step',
        description: 'Submitted your first assignment on CampusBridge.',
        icon: 'award',
      });
    }

    if (doneTasksCount >= 3) {
      awardsToEvaluate.push({
        badgeId: 'TASK_MASTER',
        title: 'Task Master',
        description: 'Successfully completed 3 or more personal productivity tasks.',
        icon: 'check-circle',
      });
    }

    if (hasProject) {
      awardsToEvaluate.push({
        badgeId: 'PROJECT_BUILDER',
        title: 'Project Builder',
        description: 'Created your first personal portfolio or study project.',
        icon: 'folder-plus',
      });
    }

    if (hasApp) {
      awardsToEvaluate.push({
        badgeId: 'INTERNSHIP_APPLICANT',
        title: 'Career Explorer',
        description: 'Submitted your first internship application with profile CV.',
        icon: 'briefcase',
      });
    }

    if (hasHighProgress) {
      awardsToEvaluate.push({
        badgeId: 'HIGH_ACHIEVER',
        title: 'Academic Distinction',
        description: 'Achieved an average course grade score of 90% or higher.',
        icon: 'star',
      });
    }

    // Upsert awards idempotently
    for (const badge of awardsToEvaluate) {
      await Achievement.findOneAndUpdate(
        { userId, badgeId: badge.badgeId },
        {
          userId,
          badgeId: badge.badgeId,
          title: badge.title,
          description: badge.description,
          icon: badge.icon,
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    const achievements = await Achievement.find({ userId })
      .sort({ awardedAt: -1 })
      .lean();

    const formatted = achievements.map((a) => ({
      id: a._id.toString(),
      badgeId: a.badgeId,
      title: a.title,
      description: a.description,
      icon: a.icon,
      awardedAt: a.awardedAt ? a.awardedAt.toISOString() : a.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      message: 'Achievements retrieved.',
      data: formatted,
      pagination: null,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/rankings
// Retrieve student cohort leaderboard by average score (FR-17)
// Enforces FR-17 privacy: first name + last initial only
// ─────────────────────────────────────────────────────────────────────────────
export const getRankings = async (req, res, next) => {
  try {
    const currentUserId = req.user._id.toString();

    // Aggregate average scores per student from Progress records
    const progressStats = await Progress.aggregate([
      {
        $group: {
          _id: '$studentId',
          averageScore: { $avg: '$averageScore' },
          totalCompleted: { $sum: '$submittedCount' },
        },
      },
      { $sort: { averageScore: -1, totalCompleted: -1 } },
    ]);

    const studentIds = progressStats.map((p) => p._id);
    const users = await User.find({ _id: { $in: studentIds }, role: 'student', active: true })
      .select('_id name firstName lastName email')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const leaderboard = [];
    let myRank = null;
    let myAverageScore = 0;

    let rankCounter = 1;
    for (const item of progressStats) {
      const uId = item._id.toString();
      const user = userMap.get(uId);
      if (!user) continue;

      const roundedScore = Math.round(item.averageScore * 10) / 10;
      const isCurrentUser = uId === currentUserId;

      if (isCurrentUser) {
        myRank = rankCounter;
        myAverageScore = roundedScore;
      }

      leaderboard.push({
        rank: rankCounter++,
        displayName: formatDisplayName(user),
        averageScore: roundedScore,
        isCurrentUser,
      });
    }

    // If current student has no grades yet, calculate standing as unranked
    if (!myRank) {
      const myProgress = await Progress.find({ studentId: req.user._id }).lean();
      if (myProgress.length > 0) {
        const avg = myProgress.reduce((sum, p) => sum + (p.averageScore || 0), 0) / myProgress.length;
        myAverageScore = Math.round(avg * 10) / 10;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Rankings retrieved.',
      data: {
        myRank,
        myAverageScore,
        leaderboard: leaderboard.slice(0, 50), // top 50
      },
      pagination: null,
    });
  } catch (err) {
    next(err);
  }
};
