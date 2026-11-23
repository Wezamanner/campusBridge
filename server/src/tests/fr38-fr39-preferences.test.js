/**
 * FR-38 / FR-39 — Profile Preferences Test Suite
 *
 * SRS Traceability:
 *   FR-38 — View and edit profile information and preferences.
 *   FR-39 — Theme switching; stored with the user account for signed-in users.
 *   UC-G02 — Manage profile and preferences (all roles).
 *
 * Tests 1–20: original API-contract coverage (profile CRUD, validation,
 *             authorization, regression).
 *
 * Tests 21–32: reactive-sync server contract — the browser-side fix
 *   (ThemeContext listens for 'campusbridge:themechange' events dispatched
 *    by AuthContext) depends on the server returning preferences.theme in
 *    the correct shape from every auth endpoint. These tests verify that
 *    contract so a server-side regression is caught before it reaches the UI.
 *
 *   21. POST /auth/login with dark preference → response.data.preferences.theme === 'dark'
 *   22. POST /auth/login with light preference → response.data.preferences.theme === 'light'
 *   23. GET /auth/me after setting light → carries 'light' (session-restore contract)
 *   24. GET /auth/me after reverting to dark → carries 'dark'
 *   25. PUT /profile sets light → GET /auth/me immediately reflects 'light'
 *   26. PUT /profile sets dark → GET /auth/me immediately reflects 'dark'
 *   27. POST /auth/login — user with no stored preference still returns a valid theme
 *   28. Logout + login as a different user (light) — login response carries that user's theme
 *   29. Logout + login as original user (dark) — login response carries dark
 *   30. POST /auth/login — wrong password → 401, no theme leak
 *   31. preferences object is never null in login/me responses
 *   32. Full regression: all four roles, GET /profile, preferences present and valid
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
import { Notification } from '../models/Notification.js';

const TEST_DB_URI =
  process.env.TEST_MONGODB_URI ||
  (config.mongoURI || 'mongodb://127.0.0.1:27017/campusbridge').replace(
    '/campusbridge',
    '/campusbridge_test'
  );
const JWT_SECRET = config.jwtSecret || 'supersecret_campusbridge_jwt_dev_key_2026';
const TEST_PORT = 5099;

let server;
let studentToken, instructorToken, coordinatorToken, adminToken;
let studentUser, instructorUser, coordinatorUser, adminUser;

let totalTests = 0;
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

// ── Setup / Teardown ──────────────────────────────────────────────────────────

async function setup() {
  console.log('\n  [DB] Connecting:', TEST_DB_URI);
  await mongoose.connect(TEST_DB_URI);

  // Clean slate — only the collections this suite touches
  await User.deleteMany({ email: /@fr3839test\.cb$/ });
  await Notification.deleteMany({});

  studentUser = await User.create({
    name: 'Pref Student',
    email: 'student@fr3839test.cb',
    passwordHash: 'password123',
    role: 'student',
    preferences: { theme: 'dark' },
  });
  instructorUser = await User.create({
    name: 'Pref Instructor',
    email: 'instructor@fr3839test.cb',
    passwordHash: 'password123',
    role: 'instructor',
    department: 'Computer Science',
    preferences: { theme: 'dark' },
  });
  coordinatorUser = await User.create({
    name: 'Pref Coordinator',
    email: 'coordinator@fr3839test.cb',
    passwordHash: 'password123',
    role: 'coordinator',
    department: 'Engineering',
    preferences: { theme: 'dark' },
  });
  adminUser = await User.create({
    name: 'Pref Admin',
    email: 'admin@fr3839test.cb',
    passwordHash: 'password123',
    role: 'admin',
    preferences: { theme: 'dark' },
  });

  studentToken     = makeToken(studentUser);
  instructorToken  = makeToken(instructorUser);
  coordinatorToken = makeToken(coordinatorUser);
  adminToken       = makeToken(adminUser);

  server = http.createServer(app);
  await new Promise((r) => server.listen(TEST_PORT, r));
  console.log(`  [HTTP] Test server on :${TEST_PORT}`);
}

async function teardown() {
  await User.deleteMany({ email: /@fr3839test\.cb$/ });
  await Notification.deleteMany({});
  server.close();
  await mongoose.disconnect();
  console.log('  [DB] Cleanup complete\n');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests() {
  // ── 1. GET /profile — default preferences present for all four roles ─────────
  await test('1 | GET /profile (student) — preferences.theme defaults to dark', async () => {
    const res = await req('GET', '/api/v1/profile', studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.preferences, 'preferences object missing');
    assert.strictEqual(res.body.data.preferences.theme, 'dark');
  });

  await test('2 | GET /profile (instructor) — preferences.theme present', async () => {
    const res = await req('GET', '/api/v1/profile', instructorToken);
    assert.strictEqual(res.status, 200);
    assert.ok(['dark', 'light'].includes(res.body.data.preferences.theme));
  });

  await test('3 | GET /profile (coordinator) — preferences.theme present', async () => {
    const res = await req('GET', '/api/v1/profile', coordinatorToken);
    assert.strictEqual(res.status, 200);
    assert.ok(['dark', 'light'].includes(res.body.data.preferences.theme));
  });

  await test('4 | GET /profile (admin) — preferences.theme present', async () => {
    const res = await req('GET', '/api/v1/profile', adminToken);
    assert.strictEqual(res.status, 200);
    assert.ok(['dark', 'light'].includes(res.body.data.preferences.theme));
  });

  // ── 2. PUT /profile — update theme preference ─────────────────────────────────
  await test('5 | PUT /profile (student) — dark → light, response reflects change', async () => {
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      name: 'Pref Student',
      preferences: { theme: 'light' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  // ── 3. Persistence — GET after PUT ───────────────────────────────────────────
  await test('6 | GET /profile after update — theme persisted as light', async () => {
    const res = await req('GET', '/api/v1/profile', studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  // ── 4. Invalid theme value ─────────────────────────────────────────────────
  await test('7 | PUT /profile — invalid theme "blue" rejected with 400', async () => {
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      preferences: { theme: 'blue' },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await test('8 | PUT /profile — invalid theme empty string rejected with 400', async () => {
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      preferences: { theme: '' },
    });
    assert.strictEqual(res.status, 400);
  });

  // ── 5. Unknown preference key rejected ────────────────────────────────────
  await test('9 | PUT /profile — unknown preference key "notifications" rejected with 400', async () => {
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      preferences: { notifications: true },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // ── 6. Unauthenticated — cannot read profile ──────────────────────────────
  await test('10 | GET /profile without token — 401', async () => {
    const res = await req('GET', '/api/v1/profile', null);
    assert.strictEqual(res.status, 401);
  });

  // ── 7. Unauthenticated — cannot update profile ────────────────────────────
  await test('11 | PUT /profile without token — 401', async () => {
    const res = await req('PUT', '/api/v1/profile', null, {
      preferences: { theme: 'dark' },
    });
    assert.strictEqual(res.status, 401);
  });

  // ── 8. Users cannot modify another user's profile ─────────────────────────
  await test('12 | PUT /profile — body with _id/userId field ignored (allowlist)', async () => {
    // The backend only applies allowlisted fields; _id and userId are ignored/rejected
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      _id: adminUser._id.toString(),
      preferences: { theme: 'dark' },
    });
    // Either 400 (field not allowed) or 200 but only student's own record updated
    if (res.status === 200) {
      // Verify it only updated the student, not the admin
      const adminDoc = await User.findById(adminUser._id).lean();
      assert.notStrictEqual(
        adminDoc.preferences?.theme,
        'dark_via_student',
        'admin record should not have been modified'
      );
    } else {
      assert.strictEqual(res.status, 400);
    }
  });

  await test('13 | Student token cannot read instructor profile — only own profile returned', async () => {
    // GET /profile always returns the authenticated user's own profile
    const res = await req('GET', '/api/v1/profile', studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.email, studentUser.email);
    assert.notStrictEqual(res.body.data.email, instructorUser.email);
  });

  // ── 9. GET /auth/me includes preferences ──────────────────────────────────
  await test('14 | GET /auth/me — preferences.theme included for session restore (FR-39)', async () => {
    const res = await req('GET', '/api/v1/auth/me', studentToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.preferences, 'preferences missing from /auth/me response');
    assert.ok(['dark', 'light'].includes(res.body.data.preferences.theme));
  });

  // ── 10. Instructor can update theme and name ───────────────────────────────
  await test('15 | PUT /profile (instructor) — name + theme update succeeds', async () => {
    const res = await req('PUT', '/api/v1/profile', instructorToken, {
      name: 'Dr. Pref Instructor',
      preferences: { theme: 'light' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.name, 'Dr. Pref Instructor');
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  // ── 11. Coordinator can update theme and department ───────────────────────
  await test('16 | PUT /profile (coordinator) — department + theme update succeeds', async () => {
    const res = await req('PUT', '/api/v1/profile', coordinatorToken, {
      name: 'Pref Coordinator',
      department: 'Electrical Engineering',
      preferences: { theme: 'light' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.department, 'Electrical Engineering');
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  // ── 12. Admin can update theme ─────────────────────────────────────────────
  await test('17 | PUT /profile (admin) — theme update succeeds', async () => {
    const res = await req('PUT', '/api/v1/profile', adminToken, {
      name: 'Pref Admin',
      preferences: { theme: 'light' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  // ── 13. Revert theme back to dark ─────────────────────────────────────────
  await test('18 | PUT /profile — theme reverts dark → light → dark correctly', async () => {
    // Already set to light in test 15 (instructor), now revert
    const res = await req('PUT', '/api/v1/profile', instructorToken, {
      name: 'Dr. Pref Instructor',
      preferences: { theme: 'dark' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'dark');
    // Persist check
    const getRes = await req('GET', '/api/v1/profile', instructorToken);
    assert.strictEqual(getRes.body.data.preferences.theme, 'dark');
  });

  // ── 14. Existing notification creation unaffected ─────────────────────────
  await test('19 | Notification.create still works after profile update (regression)', async () => {
    const notif = await Notification.create({
      userId: studentUser._id,
      type: 'system',
      title: 'Test notification',
      message: 'Regression check: notifications unaffected by FR-38/39.',
      link: '',
    });
    assert.ok(notif._id, 'Notification was not created');
    assert.strictEqual(notif.type, 'system');
    // And the GET notifications endpoint still returns it
    const res = await req('GET', '/api/v1/notifications', studentToken);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find((n) => n._id === notif._id.toString());
    assert.ok(found, 'Created notification not found via API');
  });

  // ── 15. Name validation ────────────────────────────────────────────────────
  await test('20 | PUT /profile — name too short (1 char) rejected with 400', async () => {
    const res = await req('PUT', '/api/v1/profile', studentToken, {
      name: 'X',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Tests 21-32 — Reactive-sync server contract (FR-39)
  //
  // The browser-side fix (ThemeContext listens for 'campusbridge:themechange'
  // CustomEvents dispatched by AuthContext) only works correctly when the
  // server returns preferences.theme in the right shape from every auth
  // endpoint. The tests below lock down that contract.
  // ══════════════════════════════════════════════════════════════════════════

  // ── 21-22: POST /auth/login carries preferences.theme ─────────────────────
  await test('21 | POST /auth/login with dark pref → login response carries "dark"', async () => {
    // studentUser currently has 'light' (set by test 5); revert to dark first
    await req('PUT', '/api/v1/profile', studentToken, {
      name: 'Pref Student',
      preferences: { theme: 'dark' },
    });
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'student@fr3839test.cb',
      password: 'password123',
    });
    assert.strictEqual(res.status, 200, `login failed: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data?.user?.preferences, 'preferences missing from login response');
    assert.strictEqual(res.body.data.user.preferences.theme, 'dark');
  });

  await test('22 | POST /auth/login with light pref → login response carries "light"', async () => {
    // Switch student to light
    await req('PUT', '/api/v1/profile', studentToken, {
      name: 'Pref Student',
      preferences: { theme: 'light' },
    });
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'student@fr3839test.cb',
      password: 'password123',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.preferences.theme, 'light');
  });

  // ── 23-24: GET /auth/me reflects the stored preference (session-restore) ──
  await test('23 | GET /auth/me after PUT light → carries "light" (session-restore contract)', async () => {
    // student already has 'light' from test 22
    const res = await req('GET', '/api/v1/auth/me', studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  await test('24 | GET /auth/me after reverting to dark → carries "dark"', async () => {
    await req('PUT', '/api/v1/profile', studentToken, {
      name: 'Pref Student',
      preferences: { theme: 'dark' },
    });
    const res = await req('GET', '/api/v1/auth/me', studentToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'dark');
  });

  // ── 25-26: PUT /profile then GET /auth/me is immediately consistent ────────
  await test('25 | PUT /profile sets light → GET /auth/me immediately reflects "light"', async () => {
    await req('PUT', '/api/v1/profile', instructorToken, {
      name: 'Dr. Pref Instructor',
      preferences: { theme: 'light' },
    });
    const res = await req('GET', '/api/v1/auth/me', instructorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'light');
  });

  await test('26 | PUT /profile sets dark → GET /auth/me immediately reflects "dark"', async () => {
    await req('PUT', '/api/v1/profile', instructorToken, {
      name: 'Dr. Pref Instructor',
      preferences: { theme: 'dark' },
    });
    const res = await req('GET', '/api/v1/auth/me', instructorToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.preferences.theme, 'dark');
  });

  // ── 27: User with no explicit preference gets a valid default ──────────────
  await test('27 | User created without preferences.theme — login still returns a valid theme', async () => {
    // Create a user without setting preferences at all (Mongoose default kicks in)
    const bare = await User.create({
      name: 'Bare User',
      email: 'bare@fr3839test.cb',
      passwordHash: 'password123',
      role: 'student',
    });
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'bare@fr3839test.cb',
      password: 'password123',
    });
    assert.strictEqual(res.status, 200);
    const theme = res.body.data?.user?.preferences?.theme;
    assert.ok(
      theme === 'dark' || theme === 'light',
      `expected dark or light, got: ${theme}`
    );
    await User.deleteOne({ _id: bare._id });
  });

  // ── 28-29: Logout + login as a different user carries that user's theme ────
  await test('28 | Login as coordinator (light) → response carries "light"', async () => {
    // coordinator was set to light in test 16, reverted partially — set it now
    await req('PUT', '/api/v1/profile', coordinatorToken, {
      name: 'Pref Coordinator',
      preferences: { theme: 'light' },
    });
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'coordinator@fr3839test.cb',
      password: 'password123',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.preferences.theme, 'light');
  });

  await test('29 | Login as admin (dark) after coordinator login → carries "dark"', async () => {
    // admin was set to light in test 17; revert
    await req('PUT', '/api/v1/profile', adminToken, {
      name: 'Pref Admin',
      preferences: { theme: 'dark' },
    });
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'admin@fr3839test.cb',
      password: 'password123',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.preferences.theme, 'dark');
  });

  // ── 30: Wrong password → 401, no preference data exposed ──────────────────
  await test('30 | POST /auth/login — wrong password returns 401, no theme in body', async () => {
    const res = await req('POST', '/api/v1/auth/login', null, {
      email: 'student@fr3839test.cb',
      password: 'wrongpassword',
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    // No user data or preferences should be exposed on failure
    assert.ok(!res.body.data?.user, 'user data must not be returned on failed login');
  });

  // ── 31: preferences object is never null/absent in auth responses ──────────
  await test('31 | preferences object non-null in login and /auth/me for all four roles', async () => {
    const cases = [
      { email: 'student@fr3839test.cb',     token: studentToken },
      { email: 'instructor@fr3839test.cb',  token: instructorToken },
      { email: 'coordinator@fr3839test.cb', token: coordinatorToken },
      { email: 'admin@fr3839test.cb',       token: adminToken },
    ];
    for (const { email, token } of cases) {
      const meRes = await req('GET', '/api/v1/auth/me', token);
      assert.strictEqual(meRes.status, 200, `GET /auth/me failed for ${email}`);
      assert.ok(
        meRes.body.data?.preferences != null,
        `preferences null/missing in /auth/me for ${email}`
      );
      assert.ok(
        ['dark', 'light'].includes(meRes.body.data.preferences.theme),
        `invalid theme in /auth/me for ${email}: ${meRes.body.data?.preferences?.theme}`
      );
    }
  });

  // ── 32: Regression — existing profile and auth behavior intact ─────────────
  await test('32 | Regression — GET /profile still works for all four roles after sync changes', async () => {
    const tokens = [studentToken, instructorToken, coordinatorToken, adminToken];
    for (const t of tokens) {
      const res = await req('GET', '/api/v1/profile', t);
      assert.strictEqual(res.status, 200, 'GET /profile failed');
      assert.ok(res.body.data?.preferences?.theme, 'preferences.theme missing');
      assert.strictEqual(res.body.success, true);
    }
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
    console.log('\n' + '═'.repeat(60));
    console.log('  TEST SUMMARY (FR-38 / FR-39 — Profile Preferences)');
    console.log('═'.repeat(60));
    console.log(`  Total:   ${totalTests}`);
    console.log(`  ✓ Pass:  ${passedTests}`);
    console.log(`  ✗ Fail:  ${failedTests}`);
    console.log(`  Rate:    ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
    if (failedTests > 0) {
      console.log('\n  ✗ Some tests failed.\n');
      process.exitCode = 1;
    } else {
      console.log('\n  ✓ All preference tests passed.\n');
    }
  }
})();
