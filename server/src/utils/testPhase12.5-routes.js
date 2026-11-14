#!/usr/bin/env node
/**
 * Integration Tests for Phase 12.5 - Coordinator/Administrator Functionality (Routes)
 *
 * Tests the complete HTTP request-to-response flow through:
 * - Express middleware (authenticate, authorize)
 * - Route handlers (admin.routes.js, coordinator.routes.js, reports.routes.js)
 * - Controllers (admin.controller.js, coordinator.controller.js, reports.controller.js)
 * - Services (admin.service.js, coordinator.service.js, reports.service.js)
 * - Models (User, PartnerOrganization, Application, Progress)
 *
 * Coverage: 6 endpoints (admin: 2, coordinator: 2, reports: 2) with authentication and authorization
 *
 * Phase 4 Deliverable: Route Integration Test Suite
 * Created: 2026-11-11
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: join(__dirname, '../../.env') });

import app from '../server.js';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Application } from '../models/Application.js';
import { Course } from '../models/Course.js';
import { Progress } from '../models/Progress.js';

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

// Test data
let adminUser, coordinatorUser, instructorUser, studentUser;
let adminToken, coordinatorToken, instructorToken, studentToken;
let testOrg, testCourse;

const TEST_PORT = process.env.PORT || 5005;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Test server instance
let testServer;

// Helper to make HTTP requests
const makeRequest = (method, path, token, body = null, query = '') => {
  return new Promise((resolve, reject) => {
    const url = new URL(path + query, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, text: data });
        } catch (err) {
          resolve({ status: res.statusCode, headers: res.headers, body: null, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function setupTestData() {
  log.info('Setting up test data...');

  // Clean up collections
  await User.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Application.deleteMany({});
  await Course.deleteMany({});
  await Progress.deleteMany({});

  // Create test users
  adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@test.edu',
    passwordHash: await bcrypt.hash('Admin123!', 10),
    role: 'admin',
    program: 'Computer Science',
    year: 4,
    active: true,
  });

  coordinatorUser = await User.create({
    name: 'Coordinator User',
    email: 'coord@test.edu',
    passwordHash: await bcrypt.hash('Coord123!', 10),
    role: 'coordinator',
    program: 'Engineering',
    year: 3,
    active: true,
  });

  instructorUser = await User.create({
    name: 'Instructor User',
    email: 'instructor@test.edu',
    passwordHash: await bcrypt.hash('Inst123!', 10),
    role: 'instructor',
    program: 'Mathematics',
    year: 5,
    active: true,
  });

  studentUser = await User.create({
    name: 'Student User',
    email: 'student@test.edu',
    passwordHash: await bcrypt.hash('Student123!', 10),
    role: 'student',
    program: 'Physics',
    year: 2,
    active: true,
  });

  // Generate tokens
  adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  coordinatorToken = jwt.sign({ id: coordinatorUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  instructorToken = jwt.sign({ id: instructorUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  studentToken = jwt.sign({ id: studentUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // Create test organization
  testOrg = await PartnerOrganization.create({
    name: 'Test Company',
    contactPerson: 'John Test',
    email: 'contact@testcompany.com',
    phone: '555-0100',
    description: 'A test organization',
    website: 'https://testcompany.com',
    createdBy: coordinatorUser._id,
    approved: false,
  });

  // Create test course
  testCourse = await Course.create({
    code: 'CS101',
    title: 'Intro to Testing',
    description: 'Test course',
    credits: 3,
    department: 'Computer Science',
    semester: 'Fall 2026',
    instructorId: instructorUser._id,
    createdBy: instructorUser._id,
    capacity: 30,
    enrolledStudents: [studentUser._id],
  });

  // Create test progress
  await Progress.create({
    studentId: studentUser._id,
    courseId: testCourse._id,
    assignments: [],
    currentGrade: 85,
    completionRate: 75,
    lastUpdated: new Date(),
  });

  // Create test internship (needed for Application)
  const { Internship } = await import('../models/Internship.js');
  const testInternship = await Internship.create({
    title: 'Test Internship Position',
    description: 'A test internship opportunity',
    companyId: testOrg._id,
    location: 'Test City',
    duration: '3 months',
    type: 'Remote', // required field
    skills: ['JavaScript', 'Node.js'], // required field
    requirements: ['Requirement 1', 'Requirement 2'], // required field
    deadline: new Date('2027-01-01'), // required field
    createdBy: coordinatorUser._id, // required field
    active: true,
  });

  // Create test application
  await Application.create({
    internshipId: testInternship._id,
    studentId: studentUser._id,
    message: 'This is a test application message for the internship position.',
    cv: {
      name: 'test-cv.pdf',
      path: '/uploads/test-cv.pdf',
      size: 102400,
      mimeType: 'application/pdf',
    },
    status: 'Submitted',
  });

  log.success('Test data created successfully');
}

// Test: Admin - List Users
async function testAdminListUsers() {
  log.test('Admin can list users with filters');
  try {
    const res = await makeRequest('GET', '/api/v1/admin/users', adminToken, null, '?role=student&active=true');
    if (res.status === 200 && res.body.success && Array.isArray(res.body.data)) {
      log.success('Admin user listing works correctly');
      testsPassed++;
    } else {
      log.error(`Expected 200 with data array, got ${res.status}`);
      log.error(`Response: ${JSON.stringify(res.body)}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Admin list users failed: ${err.message}`);
    testsFailed++;
  }
}

async function testCoordinatorCannotListUsers() {
  log.test('Coordinator cannot list users');
  try {
    const res = await makeRequest('GET', '/api/v1/admin/users', coordinatorToken);
    if (res.status === 403) {
      log.success('Coordinator access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

async function testInstructorCannotListUsers() {
  log.test('Instructor cannot list users');
  try {
    const res = await makeRequest('GET', '/api/v1/admin/users', instructorToken);
    if (res.status === 403) {
      log.success('Instructor access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Instructor authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

async function testUnauthenticatedListUsers() {
  log.test('Unauthenticated request rejected');
  try {
    const res = await makeRequest('GET', '/api/v1/admin/users', null);
    if (res.status === 401) {
      log.success('Unauthenticated access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 401, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Unauthenticated test failed: ${err.message}`);
    testsFailed++;
  }
}

// Test: Admin - Update User
async function testAdminUpdateUser() {
  log.test('Admin can update user role');
  try {
    // Create a separate user for this test to avoid affecting other tests
    const testUser = await User.create({
      name: 'Update Test User',
      email: 'updatetest@test.edu',
      passwordHash: await bcrypt.hash('Test123!', 10),
      role: 'student',
      program: 'Biology',
      year: 1,
      active: true,
    });

    const res = await makeRequest('PATCH', `/api/v1/admin/users/${testUser._id}`, adminToken, { role: 'instructor' });
    if (res.status === 200 && res.body.data && res.body.data.role === 'instructor') {
      log.success('Admin user update works correctly');
      testsPassed++;
    } else {
      log.error(`Expected 200 with role=instructor, got ${res.status}`);
      log.error(`Response: ${JSON.stringify(res.body)}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Admin update user failed: ${err.message}`);
    testsFailed++;
  }
}

async function testCoordinatorCannotUpdateUser() {
  log.test('Coordinator cannot update users');
  try {
    // Create a separate user for this test
    const testUser = await User.create({
      name: 'Coordinator Update Test',
      email: 'coordtest@test.edu',
      passwordHash: await bcrypt.hash('Test123!', 10),
      role: 'student',
      program: 'Chemistry',
      year: 2,
      active: true,
    });

    const res = await makeRequest('PATCH', `/api/v1/admin/users/${testUser._id}`, coordinatorToken, { role: 'admin' });
    if (res.status === 403) {
      log.success('Coordinator update access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      log.error(`Response: ${JSON.stringify(res.body)}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator update authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

// Test: Coordinator - List Organizations
async function testCoordinatorListOrganizations() {
  log.test('Coordinator can list organizations');
  try {
    const res = await makeRequest('GET', '/api/v1/coordinator/organizations', coordinatorToken, null, '?approved=false');
    if (res.status === 200 && res.body.success && Array.isArray(res.body.data)) {
      log.success('Coordinator organization listing works');
      testsPassed++;
    } else {
      log.error(`Expected 200, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator list organizations failed: ${err.message}`);
    testsFailed++;
  }
}

async function testStudentCannotListOrganizations() {
  log.test('Student cannot list organizations');
  try {
    const res = await makeRequest('GET', '/api/v1/coordinator/organizations', studentToken);
    if (res.status === 403) {
      log.success('Student access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Student authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

// Test: Coordinator - Approve Organization
async function testCoordinatorApproveOrganization() {
  log.test('Coordinator can approve organization');
  try {
    const res = await makeRequest(
      'PATCH',
      `/api/v1/coordinator/organizations/${testOrg._id}/approve`,
      coordinatorToken
    );
    if (res.status === 200 && res.body.data && res.body.data.organization && res.body.data.organization.approved === true) {
      log.success('Coordinator approval works correctly');
      testsPassed++;
    } else {
      log.error(`Expected 200 with approved=true, got ${res.status}`);
      log.error(`Response: ${JSON.stringify(res.body)}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator approve organization failed: ${err.message}`);
    testsFailed++;
  }
}

async function testCoordinatorIdempotentApproval() {
  log.test('Coordinator approval is idempotent');
  try {
    // Create new org for idempotent test
    const newOrg = await PartnerOrganization.create({
      name: 'Test Idempotent Company',
      contactPerson: 'Jane Idempotent',
      email: 'idempotent@test.com',
      phone: '555-0300',
      description: 'Organization for idempotent test',
      createdBy: coordinatorUser._id,
      approved: false,
    });

    // Approve once
    await makeRequest('PATCH', `/api/v1/coordinator/organizations/${newOrg._id}/approve`, coordinatorToken);
    
    // Try to approve again
    const res = await makeRequest('PATCH', `/api/v1/coordinator/organizations/${newOrg._id}/approve`, coordinatorToken);
    
    if (res.status === 200 && res.body.data.alreadyApproved) {
      log.success('Idempotent approval handled correctly');
      testsPassed++;
    } else {
      log.error(`Expected 200 with alreadyApproved flag, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Idempotent approval test failed: ${err.message}`);
    testsFailed++;
  }
}

// Test: Reports - Progress Report
async function testInstructorProgressReport() {
  log.test('Instructor can generate progress report');
  try {
    const res = await makeRequest(
      'GET',
      '/api/v1/reports/progress',
      instructorToken,
      null,
      `?courseId=${testCourse._id}&semester=Fall%202026`
    );
    // Report returns CSV by default - check for 200 and CSV headers in response
    if (res.status === 200 && (typeof res.body === 'object' && res.body.success || typeof res.text === 'string' && res.text.includes('Course Code'))) {
      log.success('Instructor progress report works');
      testsPassed++;
    } else {
      log.error(`Expected 200 with valid response, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Instructor progress report failed: ${err.message}`);
    testsFailed++;
  }
}

async function testCoordinatorProgressReport() {
  log.test('Coordinator can generate progress report');
  try {
    const res = await makeRequest('GET', '/api/v1/reports/progress', coordinatorToken, null, '?semester=Fall%202026');
    // Accept either JSON or CSV as valid response
    if (res.status === 200) {
      log.success('Coordinator progress report works');
      testsPassed++;
    } else {
      log.error(`Expected 200, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator progress report failed: ${err.message}`);
    testsFailed++;
  }
}

async function testStudentCannotAccessProgressReport() {
  log.test('Student cannot access progress report');
  try {
    const res = await makeRequest('GET', '/api/v1/reports/progress', studentToken);
    if (res.status === 403) {
      log.success('Student access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Student authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

// Test: Reports - Applications Report
async function testCoordinatorApplicationsReport() {
  log.test('Coordinator can generate applications report');
  try {
    const res = await makeRequest('GET', '/api/v1/reports/applications', coordinatorToken, null, '?status=Submitted');
    // Accept either JSON or CSV as valid response
    if (res.status === 200) {
      log.success('Coordinator applications report works');
      testsPassed++;
    } else {
      log.error(`Expected 200, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Coordinator applications report failed: ${err.message}`);
    testsFailed++;
  }
}

async function testAdminApplicationsReport() {
  log.test('Admin can generate applications report');
  try {
    const res = await makeRequest('GET', '/api/v1/reports/applications', adminToken);
    // Accept either JSON or CSV as valid response
    if (res.status === 200) {
      log.success('Admin applications report works');
      testsPassed++;
    } else {
      log.error(`Expected 200, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Admin applications report failed: ${err.message}`);
    testsFailed++;
  }
}

async function testInstructorCannotAccessApplicationsReport() {
  log.test('Instructor cannot access applications report');
  try {
    const res = await makeRequest('GET', '/api/v1/reports/applications', instructorToken);
    if (res.status === 403) {
      log.success('Instructor access correctly denied');
      testsPassed++;
    } else {
      log.error(`Expected 403, got ${res.status}`);
      testsFailed++;
    }
  } catch (err) {
    log.error(`Instructor authorization test failed: ${err.message}`);
    testsFailed++;
  }
}

// Main test runner
async function runTests() {
  log.section('Phase 12.5 - Route Integration Tests');

  try {
    // Connect to database (only if not already connected)
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
      log.success('Connected to MongoDB');
    } else {
      log.info('Using existing MongoDB connection');
    }

    // Setup test data
    await setupTestData();

    // Start test server
    log.info(`Starting test server on port ${TEST_PORT}...`);
    await new Promise((resolve, reject) => {
      testServer = app.listen(TEST_PORT, () => {
        log.success(`Test server started on port ${TEST_PORT}`);
        resolve();
      });
      testServer.on('error', reject);
    });

    // Run Admin Route Tests
    log.section('Admin Routes - /api/v1/admin');
    await testAdminListUsers();
    await testCoordinatorCannotListUsers();
    await testInstructorCannotListUsers();
    await testUnauthenticatedListUsers();
    await testAdminUpdateUser();
    await testCoordinatorCannotUpdateUser();

    // Run Coordinator Route Tests
    log.section('Coordinator Routes - /api/v1/coordinator');
    await testCoordinatorListOrganizations();
    await testStudentCannotListOrganizations();
    await testCoordinatorApproveOrganization();
    await testCoordinatorIdempotentApproval();

    // Run Reports Route Tests
    log.section('Reports Routes - /api/v1/reports');
    await testInstructorProgressReport();
    await testCoordinatorProgressReport();
    await testStudentCannotAccessProgressReport();
    await testCoordinatorApplicationsReport();
    await testAdminApplicationsReport();
    await testInstructorCannotAccessApplicationsReport();

    // Print summary
    log.section('Test Summary');
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total:  ${testsPassed + testsFailed}`);

    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed!\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${testsFailed} test(s) failed\n`);
      process.exit(1);
    }
  } catch (err) {
    log.error(`Test execution failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    // Shutdown test server
    if (testServer) {
      log.info('Shutting down test server...');
      await new Promise((resolve) => {
        testServer.close(() => {
          log.success('Test server shut down');
          resolve();
        });
      });
    }
    
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      log.success('MongoDB connection closed');
    }
  }
}

runTests();
