/**
 * Phase 13.1 Test Suite
 * Tests for Coordinator Internship & Application Management + Admin Staff Creation
 * 
 * Features tested:
 * 1. Internship Creation (Coordinator)
 * 2. Application Listing (Coordinator)
 * 3. Application Forwarding (Coordinator)
 * 4. Company Decision Recording (Coordinator)
 * 5. Staff Account Creation (Admin)
 */

import assert from 'assert';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Internship } from '../models/Internship.js';
import { Application } from '../models/Application.js';
import { Notification } from '../models/Notification.js';
import {
  createInternship,
  listAllApplications,
  forwardApplication,
  recordCompanyDecision,
} from '../services/coordinator.service.js';
import { createStaffUser } from '../services/admin.service.js';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || (config.mongoURI || 'mongodb://127.0.0.1:27017/campusbridge').replace('/campusbridge', '/campusbridge_test');

console.log('\n╔════════════════════════════════════════════════════════════════════╗');
console.log('║           Phase 13.1 Test Suite — Coordinator & Admin              ║');
console.log('╚════════════════════════════════════════════════════════════════════╝\n');

let testCoordinator;
let testAdmin;
let testStudent;
let testCompany;
let testInternship;
let testApplication;

// Test execution tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    passedTests++;
    console.log(`✓ ${testName}`);
  } catch (err) {
    failedTests++;
    console.log(`✗ ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  // Connect to test database
  await mongoose.connect(TEST_DB_URI);
  
  // Clean collections
  await User.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});
  
  // Create test users
  testCoordinator = await User.create({
    name: 'Test Coordinator',
    email: 'coordinator@test.edu',
    passwordHash: 'TestPass123!',
    role: 'coordinator',
    active: true,
  });

  testAdmin = await User.create({
    name: 'Test Administrator',
    email: 'admin@test.edu',
    passwordHash: 'AdminPass123!',
    role: 'admin',
    active: true,
  });

  testStudent = await User.create({
    name: 'Test Student',
    email: 'student@test.edu',
    passwordHash: 'StudentPass123!',
    role: 'student',
    active: true,
    program: 'Computer Science',
    year: 3,
    cv: {
      name: 'resume.pdf',
      path: '/uploads/resume.pdf',
      size: 12345,
      mimeType: 'application/pdf',
    },
  });

  // Create approved company
  testCompany = await PartnerOrganization.create({
    name: 'Tech Corp',
    contactPerson: 'Jane Recruiter',
    email: 'recruiter@techcorp.com',
    website: 'https://techcorp.com',
    description: 'Leading tech company',
    approved: true,
    approvedBy: testCoordinator._id,
    approvedAt: new Date(),
    createdBy: testCoordinator._id,
  });

  console.log('Test database setup complete.\n');
}

async function cleanupTestDatabase() {
  console.log('\nCleaning up test database...');
  await User.deleteMany({});
  await PartnerOrganization.deleteMany({});
  await Internship.deleteMany({});
  await Application.deleteMany({});
  await Notification.deleteMany({});
  await mongoose.disconnect();
  console.log('Test database cleaned up.\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite 1: Internship Creation
// ═══════════════════════════════════════════════════════════════════════════

async function testInternshipCreation() {
  console.log('\n─── Test Suite 1: Internship Creation ───\n');

  await runTest('Creates internship with valid data', async () => {
    const internshipData = {
      companyId: testCompany._id.toString(),
      title: 'Backend Developer Intern',
      type: 'Remote',
      skills: ['JavaScript', 'Node.js', 'MongoDB'],
      description: 'Work on backend systems',
      requirements: ['3rd year student', 'JavaScript knowledge'],
      location: 'Remote',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };

    const result = await createInternship(internshipData, testCoordinator._id.toString());
    assert(result._id, 'Internship should have ID');
    assert.strictEqual(result.title, internshipData.title);
    assert.strictEqual(result.status, 'open');
    assert.strictEqual(result.createdBy.toString(), testCoordinator._id.toString());

    // Save for later tests
    testInternship = await Internship.findById(result._id);
  });

  await runTest('Rejects unapproved company', async () => {
    const unapprovedCompany = await PartnerOrganization.create({
      name: 'Unapproved Corp',
      contactPerson: 'John Doe',
      email: 'john@unapproved.com',
      approved: false,
      createdBy: testCoordinator._id,
    });

    const internshipData = {
      companyId: unapprovedCompany._id.toString(),
      title: 'Test Internship',
      type: 'Remote',
      skills: ['Test'],
      description: 'Test',
      requirements: ['Test'],
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    try {
      await createInternship(internshipData, testCoordinator._id.toString());
      throw new Error('Should have rejected unapproved company');
    } catch (err) {
      assert(err.message.includes('not yet approved'));
    }
  });

  await runTest('Rejects past deadline', async () => {
    const internshipData = {
      companyId: testCompany._id.toString(),
      title: 'Past Deadline Internship',
      type: 'Remote',
      skills: ['Test'],
      description: 'Test',
      requirements: ['Test'],
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    };

    try {
      await createInternship(internshipData, testCoordinator._id.toString());
      throw new Error('Should have rejected past deadline');
    } catch (err) {
      assert(err.message.includes('must be in the future'));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite 2: Application Listing
// ═══════════════════════════════════════════════════════════════════════════

async function testApplicationListing() {
  console.log('\n─── Test Suite 2: Application Listing ───\n');

  // Create test application
  testApplication = await Application.create({
    internshipId: testInternship._id,
    studentId: testStudent._id,
    message: 'I am very interested in this position and have relevant experience.',
    cv: testStudent.cv,
    status: 'Submitted',
    history: [{ status: 'Submitted', byUserId: testStudent._id }],
  });

  await runTest('Lists all applications', async () => {
    const result = await listAllApplications({});
    assert(result.applications.length > 0, 'Should return applications');
    assert(result.pagination, 'Should include pagination');
    assert(result.pagination.totalCount >= 1);
  });

  await runTest('Filters by status', async () => {
    const result = await listAllApplications({ status: 'Submitted' });
    assert(result.applications.length > 0);
    assert(result.applications.every(app => app.status === 'Submitted'));
  });

  await runTest('Filters by internship ID', async () => {
    const result = await listAllApplications({ internshipId: testInternship._id.toString() });
    assert(result.applications.length > 0);
    assert(result.applications.every(app => app.internshipId._id.toString() === testInternship._id.toString()));
  });

  await runTest('Populates student and internship data', async () => {
    const result = await listAllApplications({});
    const app = result.applications[0];
    assert(app.studentId.name, 'Should populate student name');
    assert(app.internshipId.title, 'Should populate internship title');
    assert(app.internshipId.companyId.name, 'Should populate company name');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite 3: Application Forwarding
// ═══════════════════════════════════════════════════════════════════════════

async function testApplicationForwarding() {
  console.log('\n─── Test Suite 3: Application Forwarding ───\n');

  await runTest('Forwards application from Submitted to Forwarded (auto-transition)', async () => {
    const result = await forwardApplication(
      testApplication._id.toString(),
      testCoordinator._id.toString(),
      'Looks promising'
    );
    
    assert.strictEqual(result.status, 'Forwarded');
    assert(result.history.length >= 2, 'Should have history entries');
    assert(result.history.some(h => h.status === 'Under review'), 'Should auto-transition through Under review');
    assert(result.history.some(h => h.status === 'Forwarded'), 'Should have Forwarded entry');
  });

  await runTest('Dispatches student notification on forward', async () => {
    // Event-based notification is async — allow event loop to flush
    await new Promise((r) => setTimeout(r, 200));

    const notifications = await Notification.find({ 
      userId: testStudent._id,
      type: 'application'
    });
    
    assert(notifications.length > 0, 'Should create notification');
    const forwardNotif = notifications.find(n => n.title === 'Application Forwarded');
    assert(forwardNotif, 'Should have forwarding notification');
  });

  await runTest('Rejects forwarding terminal states', async () => {
    // Create unique test student for this test
    const uniqueStudent = await User.create({
      name: 'Terminal State Student',
      email: 'terminal@test.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'Engineering',
      year: 2,
      cv: {
        name: 'terminal.pdf',
        path: '/uploads/terminal.pdf',
        size: 12345,
        mimeType: 'application/pdf',
      },
    });

    // Create accepted application with unique student
    const acceptedApp = await Application.create({
      internshipId: testInternship._id,
      studentId: uniqueStudent._id,
      message: 'Test application for terminal state',
      cv: uniqueStudent.cv,
      status: 'Accepted',
      history: [{ status: 'Accepted', byUserId: testCoordinator._id }],
    });

    try {
      await forwardApplication(acceptedApp._id.toString(), testCoordinator._id.toString());
      throw new Error('Should have rejected terminal state transition');
    } catch (err) {
      assert(err.message.includes('Cannot forward'));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite 4: Company Decision Recording
// ═══════════════════════════════════════════════════════════════════════════

async function testCompanyDecision() {
  console.log('\n─── Test Suite 4: Company Decision Recording ───\n');

  await runTest('Records Accepted decision', async () => {
    const result = await recordCompanyDecision(
      testApplication._id.toString(),
      'Accepted',
      testCoordinator._id.toString(),
      'Great candidate'
    );
    
    assert.strictEqual(result.status, 'Accepted');
    const lastHistory = result.history[result.history.length - 1];
    assert.strictEqual(lastHistory.status, 'Accepted');
    assert.strictEqual(lastHistory.notes, 'Great candidate');
  });

  await runTest('Dispatches acceptance notification to student', async () => {
    // Event-based notification is async — allow event loop to flush
    await new Promise((r) => setTimeout(r, 200));

    const notifications = await Notification.find({ 
      userId: testStudent._id,
      title: 'Application Accepted'
    });
    
    assert(notifications.length > 0, 'Should create acceptance notification');
    assert(notifications[0].message.includes('Congratulations'));
  });

  await runTest('Records Rejected decision', async () => {
    // Create unique student for rejected application
    const rejectedStudent = await User.create({
      name: 'Rejected App Student',
      email: 'rejected@test.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'Engineering',
      year: 2,
      cv: {
        name: 'rejected.pdf',
        path: '/uploads/rejected.pdf',
        size: 12345,
        mimeType: 'application/pdf',
      },
    });

    // Create new forwarded application with unique student
    const newApp = await Application.create({
      internshipId: testInternship._id,
      studentId: rejectedStudent._id,
      message: 'Another application for rejection test',
      cv: rejectedStudent.cv,
      status: 'Forwarded',
      history: [{ status: 'Forwarded', byUserId: testCoordinator._id }],
    });

    const result = await recordCompanyDecision(
      newApp._id.toString(),
      'Rejected',
      testCoordinator._id.toString(),
      'Not a good fit'
    );
    
    assert.strictEqual(result.status, 'Rejected');
  });

  await runTest('Rejects decision for non-Forwarded applications', async () => {
    // Create unique student for non-forwarded test
    const nonForwardedStudent = await User.create({
      name: 'Non-Forwarded Student',
      email: 'nonforwarded@test.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'Engineering',
      year: 2,
      cv: {
        name: 'nonforwarded.pdf',
        path: '/uploads/nonforwarded.pdf',
        size: 12345,
        mimeType: 'application/pdf',
      },
    });

    const submittedApp = await Application.create({
      internshipId: testInternship._id,
      studentId: nonForwardedStudent._id,
      message: 'Yet another application for non-forwarded test',
      cv: nonForwardedStudent.cv,
      status: 'Submitted',
      history: [{ status: 'Submitted', byUserId: nonForwardedStudent._id }],
    });

    try {
      await recordCompanyDecision(submittedApp._id.toString(), 'Accepted', testCoordinator._id.toString());
      throw new Error('Should have rejected non-Forwarded application');
    } catch (err) {
      assert(err.message.includes('forwarded applications'));
    }
  });

  await runTest('Rejects invalid decision value', async () => {
    // Create unique student for invalid decision test
    const invalidDecisionStudent = await User.create({
      name: 'Invalid Decision Student',
      email: 'invaliddecision@test.edu',
      passwordHash: 'TestPass123!',
      role: 'student',
      active: true,
      program: 'Engineering',
      year: 2,
      cv: {
        name: 'invaliddecision.pdf',
        path: '/uploads/invaliddecision.pdf',
        size: 12345,
        mimeType: 'application/pdf',
      },
    });

    const forwardedApp = await Application.create({
      internshipId: testInternship._id,
      studentId: invalidDecisionStudent._id,
      message: 'Test message for invalid decision - this is longer than 10 characters',
      cv: invalidDecisionStudent.cv,
      status: 'Forwarded',
      history: [{ status: 'Forwarded', byUserId: testCoordinator._id }],
    });

    try {
      await recordCompanyDecision(forwardedApp._id.toString(), 'Maybe', testCoordinator._id.toString());
      throw new Error('Should have rejected invalid decision');
    } catch (err) {
      assert(err.message.includes('Accepted" or "Rejected'));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite 5: Staff Account Creation
// ═══════════════════════════════════════════════════════════════════════════

async function testStaffAccountCreation() {
  console.log('\n─── Test Suite 5: Staff Account Creation ───\n');

  await runTest('Creates instructor account', async () => {
    const userData = {
      name: 'Dr. New Instructor',
      email: 'new.instructor@test.edu',
      role: 'instructor',
      passwordHash: 'InstructorPass123!',
      department: 'Computer Science',
      active: true,
    };

    const result = await createStaffUser(userData, testAdmin._id.toString());
    
    assert(result._id, 'Should have user ID');
    assert.strictEqual(result.name, userData.name);
    assert.strictEqual(result.role, 'instructor');
    assert(!result.passwordHash, 'Should not return password hash');

    // Verify password was hashed (need to explicitly select passwordHash due to select: false)
    const user = await User.findById(result._id).select('+passwordHash');
    assert(user.passwordHash, 'Should have password hash');
    assert(user.passwordHash !== 'InstructorPass123!', 'Password should be hashed');
    assert(typeof user.passwordHash === 'string' && user.passwordHash.length > 20, 'Should have bcrypt hash');
  });

  await runTest('Creates coordinator account', async () => {
    const userData = {
      name: 'New Coordinator',
      email: 'new.coordinator@test.edu',
      role: 'coordinator',
      passwordHash: 'CoordinatorPass123!',
      active: true,
    };

    const result = await createStaffUser(userData, testAdmin._id.toString());
    assert.strictEqual(result.role, 'coordinator');
  });

  await runTest('Rejects admin role creation', async () => {
    const userData = {
      name: 'New Admin',
      email: 'new.admin@test.edu',
      role: 'admin',
      passwordHash: 'AdminPass123!',
    };

    try {
      await createStaffUser(userData, testAdmin._id.toString());
      throw new Error('Should have rejected admin role');
    } catch (err) {
      assert(err.message.includes('instructor and coordinator'));
    }
  });

  await runTest('Rejects student role creation', async () => {
    const userData = {
      name: 'New Student',
      email: 'new.student@test.edu',
      role: 'student',
      passwordHash: 'StudentPass123!',
    };

    try {
      await createStaffUser(userData, testAdmin._id.toString());
      throw new Error('Should have rejected student role');
    } catch (err) {
      assert(err.message.includes('instructor and coordinator'));
    }
  });

  await runTest('Rejects duplicate email', async () => {
    const userData = {
      name: 'Duplicate Email User',
      email: testCoordinator.email, // Existing email
      role: 'instructor',
      passwordHash: 'TestPass123!',
    };

    try {
      await createStaffUser(userData, testAdmin._id.toString());
      throw new Error('Should have rejected duplicate email');
    } catch (err) {
      assert(err.message.includes('already exists'));
      assert(err.statusCode === 409);
    }
  });

  await runTest('Rejects short password', async () => {
    const userData = {
      name: 'Short Password User',
      email: 'short@test.edu',
      role: 'instructor',
      passwordHash: 'short', // Less than 8 chars
    };

    try {
      await createStaffUser(userData, testAdmin._id.toString());
      throw new Error('Should have rejected short password');
    } catch (err) {
      assert(err.message.includes('at least 8 characters'));
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════════════════════════

async function runAllTests() {
  try {
    await setupTestDatabase();

    await testInternshipCreation();
    await testApplicationListing();
    await testApplicationForwarding();
    await testCompanyDecision();
    await testStaffAccountCreation();

    await cleanupTestDatabase();

    // Print summary
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Tests:  ${totalTests}`);
    console.log(`✓ Passed:     ${passedTests}`);
    console.log(`✗ Failed:     ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests === 0) {
      console.log('✓ All tests passed successfully!\n');
      process.exit(0);
    } else {
      console.log(`✗ ${failedTests} test(s) failed.\n`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n✗ Fatal error during test execution:');
    console.error(err);
    await cleanupTestDatabase();
    process.exit(1);
  }
}

// Run tests
runAllTests();
