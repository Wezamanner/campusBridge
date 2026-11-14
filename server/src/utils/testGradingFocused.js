/**
 * CampusBridge Phase 8 Focused Grading Test
 * Tests NEW instructor grading endpoints and validations (FR-08)
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
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

async function runGradingTests() {
  log.section('🎓 Phase 8 Focused Grading Tests (FR-08) - 11 Tests');

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

  try {
    // Cleanup any existing test data first
    await Grade.deleteMany({ courseId: { $exists: true } });
    await Submission.deleteMany({ text: { $regex: /test.*submission/i } });
    await Assignment.deleteMany({ title: 'Test Assignment for Grading' });
    await Enrollment.deleteMany({ courseId: { $exists: true } });
    await Course.deleteMany({ code: 'TEST101' });

    // Setup test data
    log.info('Creating test data...');
    const instructor = await User.findOne({ email: 'instructor@campusbridge.edu' });
    const student = await User.findOne({ email: 'student@campusbridge.edu' });

    if (!instructor || !student) {
      log.error('Users not found. Run npm run seed:users first.');
      process.exit(1);
    }

    const course = await Course.create({
      code: 'TEST101',
      title: 'Test Course for Grading',
      description: 'Test course',
      instructorId: instructor._id,
      createdBy: instructor._id,
      status: 'active',
    });

    await Enrollment.create({
      studentId: student._id,
      courseId: course._id,
    });

    const assignment = await Assignment.create({
      courseId: course._id,
      createdBy: instructor._id,
      title: 'Test Assignment',
      description: 'Test',
      deadline: new Date(Date.now() + 86400000),
      maxScore: 100,
      allowLate: false,
    });

    const submission = await Submission.create({
      assignmentId: assignment._id,
      studentId: student._id,
      courseId: course._id,
      text: 'Test submission',
      status: 'Submitted',
    });

    log.success('Test data created');

    // Login
    const loginResp = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'instructor@campusbridge.edu',
        password: 'InstructorPass123!',
      }),
    });
    const token = loginResp.data.data.token;

    // TEST 1: Get submissions queue
    log.section('Test 1: GET /api/v1/instructor/submissions');
    const queueResp = await apiCall(`/instructor/submissions?courseId=${course._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (queueResp.data.success && queueResp.data.data.length === 1) {
      log.success('✅ Submission queue retrieved');
      testPassed++;
    } else {
      log.error('❌ Submission queue failed');
      testFailed++;
    }

    // TEST 2: Grade with valid score
    log.section('Test 2: PATCH /api/v1/instructor/submissions/:id/grade (valid)');
    const gradeResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: 95, feedback: 'Great work!' }),
    });

    if (gradeResp.data.success && gradeResp.data.data.grade.score === 95) {
      log.success('✅ Valid grading successful');
      testPassed++;
    } else {
      log.error(`❌ Valid grading failed: ${gradeResp.data.message}`);
      testFailed++;
    }

    // TEST 3: Verify status updated
    const updatedSub = await Submission.findById(submission._id);
    if (updatedSub.status === 'Graded') {
      log.success('✅ Submission status updated to Graded');
      testPassed++;
    } else {
      log.error('❌ Submission status not updated');
      testFailed++;
    }

    // TEST 4: Negative score rejection
    log.section('Test 3: Negative score validation');
    const negResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: -5, feedback: '' }),
    });

    if (!negResp.data.success && negResp.status === 400) {
      log.success('✅ Negative score correctly rejected');
      testPassed++;
    } else {
      log.error('❌ Negative score should be rejected');
      testFailed++;
    }

    // TEST 5: Score > maxScore rejection
    log.section('Test 4: Score exceeds maxScore validation');
    const exceedResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: 150, feedback: '' }),
    });

    if (!exceedResp.data.success && exceedResp.status === 400) {
      log.success('✅ Score above maxScore correctly rejected');
      testPassed++;
    } else {
      log.error('❌ Score above maxScore should be rejected');
      testFailed++;
    }

    // TEST 6: Non-numeric score
    log.section('Test 5: Non-numeric score validation');
    const invalidResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: 'abc', feedback: '' }),
    });

    if (!invalidResp.data.success && invalidResp.status === 400) {
      log.success('✅ Non-numeric score correctly rejected');
      testPassed++;
    } else {
      log.error('❌ Non-numeric score should be rejected');
      testFailed++;
    }

    // TEST 7: Update existing grade
    log.section('Test 6: Update existing grade');
    const updateResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score: 98, feedback: 'Updated feedback' }),
    });

    if (updateResp.data.success && updateResp.data.data.grade.score === 98) {
      log.success('✅ Grade updated successfully');
      testPassed++;
    } else {
      log.error('❌ Grade update failed');
      testFailed++;
    }

    // TEST 8: Student views own grade
    log.section('Test 7: Student grade visibility');
    const studentLogin = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'student@campusbridge.edu',
        password: 'StudentPass123!',
      }),
    });
    const studentToken = studentLogin.data.data.token;

    const studentView = await apiCall(`/assignments/${assignment._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    if (studentView.data.success && studentView.data.data.submission.grade.score === 98) {
      log.success('✅ Student can view own grade');
      testPassed++;
    } else {
      log.error('❌ Student grade visibility failed');
      testFailed++;
    }

    // TEST 9: Student cannot grade
    log.section('Test 8: Student cannot grade submissions');
    const studentGradeResp = await apiCall(`/instructor/submissions/${submission._id}/grade`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ score: 100, feedback: '' }),
    });

    if (!studentGradeResp.data.success && studentGradeResp.status === 403) {
      log.success('✅ Student correctly blocked from grading');
      testPassed++;
    } else {
      log.error('❌ Student should be blocked from grading');
      testFailed++;
    }

    // TEST 10: Physical path not exposed
    log.section('Test 9: Privacy - Physical paths not exposed');
    const privacyResp = await apiCall(`/instructor/submissions?courseId=${course._id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const hasPath = JSON.stringify(privacyResp.data).includes('/uploads/') ||
                     JSON.stringify(privacyResp.data).includes('submissions/');

    if (!hasPath) {
      log.success('✅ Physical file paths not exposed');
      testPassed++;
    } else {
      log.error('❌ Physical paths should not be exposed in API response');
      testFailed++;
    }

    // TEST 10: Transaction integrity - Atomic commits
    // Note: Testing transaction *rollback* with cross-process HTTP calls is not feasible
    // because stubs in the test process cannot affect the server process.
    // This test verifies the positive case: atomic commit of Grade + Submission updates.
    log.section('Test 10: Transaction Integrity - Atomic Grade + Submission updates');

    // Delete any existing data
    await Submission.deleteOne({ studentId: student._id, assignmentId: assignment._id });
    await Grade.deleteMany({ studentId: student._id, assignmentId: assignment._id });

    // Create a submission to grade
    const txTestSubmission = await Submission.create({
      studentId: student._id,
      assignmentId: assignment._id,
      courseId: course._id,
      submittedAt: new Date(),
      status: 'Submitted',
      text: 'Transaction test submission',
    });

    let txTestPassed = false;

    try {
      // Grade the submission
      const txGradeResp = await apiCall(`/instructor/submissions/${txTestSubmission._id}/grade`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: 88, feedback: 'Transaction test grade' }),
      });

      if (txGradeResp.status === 200 && txGradeResp.data.success === true) {
        // Verify both Grade and Submission were updated atomically
        const createdGrade = await Grade.findOne({ submissionId: txTestSubmission._id });
        const updatedSubmission = await Submission.findById(txTestSubmission._id);

        if (createdGrade &&
            createdGrade.score === 88 &&
            updatedSubmission &&
            updatedSubmission.status === 'Graded') {
          log.success('✅ Transaction committed atomically - both Grade and Submission updated');
          testPassed++;
          txTestPassed = true;
        } else {
          log.error(`❌ Transaction incomplete. Grade: ${!!createdGrade}, Score: ${createdGrade?.score}, Submission status: ${updatedSubmission?.status}`);
          testFailed++;
        }
      } else {
        log.error(`❌ Grading failed with status ${txGradeResp.status}`);
        testFailed++;
      }
    } catch (err) {
      log.error(`❌ Transaction test threw error: ${err.message}`);
      testFailed++;
    }

    // Cleanup
    await Grade.deleteMany({ submissionId: txTestSubmission._id });
    await Submission.deleteMany({ _id: txTestSubmission._id });

    // Cleanup
    await Grade.deleteMany({ submissionId: submission._id });
    await Submission.deleteMany({ _id: submission._id });
    await Assignment.deleteMany({ _id: assignment._id });
    await Enrollment.deleteMany({ courseId: course._id });
    await Course.deleteMany({ _id: course._id });

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
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(testFailed > 0 ? 1 : 0);
  }
}

runGradingTests();
