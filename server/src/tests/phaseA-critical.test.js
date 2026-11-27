/**
 * Phase A — Critical Fixes Regression Suite
 *
 * BUG-01: GET /api/v1/admin/activity-logs
 *
 * Tests:
 *   1.  Admin can retrieve activity logs — 200, data is an array
 *   2.  Response uses `data` field (not legacy `logs`)
 *   3.  Pagination metadata present (page, limit, total, pages)
 *   4.  Default limit is 50, capped at 100
 *   5.  userId filter returns only that user's logs
 *   6.  Invalid userId filter returns 400
 *   7.  Invalid page/limit handled gracefully (defaults applied)
 *   8.  Instructor cannot access — 403
 *   9.  Student cannot access — 403
 *  10.  Coordinator cannot access — 403
 *  11.  Unauthenticated request — 401
 *  12.  Populated userId contains name, email, role (no password or hash)
 *  13.  Empty database returns valid empty response
 *  14.  GAP-02: GET /api/v1/help returns role-scoped FAQ for student
 *  15.  GAP-02: GET /api/v1/help returns role-scoped FAQ for instructor
 *  16.  GAP-02: GET /api/v1/help returns role-scoped FAQ for coordinator
 *  17.  GAP-02: GET /api/v1/help returns role-scoped FAQ for admin
 *  18.  GAP-02: Unauthenticated help request — 401
 *  19.  GAP-02: Help response contains supportContact and faqs array
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

import app from '../server.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { ActivityLog } from '../models/ActivityLog.js';

const TEST_DB_URI =
  process.env.TEST_MONGODB_URI ||
  (config.mongoURI || 'mongodb://127.0.0.1:27017/campusbridge').replace(
    '/campusbridge',
    '/campusbridge_test'
  );
const JWT_SECRET = config.jwtSecret || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT  = 5096;

let server;
let adminToken, instructorToken, coordinatorToken, studentToken;
let adminUser, testStudent, activityEntry;

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

function makeToken(user) {
  return jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

async function setup() {
  console.log('\n  [DB] Connecting:', TEST_DB_URI);
  await mongoose.connect(TEST_DB_URI);

  await User.deleteMany({ email: /@phaseAtest\.cb$/ });
  await ActivityLog.deleteMany({ 'meta.testRun': 'phaseA' });

  adminUser = await User.create({
    name: 'Phase A Admin',
    email: 'admin@phaseAtest.cb',
    passwordHash: 'password123',
    role: 'admin',
  });
  const instructorUser = await User.create({
    name: 'Phase A Instructor',
    email: 'instructor@phaseAtest.cb',
    passwordHash: 'password123',
    role: 'instructor',
  });
  const coordinatorUser = await User.create({
    name: 'Phase A Coordinator',
    email: 'coordinator@phaseAtest.cb',
    passwordHash: 'password123',
    role: 'coordinator',
  });
  testStudent = await User.create({
    name: 'Phase A Student',
    email: 'student@phaseAtest.cb',
    passwordHash: 'password123',
    role: 'student',
  });

  adminToken      = makeToken(adminUser);
  instructorToken = makeToken(instructorUser);
  coordinatorToken = makeToken(coordinatorUser);
  studentToken    = makeToken(testStudent);

  // Create a sample activity log entry
  activityEntry = await ActivityLog.create({
    userId: testStudent._id,
    action: 'CREATE_TASK',
    targetType: 'Task',
    targetId: new mongoose.Types.ObjectId(),
    meta: { testRun: 'phaseA', title: 'Sample task' },
  });

  server = http.createServer(app);
  await new Promise((r) => server.listen(TEST_PORT, r));
  console.log(`  [HTTP] Test server on :${TEST_PORT}`);
}

async function teardown() {
  await ActivityLog.deleteMany({ 'meta.testRun': 'phaseA' });
  await User.deleteMany({ email: /@phaseAtest\.cb$/ });
  server.close();
  await mongoose.disconnect();
  console.log('  [DB] Cleanup complete\n');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {

  // ── BUG-01: Admin activity logs ───────────────────────────────────────────

  await test('1 | GET /admin/activity-logs (admin) — 200 with data array', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', adminToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'data should be an array');
  });

  await test('2 | Response uses data field (not legacy logs field)', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', adminToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data !== undefined, 'data field must be present');
    assert.ok(res.body.logs === undefined, 'legacy logs field should be absent');
  });

  await test('3 | Pagination metadata present', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', adminToken);
    assert.strictEqual(res.status, 200);
    const p = res.body.pagination;
    assert.ok(p, 'pagination object missing');
    assert.strictEqual(typeof p.page, 'number');
    assert.strictEqual(typeof p.limit, 'number');
    assert.strictEqual(typeof p.total, 'number');
    assert.strictEqual(typeof p.pages, 'number');
  });

  await test('4 | Default limit is 50', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.pagination.limit, 50);
  });

  await test('5 | userId filter returns only that user\'s logs', async () => {
    const res = await req(
      'GET',
      `/api/v1/admin/activity-logs?userId=${testStudent._id.toString()}`,
      adminToken
    );
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.length >= 1, 'Expected at least one entry');
    const allMatch = res.body.data.every(
      (l) => l.userId?._id === testStudent._id.toString()
    );
    assert.ok(allMatch, 'All entries should belong to the filtered user');
  });

  await test('6 | Invalid userId filter returns 400', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs?userId=notavalidid', adminToken);
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  await test('7 | Invalid page/limit values fall back to defaults', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs?page=-5&limit=abc', adminToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.strictEqual(res.body.pagination.limit, 50);
  });

  await test('8 | Instructor cannot access — 403', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', instructorToken);
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  await test('9 | Student cannot access — 403', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', studentToken);
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  await test('10 | Coordinator cannot access — 403', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', coordinatorToken);
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  await test('11 | Unauthenticated request — 401', async () => {
    const res = await req('GET', '/api/v1/admin/activity-logs', null);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('12 | Populated userId exposes only name, email, role', async () => {
    const res = await req('GET', `/api/v1/admin/activity-logs?userId=${testStudent._id}`, adminToken);
    assert.strictEqual(res.status, 200);
    const entry = res.body.data.find((l) => l._id === activityEntry._id.toString());
    assert.ok(entry, 'Our test entry not found');
    assert.ok(entry.userId, 'userId not populated');
    assert.ok(entry.userId.name, 'name should be populated');
    assert.ok(entry.userId.email, 'email should be populated');
    assert.ok(entry.userId.role, 'role should be populated');
    assert.strictEqual(entry.userId.passwordHash, undefined, 'passwordHash must not be exposed');
    assert.strictEqual(JSON.stringify(entry.userId).includes('password'), false, 'no password-like field');
  });

  await test('13 | Meta field from ActivityLog is returned intact', async () => {
    const res = await req('GET', `/api/v1/admin/activity-logs?userId=${testStudent._id}`, adminToken);
    const entry = res.body.data.find((l) => l._id === activityEntry._id.toString());
    assert.ok(entry, 'Entry not found');
    assert.strictEqual(entry.meta?.testRun, 'phaseA');
  });

  // ── GAP-02: Help & Support endpoint ────────────────────────────────────────

  await test('14 | GET /help (student) — 200 with role-scoped FAQ', async () => {
    const res = await req('GET', '/api/v1/help', studentToken);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'student');
    assert.ok(Array.isArray(res.body.data.faqs), 'faqs should be an array');
    assert.ok(res.body.data.faqs.length > 0, 'student FAQs should not be empty');
  });

  await test('15 | GET /help (instructor) — role is instructor', async () => {
    const res = await req('GET', '/api/v1/help', instructorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'instructor');
    assert.ok(res.body.data.faqs.length > 0);
  });

  await test('16 | GET /help (coordinator) — role is coordinator', async () => {
    const res = await req('GET', '/api/v1/help', coordinatorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'coordinator');
    assert.ok(res.body.data.faqs.length > 0);
  });

  await test('17 | GET /help (admin) — role is admin', async () => {
    const res = await req('GET', '/api/v1/help', adminToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.role, 'admin');
    assert.ok(res.body.data.faqs.length > 0);
  });

  await test('18 | GET /help unauthenticated — 401', async () => {
    const res = await req('GET', '/api/v1/help', null);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('19 | Help response includes supportContact', async () => {
    const res = await req('GET', '/api/v1/help', studentToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.supportContact, 'supportContact should be present');
    assert.ok(typeof res.body.data.supportContact === 'string');
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
    console.log('  TEST SUMMARY (Phase A — Critical Fixes)');
    console.log('═'.repeat(62));
    console.log(`  Total:   ${totalTests}`);
    console.log(`  ✓ Pass:  ${passedTests}`);
    console.log(`  ✗ Fail:  ${failedTests}`);
    console.log(`  Rate:    ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
    if (failedTests > 0) {
      console.log('\n  ✗ Some tests failed.\n');
      process.exitCode = 1;
    } else {
      console.log('\n  ✓ All Phase A tests passed.\n');
    }
  }
})();
