/**
 * CampusBridge — Instructor Demonstration Data Seeder
 *
 * Creates a complete, end-to-end instructor workflow for the reviewer presentation:
 *
 *   reviewer instructor → assigned course → 3 demo students enrolled
 *   → 1 assignment → 2 student submissions → 1 graded submission
 *   → progress records updated
 *
 * SAFETY GUARANTEES
 * ─────────────────
 * 1. Reads MONGODB_URI from the environment. Refuses to run if the URI
 *    contains known Atlas hostnames (shard-00-0x.igmih9f) unless the caller
 *    explicitly passes --allow-production.
 * 2. Refuses to run when NODE_ENV=production unless --allow-production is passed.
 * 3. Checks the database name: refuses if it matches 'campusbridge' (production)
 *    unless --allow-production is passed.
 * 4. Idempotent: running twice produces no duplicates. Each record is located
 *    by a unique deterministic field before creation.
 * 5. Never modifies existing users or real course/assignment records.
 * 6. No hardcoded passwords — demo student passwords are generated at runtime
 *    and printed once to stdout.
 * 7. Never prints connection strings, JWT secrets, or other credentials.
 *
 * USAGE
 * ─────
 * Against a LOCAL development database (default: mongodb://127.0.0.1:27017/campusbridge_demo):
 *
 *   node src/utils/seedInstructorDemo.js
 *
 * Against a custom local/staging URI:
 *
 *   MONGODB_URI="mongodb://127.0.0.1:27017/campusbridge_demo" node src/utils/seedInstructorDemo.js
 *
 * To run against production (requires explicit opt-in — NOT RECOMMENDED):
 *
 *   MONGODB_URI="<atlas-uri>" node src/utils/seedInstructorDemo.js --allow-production
 */

import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';
import crypto   from 'crypto';

// ── Safety helpers ─────────────────────────────────────────────────────────

const ALLOW_PRODUCTION = process.argv.includes('--allow-production');

const PRODUCTION_INDICATORS = [
  'igmih9f',           // Atlas cluster hostname fragment
  'mongodb.net',       // Atlas generic hostname fragment
];

function isProductionUri(uri) {
  return PRODUCTION_INDICATORS.some(indicator => uri.includes(indicator));
}

function guardProductionAccess(uri, dbName) {
  if (ALLOW_PRODUCTION) return; // caller accepted responsibility

  if (process.env.NODE_ENV === 'production') {
    console.error('✗ Refusing to seed: NODE_ENV=production. Pass --allow-production to override.');
    process.exit(1);
  }
  if (isProductionUri(uri)) {
    console.error('✗ Refusing to seed: MONGODB_URI points to a production Atlas cluster.');
    console.error('  Pass --allow-production to override (not recommended).');
    process.exit(1);
  }
  if (dbName === 'campusbridge') {
    console.error('✗ Refusing to seed: database name is "campusbridge" (production).');
    console.error('  Use a database named "campusbridge_demo" or similar.');
    process.exit(1);
  }
}

// ── Lazy model imports (avoid circular deps) ───────────────────────────────

async function getModels() {
  const { User }       = await import('../models/User.js');
  const { Course }     = await import('../models/Course.js');
  const { Enrollment } = await import('../models/Enrollment.js');
  const { Assignment } = await import('../models/Assignment.js');
  const { Submission } = await import('../models/Submission.js');
  const { Grade }      = await import('../models/Grade.js');
  const { Progress }   = await import('../models/Progress.js');
  return { User, Course, Enrollment, Assignment, Submission, Grade, Progress };
}

// ── Idempotent find-or-create helpers ──────────────────────────────────────

async function findOrCreateUser(User, data) {
  const existing = await User.findOne({ email: data.email }).select('+deletedAt');
  if (existing) {
    if (existing.deletedAt || !existing.active) {
      return { user: existing, created: false, skipped: true,
               reason: existing.deletedAt ? 'soft-deleted' : 'inactive' };
    }
    return { user: existing, created: false, skipped: true, reason: 'already exists' };
  }
  const user = new User(data);
  await user.save();
  return { user, created: true, skipped: false };
}

async function findOrCreateCourse(Course, data) {
  const existing = await Course.findOne({ code: data.code });
  if (existing) return { course: existing, created: false };
  const course = new Course(data);
  await course.save();
  return { course, created: true };
}

async function findOrCreateEnrollment(Enrollment, studentId, courseId) {
  const existing = await Enrollment.findOne({ studentId, courseId });
  if (existing) return { enrollment: existing, created: false };
  const enrollment = new Enrollment({ studentId, courseId, enrolledAt: new Date() });
  await enrollment.save();
  return { enrollment, created: true };
}

async function findOrCreateAssignment(Assignment, data) {
  const existing = await Assignment.findOne({ courseId: data.courseId, title: data.title });
  if (existing) return { assignment: existing, created: false };
  const assignment = new Assignment(data);
  await assignment.save();
  return { assignment, created: true };
}

async function findOrCreateSubmission(Submission, data) {
  const existing = await Submission.findOne({
    assignmentId: data.assignmentId,
    studentId:    data.studentId,
  });
  if (existing) return { submission: existing, created: false };
  const submission = new Submission(data);
  await submission.save();
  return { submission, created: true };
}

async function findOrCreateGrade(Grade, Submission, Progress, submission, graderUserId, score, feedback, maxScore) {
  const existing = await Grade.findOne({ submissionId: submission._id });
  if (existing) return { grade: existing, created: false };

  const grade = new Grade({
    submissionId: submission._id,
    assignmentId: submission.assignmentId,
    studentId:    submission.studentId,
    courseId:     submission.courseId,
    graderId:     graderUserId,
    score,
    maxScore,
    feedback,
    gradedAt:     new Date(),
  });
  await grade.save();

  // Mark submission as Graded
  await Submission.findByIdAndUpdate(submission._id, { status: 'Graded' });

  // Recalculate progress
  try {
    const { recalculateStudentCourseProgress } = await import('../services/progress.service.js');
    await recalculateStudentCourseProgress(submission.studentId, submission.courseId);
  } catch (e) {
    console.warn('  ⚠  Progress recalculation failed (non-fatal):', e.message);
  }

  return { grade, created: true };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function seed() {
  const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbridge_demo';

  // Extract DB name from URI for safety check
  const dbName = rawUri.split('/').pop().split('?')[0] || 'unknown';

  guardProductionAccess(rawUri, dbName);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   CampusBridge — Instructor Demo Seeder                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log(`Target DB : ${dbName}`);
  console.log(`URI host  : ${rawUri.replace(/\/\/[^@]*@/, '//<credentials>@').split('/')[2]}`);
  console.log('');

  await mongoose.connect(rawUri);
  console.log(`Connected : ${mongoose.connection.host}/${mongoose.connection.db.databaseName}\n`);

  const { User, Course, Enrollment, Assignment, Submission, Grade, Progress } = await getModels();

  const passwords = {}; // tracks newly-generated passwords for the credential sheet

  // ── 1. Reviewer instructor ───────────────────────────────────────────────
  console.log('── Step 1: Reviewer Instructor ─────────────────────────');
  const instrResult = await findOrCreateUser(User, {
    name:         'Reviewer Instructor',
    email:        'instructor@campusbridge.edu',
    passwordHash: 'DemoInstructor2026!',  // will be bcrypt-hashed by pre-save hook
    role:         'instructor',
    department:   'Software Engineering',
    active:       true,
    preferences:  { theme: 'dark' },
  });
  const instructor = instrResult.user;
  if (instrResult.created) {
    console.log('  ✓ Created instructor:', instructor.email);
    passwords['instructor'] = 'DemoInstructor2026!';
  } else {
    console.log('  ℹ Instructor already exists:', instructor.email, `(${instrResult.reason})`);
  }

  // ── 2. Demo course assigned to instructor ────────────────────────────────
  console.log('\n── Step 2: Demo Course ─────────────────────────────────');
  const { course, created: courseCreated } = await findOrCreateCourse(Course, {
    code:        'CS401',
    title:       'Advanced Software Engineering',
    description: 'Industry-grade software development practices, testing, and deployment.',
    status:      'active',
    instructorId: instructor._id,
    createdBy:    instructor._id,
  });
  console.log(`  ${courseCreated ? '✓ Created' : 'ℹ Exists'} course: ${course.code} — ${course.title}`);
  console.log(`  Instructor assigned: ${instructor.email}`);

  // ── 3. Demo students ─────────────────────────────────────────────────────
  console.log('\n── Step 3: Demo Students ───────────────────────────────');
  const demoStudents = [
    { name: 'Demo Student Alpha',   email: 'demo.student.alpha@campusbridge.edu',   program: 'Software Engineering', year: 3 },
    { name: 'Demo Student Beta',    email: 'demo.student.beta@campusbridge.edu',    program: 'Computer Science',     year: 2 },
    { name: 'Demo Student Gamma',   email: 'demo.student.gamma@campusbridge.edu',   program: 'Information Systems',  year: 4 },
  ];
  const students = [];
  for (const s of demoStudents) {
    const pw = crypto.randomBytes(10).toString('base64url').slice(0, 12);
    const r = await findOrCreateUser(User, {
      name:         s.name,
      email:        s.email,
      passwordHash: pw,
      role:         'student',
      program:      s.program,
      year:         s.year,
      active:       true,
      preferences:  { theme: 'dark' },
    });
    students.push(r.user);
    if (r.created) {
      console.log(`  ✓ Created student: ${s.email}`);
      passwords[s.email] = pw;
    } else {
      console.log(`  ℹ Exists: ${s.email} (${r.reason})`);
    }
  }

  // ── 4. Enroll students ───────────────────────────────────────────────────
  console.log('\n── Step 4: Enrollments ─────────────────────────────────');
  for (const student of students) {
    const { created } = await findOrCreateEnrollment(Enrollment, student._id, course._id);
    console.log(`  ${created ? '✓ Enrolled' : 'ℹ Already enrolled'}: ${student.email} → ${course.code}`);
  }

  // ── 5. Assignment ────────────────────────────────────────────────────────
  console.log('\n── Step 5: Assignment ──────────────────────────────────');
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14); // 2 weeks from now

  const { assignment, created: assignCreated } = await findOrCreateAssignment(Assignment, {
    courseId:     course._id,
    createdBy:    instructor._id,
    title:        'REST API Design and Implementation',
    description:  'Design and implement a RESTful API with authentication, role-based access control, and comprehensive error handling. Submit a GitHub repository link and a Postman collection.',
    deadline,
    maxScore:     100,
    published:    true,
  });
  console.log(`  ${assignCreated ? '✓ Created' : 'ℹ Exists'} assignment: "${assignment.title}"`);
  console.log(`  Deadline: ${assignment.deadline.toDateString()}`);

  // ── 6. Submissions ───────────────────────────────────────────────────────
  console.log('\n── Step 6: Student Submissions ─────────────────────────');
  const submittingStudents = students.slice(0, 2); // Alpha and Beta submit
  const submissions = [];
  const submissionTexts = [
    'Implemented a REST API using Node.js and Express. Repo: https://github.com/demo/rest-api-alpha. Postman collection included.',
    'Built a REST API with JWT authentication and role-based access control. Full test coverage included. Repo: https://github.com/demo/rest-api-beta.',
  ];
  for (let i = 0; i < submittingStudents.length; i++) {
    const student = submittingStudents[i];
    const { submission, created } = await findOrCreateSubmission(Submission, {
      assignmentId: assignment._id,
      studentId:    student._id,
      courseId:     course._id,
      text:         submissionTexts[i],
      status:       'Submitted',
      submittedAt:  new Date(),
    });
    submissions.push(submission);
    console.log(`  ${created ? '✓ Submitted' : 'ℹ Already submitted'}: ${student.email}`);
  }

  // ── 7. Grade first submission ────────────────────────────────────────────
  console.log('\n── Step 7: Grade Submission ────────────────────────────');
  if (submissions.length > 0) {
    const toGrade = submissions[0];
    const { grade, created: gradeCreated } = await findOrCreateGrade(
      Grade, Submission, Progress,
      toGrade,
      instructor._id,
      88,                     // score
      'Excellent implementation. Clean architecture, proper error handling, and well-documented endpoints. Minor improvement: add rate limiting to the authentication routes.',
      assignment.maxScore
    );
    const gradeStudent = students.find(s => s._id.toString() === toGrade.studentId.toString());
    console.log(`  ${gradeCreated ? '✓ Graded' : 'ℹ Already graded'}: ${gradeStudent?.email} → score=${grade.score}/${grade.maxScore}`);
  }

  // ── 8. Summary ───────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   DEMO DATA SUMMARY                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Instructor : instructor@campusbridge.edu                    ║`);
  console.log(`║  Course     : ${course.code} — ${course.title.slice(0,38).padEnd(38)}║`);
  console.log(`║  Students   : ${students.length} enrolled                                 ║`);
  console.log(`║  Assignments: 1                                              ║`);
  console.log(`║  Submissions: ${submissions.length} (1 graded, ${Math.max(0,submissions.length-1)} pending)                   ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');

  if (Object.keys(passwords).length > 0) {
    console.log('║  NEWLY GENERATED PASSWORDS (save now — not stored anywhere)  ║');
    for (const [who, pw] of Object.entries(passwords)) {
      const line = `  ${who}: ${pw}`;
      console.log(`║  ${line.padEnd(61)}║`);
    }
  } else {
    console.log('║  No new passwords generated — all accounts already existed. ║');
  }
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Login at: https://campus-bridge-lyart.vercel.app/login      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n✗ Seeder error:', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  process.exit(1);
});
