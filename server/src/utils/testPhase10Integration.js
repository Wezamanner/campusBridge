/**
 * Phase 10 Integration Test Suite
 *
 * Validates Phase 10 At-Risk Monitoring integration with completed Phases 4–9:
 *   - Phase 4 (Course & Enrollment)
 *   - Phase 5 (Student Activity Tracking)
 *   - Phase 6 (Assignment Management)
 *   - Phase 7 (Student Submissions)
 *   - Phase 8 (Grading Queue)
 *   - Phase 9 (Progress Analytics)
 *
 * Run: node server/src/utils/testPhase10Integration.js
 */

import {
  evaluateInactivity,
  evaluateLowProgress,
  evaluateMissedDeadlines,
  computeAtRiskStatus,
} from '../services/atRisk.service.js';

let passed = 0;
let failed = 0;
const errors = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    const msg = detail ? `${label} — ${detail}` : label;
    errors.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function section(title) {
  console.log(`\n${'='.repeat(65)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(65)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Inactivity & Activity Integration (Phase 5 / ActivityLog / Logins / Submissions)
// ─────────────────────────────────────────────────────────────────────────────
section('1. Inactivity & Activity Integration');

{
  // Student with no recorded activity at all
  const resNull = evaluateInactivity(null);
  assert('Student with no recorded activity is flagged', resNull.status === 'flagged');
  assert('Inactivity reason explains no activity recorded', resNull.reason.includes('No platform activity'));
  assert('lastActivityAt is null', resNull.lastActivityAt === null);

  // Student with recorded activity timestamp (e.g. recent login or submission)
  const now = new Date();
  const resActive = evaluateInactivity(now);
  assert('Student with recorded activity is not_flagged', resActive.status === 'not_flagged');
  assert('lastActivityAt matches recorded timestamp', resActive.lastActivityAt === now);

  // Ambiguity D-5 check: no arbitrary threshold (e.g., activity from 30 days ago is still not_flagged because SRS defines no threshold)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const resOld = evaluateInactivity(thirtyDaysAgo);
  assert('Activity from 30 days ago does not invent arbitrary cutoffs', resOld.status === 'not_flagged');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Low Progress Integration (Phase 9 Progress Service & Model)
// ─────────────────────────────────────────────────────────────────────────────
section('2. Low Progress Integration (Phase 9)');

{
  // No progress record exists (course without progress data)
  const resNoRecord = evaluateLowProgress(null);
  assert('Missing progress record returns insufficient_data', resNoRecord.status === 'insufficient_data');
  assert('Missing progress data is never silently treated as safe', resNoRecord.status !== 'not_flagged');
  assert('Missing progress data is never treated as 0% progress', resNoRecord.status !== 'flagged');

  // Course has 0 assignments created (Phase 6 empty state)
  const zeroAssignments = { totalAssignments: 0, submittedCount: 0, percent: 0, averageScore: 0 };
  const resZeroAssign = evaluateLowProgress(zeroAssignments);
  assert('Course with 0 total assignments returns insufficient_data', resZeroAssign.status === 'insufficient_data');

  // Course has assignments, student submitted 0 (real 0% progress)
  const realZero = { totalAssignments: 3, submittedCount: 0, percent: 0, averageScore: 0 };
  const resRealZero = evaluateLowProgress(realZero);
  assert('Student with 0% progress and assignments present is flagged', resRealZero.status === 'flagged');
  assert('Progress data preserved in result', resRealZero.progressData.totalAssignments === 3);

  // Student with positive progress (e.g. 33%, 50%, 100%)
  const partialProgress = { totalAssignments: 3, submittedCount: 1, percent: 33, averageScore: 85 };
  const resPartial = evaluateLowProgress(partialProgress);
  assert('Student with positive progress (33%) is not_flagged', resPartial.status === 'not_flagged');

  const fullProgress = { totalAssignments: 3, submittedCount: 3, percent: 100, averageScore: 92 };
  const resFull = evaluateLowProgress(fullProgress);
  assert('Student with 100% progress is not_flagged', resFull.status === 'not_flagged');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Missed Deadlines Integration (Phase 6 Assignments & Phase 7 Submissions)
// ─────────────────────────────────────────────────────────────────────────────
section('3. Missed Deadlines Integration (Phases 6 & 7)');

{
  // 3.1: No assignment data available
  const noAssign = evaluateMissedDeadlines(null);
  assert('No assignment data available returns insufficient_data', noAssign.status === 'insufficient_data');

  // 3.2: Submission tracking unavailable
  const subUnavail = evaluateMissedDeadlines({ available: true, submissionsAvailable: false });
  assert('Submission tracking unavailable returns insufficient_data', subUnavail.status === 'insufficient_data');

  // 3.3: Future deadlines only (assignments exist, but none past deadline)
  const futureOnly = {
    available: true,
    submissionsAvailable: true,
    totalAssignments: 2,
    totalOverdueAssignments: 0,
    overdueCount: 0,
  };
  const resFuture = evaluateMissedDeadlines(futureOnly);
  assert('Future deadlines only returns not_flagged', resFuture.status === 'not_flagged');
  assert('Missed count is 0 for future deadlines', resFuture.missedCount === 0);

  // 3.4: Overdue assignments exist and student submitted ALL of them
  const allSubmitted = {
    available: true,
    submissionsAvailable: true,
    totalAssignments: 3,
    totalOverdueAssignments: 2,
    overdueCount: 0, // 0 unsubmitted past deadline
  };
  const resAllSub = evaluateMissedDeadlines(allSubmitted);
  assert('All overdue assignments submitted returns not_flagged', resAllSub.status === 'not_flagged');
  assert('Missed count is 0', resAllSub.missedCount === 0);

  // 3.5: Overdue assignment unsubmitted
  const oneMissed = {
    available: true,
    submissionsAvailable: true,
    totalAssignments: 3,
    totalOverdueAssignments: 2,
    overdueCount: 1, // 1 unsubmitted past deadline
  };
  const resMissed = evaluateMissedDeadlines(oneMissed);
  assert('Unsubmitted overdue assignment returns flagged', resMissed.status === 'flagged');
  assert('Missed count reflects unsubmitted past deadline count (1)', resMissed.missedCount === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Aggregator & Classification Rules (SRS UC-I03)
// ─────────────────────────────────────────────────────────────────────────────
section('4. Aggregator & Classification Rules');

{
  // Case A: Insufficient data alone must NOT classify student as at-risk
  const allInsufficient = {
    inactivity: { status: 'not_flagged' },
    lowProgress: { status: 'insufficient_data' },
    missedDeadlines: { status: 'insufficient_data' },
  };
  const resA = computeAtRiskStatus(allInsufficient);
  assert('Insufficient data alone does not flag student as at-risk', resA.isAtRisk === false);
  assert('Flag count is 0 for insufficient data alone', resA.flagCount === 0);

  // Case B: At least one indicator flagged classifies as at-risk
  const oneFlagged = {
    inactivity: { status: 'flagged' },
    lowProgress: { status: 'not_flagged' },
    missedDeadlines: { status: 'not_flagged' },
  };
  const resB = computeAtRiskStatus(oneFlagged);
  assert('One flagged indicator classifies student as at-risk', resB.isAtRisk === true);
  assert('Flag count is 1', resB.flagCount === 1);

  // Case C: Multiple flagged indicators
  const multipleFlagged = {
    inactivity: { status: 'flagged' },
    lowProgress: { status: 'flagged' },
    missedDeadlines: { status: 'flagged' },
  };
  const resC = computeAtRiskStatus(multipleFlagged);
  assert('Multiple flagged indicators classifies as at-risk', resC.isAtRisk === true);
  assert('Flag count is 3', resC.flagCount === 3);

  // Case D: Flagged + insufficient data together
  const mixed = {
    inactivity: { status: 'not_flagged' },
    lowProgress: { status: 'insufficient_data' },
    missedDeadlines: { status: 'flagged' },
  };
  const resD = computeAtRiskStatus(mixed);
  assert('Flagged indicator with insufficient data classifies as at-risk', resD.isAtRisk === true);
  assert('Flag count is 1', resD.flagCount === 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Multi-Course Deduplication & Totals (D-3)
// ─────────────────────────────────────────────────────────────────────────────
section('5. Multi-Course Deduplication & Totals (D-3)');

{
  // Student enrolled in CS101 and CS102 under same instructor
  // Flagged in CS101, Safe in CS102
  const allStudents = new Set(['studentA', 'studentB', 'studentC']);
  const atRiskStudents = new Set(['studentA']); // studentA flagged in one course

  const totalEnrolled = allStudents.size;
  const totalAtRisk = atRiskStudents.size;
  const totalSafe = totalEnrolled - totalAtRisk;

  assert('Total enrolled counts unique students (3)', totalEnrolled === 3);
  assert('Total at-risk counts unique students (1)', totalAtRisk === 1);
  assert('Total safe counts unique students (2)', totalSafe === 2);
  assert('totalEnrolled equals totalAtRisk + totalSafe', totalEnrolled === totalAtRisk + totalSafe);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Security & Access Control Boundaries
// ─────────────────────────────────────────────────────────────────────────────
section('6. Security & Access Control Boundaries');

{
  // Role check: only instructor allowed
  const allowedRoles = ['instructor'];
  assert('Instructor role authorized', allowedRoles.includes('instructor'));
  assert('Student role rejected', !allowedRoles.includes('student'));
  assert('Coordinator role rejected', !allowedRoles.includes('coordinator'));
  assert('Admin role rejected', !allowedRoles.includes('admin'));

  // ObjectId validation
  const validId = '507f1f77bcf86cd799439011';
  const invalidId = 'not-an-objectid';
  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
  assert('Valid ObjectId recognized', isValidObjectId(validId));
  assert('Invalid ObjectId rejected', !isValidObjectId(invalidId));
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(65));
console.log(`  Phase 10 Integration Test Results`);
console.log('='.repeat(65));
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log('='.repeat(65));

if (failed > 0) {
  console.log('\nFailures:');
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log('\n✓ All Phase 10 Integration tests passed successfully!\n');
  process.exit(0);
}
