#!/usr/bin/env node
/**
 * Phase 12.5 Controller Layer Tests
 * 
 * Tests new controllers added for Coordinator/Administrator functionality
 * Phase 3: Controller Layer Implementation
 * 
 * Tests HTTP layer concerns:
 * - Request parameter validation
 * - Query parameter parsing
 * - Request body validation
 * - Service delegation
 * - Error handling and HTTP status mapping
 * - Response formatting
 * - CSV download headers
 * - Authentication context usage
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './server/.env' });

import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Progress } from '../models/Progress.js';
import { Application } from '../models/Application.js';
import { Internship } from '../models/Internship.js';

// Import controllers
import * as adminController from '../controllers/admin.controller.js';
import * as coordinatorController from '../controllers/coordinator.controller.js';
import * as reportsController from '../controllers/reports.controller.js';

// Test utilities
const log = {
  section: (msg) => console.log(`\n${'='.repeat(70)}\n${msg}\n${'='.repeat(70)}`),
  test: (msg) => console.log(`\n🧪 ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  error: (msg) => console.log(`  ❌ ${msg}`),
  info: (msg) => console.log(`  ℹ️  ${msg}`),
};

let testsPassed = 0;
let testsFailed = 0;

// Mock request/response objects for controller testing
const createMockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  user: null,
  headers: {},
  ...overrides,
});

const createMockRes = () => {
  const res = {
    statusCode: null,
    headers: {},
    data: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.data = data;
      return this;
    },
    send: function (data) {
      this.data = data;
      return this;
    },
    setHeader: function (key, value) {
      this.headers[key] = value;
      return this;
    },
  };
  return res;
};

const mockNext = (error) => {
  if (error) {
    throw error; // In tests, propagate unexpected errors
  }
};

// Test data cleanup
const testData = {
  users: [],
  organizations: [],
  courses: [],
  enrollments: [],
  progress: [],
  applications: [],
  internships: [],
};

async function runTests() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbridge';
    await mongoose.connect(mongoURI);
    log.info(`Connected to MongoDB: ${mongoose.connection.name}`);

    // ========================================
    // SETUP: Create test data
    // ========================================
    log.section('SETUP: Creating test data');

    // Cleanup any existing test data from previous runs
    await User.deleteMany({ email: { $regex: /phase12\.5.*ctrl@test\.com/ } });
    await PartnerOrganization.deleteMany({ email: { $regex: /org-ctrl-phase125@test\.com/ } });
    await Course.deleteMany({ code: 'TEST101' });
    log.info('Cleaned up any existing test data');

    // Create test users
    const adminUser = new User({
      name: 'Test Admin Controller',
      email: 'phase12.5-admin-ctrl@test.com',
      passwordHash: 'hashed',
      role: 'admin',
    });
    await adminUser.save();
    testData.users.push(adminUser);
    log.info('Created admin user');

    const coordinatorUser = new User({
      name: 'Test Coordinator Controller',
      email: 'phase12.5-coord-ctrl@test.com',
      passwordHash: 'hashed',
      role: 'coordinator',
    });
    await coordinatorUser.save();
    testData.users.push(coordinatorUser);
    log.info('Created coordinator user');

    const instructorUser = new User({
      name: 'Test Instructor Controller',
      email: 'phase12.5-instructor-ctrl@test.com',
      passwordHash: 'hashed',
      role: 'instructor',
      department: 'Computer Science',
    });
    await instructorUser.save();
    testData.users.push(instructorUser);
    log.info('Created instructor user');

    const studentUser = new User({
      name: 'Test Student Controller',
      email: 'phase12.5-student-ctrl@test.com',
      passwordHash: 'hashed',
      role: 'student',
      program: 'Computer Science',
      year: 3,
    });
    await studentUser.save();
    testData.users.push(studentUser);
    log.info('Created student user');

    // Create test organization
    const testOrg = new PartnerOrganization({
      name: 'Test Organization Controller',
      contactPerson: 'Test Contact',
      email: 'org-ctrl-phase125@test.com',
      approved: false,
      createdBy: coordinatorUser._id,
    });
    await testOrg.save();
    testData.organizations.push(testOrg);
    log.info('Created test organization');

    // Create test course
    const testCourse = new Course({
      code: 'TEST101',
      title: 'Test Course for Controllers',
      description: 'Test',
      instructorId: instructorUser._id,
      createdBy: coordinatorUser._id, // Required field
      status: 'active',
    });
    await testCourse.save();
    testData.courses.push(testCourse);
    log.info('Created test course');

    // Create enrollment and progress
    const testEnrollment = new Enrollment({
      studentId: studentUser._id,
      courseId: testCourse._id,
    });
    await testEnrollment.save();
    testData.enrollments.push(testEnrollment);

    const testProgress = new Progress({
      studentId: studentUser._id,
      courseId: testCourse._id,
      totalAssignments: 5,
      submittedCount: 3,
      percent: 60,
      averageScore: 75,
    });
    await testProgress.save();
    testData.progress.push(testProgress);
    log.info('Created enrollment and progress');

    // ========================================
    // ADMIN CONTROLLER TESTS
    // ========================================
    log.section('ADMIN CONTROLLER TESTS');

    // Test 1: listUsers - successful request
    log.test('Test 1: adminController.listUsers - successful request');
    try {
      const req = createMockReq({
        query: { page: '1', limit: '20' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.listUsers(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success && Array.isArray(res.data.data)) {
        log.success(`listUsers returned ${res.data.data.length} users with pagination`);
        testsPassed++;
      } else {
        log.error('listUsers did not return expected success response');
        testsFailed++;
      }
    } catch (err) {
      log.error(`listUsers test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 2: listUsers - invalid page number
    log.test('Test 2: adminController.listUsers - invalid page validation');
    try {
      const req = createMockReq({
        query: { page: '-1', limit: '20' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.listUsers(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Invalid page number rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Invalid page test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 3: listUsers - role filter
    log.test('Test 3: adminController.listUsers - role filter');
    try {
      const req = createMockReq({
        query: { role: 'student', page: '1', limit: '20' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.listUsers(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success) {
        log.success('Role filter applied successfully');
        testsPassed++;
      } else {
        log.error('Role filter test failed');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Role filter test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 4: updateUser - successful update
    log.test('Test 4: adminController.updateUser - successful role change');
    try {
      const req = createMockReq({
        params: { id: studentUser._id.toString() },
        body: { role: 'instructor' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.updateUser(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success) {
        // Check if role was actually updated
        const updatedUser = await User.findById(studentUser._id);
        if (updatedUser.role === 'instructor') {
          log.success('User role updated successfully');
          // Revert for other tests
          await User.findByIdAndUpdate(studentUser._id, { role: 'student' });
          testsPassed++;
        } else {
          log.error(`Role not updated: expected 'instructor', got '${updatedUser.role}'`);
          log.info(`Response: ${JSON.stringify(res.data)}`);
          testsFailed++;
        }
      } else {
        log.error(`updateUser did not return success: status=${res.statusCode}, success=${res.data?.success}`);
        log.info(`Response: ${JSON.stringify(res.data)}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`updateUser test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 5: updateUser - invalid user ID format
    log.test('Test 5: adminController.updateUser - invalid ID format');
    try {
      const req = createMockReq({
        params: { id: 'invalid-id' },
        body: { role: 'admin' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.updateUser(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Invalid user ID rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Invalid ID test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 6: updateUser - admin cannot modify own account
    log.test('Test 6: adminController.updateUser - self-modification prevention');
    try {
      const req = createMockReq({
        params: { id: adminUser._id.toString() },
        body: { role: 'coordinator' },
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.updateUser(req, res, mockNext);

      if (res.statusCode === 403 && res.data.success === false) {
        log.success('Self-modification blocked with 403');
        testsPassed++;
      } else {
        log.error(`Expected 403, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Self-modification test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 7: updateUser - no fields provided
    log.test('Test 7: adminController.updateUser - require at least one field');
    try {
      const req = createMockReq({
        params: { id: studentUser._id.toString() },
        body: {},
        user: adminUser,
      });
      const res = createMockRes();

      await adminController.updateUser(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Empty update rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Empty update test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // COORDINATOR CONTROLLER TESTS
    // ========================================
    log.section('COORDINATOR CONTROLLER TESTS');

    // Test 8: listOrganizations - successful request
    log.test('Test 8: coordinatorController.listOrganizations - successful request');
    try {
      const req = createMockReq({
        query: { page: '1', limit: '20' },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.listOrganizations(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success && Array.isArray(res.data.data)) {
        log.success(`listOrganizations returned ${res.data.data.length} organizations`);
        testsPassed++;
      } else {
        log.error('listOrganizations did not return expected result');
        testsFailed++;
      }
    } catch (err) {
      log.error(`listOrganizations test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 9: listOrganizations - approved filter
    log.test('Test 9: coordinatorController.listOrganizations - approved filter');
    try {
      const req = createMockReq({
        query: { approved: 'false', page: '1', limit: '20' },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.listOrganizations(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success) {
        log.success('Approved filter applied successfully');
        testsPassed++;
      } else {
        log.error('Approved filter test failed');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Approved filter test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 10: approveOrganization - successful approval
    log.test('Test 10: coordinatorController.approveOrganization - successful approval');
    try {
      const req = createMockReq({
        params: { id: testOrg._id.toString() },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.approveOrganization(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success && res.data.data.organization.approved) {
        log.success('Organization approved successfully');
        log.info(`Approved by: ${res.data.data.organization.approvedBy}`);
        testsPassed++;
      } else {
        log.error('approveOrganization did not return expected result');
        testsFailed++;
      }
    } catch (err) {
      log.error(`approveOrganization test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 11: approveOrganization - idempotent approval
    log.test('Test 11: coordinatorController.approveOrganization - idempotent');
    try {
      const req = createMockReq({
        params: { id: testOrg._id.toString() },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.approveOrganization(req, res, mockNext);

      if (res.statusCode === 200 && res.data.success && res.data.data.alreadyApproved === true) {
        log.success('Idempotent approval returned success');
        testsPassed++;
      } else {
        log.error('Idempotent approval behavior incorrect');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Idempotent approval test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 12: approveOrganization - invalid ID format
    log.test('Test 12: coordinatorController.approveOrganization - invalid ID');
    try {
      const req = createMockReq({
        params: { id: 'invalid-org-id' },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.approveOrganization(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Invalid organization ID rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Invalid ID test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 13: approveOrganization - nonexistent organization
    log.test('Test 13: coordinatorController.approveOrganization - nonexistent org');
    try {
      const fakeOrgId = new mongoose.Types.ObjectId().toString();
      const req = createMockReq({
        params: { id: fakeOrgId },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await coordinatorController.approveOrganization(req, res, mockNext);

      if (res.statusCode === 404 && res.data.success === false) {
        log.success('Nonexistent organization rejected with 404');
        testsPassed++;
      } else {
        log.error(`Expected 404, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Nonexistent org test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // REPORTS CONTROLLER TESTS
    // ========================================
    log.section('REPORTS CONTROLLER TESTS');

    // Test 14: getProgressReport - instructor access
    log.test('Test 14: reportsController.getProgressReport - instructor access');
    try {
      const req = createMockReq({
        query: {},
        user: instructorUser,
      });
      const res = createMockRes();

      await reportsController.getProgressReport(req, res, mockNext);

      if (
        res.statusCode === 200 &&
        typeof res.data === 'string' &&
        res.headers['Content-Type'] === 'text/csv; charset=utf-8'
      ) {
        log.success('Progress report CSV generated for instructor');
        log.info(`Content-Disposition: ${res.headers['Content-Disposition']}`);
        testsPassed++;
      } else {
        log.error('Progress report did not return CSV');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Progress report test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 15: getProgressReport - coordinator access
    log.test('Test 15: reportsController.getProgressReport - coordinator access');
    try {
      const req = createMockReq({
        query: {},
        user: coordinatorUser,
      });
      const res = createMockRes();

      await reportsController.getProgressReport(req, res, mockNext);

      if (res.statusCode === 200 && typeof res.data === 'string') {
        log.success('Progress report generated for coordinator');
        testsPassed++;
      } else {
        log.error('Coordinator progress report failed');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Coordinator progress report test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 16: getProgressReport - student unauthorized
    log.test('Test 16: reportsController.getProgressReport - student unauthorized');
    try {
      const req = createMockReq({
        query: {},
        user: studentUser,
      });
      const res = createMockRes();

      await reportsController.getProgressReport(req, res, mockNext);

      if (res.statusCode === 403 && res.data.success === false) {
        log.success('Student access denied with 403');
        testsPassed++;
      } else {
        log.error(`Expected 403, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Student unauthorized test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 17: getProgressReport - course code filter
    log.test('Test 17: reportsController.getProgressReport - course filter');
    try {
      const req = createMockReq({
        query: { courseCode: 'TEST101' },
        user: instructorUser,
      });
      const res = createMockRes();

      await reportsController.getProgressReport(req, res, mockNext);

      if (res.statusCode === 200 && typeof res.data === 'string') {
        log.success('Course filter applied successfully');
        testsPassed++;
      } else {
        log.error('Course filter test failed');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Course filter test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 18: getApplicationsReport - coordinator access
    log.test('Test 18: reportsController.getApplicationsReport - coordinator access');
    try {
      const req = createMockReq({
        query: {},
        user: coordinatorUser,
      });
      const res = createMockRes();

      await reportsController.getApplicationsReport(req, res, mockNext);

      if (
        res.statusCode === 200 &&
        typeof res.data === 'string' &&
        res.headers['Content-Type'] === 'text/csv; charset=utf-8'
      ) {
        log.success('Applications report CSV generated for coordinator');
        testsPassed++;
      } else {
        log.error('Applications report did not return CSV');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Applications report test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 19: getApplicationsReport - instructor unauthorized
    log.test('Test 19: reportsController.getApplicationsReport - instructor unauthorized');
    try {
      const req = createMockReq({
        query: {},
        user: instructorUser,
      });
      const res = createMockRes();

      await reportsController.getApplicationsReport(req, res, mockNext);

      if (res.statusCode === 403 && res.data.success === false) {
        log.success('Instructor access denied with 403');
        testsPassed++;
      } else {
        log.error(`Expected 403, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Instructor unauthorized test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 20: getApplicationsReport - invalid date format
    log.test('Test 20: reportsController.getApplicationsReport - invalid date');
    try {
      const req = createMockReq({
        query: { startDate: 'invalid-date' },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await reportsController.getApplicationsReport(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Invalid date format rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Invalid date test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 21: getApplicationsReport - invalid date range
    log.test('Test 21: reportsController.getApplicationsReport - invalid date range');
    try {
      const req = createMockReq({
        query: { startDate: '2026-12-31', endDate: '2026-01-01' },
        user: coordinatorUser,
      });
      const res = createMockRes();

      await reportsController.getApplicationsReport(req, res, mockNext);

      if (res.statusCode === 400 && res.data.success === false) {
        log.success('Invalid date range rejected with 400');
        testsPassed++;
      } else {
        log.error(`Expected 400, got ${res.statusCode}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Invalid date range test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 22: CSV download headers verification
    log.test('Test 22: CSV download headers - Cache-Control and Pragma');
    try {
      const req = createMockReq({
        query: {},
        user: adminUser,
      });
      const res = createMockRes();

      await reportsController.getProgressReport(req, res, mockNext);

      if (
        res.headers['Cache-Control'] === 'no-cache, no-store, must-revalidate' &&
        res.headers['Pragma'] === 'no-cache' &&
        res.headers['Expires'] === '0'
      ) {
        log.success('CSV download headers correctly set');
        testsPassed++;
      } else {
        log.error('CSV download headers missing or incorrect');
        testsFailed++;
      }
    } catch (err) {
      log.error(`CSV headers test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // CLEANUP
    // ========================================
    log.section('TEST SUMMARY');

    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      console.log('🎉 All Phase 12.5 Controller Layer tests passed!');
    } else {
      console.log(`⚠️  ${testsFailed} test(s) failed.`);
    }

    // Cleanup test data
    log.info('Cleaning up test data...');
    await User.deleteMany({ email: { $regex: /phase12\.5.*ctrl@test\.com/ } });
    await PartnerOrganization.deleteMany({ email: { $regex: /org-ctrl-phase125@test\.com/ } });
    await Course.deleteMany({ code: 'TEST101' });
    await Enrollment.deleteMany({ studentId: { $in: testData.users.map((u) => u._id) } });
    await Progress.deleteMany({ studentId: { $in: testData.users.map((u) => u._id) } });
    log.info('Test data cleaned up successfully');

    // Close connection
    await mongoose.connection.close();
    log.info('MongoDB connection closed');

    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Fatal test error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run tests
runTests();
