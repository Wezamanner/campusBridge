import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import '../server.js'; // Starts Express server and connects MongoDB

const BASE_URL = `http://localhost:${config.port}/api/v1/auth`;

async function runAuthTests() {
  console.log('--- Starting CampusBridge Phase 3 Authentication & RBAC Test Suite ---');
  // Wait brief moment for Express to bind to port
  await new Promise((resolve) => setTimeout(resolve, 800));

  const results = {
    passed: 0,
    failed: 0,
    details: [],
  };

  function assert(condition, message) {
    if (condition) {
      results.passed++;
      results.details.push(`✅ PASS: ${message}`);
      console.log(`✅ PASS: ${message}`);
    } else {
      results.failed++;
      results.details.push(`❌ FAIL: ${message}`);
      console.error(`❌ FAIL: ${message}`);
    }
  }

  const timestamp = Date.now();
  const testStudentEmail = `student_${timestamp}@university.edu`;
  const testInstructorEmail = `instructor_${timestamp}@university.edu`;
  const testCoordinatorEmail = `coordinator_${timestamp}@university.edu`;
  const testAdminEmail = `admin_${timestamp}@university.edu`;
  const testDeactivatedEmail = `deactivated_${timestamp}@university.edu`;

  let studentToken = '';
  let instructorToken = '';
  let coordinatorToken = '';
  let adminToken = '';
  let deactivatedToken = '';

  try {
    // 1. Successful Student Registration
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sabrin Abdu',
        email: testStudentEmail,
        password: 'ValidPassword123!',
        program: 'Computer Science & Engineering',
        year: 4,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success === true, 'Successful student registration returns 201');
    assert(regData.data.user.role === 'student', 'Registered user role defaults to "student"');
    assert(regData.data.token != null, 'Registration returns signed JWT token');
    assert(regData.data.user.passwordHash === undefined, 'Registration response excludes passwordHash');

    // 2. Duplicate Email Registration Rejection
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Student',
        email: testStudentEmail,
        password: 'AnotherPassword123!',
      }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409 && dupData.success === false, 'Duplicate email registration rejected with 409 Conflict');

    // 3. Short Password Rejection
    const shortPassRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Pass User',
        email: `short_${timestamp}@university.edu`,
        password: '123',
      }),
    });
    const shortPassData = await shortPassRes.json();
    assert(shortPassRes.status === 400 && shortPassData.success === false, 'Short password (< 6 chars) rejected with 400');

    // 4. Successful Student Login
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'ValidPassword123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && loginData.success === true, 'Successful student login returns 200');
    assert(loginData.data.token != null, 'Login returns valid token');
    assert(loginData.data.user.passwordHash === undefined, 'Login response excludes passwordHash');
    studentToken = loginData.data.token;

    // 5. Incorrect Password Login Rejection
    const wrongPassRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password: 'WrongPassword!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(wrongPassRes.status === 401 && wrongPassData.message === 'Invalid email or password.', 'Incorrect password returns generic 401');

    // 6. Non-existent User Login Rejection (Timing-safe check)
    const nonExistRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `non_existent_${timestamp}@university.edu`,
        password: 'SomePassword123!',
      }),
    });
    const nonExistData = await nonExistRes.json();
    assert(nonExistRes.status === 401 && nonExistData.message === 'Invalid email or password.', 'Unknown email returns identical generic 401 error (SEC-03)');

    // Provision Staff Accounts (Instructor, Coordinator, Admin) for Role Testing
    const instructorUser = new User({
      name: 'Dr. Jane Smith',
      email: testInstructorEmail,
      passwordHash: 'StaffPass123!',
      role: 'instructor',
      department: 'Electrical Engineering',
    });
    await instructorUser.save();

    const coordinatorUser = new User({
      name: 'Coordinator Mark',
      email: testCoordinatorEmail,
      passwordHash: 'StaffPass123!',
      role: 'coordinator',
    });
    await coordinatorUser.save();

    const adminUser = new User({
      name: 'Admin Supervisor',
      email: testAdminEmail,
      passwordHash: 'AdminPass123!',
      role: 'admin',
    });
    await adminUser.save();

    const deactivatedUser = new User({
      name: 'Deactivated User',
      email: testDeactivatedEmail,
      passwordHash: 'Pass123!',
      role: 'student',
      active: false,
    });
    await deactivatedUser.save();

    // Login Staff & Capture Tokens
    const instLogin = await (await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testInstructorEmail, password: 'StaffPass123!' }),
    })).json();
    instructorToken = instLogin.data.token;

    const coordLogin = await (await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testCoordinatorEmail, password: 'StaffPass123!' }),
    })).json();
    coordinatorToken = coordLogin.data.token;

    const adminLogin = await (await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: 'AdminPass123!' }),
    })).json();
    adminToken = adminLogin.data.token;

    assert(instructorToken && coordinatorToken && adminToken, 'All 4 user roles successfully authenticate and receive tokens');

    // 7. Deactivated Account Login Rejection
    const deactLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testDeactivatedEmail, password: 'Pass123!' }),
    });
    const deactLoginData = await deactLoginRes.json();
    assert(deactLoginRes.status === 403 && deactLoginData.success === false, 'Deactivated account login rejected with 403 Forbidden');

    // 8. Protected Endpoint Without Token (GET /me)
    const noTokenRes = await fetch(`${BASE_URL}/me`);
    const noTokenData = await noTokenRes.json();
    assert(noTokenRes.status === 401 && noTokenData.success === false, 'Protected route without token rejected with 401');

    // 9. Protected Endpoint With Invalid Token
    const invalidTokenRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: 'Bearer fake.invalid.jwt.token' },
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(invalidTokenRes.status === 401 && invalidTokenData.message.includes('Invalid'), 'Protected route with forged token rejected with 401');

    // 10. Protected Endpoint With Expired Token
    const expiredToken = jwt.sign(
      { id: instructorUser._id, role: 'instructor' },
      config.jwtSecret,
      { expiresIn: '-1s' }
    );
    const expiredRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const expiredData = await expiredRes.json();
    assert(expiredRes.status === 401 && expiredData.message.includes('expired'), 'Protected route with expired token rejected with 401');

    // 11. Current-User Endpoint (GET /me) With Valid Token
    const meRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200 && meData.data.email === testStudentEmail, 'GET /api/v1/auth/me returns authenticated student data');
    assert(meData.data.passwordHash === undefined, 'GET /api/v1/auth/me does not expose passwordHash');

    // 12. Role-Based Access Control Checks
    // A) Student accessing student route
    const studentOk = await fetch(`${BASE_URL}/test-role/student`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentOk.status === 200, 'Student authorized for student-level endpoint');

    // B) Student accessing instructor route (Unauthorized)
    const studentBadInst = await fetch(`${BASE_URL}/test-role/instructor`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentBadInst.status === 403, 'Student rejected with 403 when accessing instructor endpoint');

    // C) Student accessing admin route (Unauthorized)
    const studentBadAdmin = await fetch(`${BASE_URL}/test-role/admin`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentBadAdmin.status === 403, 'Student rejected with 403 when accessing admin endpoint');

    // D) Instructor accessing instructor route
    const instructorOk = await fetch(`${BASE_URL}/test-role/instructor`, {
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    assert(instructorOk.status === 200, 'Instructor authorized for instructor-level endpoint');

    // E) Coordinator accessing coordinator route
    const coordinatorOk = await fetch(`${BASE_URL}/test-role/coordinator`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });
    assert(coordinatorOk.status === 200, 'Coordinator authorized for coordinator-level endpoint');

    // F) Admin accessing admin route
    const adminOk = await fetch(`${BASE_URL}/test-role/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminOk.status === 200, 'Admin authorized for admin-level endpoint');

    // 13. Deactivated User Protected Access Rejection
    // Even if a deactivated user previously possessed a signed token, the middleware must block them
    deactivatedToken = jwt.sign(
      { id: deactivatedUser._id, role: 'student' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const deactProtectedRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${deactivatedToken}` },
    });
    assert(deactProtectedRes.status === 403, 'Deactivated user token blocked with 403 on protected route access');

    // 14. Logout endpoint
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200 && logoutData.success === true, 'POST /api/v1/auth/logout returns 200 success');

    // Clean up test documents
    await User.deleteMany({
      email: {
        $in: [
          testStudentEmail,
          testInstructorEmail,
          testCoordinatorEmail,
          testAdminEmail,
          testDeactivatedEmail,
        ],
      },
    });

    console.log('\n--- Authentication & RBAC Test Summary ---');
    console.log(`Total tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);

    await mongoose.connection.close();
    process.exit(results.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Auth Test Suite Fatal Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

runAuthTests();
