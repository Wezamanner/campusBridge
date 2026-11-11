import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import '../server.js'; // Starts Express server

const BASE_URL = `http://localhost:${config.port}/api/v1`;

async function runStudentEnrollmentTests() {
  console.log('--- Starting CampusBridge Phase 4 Student Course Browsing & Enrollment Test Suite ---');
  await connectDB();
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
  const coordinatorEmail = `coord_p4_${timestamp}@university.edu`;
  const instructorEmail = `inst_p4_${timestamp}@university.edu`;
  const student1Email = `student1_p4_${timestamp}@university.edu`;
  const student2Email = `student2_p4_${timestamp}@university.edu`;

  let coordinator, instructor, student1, student2;
  let tokenStudent1, tokenStudent2, tokenInstructor;
  let activeCourse, archivedCourse, concurrentCourse;

  try {
    // 1. Setup test users
    coordinator = await User.create({
      name: 'Coordinator Academic',
      email: coordinatorEmail,
      passwordHash: 'dummy_hash',
      role: 'coordinator',
      department: 'Dean Office',
    });

    instructor = await User.create({
      name: 'Prof. Donald Knuth',
      email: instructorEmail,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Computer Science',
    });

    student1 = await User.create({
      name: 'Alice Cooper',
      email: student1Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'Computer Science',
      year: 2,
    });

    student2 = await User.create({
      name: 'Bob Marley',
      email: student2Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'Information Systems',
      year: 3,
    });

    const codeActive = `CS${timestamp % 10000}`;
    const codeArchived = `AR${(timestamp + 1) % 10000}`;

    // 2. Setup active and archived courses
    activeCourse = await Course.create({
      code: codeActive,
      title: 'Operating Systems & Concurrency',
      description: 'Processes, threads, memory management, and file systems.',
      status: 'active',
      instructorId: instructor._id,
      createdBy: coordinator._id,
    });

    archivedCourse = await Course.create({
      code: codeArchived,
      title: 'Legacy Assembler 1980',
      description: 'Archived course module no longer offered.',
      status: 'archived',
      instructorId: instructor._id,
      createdBy: coordinator._id,
    });

    const makeToken = (user) =>
      jwt.sign({ id: user._id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: '1h' });

    tokenStudent1 = makeToken(student1);
    tokenStudent2 = makeToken(student2);
    tokenInstructor = makeToken(instructor);

    // TEST 1: Unauthenticated enrollment rejection
    const unauthRes = await fetch(`${BASE_URL}/courses/${activeCourse._id}/enroll`, {
      method: 'POST',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request to POST /courses/:id/enroll returns 401');

    // TEST 2: Role authorization - Non-students cannot enroll
    const instEnrollRes = await fetch(`${BASE_URL}/courses/${activeCourse._id}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInstructor}` },
    });
    assert(instEnrollRes.status === 403, 'Instructor attempting to enroll receives 403 Forbidden (student role only)');

    // TEST 3: Student course catalog visibility (active courses only)
    const catalogRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const catalogData = await catalogRes.json();
    assert(catalogRes.status === 200, 'Student catalog query returns 200');
    assert(
      catalogData.data.some((c) => c.id === activeCourse._id.toString()),
      'Student catalog contains active course'
    );
    assert(
      !catalogData.data.some((c) => c.id === archivedCourse._id.toString()),
      'Student catalog strictly excludes archived courses'
    );

    // Verify initial isEnrolled is false for student1
    const initialActive = catalogData.data.find((c) => c.id === activeCourse._id.toString());
    assert(initialActive && initialActive.isEnrolled === false, 'Initial enrollment state for student is isEnrolled: false');
    assert(initialActive.instructor?.name === 'Prof. Donald Knuth', 'Student catalog exposes instructor name');
    assert(initialActive.instructor?.email === undefined, 'Student catalog instructor strictly omits email per student-api-spec 2.1');
    assert(initialActive.instructor?.department === undefined, 'Student catalog instructor strictly omits department per student-api-spec 2.1');

    // TEST 4: Student views course details
    const courseDetailsRes = await fetch(`${BASE_URL}/courses/${activeCourse._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const courseDetailsData = await courseDetailsRes.json();
    assert(courseDetailsRes.status === 200, 'Student can view course details (200 OK)');
    assert(courseDetailsData.data.code === codeActive, 'Course details contains correct course code');
    assert(courseDetailsData.data.isEnrolled === false, 'Course details indicates student is not enrolled yet');
    assert(courseDetailsData.data.instructor?.name === 'Prof. Donald Knuth', 'Course details exposes instructor name');
    assert(courseDetailsData.data.instructor?.email === instructorEmail, 'Course details exposes instructor email per student-api-spec 2.2');
    assert(courseDetailsData.data.instructor?.department === undefined, 'Course details strictly omits instructor department per student-api-spec 2.2');
    assert(
      courseDetailsData.data.enrolledStudents === undefined,
      'Student view of course details strictly hides other students roster (privacy guard)'
    );

    // TEST 5: Successful student enrollment (FR-05)
    const enrollRes = await fetch(`${BASE_URL}/courses/${activeCourse._id}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const enrollData = await enrollRes.json();
    assert(enrollRes.status === 201, 'Student 1 successful enrollment returns 201 Created');
    assert(enrollData.success === true, 'Enrollment response indicates success: true');
    assert(enrollData.data.courseId === activeCourse._id.toString(), 'Returned enrollment record has correct courseId');
    assert(enrollData.data.studentId === student1._id.toString(), 'Returned enrollment record has correct studentId');

    // Verify DB enrollment record actually exists
    const dbEnrollment = await Enrollment.findOne({
      studentId: student1._id,
      courseId: activeCourse._id,
    });
    assert(dbEnrollment !== null, 'Enrollment record successfully persisted in MongoDB');

    // TEST 6: Duplicate enrollment prevention (409 Conflict)
    const dupRes = await fetch(`${BASE_URL}/courses/${activeCourse._id}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, 'Duplicate enrollment attempt returns 409 Conflict');
    assert(dupData.success === false, 'Duplicate enrollment response has success: false');

    // TEST 7: Catalog reflects updated isEnrolled state
    const updatedCatalogRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const updatedCatalogData = await updatedCatalogRes.json();
    const updatedActive = updatedCatalogData.data.find((c) => c.id === activeCourse._id.toString());
    assert(updatedActive && updatedActive.isEnrolled === true, 'Catalog query now reflects isEnrolled: true for student 1');

    // Verify student 2 still sees isEnrolled: false (student isolation)
    const stud2CatalogRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    const stud2CatalogData = await stud2CatalogRes.json();
    const stud2Active = stud2CatalogData.data.find((c) => c.id === activeCourse._id.toString());
    assert(stud2Active && stud2Active.isEnrolled === false, 'Student 2 catalog shows isEnrolled: false (per-student isolation)');

    // TEST 8: Enrollment in archived course rejected
    const archivedEnrollRes = await fetch(`${BASE_URL}/courses/${archivedCourse._id}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(archivedEnrollRes.status === 400, 'Attempting to enroll in archived course returns 400 Bad Request');

    // TEST 9: Malformed course ID returns 400
    const malformedRes = await fetch(`${BASE_URL}/courses/bad-id-123/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(malformedRes.status === 400, 'Malformed course ID returns 400 Bad Request');

    // TEST 10: Non-existent course ID returns 404
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/courses/${nonExistentId}/enroll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(notFoundRes.status === 404, 'Non-existent course ID returns 404 Not Found');

    // TEST 11: Concurrent duplicate enrollment race condition handling
    const concurrentCourse = await Course.create({
      code: `CC${(timestamp + 2) % 10000}`,
      title: 'Concurrent Programming Lab',
      description: 'Race condition testing.',
      status: 'active',
      instructorId: instructor._id,
      createdBy: coordinator._id,
    });

    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${BASE_URL}/courses/${concurrentCourse._id}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStudent2}` },
      }),
      fetch(`${BASE_URL}/courses/${concurrentCourse._id}/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStudent2}` },
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      'Concurrent enrollment requests safely result in exactly one 201 Created and one 409 Conflict'
    );
    const concurrentCount = await Enrollment.countDocuments({
      studentId: student2._id,
      courseId: concurrentCourse._id,
    });
    assert(concurrentCount === 1, 'MongoDB contains exactly 1 enrollment record despite race condition');

  } catch (err) {
    console.error('Test execution error:', err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    // Cleanup test data
    try {
      if (activeCourse) {
        await Enrollment.deleteMany({ courseId: activeCourse._id });
        await Course.deleteOne({ _id: activeCourse._id });
      }
      if (archivedCourse) {
        await Course.deleteOne({ _id: archivedCourse._id });
      }
      if (concurrentCourse) {
        await Enrollment.deleteMany({ courseId: concurrentCourse._id });
        await Course.deleteOne({ _id: concurrentCourse._id });
      }
      if (student1) await User.deleteOne({ _id: student1._id });
      if (student2) {
        await Enrollment.deleteMany({ studentId: student2._id });
        await User.deleteOne({ _id: student2._id });
      }
      if (instructor) await User.deleteOne({ _id: instructor._id });
      if (coordinator) await User.deleteOne({ _id: coordinator._id });
    } catch {
      // Ignore cleanup error
    }

    console.log('\n======================================================');
    console.log(`Test Execution Finished: ${results.passed} Passed, ${results.failed} Failed`);
    console.log('======================================================\n');
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

runStudentEnrollmentTests();
