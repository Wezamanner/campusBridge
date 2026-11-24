/**
 * DEF-01 Regression — Instructor Grading Maximum Score
 *
 * Verifies that:
 *   (a) The backend submission endpoint returns `assignmentId.maxScore`
 *       (not `totalPoints`) in the populated response — this is the
 *       server-side contract the fixed InstructorGradingPage relies on.
 *   (b) The grading validation boundary (score > maxScore) is enforced.
 *   (c) Authorization prevents cross-instructor and student grading.
 *   (d) Data isolation holds: instructor only sees their own submissions.
 *   (e) A graded submission carries grade.score in the response.
 *
 * Notes on test infrastructure:
 *   The gradeSubmission controller uses a MongoDB transaction (session.withTransaction).
 *   Standalone single-node MongoDB (used here) does not support multi-document
 *   transactions.  Tests that need a "graded" submission therefore create Grade
 *   and update Submission directly via the model layer (no session required) and
 *   then assert via GET — matching how the existing Phase 13/14 suites handle
 *   transaction-gated controllers.
 */

import assert from 'assert';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import app            from '../server.js';
import { config }     from '../config/env.js';
import { User }       from '../models/User.js';
import { Course }     from '../models/Course.js';
import { Assignment } from '../models/Assignment.js';
import { Enrollment } from '../models/Enrollment.js';
import { Submission } from '../models/Submission.js';
import { Grade }      from '../models/Grade.js';

const TEST_DB_URI =
  process.env.TEST_MONGODB_URI ||
  (config.mongoURI || 'mongodb://127.0.0.1:27017/campusbridge').replace(
    '/campusbridge',
    '/campusbridge_test'
  );
const JWT_SECRET = config.jwtSecret || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT  = 5097;

let server;
let instructorToken, instructor2Token, studentToken;
let instructorUser, instructor2User, studentUser;
let course, assignment, enrollment;
let submissionPending, submissionGraded;
let gradeDoc;

let totalTests  = 0;
let passedTests = 0;
let failedTests = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url     = new URL(path, `http://localhost:${TEST_PORT}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port:     parseInt(url.port),
      path:     url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token   ? { Authorization: `Bearer ${token}` }                       : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function makeToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

async function setup() {
  console.log('\n  [DB] Connecting:', TEST_DB_URI);
  await mongoose.connect(TEST_DB_URI);

  // Clean up any leftovers
  await User.deleteMany({ email: /@def01maxscore\.cb$/ });

  instructorUser = await User.create({
    name: 'DEF01 Instructor',
    email: 'instructor@def01maxscore.cb',
    passwordHash: 'password123',
    role: 'instructor',
    department: 'Computer Science',
  });
  instructor2User = await User.create({
    name: 'DEF01 Instructor Two',
    email: 'instructor2@def01maxscore.cb',
    passwordHash: 'password123',
    role: 'instructor',
    department: 'Engineering',
  });
  studentUser = await User.create({
    name: 'DEF01 Student',
    email: 'student@def01maxscore.cb',
    passwordHash: 'password123',
    role: 'student',
    program: 'Software Engineering',
    year: 2,
  });

  instructorToken  = makeToken(instructorUser);
  instructor2Token = makeToken(instructor2User);
  studentToken     = makeToken(studentUser);

  // Second student for the graded submission (Submission has a unique
  // index on {assignmentId, studentId}, so we cannot reuse the same student).
  const student2User = await User.create({
    name: 'DEF01 Student Two',
    email: 'student2@def01maxscore.cb',
    passwordHash: 'password123',
    role: 'student',
    program: 'Software Engineering',
    year: 3,
  });

  // Course owned by instructorUser — random suffix prevents collision across runs
  const uniqueSuffix = Math.floor(Math.random() * 90000 + 10000);
  course = await Course.create({
    code:         `GR${uniqueSuffix}`,
    title:        'DEF-01 Grading Test Course',
    description:  'DEF-01 regression test',
    status:       'active',
    instructorId: instructorUser._id,
    createdBy:    instructorUser._id,
  });

  // Assignment with maxScore 50
  assignment = await Assignment.create({
    courseId:    course._id,
    title:       'DEF-01 Test Assignment',
    description: 'Regression',
    deadline:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxScore:    50,
    createdBy:   instructorUser._id,
  });

  enrollment = await Enrollment.create({
    studentId:  studentUser._id,
    courseId:   course._id,
    enrolledAt: new Date(),
  });

  // Pending submission — status Submitted, no grade
  submissionPending = await Submission.create({
    assignmentId: assignment._id,
    studentId:    studentUser._id,
    courseId:     course._id,
    text:         'Pending answer text.',
    status:       'Submitted',
    submittedAt:  new Date(),
  });

  // Pre-graded submission — created via model layer to bypass the transaction
  submissionGraded = await Submission.create({
    assignmentId: assignment._id,
    studentId:    student2User._id,
    courseId:     course._id,
    text:         'Graded answer text.',
    status:       'Graded',
    submittedAt:  new Date(Date.now() - 60000),
  });
  gradeDoc = await Grade.create({
    submissionId: submissionGraded._id,
    assignmentId: assignment._id,
    studentId:    student2User._id,
    courseId:     course._id,
    graderId:     instructorUser._id,
    score:        35,
    maxScore:     50,
    feedback:     'Good attempt.',
    gradedAt:     new Date(),
  });

  server = http.createServer(app);
  await new Promise((r) => server.listen(TEST_PORT, r));
  console.log(`  [HTTP] Test server on :${TEST_PORT}`);
}

async function teardown() {
  if (gradeDoc)            await Grade.deleteOne({ _id: gradeDoc._id });
  if (submissionGraded)   await Submission.deleteOne({ _id: submissionGraded._id });
  if (submissionPending)  await Submission.deleteOne({ _id: submissionPending._id });
  if (enrollment)         await Enrollment.deleteOne({ _id: enrollment._id });
  if (assignment)         await Assignment.deleteOne({ _id: assignment._id });
  if (course)             await Course.deleteOne({ _id: course._id });
  await User.deleteMany({ email: /@def01maxscore\.cb$/ });
  server.close();
  await mongoose.disconnect();
  console.log('  [DB] Cleanup complete\n');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // ── A. Server-contract tests: maxScore present, totalPoints absent ─────────

  await test('1 | GET /instructor/submissions — maxScore equals 50', async () => {
    const res = await req('GET', '/api/v1/instructor/submissions', instructorToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${res.body?.message}`);
    assert.ok(Array.isArray(res.body.data), 'data should be an array');
    const sub = res.body.data.find(s => s.id === submissionPending._id.toString());
    assert.ok(sub, 'Pending submission not found in response');
    assert.strictEqual(
      sub.maxScore,
      50,
      `maxScore should be 50, got ${sub.maxScore}`
    );
  });

  await test('2 | GET /instructor/submissions — totalPoints is undefined (not present)', async () => {
    const res = await req('GET', '/api/v1/instructor/submissions', instructorToken);
    assert.strictEqual(res.status, 200);
    const sub = res.body.data.find(s => s.id === submissionPending._id.toString());
    assert.ok(sub, 'Pending submission not found');
    assert.strictEqual(
      sub.totalPoints,
      undefined,
      'totalPoints must not appear in response — only maxScore should'
    );
  });

  await test('3 | GET ?status=Graded — graded submission has maxScore = 50', async () => {
    const res = await req(
      'GET',
      '/api/v1/instructor/submissions?status=Graded',
      instructorToken
    );
    assert.strictEqual(res.status, 200);
    const sub = res.body.data.find(s => s.id === submissionGraded._id.toString());
    assert.ok(sub, 'Graded submission not found in Graded filter');
    assert.strictEqual(sub.maxScore, 50);
    assert.strictEqual(sub.totalPoints, undefined);
  });

  await test('4 | GET ?status=Graded — grade.score is a number (35)', async () => {
    const res = await req(
      'GET',
      '/api/v1/instructor/submissions?status=Graded',
      instructorToken
    );
    assert.strictEqual(res.status, 200);
    const sub = res.body.data.find(s => s.id === submissionGraded._id.toString());
    assert.ok(sub, 'Graded submission not found');
    assert.ok(sub.grade, 'grade object missing on graded submission');
    assert.strictEqual(sub.grade.score, 35, `Expected 35, got ${sub.grade.score}`);
  });

  // ── B. Grading validation boundary (HTTP layer, pre-transaction) ────────────

  await test('5 | PATCH grade — score above maxScore (51) rejected with 400', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      instructorToken,
      { score: 51, feedback: '' }
    );
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}: ${res.body?.message}`);
    assert.strictEqual(res.body.success, false);
  });

  await test('6 | PATCH grade — non-numeric score rejected with 400', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      instructorToken,
      { score: 'excellent', feedback: '' }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('7 | PATCH grade — missing score rejected with 400', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      instructorToken,
      { feedback: 'No score.' }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('8 | PATCH grade — negative score rejected with 400', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      instructorToken,
      { score: -1, feedback: '' }
    );
    assert.strictEqual(res.status, 400);
  });

  // ── C. Authorization ───────────────────────────────────────────────────────

  await test('9 | PATCH grade — another instructor cannot grade this submission (403)', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      instructor2Token,
      { score: 30, feedback: 'From the wrong instructor.' }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  await test('10 | PATCH grade — student role cannot grade (403)', async () => {
    const res = await req(
      'PATCH',
      `/api/v1/instructor/submissions/${submissionPending._id}/grade`,
      studentToken,
      { score: 30, feedback: 'Self-grade attempt.' }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // ── D. Data isolation ──────────────────────────────────────────────────────

  await test('11 | GET /instructor/submissions — instructor2 sees no submissions from instructor1 course', async () => {
    const res = await req('GET', '/api/v1/instructor/submissions', instructor2Token);
    assert.strictEqual(res.status, 200);
    const ids = (res.body.data || []).map(s => s._id);
    assert.ok(
      !ids.includes(submissionPending._id.toString()),
      'Instructor 2 must not see submissions from Instructor 1\'s course'
    );
    assert.ok(
      !ids.includes(submissionGraded._id.toString()),
      'Instructor 2 must not see graded submissions from Instructor 1\'s course'
    );
  });

  // ── E. Model-layer assertion: Assignment.maxScore persists correctly ────────

  await test('12 | Assignment model: maxScore field is 50 (not totalPoints)', async () => {
    const a = await Assignment.findById(assignment._id).lean();
    assert.strictEqual(a.maxScore, 50, `Expected maxScore 50, got ${a.maxScore}`);
    assert.strictEqual(
      a.totalPoints,
      undefined,
      'Assignment model must not have totalPoints field'
    );
  });
}

// ── Entry point ───────────────────────────────────────────────────────────────

(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error('\n  [FATAL] Setup or suite error:', err.message);
    process.exitCode = 1;
  } finally {
    await teardown().catch(() => {});
    console.log('\n' + '═'.repeat(62));
    console.log('  TEST SUMMARY (DEF-01 — Grading maxScore)');
    console.log('═'.repeat(62));
    console.log(`  Total:   ${totalTests}`);
    console.log(`  ✓ Pass:  ${passedTests}`);
    console.log(`  ✗ Fail:  ${failedTests}`);
    console.log(`  Rate:    ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
    if (failedTests > 0) {
      console.log('\n  ✗ Some tests failed.\n');
      process.exitCode = 1;
    } else {
      console.log('\n  ✓ All DEF-01 grading tests passed.\n');
    }
  }
})();
