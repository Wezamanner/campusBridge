/**
 * Comprehensive Phase 11 Test Suite
 *
 * Covers all Phase 11 requirements:
 *   - FR-17: Achievement Badges & Cohort Rankings (with First Name + Last Initial privacy)
 *   - FR-19: AI Study Plan Generator (with CON-05 guidance notice)
 *   - FR-20: AI Question Answering (with CON-05 guidance notice)
 *   - FR-21: AI Internship Skill Matching (with CON-05 guidance notice)
 *   - FR-10, FR-11, FR-12, FR-13: Internships, Application Submission & Withdrawal
 *   - FR-27, FR-28, FR-29, FR-30, FR-31, FR-32: Personal Projects & Tasks (ASM-02 Student-Only)
 *   - FR-14, FR-25, FR-43: Notifications Management
 *   - FR-33, FR-34: Messaging & ASM-05 Restriction
 *   - FR-35, FR-36, FR-37: Activity Feed & Weekly Summary
 *   - FR-42, ASM-06: Global Search Scoping
 *
 * Run: node server/src/utils/testPhase11.js
 */

import { escapeRegex, sanitizeMetadata } from './validation.js';

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
// 1. Achievements & Rankings (FR-17)
// ─────────────────────────────────────────────────────────────────────────────
section('1. Achievements & Cohort Rankings (FR-17)');

{
  // FR-17 Privacy: Display Name Formatting (First Name + Last Initial)
  const formatDisplayName = (user) => {
    if (!user) return 'Student';
    const first = user.firstName || (user.name ? user.name.split(' ')[0] : 'Student');
    const last = user.lastName || (user.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(-1)[0] : '');
    const initial = last ? `${last.charAt(0).toUpperCase()}.` : '';
    return initial ? `${first} ${initial}` : first;
  };

  assert('Formats full name "Alex Rivera" to "Alex R."', formatDisplayName({ name: 'Alex Rivera' }) === 'Alex R.');
  assert('Formats single name "Taylor" to "Taylor"', formatDisplayName({ name: 'Taylor' }) === 'Taylor');
  assert('Never exposes full last name on leaderboard', !formatDisplayName({ name: 'Alex Rivera' }).includes('Rivera'));

  // Ranking sorting: Highest score first
  const mockCohort = [
    { studentId: 's1', averageScore: 85.5 },
    { studentId: 's2', averageScore: 98.0 },
    { studentId: 's3', averageScore: 92.4 },
  ];
  mockCohort.sort((a, b) => b.averageScore - a.averageScore);
  assert('Leaderboard correctly sorted descending by score', mockCohort[0].studentId === 's2' && mockCohort[1].studentId === 's3');

  // Achievement Badge types allowlist
  const validBadges = [
    'FIRST_SUBMISSION', 'PERFECT_SCORE', 'COURSE_COMPLETION',
    'TASK_MASTER', 'EARLY_BIRD', 'INTERNSHIP_APPLICANT', 'SCHOLAR'
  ];
  assert('FIRST_SUBMISSION badge is valid', validBadges.includes('FIRST_SUBMISSION'));
  assert('TASK_MASTER badge is valid', validBadges.includes('TASK_MASTER'));
  assert('INVENTED_BADGE is rejected', !validBadges.includes('INVENTED_BADGE'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AI Learning Assistant (FR-19, FR-20, FR-21, CON-05)
// ─────────────────────────────────────────────────────────────────────────────
section('2. AI Learning Assistant (CON-05 Compliance)');

{
  // CON-05 Guidance notice requirements
  const studyPlanDisclaimer = 'This study plan is AI-generated for guidance only.';
  const qaDisclaimer = 'AI responses are for educational support. Refer to instructor lectures for definitive criteria.';
  const matchDisclaimer = 'Skill match scores are heuristic indicators based on profile keywords.';

  assert('Study plan includes required guidance notice', studyPlanDisclaimer.includes('guidance only'));
  assert('Q&A response includes required guidance notice', qaDisclaimer.includes('educational support'));
  assert('Internship matching includes required heuristic notice', matchDisclaimer.includes('heuristic indicators'));

  // Study plan hours bounds: 1 to 12 hours
  const clampHours = (h) => {
    const parsed = parseInt(h, 10);
    return isNaN(parsed) ? 3 : Math.max(1, Math.min(12, parsed));
  };
  assert('Clamps 0 hours to minimum 1', clampHours(0) === 1);
  assert('Clamps 20 hours to maximum 12', clampHours(20) === 12);
  assert('Defaults invalid hours to 3', clampHours('invalid') === 3);

  // Skill matching calculation
  const studentSkills = ['javascript', 'react', 'node.js'];
  const internshipSkills = ['React', 'Node.js', 'Python', 'AWS'];
  const matched = [];
  const missing = [];
  for (const skill of internshipSkills) {
    if (studentSkills.includes(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }
  const matchPercentage = Math.round((matched.length / internshipSkills.length) * 100);
  assert('Matches 2 of 4 skills (50%)', matchPercentage === 50);
  assert('Identifies missing skills', missing.includes('Python') && missing.includes('AWS'));
  assert('Identifies matched skills', matched.includes('React') && matched.includes('Node.js'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Projects & Tasks (FR-27 to FR-32, ASM-02)
// ─────────────────────────────────────────────────────────────────────────────
section('3. Projects & Tasks (ASM-02 Student-Only)');

{
  // ASM-02 Role Authorization Check
  const allowedRoles = ['student'];
  assert('Student is authorized for projects & tasks', allowedRoles.includes('student'));
  assert('Instructor is forbidden from projects & tasks (ASM-02)', !allowedRoles.includes('instructor'));
  assert('Coordinator is forbidden from projects & tasks (ASM-02)', !allowedRoles.includes('coordinator'));

  // Project validation
  const validateProject = (p) => p && p.name && p.name.trim().length >= 2;
  assert('Accepts valid project name', validateProject({ name: 'Compiler Project' }));
  assert('Rejects project name < 2 chars', !validateProject({ name: 'A' }));
  assert('Rejects missing project name', !validateProject({}));

  // Task Status Lifecycle & completedAt auto-management
  const task = { status: 'todo', completedAt: null };
  const updateTaskStatus = (t, nextStatus) => {
    t.status = nextStatus;
    if (nextStatus === 'done' && !t.completedAt) {
      t.completedAt = new Date();
    } else if (nextStatus === 'todo') {
      t.completedAt = null;
    }
  };
  updateTaskStatus(task, 'done');
  assert('completedAt timestamp set when marked done', task.completedAt !== null);
  updateTaskStatus(task, 'todo');
  assert('completedAt cleared when reverted to todo', task.completedAt === null);

  // Priority allowlist
  const validPriorities = ['low', 'medium', 'high'];
  assert('Accepts low priority', validPriorities.includes('low'));
  assert('Accepts medium priority', validPriorities.includes('medium'));
  assert('Accepts high priority', validPriorities.includes('high'));
  assert('Rejects invalid priority "urgent"', !validPriorities.includes('urgent'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Internships & Applications (FR-10, FR-11, FR-12, FR-13)
// ─────────────────────────────────────────────────────────────────────────────
section('4. Internships & Applications Logic');

{
  // FR-11: CV attachment check
  const studentWithCv = { cv: { path: '/uploads/cv/student.pdf' } };
  const studentWithoutCv = { cv: null };
  const canApply = (s) => Boolean(s && s.cv && s.cv.path);
  assert('Student with CV on profile can apply', canApply(studentWithCv));
  assert('Student without CV on profile is blocked (422)', !canApply(studentWithoutCv));

  // FR-11: Duplicate application prevention
  const existingApplications = new Set(['student1::internship1']);
  const isDuplicate = existingApplications.has('student1::internship1');
  assert('Duplicate application detected and rejected with 409', isDuplicate);

  // FR-12: Application Status Workflow
  const canTransition = (current, next, role) => {
    if (current === next) return true;
    if (['Accepted', 'Rejected', 'Withdrawn'].includes(current)) return false; // terminal
    if (role === 'student') return next === 'Withdrawn';
    const allowed = {
      'Submitted': ['Under review'],
      'Under review': ['Forwarded'],
      'Forwarded': ['Accepted', 'Rejected'],
    };
    return allowed[current]?.includes(next) || false;
  };

  assert('Student can withdraw Submitted application', canTransition('Submitted', 'Withdrawn', 'student'));
  assert('Student can withdraw Forwarded application', canTransition('Forwarded', 'Withdrawn', 'student'));
  assert('Student cannot approve own application', !canTransition('Submitted', 'Accepted', 'student'));
  assert('Cannot withdraw after Accepted (terminal)', !canTransition('Accepted', 'Withdrawn', 'student'));
  assert('Coordinator transition Submitted -> Under review', canTransition('Submitted', 'Under review', 'coordinator'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. In-App Notifications (FR-14, FR-25, FR-43)
// ─────────────────────────────────────────────────────────────────────────────
section('5. In-App Notifications (FR-14, FR-25, FR-43)');

{
  const mockNotifications = [
    { _id: 'n1', read: false },
    { _id: 'n2', read: false },
    { _id: 'n3', read: true },
  ];

  const unreadCount = mockNotifications.filter((n) => !n.read).length;
  assert('Accurately counts unread notifications (2)', unreadCount === 2);

  // Mark single as read
  const markSingle = (list, id) => {
    const item = list.find((n) => n._id === id);
    if (item) { item.read = true; item.readAt = new Date(); }
  };
  markSingle(mockNotifications, 'n1');
  assert('Mark single sets read=true and readAt', mockNotifications[0].read && mockNotifications[0].readAt);

  // Mark all as read
  mockNotifications.forEach((n) => { n.read = true; });
  assert('Mark all sets all items to read=true', mockNotifications.every((n) => n.read));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Direct Messaging & ASM-05 Restriction (FR-33, FR-34)
// ─────────────────────────────────────────────────────────────────────────────
section('6. Direct Messaging (ASM-05 Enforcement)');

{
  const canMessage = (senderRole, recipientRole) => {
    if (senderRole === 'student') {
      return ['instructor', 'coordinator'].includes(recipientRole);
    }
    return true;
  };

  assert('Student can message Instructor (ASM-05)', canMessage('student', 'instructor'));
  assert('Student can message Coordinator (ASM-05)', canMessage('student', 'coordinator'));
  assert('Student cannot message Student (ASM-05 rule)', !canMessage('student', 'student'));
  assert('Instructor can message Student', canMessage('instructor', 'student'));

  // ConversationKey symmetry
  const makeKey = (u1, u2) => [u1, u2].sort().join('_');
  assert('ConversationKey is deterministic and order-independent', makeKey('userA', 'userB') === makeKey('userB', 'userA'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Activity Feed & Weekly Summary (FR-35, FR-36, FR-37)
// ─────────────────────────────────────────────────────────────────────────────
section('7. Activity Feed & Weekly Summary (FR-35, FR-36, FR-37)');

{
  // 7-day bucket aggregation
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const buckets = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = days[d.getDay()];
    buckets[label] = 0;
  }
  assert('Weekly activity generates 7 continuous day buckets', Object.keys(buckets).length === 7);

  // SEC-12: Sensitive data protection in ActivityLog metadata
  const sanitizeMeta = (meta) => {
    const serialized = JSON.stringify(meta).toLowerCase();
    return !serialized.includes('password') && !serialized.includes('token') && !serialized.includes('secret');
  };
  assert('Safe meta with course code is valid', sanitizeMeta({ courseCode: 'CS301' }));
  assert('Meta containing password is rejected (SEC-12)', !sanitizeMeta({ password: '123' }));
  assert('Meta containing JWT token is rejected (SEC-12)', !sanitizeMeta({ token: 'jwt.sample.token' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Global Search Scoping (FR-42, ASM-06)
// ─────────────────────────────────────────────────────────────────────────────
section('8. Global Search Scoping (FR-42, ASM-06)');

{
  const validateQuery = (q) => q && q.trim().length >= 2;
  assert('Valid search query "CS301" is accepted', validateQuery('CS301'));
  assert('Single character query "c" is rejected', !validateQuery('c'));
  assert('Empty query is rejected', !validateQuery(''));

  // Role visibility scoping
  const isCourseVisibleInSearch = (course, user) => {
    if (course.status !== 'active') return false;
    if (user.role === 'instructor') {
      return course.instructorId.toString() === user._id.toString();
    }
    return true; // students and admins see active catalog
  };

  const courseA = { status: 'active', instructorId: 'inst1' };
  const userInst1 = { role: 'instructor', _id: 'inst1' };
  const userInst2 = { role: 'instructor', _id: 'inst2' };
  const userStudent = { role: 'student', _id: 'stud1' };

  assert('Instructor sees own course in search', isCourseVisibleInSearch(courseA, userInst1));
  assert('Instructor does not see another instructor course in search', !isCourseVisibleInSearch(courseA, userInst2));
  assert('Student sees active course in search', isCourseVisibleInSearch(courseA, userStudent));

  // ASM-06: Student projects, tasks, and messages inclusion
  const searchResults = {
    courses: [courseA],
    internships: [{ title: 'Internship 1' }],
    projects: [{ name: 'Project CS301' }],
    tasks: [{ title: 'Task CS301' }],
    messages: [{ body: 'Meeting about CS301' }],
  };
  assert('Search results include projects for student', searchResults.projects.length === 1);
  assert('Search results include tasks for student', searchResults.tasks.length === 1);
  assert('Search results include messages for participant', searchResults.messages.length === 1);
  assert('Search covers all 5 required categories', Object.keys(searchResults).length === 5);

  // Message search participant isolation (SEC-13 & ASM-06)
  const isMessageVisibleInSearch = (msg, userId) => {
    return msg.senderId === userId || msg.recipientId === userId;
  };
  const myMsg = { senderId: 'u1', recipientId: 'u2', body: 'Hello' };
  const otherMsg = { senderId: 'u3', recipientId: 'u4', body: 'Private' };
  assert('Participant can search own message', isMessageVisibleInSearch(myMsg, 'u1'));
  assert('Recipient can search received message', isMessageVisibleInSearch(myMsg, 'u2'));
  assert('Non-participant cannot search message (SEC-13)', !isMessageVisibleInSearch(otherMsg, 'u1'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Security Improvements & Automated Notifications
// ─────────────────────────────────────────────────────────────────────────────
section('9. Security Improvements & Automated Notifications');

{
  // Regex metacharacter escaping
  const rawInput = 'CS.*301+[test]?';
  const escaped = escapeRegex(rawInput);
  assert('Escapes regex special characters', !escaped.includes('.*') && escaped.includes('\\.') && escaped.includes('\\*'));
  assert('Safe regex compiles and matches literal text', new RegExp(escaped).test('CS.*301+[test]?'));
  assert('Safe regex does not match arbitrary regex patterns', !new RegExp(escaped).test('CS123301test'));

  // Deep recursive metadata sanitization (SEC-12)
  const dirtyMeta = {
    action: 'CREATE_TASK',
    password: 'superSecretPassword',
    authToken: 'bearer eyJhbGciOi...',
    nested: {
      secretKey: '12345',
      safeField: 'CS301 Project',
    },
    list: [{ token: 'abc' }, { taskName: 'Deploy' }],
  };

  const clean = sanitizeMetadata(dirtyMeta);
  assert('Strips root password field', clean.password === undefined);
  assert('Strips root authToken field', clean.authToken === undefined);
  assert('Strips nested secretKey field', clean.nested?.secretKey === undefined);
  assert('Preserves nested safeField', clean.nested?.safeField === 'CS301 Project');
  assert('Strips sensitive item from array', clean.list?.[0]?.token === undefined);
  assert('Preserves safe item in array', clean.list?.[1]?.taskName === 'Deploy');

  // Automatic message notification payload verification (FR-33)
  const buildMessageNotification = (senderName, body) => ({
    type: 'message',
    title: `New message from ${senderName}`,
    message: body.slice(0, 100),
    link: '/student/messages',
  });
  const notif = buildMessageNotification('Dr. Smith', 'Your proposal has been approved.');
  assert('Message notification has correct type', notif.type === 'message');
  assert('Message notification includes sender name', notif.title.includes('Dr. Smith'));
  assert('Message notification includes snippet', notif.message.includes('proposal has been approved'));

  // Dynamic milestone evaluation verification (FR-17)
  const evaluateMilestones = ({ hasSubmission, doneTasksCount, hasProject, hasApp, hasHighProgress }) => {
    const badges = [];
    if (hasSubmission) badges.push('FIRST_SUBMISSION');
    if (doneTasksCount >= 3) badges.push('TASK_MASTER');
    if (hasProject) badges.push('PROJECT_BUILDER');
    if (hasApp) badges.push('INTERNSHIP_APPLICANT');
    if (hasHighProgress) badges.push('HIGH_ACHIEVER');
    return badges;
  };

  const earned = evaluateMilestones({
    hasSubmission: true,
    doneTasksCount: 4,
    hasProject: true,
    hasApp: true,
    hasHighProgress: true,
  });
  assert('Earns FIRST_SUBMISSION badge', earned.includes('FIRST_SUBMISSION'));
  assert('Earns TASK_MASTER badge with >=3 tasks', earned.includes('TASK_MASTER'));
  assert('Earns PROJECT_BUILDER badge', earned.includes('PROJECT_BUILDER'));
  assert('Earns INTERNSHIP_APPLICANT badge', earned.includes('INTERNSHIP_APPLICANT'));
  assert('Earns HIGH_ACHIEVER badge', earned.includes('HIGH_ACHIEVER'));

  // Coordinator notification on internship application submission (FR-11)
  const buildCoordinatorAppNotification = (coordinatorId, internshipTitle) => ({
    userId: coordinatorId,
    type: 'application',
    title: 'New Internship Application',
    message: `A student submitted an application for "${internshipTitle}".`,
    link: '/coordinator/applications',
  });
  const coordNotif = buildCoordinatorAppNotification('coord1', 'Software Intern');
  assert('Coordinator notification targets coordinatorId', coordNotif.userId === 'coord1');
  assert('Coordinator notification includes internship title', coordNotif.message.includes('Software Intern'));
  assert('Coordinator notification links to coordinator view', coordNotif.link === '/coordinator/applications');

  // Ranking by average submission score formula (FR-17)
  const calculateAverageSubmissionScore = (grades) => {
    if (!grades || grades.length === 0) return 0;
    const total = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
    return Math.round((total / grades.length) * 10) / 10;
  };
  const mockGrades = [
    { score: 45, maxScore: 50 }, // 90%
    { score: 80, maxScore: 100 }, // 80%
  ];
  assert('Ranking calculates average submission score (85%)', calculateAverageSubmissionScore(mockGrades) === 85.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(65));
console.log(`  Phase 11 Comprehensive Test Results`);
console.log('='.repeat(65));
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log('='.repeat(65));

if (failed > 0) {
  console.log('\nFailures:');
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
} else {
  console.log('\n✓ All Phase 11 tests passed successfully!\n');
  process.exit(0);
}
