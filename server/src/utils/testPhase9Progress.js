/**
 * CampusBridge Phase 9 Progress Analytics Test (FR-09)
 * Tests progress calculation, student/instructor progress views
 * Creates isolated test users and records, does not assume seedUsers.js
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
import { Progress } from '../models/Progress.js';
import '../server.js';

const API_BASE = `http://localhost:${config.port}/api/v1`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function runPhase9Tests() {
  log.section('🎓 Phase 9 Progress Analytics Tests (FR-09) - 8 Tests');

  // Wait for server
  log.info('Waiting for server...');
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${config.port}/api/v1/health`);
      if (res.ok) break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  log.success('Server ready');

  let testPassed = 0;
  let testFailed = 0;

  // Test users
  let instructor, student, coordinator;

  try {
    log.info('Creating isolated test users and data...');

    // Test password - will be hashed by User pre-save hook
    const testPassword = 'TestPass123!';

    // Create test instructor
    instructor = await User.create({
      name: 'Test Instructor Progress',
      email: 'instructor.progress.test@test.com',
      passwordHash: testPassword, // Will be hashed by pre-save hook
      role: 'instructor',
      active: true,
    });

    // Create test student
    student = await User.create({
      name: 'Test Student Progress',
      email: 'student.progress.test@test.com',
      passwordHash: testPassword, // Will be hashed by pre-save hook
      role: 'student',
      active: true,
    });

    // Create test coordinator
    coordinator = await User.create({
      name: 'Test Coordinator Progress',
      email: 'coordinator.progress.test@test.com',
      passwordHash: testPassword, // Will be hashed by pre-save hook
      role: 'coordinator',
      active: true,
    });

    // Create test course
    const course = await Course.create({
      code: 'PROG401',
      title: 'Progress Analytics Test Course',
      description: 'Test course for Phase 9',
      instructorId: instructor._id,
      createdBy: instructor._id,
      status: 'active',
    });

    // Enroll student
    await Enrollment.create({
      studentId: student._id,
      courseId: course._id,
    });

    // Create 4 assignments
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const assignments = [];
    for (let i = 1; i <= 4; i++) {
      const assignment = await Assignment.create({
        courseId: course._id,
        title: `Progress Test Assignment ${i}`,
        description: `Assignment ${i}`,
        maxScore: 100,
        deadline: futureDate,
        allowLate: false,
        createdBy: instructor._id,
      });
      assignments.push(assignment);
    }

    log.success('Test data created');

    // Login test users
    const studentLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student.progress.test@test.com',
        password: 'TestPass123!',
      }),
    });

    if (!studentLogin.data.success || !studentLogin.data.data?.token) {
      log.error(`Student login failed: ${JSON.stringify(studentLogin.data)}`);
      throw new Error('Student login failed');
    }
    const studentToken = studentLogin.data.data.token;

    const instructorLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'instructor.progress.test@test.com',
        password: 'TestPass123!',
      }),
    });

    if (!instructorLogin.data.success || !instructorLogin.data.data?.token) {
      log.error(`Instructor login failed: ${JSON.stringify(instructorLogin.data)}`);
      throw new Error('Instructor login failed');
    }
    const instructorToken = instructorLogin.data.data.token;

    const coordinatorLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'coordinator.progress.test@test.com',
        password: 'TestPass123!',
      }),
    });

    if (!coordinatorLogin.data.success || !coordinatorLogin.data.data?.token) {
      log.error(`Coordinator login failed: ${JSON.stringify(coordinatorLogin.data)}`);
      throw new Error('Coordinator login failed');
    }
    const coordinatorToken = coordinatorLogin.data.data.token;

    // TEST 1: Student views progress with no submissions
    log.section('Test 1: Student views own progress (no submissions yet)');
    const emptyProgress = await apiCall('/progress', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (emptyProgress.status === 200 && Array.isArray(emptyProgress.data.data) && emptyProgress.data.data.length === 0) {
      log.success('✅ Empty progress returns 200 with empty array');
      testPassed++;
    } else {
      log.error(`❌ Expected empty array, got status=${emptyProgress.status}, data=${JSON.stringify(emptyProgress.data)}`);
      testFailed++;
    }

    // TEST 2: Submit and grade first assignment
    log.section('Test 2: Progress calculation after first grading');
    const submission1 = await Submission.create({
      studentId: student._id,
      assignmentId: assignments[0]._id,
      courseId: course._id,
      text: 'First progress test submission',
      submittedAt: new Date(),
      status: 'Submitted',
    });

    const gradeResp1 = await apiCall(`/instructor/submissions/${submission1._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({ score: 80, feedback: 'Good work' }),
    });

    if (gradeResp1.status === 200) {
      const progressAfter1 = await apiCall('/progress', {
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      if (
        progressAfter1.status === 200 &&
        Array.isArray(progressAfter1.data.data) &&
        progressAfter1.data.data.length === 1 &&
        progressAfter1.data.data[0]?.percent === 25 && // 1/4 = 25%
        progressAfter1.data.data[0]?.averageScore === 80
      ) {
        log.success('✅ Progress recalculated: 25% complete, 80.0 average');
        testPassed++;
      } else {
        log.error(
          `❌ Expected percent=25, avg=80, got data=${JSON.stringify(progressAfter1.data.data)}`
        );
        testFailed++;
      }
    } else {
      log.error(`❌ Grading failed with status ${gradeResp1.status}: ${JSON.stringify(gradeResp1.data)}`);
      testFailed++;
    }

    // TEST 3: Submit and grade second assignment
    log.section('Test 3: Progress update after second grading');
    const submission2 = await Submission.create({
      studentId: student._id,
      assignmentId: assignments[1]._id,
      courseId: course._id,
      text: 'Second progress test submission',
      submittedAt: new Date(),
      status: 'Submitted',
    });

    await apiCall(`/instructor/submissions/${submission2._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${instructorToken}` },
      body: JSON.stringify({ score: 90, feedback: 'Excellent' }),
    });

    const progressAfter2 = await apiCall('/progress', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const expectedAvg = 85.0; // (80 + 90) / 2

    if (
      progressAfter2.status === 200 &&
      progressAfter2.data.data[0].percent === 50 && // 2/4 = 50%
      progressAfter2.data.data[0].averageScore === expectedAvg
    ) {
      log.success('✅ Progress updated: 50% complete, 85.0 average');
      testPassed++;
    } else {
      log.error(
        `❌ Expected percent=50, avg=85, got percent=${progressAfter2.data.data[0]?.percent}, avg=${progressAfter2.data.data[0]?.averageScore}`
      );
      testFailed++;
    }

    // TEST 4: Instructor views student progress
    log.section('Test 4: Instructor views course progress');
    const instructorProgress = await apiCall('/progress', {
      method: 'GET',
      headers: { Authorization: `Bearer ${instructorToken}` },
    });

    if (
      instructorProgress.status === 200 &&
      instructorProgress.data.data.length >= 1 &&
      instructorProgress.data.data[0].studentName === 'Test Student Progress' &&
      instructorProgress.data.data[0].percent === 50
    ) {
      log.success('✅ Instructor can view student progress');
      testPassed++;
    } else {
      log.error('❌ Instructor progress view failed');
      testFailed++;
    }

    // TEST 5: Filter by courseId (student)
    log.section('Test 5: Student filters progress by courseId');
    const filteredProgress = await apiCall(`/progress?courseId=${course._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (filteredProgress.status === 200 && filteredProgress.data.data.length === 1) {
      log.success('✅ courseId filter works correctly');
      testPassed++;
    } else {
      log.error('❌ courseId filter failed');
      testFailed++;
    }

    // TEST 6: Unauthenticated access blocked
    log.section('Test 6: Unauthenticated access blocked');
    const unauthResp = await apiCall('/progress', {
      method: 'GET',
    });

    if (unauthResp.status === 401) {
      log.success('✅ Unauthenticated request returns 401');
      testPassed++;
    } else {
      log.error(`❌ Expected 401, got ${unauthResp.status}`);
      testFailed++;
    }

    // TEST 7: Invalid courseId format
    log.section('Test 7: Invalid courseId format rejected');
    const invalidCourseId = await apiCall('/progress?courseId=invalid-id', {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (invalidCourseId.status === 400) {
      log.success('✅ Invalid courseId returns 400');
      testPassed++;
    } else {
      log.error(`❌ Expected 400, got ${invalidCourseId.status}`);
      testFailed++;
    }

    // TEST 8: Coordinator role unauthorized
    log.section('Test 8: Coordinator role blocked from progress endpoint');
    const coordinatorProgress = await apiCall('/progress', {
      method: 'GET',
      headers: { Authorization: `Bearer ${coordinatorToken}` },
    });

    if (coordinatorProgress.status === 403) {
      log.success('✅ Coordinator role correctly blocked (403)');
      testPassed++;
    } else {
      log.error(`❌ Expected 403 for coordinator, got ${coordinatorProgress.status}`);
      testFailed++;
    }

    // Cleanup test data
    await Progress.deleteMany({ studentId: student._id });
    await Grade.deleteMany({ studentId: student._id });
    await Submission.deleteMany({ studentId: student._id });
    await Assignment.deleteMany({ courseId: course._id });
    await Enrollment.deleteMany({ studentId: student._id });
    await Course.deleteMany({ _id: course._id });
    await User.deleteMany({
      _id: { $in: [instructor._id, student._id, coordinator._id] },
    });

    log.section('========================================');
    log.info(`TOTAL TESTS: ${testPassed + testFailed}`);
    log.success(`PASSED: ${testPassed}`);
    if (testFailed > 0) {
      log.error(`FAILED: ${testFailed}`);
    }
    log.section('========================================');
  } catch (err) {
    log.error(`Test error: ${err.message}`);
    console.error(err);

    // Cleanup on error
    if (instructor || student || coordinator) {
      try {
        await Progress.deleteMany({ studentId: student?._id });
        await Grade.deleteMany({ studentId: student?._id });
        await Submission.deleteMany({ studentId: student?._id });
        await Assignment.deleteMany({ createdBy: instructor?._id });
        await Enrollment.deleteMany({ studentId: student?._id });
        await Course.deleteMany({ instructorId: instructor?._id });
        await User.deleteMany({
          email: {
            $in: [
              'instructor.progress.test@test.com',
              'student.progress.test@test.com',
              'coordinator.progress.test@test.com',
            ],
          },
        });
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr.message);
      }
    }

    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runPhase9Tests();
