/**
 * Unified Phase 14 Test Suite — Complete System Acceptance
 *
 * Covers:
 *   1. Settings & Registration Control (UC-A03, FR-24, UC-G01)
 *      - GET /api/v1/settings (public)
 *      - PUT /api/v1/admin/settings (admin only)
 *      - Registration toggle enforcement (403 when registration is closed)
 *   2. Announcements (UC-A03, UC-A04, FR-24, FR-46)
 *      - POST /api/v1/admin/announcements (message <= 200 chars, dates validation)
 *      - GET /api/v1/admin/announcements
 *      - GET /api/v1/announcements (dashboard audience, active filtering)
 *   3. Public Content Management & Visitor Experience (UC-A04, UC-G01 to UC-G07, FR-45, FR-46, FR-47)
 *      - GET /api/v1/public/content (public, active announcements, text blocks)
 *      - PUT /api/v1/admin/public/content
 *   4. Reports & CSV Exports (UC-A05, UC-C06, FR-18, FR-26)
 *      - GET /api/v1/reports/users (CSV with formula injection protection & role filter)
 *      - GET /api/v1/reports/internships/:id/forwarded & GET /api/v1/internships/:id/forwarded
 *   5. Actor Authorization Boundaries & Integration
 *      - Public, Student, Instructor, Coordinator, Admin
 *
 * Database: campusbridge_test (isolated)
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
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Setting } from '../models/Setting.js';
import { Announcement } from '../models/Announcement.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || (config.mongoURI || 'mongodb://127.0.0.1:27017/campusbridge').replace('/campusbridge', '/campusbridge_test');
const JWT_SECRET = config.jwtSecret || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT = 5098;

let server;
let adminToken, coordToken, instructorToken, studentToken;
let adminUser, coordUser, instructorUser, studentUser;
let testCompany, testInternship, testApplication;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

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
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
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

async function setup() {
  console.log('\n  [DB] Connecting to test DB:', TEST_DB_URI);
  await mongoose.connect(TEST_DB_URI);
  assert(mongoose.connection.db.databaseName.includes('test'), 'Must use test DB');

  await User.deleteMany({});
  await Setting.deleteMany({});
  await Announcement.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});

  adminUser = await User.create({
    name: 'Unified Admin',
    email: 'admin.u14@test.edu',
    passwordHash: 'Pass123!@#',
    role: 'admin',
    active: true,
  });
  adminToken = makeToken(adminUser);

  coordUser = await User.create({
    name: 'Unified Coordinator',
    email: 'coord.u14@test.edu',
    passwordHash: 'Pass123!@#',
    role: 'coordinator',
    active: true,
  });
  coordToken = makeToken(coordUser);

  instructorUser = await User.create({
    name: 'Unified Instructor',
    email: 'inst.u14@test.edu',
    passwordHash: 'Pass123!@#',
    role: 'instructor',
    department: 'Computer Science',
    active: true,
  });
  instructorToken = makeToken(instructorUser);

  studentUser = await User.create({
    name: 'Unified Student',
    email: 'student.u14@test.edu',
    passwordHash: 'Pass123!@#',
    role: 'student',
    program: 'Software Engineering',
    year: 3,
    active: true,
    cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1200 },
  });
  studentToken = makeToken(studentUser);

  testCompany = await PartnerOrganization.create({
    name: 'Unified Tech Corp',
    contactPerson: 'Lead Recruiter',
    email: 'recruiter@utech.com',
    approved: true,
    approvedBy: coordUser._id,
    createdBy: coordUser._id,
  });

  testInternship = await Internship.create({
    companyId: testCompany._id,
    createdBy: coordUser._id,
    title: 'Cloud Systems Intern',
    type: 'Remote',
    skills: ['AWS', 'Node.js'],
    requirements: ['Undergraduate student in computing or related field'],
    description: 'Work on cloud services',
    deadline: new Date(Date.now() + 15 * 86400000),
    status: 'open',
  });

  testApplication = await Application.create({
    internshipId: testInternship._id,
    studentId: studentUser._id,
    message: 'I am excited about this cloud position.',
    cv: studentUser.cv,
    status: 'Forwarded',
    history: [
      { status: 'Submitted', byUserId: studentUser._id },
      { status: 'Forwarded', byUserId: coordUser._id },
    ],
  });

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });
  console.log(`  [HTTP] Test server listening on port ${TEST_PORT}\n`);
}

async function teardown() {
  await new Promise((resolve) => server.close(resolve));
  await User.deleteMany({});
  await Setting.deleteMany({});
  await Announcement.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});
  await mongoose.disconnect();
  console.log('  [DB] Cleanup complete');
}

async function runSettingsTests() {
  console.log('── Suite 1: System Settings & Registration Control ──\n');

  await test('GET /api/v1/settings returns public registration setting', async () => {
    const res = await req('GET', '/api/v1/settings');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(typeof res.body.data.registrationOpen, 'boolean');
  });

  await test('PUT /api/v1/admin/settings toggles registrationOpen (admin only)', async () => {
    const res = await req('PUT', '/api/v1/admin/settings', adminToken, { registrationOpen: false });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.registrationOpen, false);

    // Verify public settings reflect update
    const publicRes = await req('GET', '/api/v1/settings');
    assert.strictEqual(publicRes.body.data.registrationOpen, false);
  });

  await test('POST /api/v1/auth/register rejected when registrationOpen is false', async () => {
    const res = await req('POST', '/api/v1/auth/register', null, {
      name: 'Blocked Student',
      email: 'blocked@test.edu',
      password: 'password123',
      program: 'CS',
      year: 1,
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert(res.body.message.includes('closed'));
  });

  await test('PUT /api/v1/admin/settings reenables registrationOpen', async () => {
    const res = await req('PUT', '/api/v1/admin/settings', adminToken, { registrationOpen: true });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.registrationOpen, true);
  });

  await test('POST /api/v1/auth/register succeeds when registrationOpen is true', async () => {
    const res = await req('POST', '/api/v1/auth/register', null, {
      name: 'Allowed Student',
      email: 'allowed@test.edu',
      password: 'password123',
      program: 'CS',
      year: 1,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.token);
    await User.deleteOne({ email: 'allowed@test.edu' });
  });

  await test('PUT /api/v1/admin/settings forbidden for non-admin roles', async () => {
    const resCoord = await req('PUT', '/api/v1/admin/settings', coordToken, { registrationOpen: false });
    assert.strictEqual(resCoord.status, 403);

    const resStudent = await req('PUT', '/api/v1/admin/settings', studentToken, { registrationOpen: false });
    assert.strictEqual(resStudent.status, 403);
  });
}

async function runAnnouncementsTests() {
  console.log('\n── Suite 2: Announcements Management & Auditing ──\n');

  await test('POST /api/v1/admin/announcements creates announcement with valid data', async () => {
    const res = await req('POST', '/api/v1/admin/announcements', adminToken, {
      message: 'Fall Semester Internship Placement Applications are now open!',
      audience: 'both',
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      published: true,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.audience, 'both');
  });

  await test('POST /api/v1/admin/announcements rejects message > 200 chars', async () => {
    const longMsg = 'A'.repeat(201);
    const res = await req('POST', '/api/v1/admin/announcements', adminToken, {
      message: longMsg,
      audience: 'both',
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(res.status, 400);
    assert(res.body.message.includes('200'));
  });

  await test('POST /api/v1/admin/announcements rejects endsAt before startsAt', async () => {
    const res = await req('POST', '/api/v1/admin/announcements', adminToken, {
      message: 'Invalid dates announcement',
      audience: 'both',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() - 86400000).toISOString(),
    });
    assert.strictEqual(res.status, 400);
  });

  await test('GET /api/v1/admin/announcements lists all announcements for admin', async () => {
    const res = await req('GET', '/api/v1/admin/announcements', adminToken);
    assert.strictEqual(res.status, 200);
    assert(res.body.data.length >= 1);
  });

  await test('GET /api/v1/announcements lists active dashboard announcements for authenticated users', async () => {
    const res = await req('GET', '/api/v1/announcements', studentToken);
    assert.strictEqual(res.status, 200);
    assert(res.body.data.length >= 1);
    assert(res.body.data.some((a) => a.audience === 'both' || a.audience === 'dashboard'));
  });

  await test('GET /api/v1/announcements excludes expired announcements', async () => {
    // Insert an expired announcement directly
    await Announcement.create({
      message: 'Old Expired Announcement',
      audience: 'both',
      startsAt: new Date(Date.now() - 10 * 86400000),
      endsAt: new Date(Date.now() - 5 * 86400000),
      published: true,
      createdBy: adminUser._id,
    });

    const res = await req('GET', '/api/v1/announcements', studentToken);
    assert.strictEqual(res.status, 200);
    assert(!res.body.data.some((a) => a.message === 'Old Expired Announcement'));
  });
}

async function runPublicContentTests() {
  console.log('\n── Suite 3: Public Website Content & Visitor Experience ──\n');

  await test('GET /api/v1/public/content returns active public announcements and content blocks', async () => {
    const res = await req('GET', '/api/v1/public/content');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.data.publicContent);
    assert(Array.isArray(res.body.data.announcements));
    // Verify announcements are only public/both
    for (const a of res.body.data.announcements) {
      assert(['public', 'both'].includes(a.audience));
    }
  });

  await test('PUT /api/v1/admin/public/content updates marketing text blocks (admin only)', async () => {
    const res = await req('PUT', '/api/v1/admin/public/content', adminToken, {
      heroTitle: 'Updated University Career Gateway',
      heroSubtitle: 'Connecting 10,000+ students to verified engineering internships.',
      aboutText: 'Welcome to the premier university-industry collaboration hub.',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.heroTitle, 'Updated University Career Gateway');

    // Verify public view reflects update
    const publicRes = await req('GET', '/api/v1/public/content');
    assert.strictEqual(publicRes.body.data.publicContent.heroTitle, 'Updated University Career Gateway');
  });

  await test('PUT /api/v1/admin/public/content forbidden for non-admin', async () => {
    const res = await req('PUT', '/api/v1/admin/public/content', coordToken, {
      heroTitle: 'Hacked Title',
    });
    assert.strictEqual(res.status, 403);
  });
}

async function runReportsTests() {
  console.log('\n── Suite 4: Reports & CSV Exports ──\n');

  await test('GET /api/v1/reports/users generates CSV with formula injection protection (admin)', async () => {
    // Insert user with dangerous formula prefix to test SEC-14 escaping
    const formulaUser = await User.create({
      name: '=cmd|’ /C calc’!A0',
      email: 'formula@test.edu',
      passwordHash: 'Pass123!@#',
      role: 'student',
      active: true,
    });

    const res = await req('GET', '/api/v1/reports/users', adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert(res.headers['content-disposition'].includes('attachment; filename="users-report-'));
    assert(typeof res.body === 'string');
    assert(res.body.includes('User ID,Name,Email,Role,Status'));

    // Check that formula character was escaped with single quote
    assert(res.body.includes("''=cmd|’ /C calc’!A0") || res.body.includes("'=cmd"));

    await User.deleteOne({ _id: formulaUser._id });
  });

  await test('GET /api/v1/reports/users forbidden for coordinator and student', async () => {
    const resCoord = await req('GET', '/api/v1/reports/users', coordToken);
    assert.strictEqual(resCoord.status, 403);

    const resStudent = await req('GET', '/api/v1/reports/users', studentToken);
    assert.strictEqual(resStudent.status, 403);
  });

  await test('GET /api/v1/reports/internships/:id/forwarded lists forwarded applications for coordinator', async () => {
    const res = await req('GET', `/api/v1/reports/internships/${testInternship._id}/forwarded`, coordToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 1);
    assert.strictEqual(res.body.data[0].status, 'Forwarded');
    assert.strictEqual(res.body.data[0].studentId.name, 'Unified Student');
  });

  await test('GET /api/v1/internships/:id/forwarded (direct spec route) also works for coordinator & admin', async () => {
    const resAdmin = await req('GET', `/api/v1/internships/${testInternship._id}/forwarded`, adminToken);
    assert.strictEqual(resAdmin.status, 200);
    assert.strictEqual(resAdmin.body.data.length, 1);

    const resStudent = await req('GET', `/api/v1/internships/${testInternship._id}/forwarded`, studentToken);
    assert.strictEqual(resStudent.status, 403);
  });
}

async function runAll() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           Unified Phase 14 Test Suite — Complete System Acceptance   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    await setup();
    await runSettingsTests();
    await runAnnouncementsTests();
    await runPublicContentTests();
    await runReportsTests();
    await teardown();

    console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                         TEST SUMMARY                                 ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Tests:  ${totalTests}`);
    console.log(`✓ Passed:     ${passedTests}`);
    console.log(`✗ Failed:     ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests === 0) {
      console.log('✓ All Unified Phase 14 acceptance tests passed successfully!\n');
      process.exit(0);
    } else {
      console.log(`✗ ${failedTests} test(s) failed.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n✗ Fatal error during test execution:', err);
    await teardown().catch(() => {});
    process.exit(1);
  }
}

runAll();
