/**
 * Phase 14 — New Feature Tests
 *
 * Tests for all Phase 14 additions:
 *   1. Coordinator: Course creation, update, archive (FR-04 / UC-C01)
 *   2. Coordinator: Company registration, update (FR-13)
 *   3. Coordinator: Internship edit & close (FR-10)
 *   4. Coordinator: Interview scheduling
 *   5. Admin: Soft-delete & reactivation (FR-22 / UC-A02)
 *   6. Admin: Announcement edit & delete (FR-47)
 *   7. Admin: SEC-12 activity logging
 *   8. Profile for all roles (FR-03 / UC-G02)
 *   9. Help & Support (FR-52 / UC-G07)
 *
 * Uses real HTTP endpoints on isolated test database.
 */

import assert from 'assert';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import app from '../server.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { Announcement } from '../models/Announcement.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Setting } from '../models/Setting.js';
import { Notification } from '../models/Notification.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbridge_test';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT = 5097;

let server;
let total = 0, passed = 0, failed = 0;
let adminUser, coordUser, instructorUser, studentUser;
let adminToken, coordToken, instructorToken, studentToken;
let testCompany, testInternship, testApplication;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function req(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://localhost:${TEST_PORT}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: parseInt(url.port),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function tok(user) { return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' }); }

async function setup() {
  await mongoose.connect(TEST_DB_URI);
  assert(mongoose.connection.db.databaseName.includes('test'), 'Must use test DB');

  await Promise.all([
    User.deleteMany({}), Course.deleteMany({}), PartnerOrganization.deleteMany({}),
    Internship.deleteMany({}), Application.deleteMany({}), Announcement.deleteMany({}),
    ActivityLog.deleteMany({}), Setting.deleteMany({}), Notification.deleteMany({}),
  ]);

  adminUser = await User.create({ name: 'P14 Admin', email: 'p14.admin@test.edu', passwordHash: 'Pass123!@#', role: 'admin', active: true });
  coordUser = await User.create({ name: 'P14 Coord', email: 'p14.coord@test.edu', passwordHash: 'Pass123!@#', role: 'coordinator', active: true });
  instructorUser = await User.create({ name: 'P14 Instructor', email: 'p14.inst@test.edu', passwordHash: 'Pass123!@#', role: 'instructor', department: 'CS', active: true });
  studentUser = await User.create({ name: 'P14 Student', email: 'p14.student@test.edu', passwordHash: 'Pass123!@#', role: 'student', program: 'SE', year: 2, active: true, cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 } });

  adminToken = tok(adminUser);
  coordToken = tok(coordUser);
  instructorToken = tok(instructorUser);
  studentToken = tok(studentUser);

  testCompany = await PartnerOrganization.create({
    name: 'P14 TechCo', contactPerson: 'HR Manager', email: 'hr@p14tech.com',
    approved: true, approvedBy: coordUser._id, createdBy: coordUser._id,
  });

  testInternship = await Internship.create({
    companyId: testCompany._id, createdBy: coordUser._id,
    title: 'P14 Test Internship', type: 'Remote',
    skills: ['Node.js'], requirements: ['Year 2+'],
    description: 'Phase 14 internship', deadline: new Date(Date.now() + 30 * 86400000),
  });

  testApplication = await Application.create({
    internshipId: testInternship._id, studentId: studentUser._id,
    message: 'I am interested in this internship position.',
    cv: studentUser.cv, status: 'Forwarded',
    history: [{ status: 'Submitted', byUserId: studentUser._id }, { status: 'Forwarded', byUserId: coordUser._id }],
  });

  server = app.listen(TEST_PORT);
  await new Promise((r) => server.once('listening', r));
  console.log(`  [HTTP] Listening on port ${TEST_PORT}\n`);
}

async function teardown() {
  await new Promise((r) => server.close(r));
  await Promise.all([
    User.deleteMany({}), Course.deleteMany({}), PartnerOrganization.deleteMany({}),
    Internship.deleteMany({}), Application.deleteMany({}), Announcement.deleteMany({}),
    ActivityLog.deleteMany({}), Setting.deleteMany({}), Notification.deleteMany({}),
  ]);
  await mongoose.disconnect();
}

// ══════════════════════════════════════════════════════════════════
// 1. Course Management (FR-04 / UC-C01)
// ══════════════════════════════════════════════════════════════════
async function runCourseTests() {
  console.log('── Suite 1: Coordinator Course Management ──\n');
  let courseId;

  await test('POST /coordinator/courses creates a course with instructor assignment', async () => {
    const r = await req('POST', '/api/v1/coordinator/courses', coordToken, {
      code: 'CS401', title: 'Advanced Backend Development', description: 'Node.js deep dive',
      instructorId: instructorUser._id.toString(),
    });
    assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.code, 'CS401');
    assert.strictEqual(r.body.data.instructorId.toString(), instructorUser._id.toString());
    assert.strictEqual(r.body.data.status, 'active');
    courseId = r.body.data._id;
  });

  await test('POST /coordinator/courses rejects duplicate course code → 409', async () => {
    const r = await req('POST', '/api/v1/coordinator/courses', coordToken, {
      code: 'CS401', title: 'Duplicate Code Course', instructorId: instructorUser._id.toString(),
    });
    assert.strictEqual(r.status, 409);
  });

  await test('POST /coordinator/courses rejects invalid instructor ID → 400', async () => {
    const r = await req('POST', '/api/v1/coordinator/courses', coordToken, {
      code: 'CS999', title: 'Bad Instructor', instructorId: 'not-valid-id',
    });
    assert.strictEqual(r.status, 400);
  });

  await test('PUT /coordinator/courses/:id updates title and instructor', async () => {
    const r = await req('PUT', `/api/v1/coordinator/courses/${courseId}`, coordToken, {
      title: 'Advanced Backend Updated',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.title, 'Advanced Backend Updated');
  });

  await test('PATCH /coordinator/courses/:id/status archives a course', async () => {
    const r = await req('PATCH', `/api/v1/coordinator/courses/${courseId}/status`, coordToken, { status: 'archived' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'archived');
  });

  await test('PATCH /coordinator/courses/:id/status reactivates a course', async () => {
    const r = await req('PATCH', `/api/v1/coordinator/courses/${courseId}/status`, coordToken, { status: 'active' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'active');
  });

  await test('Course endpoints reject unauthenticated requests → 401', async () => {
    const r = await req('POST', '/api/v1/coordinator/courses', null, { code: 'CS000', title: 'No Auth', instructorId: instructorUser._id.toString() });
    assert.strictEqual(r.status, 401);
  });

  await test('Course endpoints reject student role → 403', async () => {
    const r = await req('POST', '/api/v1/coordinator/courses', studentToken, { code: 'CS000', title: 'No Auth', instructorId: instructorUser._id.toString() });
    assert.strictEqual(r.status, 403);
  });
}

// ══════════════════════════════════════════════════════════════════
// 2. Partner Company Registration (FR-13)
// ══════════════════════════════════════════════════════════════════
async function runCompanyTests() {
  console.log('\n── Suite 2: Partner Company Registration & Update ──\n');
  let companyId;

  await test('POST /coordinator/organizations registers a new company', async () => {
    const r = await req('POST', '/api/v1/coordinator/organizations', coordToken, {
      name: 'New Tech Partners Ltd', contactPerson: 'Alice Smith', email: 'alice@newtech.com',
      phone: '+1234567890', website: 'https://newtech.com',
    });
    assert.strictEqual(r.status, 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.name, 'New Tech Partners Ltd');
    assert.strictEqual(r.body.data.approved, false); // starts unapproved
    companyId = r.body.data._id;
  });

  await test('POST /coordinator/organizations rejects duplicate company name → 409', async () => {
    const r = await req('POST', '/api/v1/coordinator/organizations', coordToken, {
      name: 'New Tech Partners Ltd', contactPerson: 'Bob', email: 'bob@dupe.com',
    });
    assert.strictEqual(r.status, 409);
  });

  await test('POST /coordinator/organizations rejects missing required fields → 400', async () => {
    const r = await req('POST', '/api/v1/coordinator/organizations', coordToken, {
      name: 'No Contact Company',
    });
    assert.strictEqual(r.status, 400);
  });

  await test('PUT /coordinator/organizations/:id updates company details', async () => {
    const r = await req('PUT', `/api/v1/coordinator/organizations/${companyId}`, coordToken, {
      contactPerson: 'Alice Updated', phone: '+9876543210',
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.contactPerson, 'Alice Updated');
  });
}

// ══════════════════════════════════════════════════════════════════
// 3. Internship Edit & Close (FR-10)
// ══════════════════════════════════════════════════════════════════
async function runInternshipTests() {
  console.log('\n── Suite 3: Internship Edit & Close ──\n');

  await test('GET /coordinator/internships lists all internships', async () => {
    const r = await req('GET', '/api/v1/coordinator/internships', coordToken);
    assert.strictEqual(r.status, 200);
    assert(Array.isArray(r.body.data));
    assert(r.body.data.length >= 1);
  });

  await test('PUT /coordinator/internships/:id updates title and skills', async () => {
    const r = await req('PUT', `/api/v1/coordinator/internships/${testInternship._id}`, coordToken, {
      title: 'Updated Internship Title', skills: ['Node.js', 'React'],
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.title, 'Updated Internship Title');
  });

  await test('PUT /coordinator/internships/:id rejects past deadline → 400', async () => {
    const r = await req('PUT', `/api/v1/coordinator/internships/${testInternship._id}`, coordToken, {
      deadline: new Date(Date.now() - 86400000).toISOString(),
    });
    assert.strictEqual(r.status, 400);
  });

  await test('PATCH /coordinator/internships/:id/status closes internship', async () => {
    const r = await req('PATCH', `/api/v1/coordinator/internships/${testInternship._id}/status`, coordToken, { status: 'closed' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'closed');
  });

  await test('PATCH /coordinator/internships/:id/status reopens internship', async () => {
    const r = await req('PATCH', `/api/v1/coordinator/internships/${testInternship._id}/status`, coordToken, { status: 'open' });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.status, 'open');
  });
}

// ══════════════════════════════════════════════════════════════════
// 4. Interview Scheduling
// ══════════════════════════════════════════════════════════════════
async function runInterviewTests() {
  console.log('\n── Suite 4: Interview Scheduling ──\n');

  await test('PATCH /coordinator/applications/:id/interview schedules an interview', async () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const r = await req('PATCH', `/api/v1/coordinator/applications/${testApplication._id}/interview`, coordToken, {
      date: futureDate,
      time: '10:00 AM UTC',
      meetingLink: 'https://zoom.us/j/123456789',
      instructionsForCandidate: 'Please join 5 minutes early.',
    });
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert(r.body.data.interviewSchedule);
    assert(r.body.data.interviewSchedule.meetingLink === 'https://zoom.us/j/123456789');
  });

  await test('PATCH /coordinator/applications/:id/interview rejects invalid meeting link → 400', async () => {
    const r = await req('PATCH', `/api/v1/coordinator/applications/${testApplication._id}/interview`, coordToken, {
      date: new Date(Date.now() + 7 * 86400000).toISOString(),
      meetingLink: 'not-a-url',
    });
    assert.strictEqual(r.status, 400);
  });

  await test('GET /coordinator/applications/:id/interview retrieves the interview schedule', async () => {
    const r = await req('GET', `/api/v1/coordinator/applications/${testApplication._id}/interview`, coordToken);
    assert.strictEqual(r.status, 200);
    assert(r.body.data.interviewSchedule);
  });
}

// ══════════════════════════════════════════════════════════════════
// 5. Admin Soft-Delete & Reactivation (FR-22 / UC-A02)
// ══════════════════════════════════════════════════════════════════
async function runSoftDeleteTests() {
  console.log('\n── Suite 5: Admin Soft-Delete & Reactivation ──\n');

  // Create a sacrificial user to delete
  let victim;
  before: {
    victim = await User.create({
      name: 'Victim User', email: 'victim@test.edu', passwordHash: 'Pass123!@#',
      role: 'student', active: true,
    });
  }

  await test('PATCH /admin/users/:id/delete soft-deletes a user', async () => {
    const r = await req('PATCH', `/api/v1/admin/users/${victim._id}/delete`, adminToken);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.active, false);

    // Verify deletedAt was set in DB
    const dbUser = await User.findById(victim._id).select('+deletedAt');
    assert(dbUser.deletedAt !== null, 'deletedAt should be set');
  });

  await test('PATCH /admin/users/:id/delete logs ADMIN_SOFT_DELETE_USER in ActivityLog', async () => {
    // Allow async log write to complete
    await new Promise((r) => setTimeout(r, 100));
    const log = await ActivityLog.findOne({ action: 'ADMIN_SOFT_DELETE_USER', userId: adminUser._id });
    assert(log, 'Should have activity log entry for soft-delete');
    assert.strictEqual(log.targetId.toString(), victim._id.toString());
  });

  await test('PATCH /admin/users/:id/delete prevents admin self-deletion → 403', async () => {
    const r = await req('PATCH', `/api/v1/admin/users/${adminUser._id}/delete`, adminToken);
    assert.strictEqual(r.status, 403);
  });

  await test('PATCH /admin/users/:id/delete rejects double soft-delete → 409', async () => {
    const r = await req('PATCH', `/api/v1/admin/users/${victim._id}/delete`, adminToken);
    assert.strictEqual(r.status, 409);
  });

  await test('PATCH /admin/users/:id/reactivate reactivates a soft-deleted user', async () => {
    const r = await req('PATCH', `/api/v1/admin/users/${victim._id}/reactivate`, adminToken);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.active, true);
  });

  await test('POST /auth/login rejected for soft-deleted user → 403 (via deletedAt)', async () => {
    // Re-delete victim to test auth enforcement
    await User.findByIdAndUpdate(victim._id, { deletedAt: new Date(), active: false });
    const r = await req('POST', '/api/v1/auth/login', null, { email: 'victim@test.edu', password: 'Pass123!@#' });
    assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}`);

    // Cleanup
    await User.findByIdAndDelete(victim._id);
  });
}

// ══════════════════════════════════════════════════════════════════
// 6. Announcement Edit & Delete (FR-47 / UC-A04)
// ══════════════════════════════════════════════════════════════════
async function runAnnouncementCrudTests() {
  console.log('\n── Suite 6: Announcement Edit & Delete ──\n');

  let annoId;

  await test('POST /admin/announcements creates an announcement (setup)', async () => {
    const r = await req('POST', '/api/v1/admin/announcements', adminToken, {
      message: 'Original announcement message', audience: 'both',
      endsAt: new Date(Date.now() + 7 * 86400000).toISOString(), published: true,
    });
    assert.strictEqual(r.status, 201);
    annoId = r.body.data._id;
  });

  await test('PUT /admin/announcements/:id updates message and audience', async () => {
    const r = await req('PUT', `/api/v1/admin/announcements/${annoId}`, adminToken, {
      message: 'Updated announcement message', audience: 'dashboard',
    });
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.message, 'Updated announcement message');
    assert.strictEqual(r.body.data.audience, 'dashboard');
  });

  await test('PUT /admin/announcements/:id rejects message > 200 chars → 400', async () => {
    const r = await req('PUT', `/api/v1/admin/announcements/${annoId}`, adminToken, {
      message: 'A'.repeat(201),
    });
    assert.strictEqual(r.status, 400);
  });

  await test('PUT /admin/announcements/:id forbidden for coordinator → 403', async () => {
    const r = await req('PUT', `/api/v1/admin/announcements/${annoId}`, coordToken, { message: 'Hacked' });
    assert.strictEqual(r.status, 403);
  });

  await test('DELETE /admin/announcements/:id deletes the announcement', async () => {
    const r = await req('DELETE', `/api/v1/admin/announcements/${annoId}`, adminToken);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);

    // Verify it no longer exists
    const check = await Announcement.findById(annoId);
    assert(!check, 'Announcement should be deleted from DB');
  });

  await test('DELETE /admin/announcements/:id on non-existent → 404', async () => {
    const r = await req('DELETE', `/api/v1/admin/announcements/${new mongoose.Types.ObjectId()}`, adminToken);
    assert.strictEqual(r.status, 404);
  });
}

// ══════════════════════════════════════════════════════════════════
// 7. SEC-12 Activity Logging for Role Changes
// ══════════════════════════════════════════════════════════════════
async function runActivityLogTests() {
  console.log('\n── Suite 7: SEC-12 Activity Logging ──\n');

  let logTarget;
  before: {
    logTarget = await User.create({
      name: 'Log Target', email: 'logtarget@test.edu', passwordHash: 'Pass123!@#',
      role: 'student', active: true,
    });
  }

  await test('PATCH /admin/users/:id role change is logged as ADMIN_ROLE_CHANGE', async () => {
    await ActivityLog.deleteMany({ userId: adminUser._id, action: 'ADMIN_ROLE_CHANGE' });
    const r = await req('PATCH', `/api/v1/admin/users/${logTarget._id}`, adminToken, { role: 'instructor' });
    assert.strictEqual(r.status, 200);

    await new Promise((r) => setTimeout(r, 150));
    const log = await ActivityLog.findOne({ userId: adminUser._id, action: 'ADMIN_ROLE_CHANGE' });
    assert(log, 'Role change should be logged');
    assert.strictEqual(log.meta.previousRole, 'student');
    assert.strictEqual(log.meta.newRole, 'instructor');
  });

  await test('PATCH /admin/users/:id deactivation is logged as ADMIN_DEACTIVATE_USER', async () => {
    await ActivityLog.deleteMany({ userId: adminUser._id, action: 'ADMIN_DEACTIVATE_USER' });
    const r = await req('PATCH', `/api/v1/admin/users/${logTarget._id}`, adminToken, { active: false });
    assert.strictEqual(r.status, 200);

    await new Promise((r) => setTimeout(r, 150));
    const log = await ActivityLog.findOne({ userId: adminUser._id, action: 'ADMIN_DEACTIVATE_USER' });
    assert(log, 'Deactivation should be logged');
  });

  // Cleanup
  await User.findByIdAndDelete(logTarget._id);
}

// ══════════════════════════════════════════════════════════════════
// 8. Profile for All Roles (FR-03 / UC-G02)
// ══════════════════════════════════════════════════════════════════
async function runProfileTests() {
  console.log('\n── Suite 8: Profile for All Roles (FR-03) ──\n');

  await test('GET /profile returns instructor profile', async () => {
    const r = await req('GET', '/api/v1/profile', instructorToken);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.role, 'instructor');
    assert.strictEqual(r.body.data.email, instructorUser.email);
  });

  await test('GET /profile returns coordinator profile', async () => {
    const r = await req('GET', '/api/v1/profile', coordToken);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.role, 'coordinator');
  });

  await test('GET /profile returns admin profile', async () => {
    const r = await req('GET', '/api/v1/profile', adminToken);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.role, 'admin');
  });

  await test('PUT /profile updates instructor name and department', async () => {
    const r = await req('PUT', '/api/v1/profile', instructorToken, {
      name: 'P14 Instructor Updated', department: 'Software Engineering',
    });
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.data.name, 'P14 Instructor Updated');
    assert.strictEqual(r.body.data.department, 'Software Engineering');
  });

  await test('PUT /profile updates theme preference for coordinator', async () => {
    const r = await req('PUT', '/api/v1/profile', coordToken, {
      preferences: { theme: 'light' },
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.preferences.theme, 'light');
  });

  await test('POST /profile/cv forbidden for instructor → 403', async () => {
    const r = await req('POST', '/api/v1/profile/cv', instructorToken, {});
    assert.strictEqual(r.status, 403);
  });

  await test('GET /profile requires authentication → 401', async () => {
    const r = await req('GET', '/api/v1/profile', null);
    assert.strictEqual(r.status, 401);
  });
}

// ══════════════════════════════════════════════════════════════════
// 9. Help & Support (FR-52 / UC-G07)
// ══════════════════════════════════════════════════════════════════
async function runHelpTests() {
  console.log('\n── Suite 9: Help & Support (FR-52 / UC-G07) ──\n');

  await test('GET /help returns student FAQs', async () => {
    const r = await req('GET', '/api/v1/help', studentToken);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.body.data.faqs));
    assert(r.body.data.faqs.length > 0);
    assert.strictEqual(r.body.data.role, 'student');
    assert(r.body.data.supportContact);
  });

  await test('GET /help returns coordinator-specific FAQs', async () => {
    const r = await req('GET', '/api/v1/help', coordToken);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.role, 'coordinator');
    assert(r.body.data.faqs.some((f) => f.question.toLowerCase().includes('internship')));
  });

  await test('GET /help returns admin-specific FAQs', async () => {
    const r = await req('GET', '/api/v1/help', adminToken);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.data.role, 'admin');
  });

  await test('GET /help requires authentication → 401', async () => {
    const r = await req('GET', '/api/v1/help', null);
    assert.strictEqual(r.status, 401);
  });
}

// ══════════════════════════════════════════════════════════════════
// Main runner
// ══════════════════════════════════════════════════════════════════
async function runAll() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          Phase 14 — New Feature Tests (FR-04/10/13/22/47/52)         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    await setup();
    await runCourseTests();
    await runCompanyTests();
    await runInternshipTests();
    await runInterviewTests();
    await runSoftDeleteTests();
    await runAnnouncementCrudTests();
    await runActivityLogTests();
    await runProfileTests();
    await runHelpTests();
    await teardown();

    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                         TEST SUMMARY                                ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total:   ${total}`);
    console.log(`✓ Pass:  ${passed}`);
    console.log(`✗ Fail:  ${failed}`);
    console.log(`Rate:    ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed === 0) {
      console.log('✓ All Phase 14 new feature tests passed.\n');
      process.exit(0);
    } else {
      console.log(`✗ ${failed} test(s) failed.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n✗ Fatal error:', err);
    await teardown().catch(() => {});
    process.exit(1);
  }
}

runAll();
