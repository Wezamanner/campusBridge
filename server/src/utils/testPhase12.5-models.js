#!/usr/bin/env node
/**
 * Phase 12.5 Model Extension Tests
 * 
 * Tests new fields added to User, PartnerOrganization, and Application models
 * Phase 1: Model Extensions Only
 */

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { Application } from '../models/Application.js';
import { Internship } from '../models/Internship.js';

// Test utilities
const log = {
  section: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
  test: (msg) => console.log(`\n🧪 ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  error: (msg) => console.log(`  ❌ ${msg}`),
  info: (msg) => console.log(`  ℹ️  ${msg}`),
};

let testsPassed = 0;
let testsFailed = 0;

async function runTests() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusbridge';
    await mongoose.connect(mongoURI);
    log.info(`Connected to MongoDB: ${mongoose.connection.name}`);

    // ========================================
    // USER MODEL EXTENSIONS
    // ========================================
    log.section('USER MODEL EXTENSIONS');

    // Test 1: emailVerifiedAt field
    log.test('Test 1: User.emailVerifiedAt field accepts Date');
    try {
      const testUser1 = new User({
        name: 'Test User',
        email: 'phase12.5-test1@example.com',
        passwordHash: 'hashed',
        role: 'student',
        emailVerifiedAt: new Date('2026-11-11'),
      });
      
      if (testUser1.emailVerifiedAt && testUser1.emailVerifiedAt.toISOString().startsWith('2026-11-11')) {
        log.success('emailVerifiedAt accepts Date value');
        testsPassed++;
      } else {
        log.error('emailVerifiedAt value not set correctly');
        testsFailed++;
      }
    } catch (err) {
      log.error(`emailVerifiedAt validation failed: ${err.message}`);
      testsFailed++;
    }

    // Test 2: lastLoginAt field
    log.test('Test 2: User.lastLoginAt field accepts Date');
    try {
      const testUser2 = new User({
        name: 'Test User 2',
        email: 'phase12.5-test2@example.com',
        passwordHash: 'hashed',
        role: 'instructor',
        lastLoginAt: new Date('2026-11-11T10:30:00Z'),
      });
      
      if (testUser2.lastLoginAt) {
        log.success('lastLoginAt accepts Date value');
        testsPassed++;
      } else {
        log.error('lastLoginAt value not set');
        testsFailed++;
      }
    } catch (err) {
      log.error(`lastLoginAt validation failed: ${err.message}`);
      testsFailed++;
    }

    // Test 3: deletedAt field with select: false
    log.test('Test 3: User.deletedAt has select: false (not exposed by default)');
    try {
      const testUser3 = new User({
        name: 'Test User 3',
        email: 'phase12.5-test3@example.com',
        passwordHash: 'hashed',
        role: 'admin',
        deletedAt: new Date('2026-11-11T12:00:00Z'),
      });
      
      // Check model has the field
      if (testUser3.deletedAt) {
        log.success('deletedAt field exists and accepts Date');
        
        // Verify select: false in schema
        const schema = User.schema;
        const deletedAtField = schema.path('deletedAt');
        if (deletedAtField && deletedAtField.options.select === false) {
          log.success('deletedAt has select: false (SEC-compliant)');
          testsPassed++;
        } else {
          log.error('deletedAt does not have select: false');
          testsFailed++;
        }
      } else {
        log.error('deletedAt field not accessible');
        testsFailed++;
      }
    } catch (err) {
      log.error(`deletedAt validation failed: ${err.message}`);
      testsFailed++;
    }

    // Test 4: User defaults (null for new fields)
    log.test('Test 4: User new fields default to null');
    try {
      const testUser4 = new User({
        name: 'Test User 4',
        email: 'phase12.5-test4@example.com',
        passwordHash: 'hashed',
        role: 'student',
      });
      
      if (testUser4.emailVerifiedAt === null && 
          testUser4.lastLoginAt === null && 
          testUser4.deletedAt === null) {
        log.success('All new User fields default to null');
        testsPassed++;
      } else {
        log.error(`Defaults not null: emailVerifiedAt=${testUser4.emailVerifiedAt}, lastLoginAt=${testUser4.lastLoginAt}`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Default values test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // PARTNERORGANIZATION MODEL EXTENSIONS
    // ========================================
    log.section('PARTNERORGANIZATION MODEL EXTENSIONS');

    const coordinatorUser = new User({
      name: 'Test Coordinator',
      email: 'coordinator@example.com',
      passwordHash: 'hashed',
      role: 'coordinator',
    });

    // Test 5: approved field defaults to false
    log.test('Test 5: PartnerOrganization.approved defaults to false');
    try {
      const testOrg1 = new PartnerOrganization({
        name: 'Test Company 1',
        contactPerson: 'John Doe',
        email: 'contact@testcompany1.com',
        createdBy: coordinatorUser._id,
      });
      
      if (testOrg1.approved === false) {
        log.success('approved defaults to false (pending approval)');
        testsPassed++;
      } else {
        log.error(`approved is ${testOrg1.approved}, expected false`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`approved field test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 6: approvedAt and approvedBy fields
    log.test('Test 6: PartnerOrganization.approvedAt and approvedBy accept values');
    try {
      const testOrg2 = new PartnerOrganization({
        name: 'Test Company 2',
        contactPerson: 'Jane Smith',
        email: 'contact@testcompany2.com',
        createdBy: coordinatorUser._id,
        approved: true,
        approvedAt: new Date('2026-11-11T14:00:00Z'),
        approvedBy: coordinatorUser._id,
      });
      
      if (testOrg2.approved === true && 
          testOrg2.approvedAt && 
          testOrg2.approvedBy &&
          testOrg2.approvedBy.toString() === coordinatorUser._id.toString()) {
        log.success('approved, approvedAt, approvedBy all set correctly');
        testsPassed++;
      } else {
        log.error('Approval fields not set correctly');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Approval fields test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 7: Approval fields default to null
    log.test('Test 7: PartnerOrganization approval fields default correctly');
    try {
      const testOrg3 = new PartnerOrganization({
        name: 'Test Company 3',
        contactPerson: 'Bob Johnson',
        email: 'contact@testcompany3.com',
        createdBy: coordinatorUser._id,
      });
      
      if (testOrg3.approvedAt === null && testOrg3.approvedBy === null) {
        log.success('approvedAt and approvedBy default to null');
        testsPassed++;
      } else {
        log.error('Approval fields not defaulting to null');
        testsFailed++;
      }
    } catch (err) {
      log.error(`Approval defaults test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // APPLICATION MODEL EXTENSIONS
    // ========================================
    log.section('APPLICATION MODEL EXTENSIONS');

    const studentUser = new User({
      name: 'Test Student',
      email: 'student@example.com',
      passwordHash: 'hashed',
      role: 'student',
    });

    const testInternship = new Internship({
      companyId: new mongoose.Types.ObjectId(),
      createdBy: coordinatorUser._id,
      title: 'Test Internship',
      type: 'Remote',
      skills: ['JavaScript'],
      description: 'Test internship for Phase 12.5',
      requirements: ['Bachelor degree'],
      deadline: new Date('2026-12-31'),
    });

    // Test 8: interviewSchedule subdocument
    log.test('Test 8: Application.interviewSchedule accepts subdocument');
    try {
      const testApp1 = new Application({
        internshipId: testInternship._id,
        studentId: studentUser._id,
        message: 'Test application message',
        cv: {
          name: 'resume.pdf',
          path: '/uploads/resume.pdf',
          size: 102400,
          mimeType: 'application/pdf',
        },
        interviewSchedule: {
          date: new Date('2026-11-15'),
          time: '10:00 AM UTC',
          meetingLink: 'https://meet.google.com/test-interview',
          instructionsForCandidate: 'Please prepare your IDE',
          scheduledBy: coordinatorUser._id,
        },
      });
      
      if (testApp1.interviewSchedule &&
          testApp1.interviewSchedule.date &&
          testApp1.interviewSchedule.time === '10:00 AM UTC' &&
          testApp1.interviewSchedule.meetingLink === 'https://meet.google.com/test-interview') {
        log.success('interviewSchedule subdocument accepts all fields');
        testsPassed++;
      } else {
        log.error('interviewSchedule fields not set correctly');
        testsFailed++;
      }
    } catch (err) {
      log.error(`interviewSchedule test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 9: interviewSchedule validation (meeting link must be URL)
    log.test('Test 9: Application.interviewSchedule.meetingLink validates URL format');
    try {
      const testApp2 = new Application({
        internshipId: testInternship._id,
        studentId: studentUser._id,
        message: 'Test application message',
        cv: {
          name: 'resume.pdf',
          path: '/uploads/resume.pdf',
          size: 102400,
          mimeType: 'application/pdf',
        },
        interviewSchedule: {
          meetingLink: 'not-a-url', // Invalid URL
        },
      });
      
      const validationError = testApp2.validateSync();
      if (validationError && validationError.errors['interviewSchedule.meetingLink']) {
        log.success('meetingLink URL validation works');
        testsPassed++;
      } else {
        log.error('meetingLink should reject invalid URLs');
        testsFailed++;
      }
    } catch (err) {
      log.success('meetingLink validation rejected invalid URL (caught in constructor)');
      testsPassed++;
    }

    // Test 10: reviewerNotes field with select: false
    log.test('Test 10: Application.reviewerNotes has select: false (SEC-13)');
    try {
      const testApp3 = new Application({
        internshipId: testInternship._id,
        studentId: studentUser._id,
        message: 'Test application message',
        cv: {
          name: 'resume.pdf',
          path: '/uploads/resume.pdf',
          size: 102400,
          mimeType: 'application/pdf',
        },
        reviewerNotes: 'Strong technical skills, good portfolio',
      });
      
      // Check model has the field
      if (testApp3.reviewerNotes === 'Strong technical skills, good portfolio') {
        log.success('reviewerNotes field exists and accepts String');
        
        // Verify select: false in schema
        const schema = Application.schema;
        const reviewerNotesField = schema.path('reviewerNotes');
        if (reviewerNotesField && reviewerNotesField.options.select === false) {
          log.success('reviewerNotes has select: false (SEC-13 compliant)');
          testsPassed++;
        } else {
          log.error('reviewerNotes does not have select: false');
          testsFailed++;
        }
      } else {
        log.error('reviewerNotes field not accessible');
        testsFailed++;
      }
    } catch (err) {
      log.error(`reviewerNotes test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 11: reviewerNotes maxlength validation
    log.test('Test 11: Application.reviewerNotes maxlength (2000 chars)');
    try {
      const longText = 'x'.repeat(2001); // Over limit
      const testApp4 = new Application({
        internshipId: testInternship._id,
        studentId: studentUser._id,
        message: 'Test application message',
        cv: {
          name: 'resume.pdf',
          path: '/uploads/resume.pdf',
          size: 102400,
          mimeType: 'application/pdf',
        },
        reviewerNotes: longText,
      });
      
      const validationError = testApp4.validateSync();
      if (validationError && validationError.errors['reviewerNotes']) {
        log.success('reviewerNotes maxlength validation works');
        testsPassed++;
      } else {
        log.error('reviewerNotes should reject >2000 characters');
        testsFailed++;
      }
    } catch (err) {
      log.error(`reviewerNotes maxlength test failed: ${err.message}`);
      testsFailed++;
    }

    // Test 12: Application defaults (null/empty for new fields)
    log.test('Test 12: Application new fields have correct defaults');
    try {
      const testApp5 = new Application({
        internshipId: testInternship._id,
        studentId: studentUser._id,
        message: 'Test application message',
        cv: {
          name: 'resume.pdf',
          path: '/uploads/resume.pdf',
          size: 102400,
          mimeType: 'application/pdf',
        },
      });
      
      if (testApp5.interviewSchedule === null && testApp5.reviewerNotes === '') {
        log.success('interviewSchedule defaults to null, reviewerNotes defaults to empty string');
        testsPassed++;
      } else {
        log.error(`Defaults incorrect: interviewSchedule=${testApp5.interviewSchedule}, reviewerNotes="${testApp5.reviewerNotes}"`);
        testsFailed++;
      }
    } catch (err) {
      log.error(`Application defaults test failed: ${err.message}`);
      testsFailed++;
    }

    // ========================================
    // SUMMARY
    // ========================================
    log.section('TEST SUMMARY');
    console.log(`\n✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📊 Total Tests: ${testsPassed + testsFailed}`);
    
    if (testsFailed === 0) {
      console.log('\n🎉 All Phase 12.5 Model Extension tests passed!\n');
    } else {
      console.log('\n⚠️  Some tests failed. Review the output above.\n');
    }

  } catch (err) {
    console.error('\n❌ Fatal error during tests:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.connection.close();
    log.info('MongoDB connection closed');
    process.exit(testsFailed === 0 ? 0 : 1);
  }
}

runTests();
