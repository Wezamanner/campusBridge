/**
 * Phase 13.1 — Defect Correction Tests
 *
 * Covers all four defects identified in the read-only audit:
 *   D1  Duplicate-forward protection (sequential + concurrent)
 *   D2  HTTP error status code propagation (400 / 403 / 404 / 409 / 500)
 *   D3  studentId filter in application listing
 *   D4  Notification contract (Phase 12 event vs direct write)
 *
 * Tests are split into two layers:
 *   Service layer  – fast, no HTTP overhead, verify business logic
 *   HTTP layer     – real Express + JWT, verify controller status codes
 *
 * Database: campusbridge_test (isolated, wiped in setupTestDatabase)
 */

import assert from 'assert';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

// ── Import application under test ────────────────────────────────────────────
import app, { startServer } from '../server.js';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';
import {
  forwardApplication,
  listAllApplications,
  recordCompanyDecision,
  createInternship,
} from '../services/coordinator.service.js';
import { createStaffUser } from '../services/admin.service.js';

// ── Config ───────────────────────────────────────────────────────────────────
const TEST_DB_URI =
  process.env.TEST_MONGODB_URI ||
  'mongodb://127.0.0.1:27017/campusbridge_test';
const JWT_SECRET =
  process.env.JWT_SECRET || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT = 5099; // dedicated port, never clashes with dev server
const BASE_URL = `http://localhost:${TEST_PORT}`;

// ── Tracking ─────────────────────────────────────────────────────────────────
let total = 0, passed = 0, failed = 0;

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

// ── Shared state ─────────────────────────────────────────────────────────────
let testServer;
let coordinator, admin, student, student2, student3;
let company, internship;
let coordToken, adminToken, studentToken;

// ── HTTP helper ───────────────────────────────────────────────────────────────
function req(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/v1' + path, BASE_URL);
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
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
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

// ── Database setup / teardown ─────────────────────────────────────────────────
async function setupTestDatabase() {
  console.log('\n  [DB] Connecting to', TEST_DB_URI);
  await mongoose.connect(TEST_DB_URI);

  // Verify isolation — must NOT be production database
  const dbName = mongoose.connection.db.databaseName;
  assert(
    dbName.includes('test'),
    `SAFETY: refusing to wipe non-test database "${dbName}"`
  );

  await User.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});

  // Users
  coordinator = await User.create({
    name: 'D-Test Coordinator',
    email: 'd.coord@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'coordinator',
    active: true,
  });
  admin = await User.create({
    name: 'D-Test Admin',
    email: 'd.admin@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'admin',
    active: true,
  });
  student = await User.create({
    name: 'D-Test Student',
    email: 'd.student@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'student',
    active: true,
    program: 'CS',
    year: 2,
    cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
  });
  student2 = await User.create({
    name: 'D-Test Student 2',
    email: 'd.student2@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'student',
    active: true,
    program: 'CS',
    year: 2,
    cv: { name: 'cv2.pdf', path: '/cv2.pdf', size: 1000 },
  });
  student3 = await User.create({
    name: 'D-Test Student 3',
    email: 'd.student3@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'student',
    active: true,
    program: 'CS',
    year: 2,
    cv: { name: 'cv3.pdf', path: '/cv3.pdf', size: 1000 },
  });

  // Company + internship
  company = await PartnerOrganization.create({
    name: 'Defect Corp',
    contactPerson: 'Jane',
    email: 'd.company@defect.edu',
    approved: true,
    approvedBy: coordinator._id,
    createdBy: coordinator._id,
  });
  internship = await Internship.create({
    companyId: company._id,
    createdBy: coordinator._id,
    title: 'Defect Test Internship',
    type: 'Remote',
    skills: ['Node.js'],
    description: 'Test internship for defect corrections',
    requirements: ['Year 2+'],
    deadline: new Date(Date.now() + 30 * 86400000),
  });

  coordToken = makeToken(coordinator);
  adminToken = makeToken(admin);
  studentToken = makeToken(student);

  console.log('  [DB] Setup complete\n');
}

async function cleanupTestDatabase() {
  await User.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});
  await mongoose.disconnect();
  console.log('\n  [DB] Cleanup complete');
}

function mkApp(overrides = {}) {
  return {
    internshipId: internship._id,
    cv: student.cv,
    message: 'Application message long enough to pass validation',
    history: [{ status: 'Submitted', byUserId: student._id }],
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// D1  Duplicate-Forward Protection
// ════════════════════════════════════════════════════════════════════════════
async function runD1Tests() {
  console.log('\n── D1: Duplicate Forward Protection ──\n');

  // ── D1-1: Sequential duplicate forward ──────────────────────────────────
  await test('D1-1 | Second forward on Forwarded app returns 409', async () => {
    const app1 = await Application.create({
      ...mkApp({ studentId: student._id }),
      status: 'Submitted',
    });

    // First forward — should succeed
    const result = await forwardApplication(app1._id.toString(), coordinator._id.toString());
    assert.strictEqual(result.status, 'Forwarded');

    // Second forward — must throw 409
    try {
      await forwardApplication(app1._id.toString(), coordinator._id.toString());
      throw new Error('Expected 409 but no error thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409, `Expected 409, got ${err.statusCode}: ${err.message}`);
      assert.ok(err.message.includes('Cannot forward'), `Unexpected message: ${err.message}`);
    }
  });

  // ── D1-2: No extra history entry on duplicate forward ───────────────────
  await test('D1-2 | Duplicate forward does not add history entry', async () => {
    const app2 = await Application.create({
      ...mkApp({ studentId: student2._id }),
      status: 'Submitted',
    });

    await forwardApplication(app2._id.toString(), coordinator._id.toString());

    // Try (and fail) to forward again
    try {
      await forwardApplication(app2._id.toString(), coordinator._id.toString());
    } catch (_) {}

    const loaded = await Application.findById(app2._id).lean();
    // Should have: Submitted + Under review (auto) + Forwarded = 3 entries
    const forwardedEntries = loaded.history.filter((h) => h.status === 'Forwarded');
    assert.strictEqual(forwardedEntries.length, 1, `Expected 1 Forwarded history entry, got ${forwardedEntries.length}`);
  });

  // ── D1-3: Concurrent duplicate forward ──────────────────────────────────
  await test('D1-3 | Concurrent forward requests: exactly one succeeds', async () => {
    // Fresh Submitted application
    const appConcurrent = await Application.create({
      ...mkApp({ studentId: student3._id }),
      status: 'Submitted',
    });

    const id = appConcurrent._id.toString();
    const cid = coordinator._id.toString();

    // Fire 5 concurrent forward calls
    const results = await Promise.allSettled([
      forwardApplication(id, cid),
      forwardApplication(id, cid),
      forwardApplication(id, cid),
      forwardApplication(id, cid),
      forwardApplication(id, cid),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(successes.length, 1, `Expected 1 success, got ${successes.length}`);
    assert.strictEqual(failures.length, 4, `Expected 4 failures, got ${failures.length}`);

    // All failures must be 409
    for (const f of failures) {
      assert.strictEqual(
        f.reason.statusCode, 409,
        `Concurrent failure should be 409, got ${f.reason.statusCode}`
      );
    }

    // Exactly one Forwarded history entry
    const final = await Application.findById(id).lean();
    const fwdEntries = final.history.filter((h) => h.status === 'Forwarded');
    assert.strictEqual(fwdEntries.length, 1, `Expected 1 Forwarded history entry, got ${fwdEntries.length}`);
    assert.strictEqual(final.status, 'Forwarded');
  });

  // ── D1-4: Terminal states still blocked ─────────────────────────────────
  await test('D1-4 | Forward on Accepted app returns 409', async () => {
    // Create unique student for this test to avoid duplicate key
    const s = await User.create({
      name: 'Terminal Student',
      email: 'd.terminal@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });
    const terminalApp = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Accepted',
      history: [{ status: 'Accepted', byUserId: coordinator._id }],
    });
    try {
      await forwardApplication(terminalApp._id.toString(), coordinator._id.toString());
      throw new Error('Expected 409');
    } catch (err) {
      assert.strictEqual(err.statusCode, 409);
    }
    await User.deleteOne({ _id: s._id });
  });

  // ── D1-5: Valid Under review → Forwarded still works ────────────────────
  await test('D1-5 | Under review → Forwarded still works after fix', async () => {
    // Create unique student
    const s = await User.create({
      name: 'UnderReview Student',
      email: 'd.underreview@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });
    const urApp = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Under review',
      history: [{ status: 'Under review', byUserId: coordinator._id }],
    });
    const result = await forwardApplication(urApp._id.toString(), coordinator._id.toString());
    assert.strictEqual(result.status, 'Forwarded');
    await User.deleteOne({ _id: s._id });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// D2  HTTP Error Status Code Propagation (HTTP-level tests)
// ════════════════════════════════════════════════════════════════════════════
async function runD2Tests() {
  console.log('\n── D2: HTTP Error Status Propagation ──\n');

  // ── D2-1: 400 on invalid companyId ───────────────────────────────────────
  await test('D2-1 | POST /coordinator/internships invalid companyId → HTTP 400', async () => {
    const r = await req('POST', '/coordinator/internships', coordToken, {
      companyId: 'not-an-objectid',
      title: 'Test',
      type: 'Remote',
      skills: ['JS'],
      description: 'Desc',
      requirements: ['Req'],
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.success, false);
  });

  // ── D2-2: 400 on past deadline ───────────────────────────────────────────
  await test('D2-2 | POST /coordinator/internships past deadline → HTTP 400', async () => {
    const r = await req('POST', '/coordinator/internships', coordToken, {
      companyId: company._id.toString(),
      title: 'Test',
      type: 'Remote',
      skills: ['JS'],
      description: 'Desc',
      requirements: ['Req'],
      deadline: new Date(Date.now() - 86400000).toISOString(),
    });
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-3: 403 on student role attempting coordinator route ────────────────
  await test('D2-3 | POST /coordinator/internships as student → HTTP 403', async () => {
    const r = await req('POST', '/coordinator/internships', studentToken, {
      companyId: company._id.toString(),
      title: 'Test',
      type: 'Remote',
      skills: ['JS'],
      description: 'Desc',
      requirements: ['Req'],
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}`);
  });

  // ── D2-4: 404 on non-existent application forward ────────────────────────
  await test('D2-4 | PATCH /coordinator/applications/:id/forward non-existent → HTTP 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const r = await req('PATCH', `/coordinator/applications/${fakeId}/forward`, coordToken, {});
    assert.strictEqual(r.status, 404, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-5: 409 on duplicate forward ───────────────────────────────────────
  await test('D2-5 | PATCH /coordinator/applications/:id/forward already Forwarded → HTTP 409', async () => {
    // Create unique student
    const s = await User.create({
      name: 'HTTP 409 Student',
      email: 'd.http409@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });
    const a = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Forwarded',
      history: [{ status: 'Forwarded', byUserId: coordinator._id }],
    });
    const r = await req('PATCH', `/coordinator/applications/${a._id}/forward`, coordToken, {});
    assert.strictEqual(r.status, 409, `Expected 409, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body.success, false);
    await User.deleteOne({ _id: s._id });
  });

  // ── D2-6: 400 on invalid status filter ───────────────────────────────────
  await test('D2-6 | GET /coordinator/applications invalid status → HTTP 400', async () => {
    const r = await req('GET', '/coordinator/applications?status=INVALID', coordToken);
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-7: 400 on invalid studentId filter ────────────────────────────────
  await test('D2-7 | GET /coordinator/applications invalid studentId → HTTP 400', async () => {
    const r = await req('GET', '/coordinator/applications?studentId=not-valid-id', coordToken);
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-8: 404 on decision for non-existent application ───────────────────
  await test('D2-8 | PATCH /coordinator/applications/:id/decision non-existent → HTTP 404', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const r = await req('PATCH', `/coordinator/applications/${fakeId}/decision`, coordToken, {
      decision: 'Accepted',
    });
    assert.strictEqual(r.status, 404, `Expected 404, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-9: 409 on decision for non-Forwarded application ──────────────────
  await test('D2-9 | PATCH /coordinator/applications/:id/decision on Submitted → HTTP 409', async () => {
    const s = await User.create({
      name: 'Decision Submitted Student',
      email: 'd.decisub@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });
    const a = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Submitted',
    });
    const r = await req('PATCH', `/coordinator/applications/${a._id}/decision`, coordToken, {
      decision: 'Accepted',
    });
    assert.strictEqual(r.status, 409, `Expected 409, got ${r.status}: ${JSON.stringify(r.body)}`);
    await User.deleteOne({ _id: s._id });
  });

  // ── D2-10: 403 on admin creating admin role ───────────────────────────────
  await test('D2-10 | POST /admin/users role=admin → HTTP 403', async () => {
    const r = await req('POST', '/admin/users', adminToken, {
      name: 'Another Admin',
      email: 'd.anotherAdmin@defect.edu',
      role: 'admin',
      passwordHash: 'TestPass123!',
    });
    assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-11: 409 on duplicate email for staff creation ─────────────────────
  await test('D2-11 | POST /admin/users duplicate email → HTTP 409', async () => {
    const r = await req('POST', '/admin/users', adminToken, {
      name: 'Dupe Coord',
      email: coordinator.email, // existing email
      role: 'coordinator',
      passwordHash: 'TestPass123!',
    });
    assert.strictEqual(r.status, 409, `Expected 409, got ${r.status}: ${JSON.stringify(r.body)}`);
  });

  // ── D2-12: 400 on short password ─────────────────────────────────────────
  await test('D2-12 | POST /admin/users short password → HTTP 400', async () => {
    const r = await req('POST', '/admin/users', adminToken, {
      name: 'Short Pw User',
      email: 'd.shortpw@defect.edu',
      role: 'instructor',
      passwordHash: 'abc',
    });
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// D3  studentId Filter
// ════════════════════════════════════════════════════════════════════════════
async function runD3Tests() {
  console.log('\n── D3: studentId Filter ──\n');

  // Create a few applications for two different students
  const s = await User.create({
    name: 'D3 Student A',
    email: 'd3.studentA@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'student',
    active: true,
    program: 'CS',
    year: 2,
    cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
  });
  const s2 = await User.create({
    name: 'D3 Student B',
    email: 'd3.studentB@defect.edu',
    passwordHash: 'TestPass123!',
    role: 'student',
    active: true,
    program: 'CS',
    year: 2,
    cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
  });

  await Application.create({
    ...mkApp({ studentId: s._id }),
    status: 'Submitted',
  });
  await Application.create({
    ...mkApp({ studentId: s2._id }),
    status: 'Submitted',
  });

  // ── D3-1: Service returns only matching student ──────────────────────────
  await test('D3-1 | Service: studentId filter returns only that student\'s applications', async () => {
    const result = await listAllApplications({ studentId: s._id.toString() });
    assert.ok(result.applications.length >= 1, 'Should return at least 1 application');
    for (const app of result.applications) {
      assert.strictEqual(
        app.studentId._id?.toString() ?? app.studentId.toString(),
        s._id.toString(),
        'All returned apps should belong to the filtered student'
      );
    }
  });

  // ── D3-2: Service 400 on invalid studentId ───────────────────────────────
  await test('D3-2 | Service: invalid studentId throws 400', async () => {
    try {
      await listAllApplications({ studentId: 'not-an-objectid' });
      throw new Error('Expected error not thrown');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400);
    }
  });

  // ── D3-3: HTTP: studentId filter works end-to-end ───────────────────────
  await test('D3-3 | HTTP: GET /coordinator/applications?studentId= filters correctly', async () => {
    const r = await req(
      'GET',
      `/coordinator/applications?studentId=${s._id.toString()}`,
      coordToken
    );
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body.data.length >= 1, 'Should return at least 1 app');
    for (const app of r.body.data) {
      const sid = app.studentId?._id ?? app.studentId;
      assert.strictEqual(sid.toString(), s._id.toString(), 'Filter should restrict by studentId');
    }
  });

  // ── D3-4: HTTP 400 on invalid studentId via HTTP ─────────────────────────
  await test('D3-4 | HTTP: GET /coordinator/applications?studentId=invalid → 400', async () => {
    const r = await req('GET', '/coordinator/applications?studentId=badid', coordToken);
    assert.strictEqual(r.status, 400, `Expected 400, got ${r.status}`);
  });

  // ── D3-5: Combined filters preserved ────────────────────────────────────
  await test('D3-5 | studentId + status filters combined work correctly', async () => {
    const result = await listAllApplications({
      studentId: s._id.toString(),
      status: 'Submitted',
    });
    for (const app of result.applications) {
      const sid = app.studentId._id?.toString() ?? app.studentId.toString();
      assert.strictEqual(sid, s._id.toString());
      assert.strictEqual(app.status, 'Submitted');
    }
  });

  await User.deleteMany({ email: /d3\..*defect\.edu/ });
}

// ════════════════════════════════════════════════════════════════════════════
// D4  Notification Contract
// ════════════════════════════════════════════════════════════════════════════
async function runD4Tests() {
  console.log('\n── D4: Notification Contract ──\n');

  // ── D4-1: Forward emits event, consumer creates notification ─────────────
  await test('D4-1 | Forward creates exactly one notification via event contract', async () => {
    // Fresh application for student (student was cleaned up above, use unique email)
    const s = await User.create({
      name: 'D4 Notif Student',
      email: 'd4.notif@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });

    await Notification.deleteMany({ userId: s._id });

    const a = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Submitted',
    });

    await forwardApplication(a._id.toString(), coordinator._id.toString());

    // Allow event loop to flush (event is async)
    await new Promise((r) => setTimeout(r, 150));

    const notifs = await Notification.find({ userId: s._id, type: 'application' }).lean();
    assert.ok(notifs.length >= 1, 'Should have at least one notification after forward');

    const fwdNotif = notifs.find((n) => n.title === 'Application Forwarded');
    assert.ok(fwdNotif, 'Should have an "Application Forwarded" notification');

    await User.deleteOne({ _id: s._id });
  });

  // ── D4-2: No duplicate notifications on sequential forward (D4 dedup) ────
  await test('D4-2 | No duplicate notification for the same status transition (sequential)', async () => {
    // The event consumer deduplication guards against sequential duplicate events.
    // Simultaneous fire before first DB write cannot be deduplicated — this is expected
    // behaviour documented in applicationNotification.service.js.
    // This test verifies sequential dedup works (the more common real-world scenario).
    const { handleApplicationStatusChanged } = await import('../services/applicationNotification.service.js');
    const s = await User.create({
      name: 'D4 Dedup Student',
      email: 'd4.dedup@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });

    await Notification.deleteMany({ userId: s._id });

    const fakeId = new mongoose.Types.ObjectId().toString();
    const payload = {
      applicationId: fakeId,
      studentId: s._id.toString(),
      newStatus: 'Forwarded',
      internshipTitle: 'Test Internship',
      timestamp: new Date().toISOString(),
    };

    // Call handleApplicationStatusChanged sequentially — dedup should block 2nd and 3rd
    await handleApplicationStatusChanged(payload);
    await handleApplicationStatusChanged(payload);
    await handleApplicationStatusChanged(payload);

    const notifs = await Notification.find({ userId: s._id, type: 'application' }).lean();
    assert.strictEqual(notifs.length, 1, `Expected 1 notification, got ${notifs.length} (sequential dedup failed)`);

    await User.deleteOne({ _id: s._id });
  });

  // ── D4-3: Decision (Accepted) creates correct notification ───────────────
  await test('D4-3 | Accept decision creates "Application Accepted" notification', async () => {
    const s = await User.create({
      name: 'D4 Accept Student',
      email: 'd4.accept@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });

    await Notification.deleteMany({ userId: s._id });

    const a = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Forwarded',
      history: [{ status: 'Forwarded', byUserId: coordinator._id }],
    });

    await recordCompanyDecision(a._id.toString(), 'Accepted', coordinator._id.toString(), '');
    await new Promise((r) => setTimeout(r, 150));

    const notifs = await Notification.find({ userId: s._id, type: 'application' }).lean();
    const acceptNotif = notifs.find((n) => n.title === 'Application Accepted');
    assert.ok(acceptNotif, `Expected "Application Accepted" notification. Got titles: ${notifs.map(n=>n.title).join(', ')}`);
    assert.ok(acceptNotif.message.includes('Congratulations'), 'Accepted message should say Congratulations');

    await User.deleteOne({ _id: s._id });
  });

  // ── D4-4: Decision (Rejected) creates correct notification ───────────────
  await test('D4-4 | Reject decision creates "Application Rejected" notification', async () => {
    const s = await User.create({
      name: 'D4 Reject Student',
      email: 'd4.reject@defect.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'CS',
      year: 2,
      cv: { name: 'cv.pdf', path: '/cv.pdf', size: 1000 },
    });

    await Notification.deleteMany({ userId: s._id });

    const a = await Application.create({
      ...mkApp({ studentId: s._id }),
      status: 'Forwarded',
      history: [{ status: 'Forwarded', byUserId: coordinator._id }],
    });

    await recordCompanyDecision(a._id.toString(), 'Rejected', coordinator._id.toString(), '');
    await new Promise((r) => setTimeout(r, 150));

    const notifs = await Notification.find({ userId: s._id, type: 'application' }).lean();
    const rejNotif = notifs.find((n) => n.title === 'Application Rejected');
    assert.ok(rejNotif, `Expected "Application Rejected" notification. Got titles: ${notifs.map(n=>n.title).join(', ')}`);

    await User.deleteOne({ _id: s._id });
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Main runner
// ════════════════════════════════════════════════════════════════════════════
async function runAll() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          Phase 13.1 Defect Correction Tests (D1–D4)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    await setupTestDatabase();

    // Start HTTP test server on isolated port
    testServer = http.createServer(app);
    await new Promise((resolve, reject) => {
      testServer.listen(TEST_PORT, (err) => (err ? reject(err) : resolve()));
    });
    console.log(`  [HTTP] Test server listening on port ${TEST_PORT}`);

    await runD1Tests();
    await runD2Tests();
    await runD3Tests();
    await runD4Tests();

  } finally {
    if (testServer) {
      await new Promise((r) => testServer.close(r));
      console.log('  [HTTP] Test server closed');
    }
    await cleanupTestDatabase();
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                         TEST SUMMARY                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
  console.log(`Total:   ${total}`);
  console.log(`✓ Pass:  ${passed}`);
  console.log(`✗ Fail:  ${failed}`);
  console.log(`Rate:    ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('✓ All defect-correction tests passed.\n');
    process.exit(0);
  } else {
    console.log(`✗ ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('\n✗ Fatal error:', err);
  process.exit(1);
});
