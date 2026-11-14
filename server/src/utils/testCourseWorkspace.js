import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import '../server.js'; // Starts Express server

const BASE_URL = `http://localhost:${config.port}/api/v1`;

async function runCourseWorkspaceTests() {
  console.log('--- Starting CampusBridge Phase 3 Instructor Course Workspace Test Suite ---');
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
  const coordinatorEmail = `coord_p3_${timestamp}@university.edu`;
  const instructor1Email = `inst1_p3_${timestamp}@university.edu`;
  const instructor2Email = `inst2_p3_${timestamp}@university.edu`;
  const studentEmail = `stud_p3_${timestamp}@university.edu`;
  const deactivatedInstEmail = `deact_inst_p3_${timestamp}@university.edu`;

  let coordinator, instructor1, instructor2, student, deactivatedInstructor;
  let tokenCoord, tokenInst1, tokenInst2, tokenStudent, tokenDeactivated;
  let course1, course2;

  try {
    // Setup test users directly in DB
    coordinator = await User.create({
      name: 'Coordinator Jane',
      email: coordinatorEmail,
      passwordHash: 'dummy_hash',
      role: 'coordinator',
      department: 'Academic Affairs',
    });

    instructor1 = await User.create({
      name: 'Dr. Alan Turing',
      email: instructor1Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Computer Science',
    });

    instructor2 = await User.create({
      name: 'Dr. Ada Lovelace',
      email: instructor2Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Mathematics',
    });

    student = await User.create({
      name: 'Student Bob',
      email: studentEmail,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'Computer Science',
      year: 3,
    });

    deactivatedInstructor = await User.create({
      name: 'Dr. Deactivated',
      email: deactivatedInstEmail,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      active: false,
      department: 'History',
    });

    // Create courses
    const code1 = `CS${timestamp % 10000}`;
    const code2 = `MA${(timestamp + 1) % 10000}`;

    course1 = await Course.create({
      code: code1,
      title: 'Advanced Algorithms',
      description: 'Study of asymptotic analysis and graph algorithms.',
      status: 'active',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
    });

    course2 = await Course.create({
      code: code2,
      title: 'Linear Algebra',
      description: 'Matrices, vector spaces, and linear transformations.',
      status: 'active',
      instructorId: instructor2._id,
      createdBy: coordinator._id,
    });

    // Enroll student in Course 1
    await Enrollment.create({
      studentId: student._id,
      courseId: course1._id,
    });

    // Generate JWTs
    const makeToken = (user) =>
      jwt.sign({ id: user._id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: '1h' });

    tokenCoord = makeToken(coordinator);
    tokenInst1 = makeToken(instructor1);
    tokenInst2 = makeToken(instructor2);
    tokenStudent = makeToken(student);
    tokenDeactivated = makeToken(deactivatedInstructor);

    // 1. Unauthenticated request rejection
    const unauthRes = await fetch(`${BASE_URL}/courses`);
    assert(unauthRes.status === 401, 'Unauthenticated request to GET /courses returns 401');

    // 2. Deactivated instructor rejected
    const deactRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenDeactivated}` },
    });
    assert(deactRes.status === 403, 'Deactivated instructor request to GET /courses returns 403');

    // 3. Instructor 1 assigned course listing
    const inst1CoursesRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    const inst1CoursesData = await inst1CoursesRes.json();
    assert(inst1CoursesRes.status === 200, 'Instructor 1 GET /courses returns 200');
    assert(Array.isArray(inst1CoursesData.data), 'GET /courses returns data array');
    assert(
      inst1CoursesData.data.some((c) => c.id === course1._id.toString()),
      'Instructor 1 assigned course list contains course 1'
    );
    assert(
      !inst1CoursesData.data.some((c) => c.id === course2._id.toString()),
      'Instructor 1 assigned course list strictly excludes course 2 (assigned to Instructor 2)'
    );

    // 4. Verify enrolled count is computed accurately on list
    const foundCourse1 = inst1CoursesData.data.find((c) => c.id === course1._id.toString());
    assert(foundCourse1 && foundCourse1.enrolledStudentsCount === 1, 'Assigned course includes accurate enrolled count (1)');

    // 5. Instructor 2 assigned course listing
    const inst2CoursesRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenInst2}` },
    });
    const inst2CoursesData = await inst2CoursesRes.json();
    assert(
      inst2CoursesData.data.some((c) => c.id === course2._id.toString()),
      'Instructor 2 assigned course list contains course 2'
    );
    assert(
      !inst2CoursesData.data.some((c) => c.id === course1._id.toString()),
      'Instructor 2 assigned course list strictly excludes course 1'
    );

    // 6. Instructor 1 views own course details
    const course1DetailsRes = await fetch(`${BASE_URL}/courses/${course1._id}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    const course1DetailsData = await course1DetailsRes.json();
    assert(course1DetailsRes.status === 200, 'Assigned instructor can view own course details (200 OK)');
    assert(course1DetailsData.data.code === code1, 'Course details contains correct course code');
    assert(course1DetailsData.data.title === 'Advanced Algorithms', 'Course details contains correct title');
    assert(Array.isArray(course1DetailsData.data.enrolledStudents), 'Course details includes enrolled students array');
    assert(course1DetailsData.data.enrolledStudents.length === 1, 'Enrolled students array has 1 student');
    assert(
      course1DetailsData.data.enrolledStudents[0].email === studentEmail,
      'Authorized enrolled student email matches enrolled student'
    );
    assert(
      !course1DetailsData.data.enrolledStudents[0].passwordHash,
      'Enrolled student object never exposes passwordHash'
    );

    // 7. Security Rule 3: Instructor 1 CANNOT access Instructor 2 course details
    const crossCourseRes = await fetch(`${BASE_URL}/courses/${course2._id}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    const crossCourseData = await crossCourseRes.json();
    assert(
      crossCourseRes.status === 403,
      'Instructor 1 accessing course 2 returns 403 Forbidden (cross-instructor access prevented)'
    );
    assert(
      crossCourseData.success === false,
      'Forbidden response includes success: false'
    );

    // 8. Missing course ID returns 404
    const nonExistentId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/courses/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(notFoundRes.status === 404, 'Non-existent course ID returns 404 Not Found');

    // 9. Malformed course ID returns 400
    const malformedRes = await fetch(`${BASE_URL}/courses/invalid-object-id-123`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(malformedRes.status === 400, 'Malformed course ID returns 400 Bad Request');

    // 10. Coordinator can access course details
    const coordRes = await fetch(`${BASE_URL}/courses/${course1._id}`, {
      headers: { Authorization: `Bearer ${tokenCoord}` },
    });
    assert(coordRes.status === 200, 'Coordinator can view course details (200 OK)');

    // 11. Student catalog view shows isEnrolled flag correctly
    const studentCoursesRes = await fetch(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const studentCoursesData = await studentCoursesRes.json();
    assert(studentCoursesRes.status === 200, 'Student catalog query returns 200');
    const studCourse1 = studentCoursesData.data.find((c) => c.id === course1._id.toString());
    const studCourse2 = studentCoursesData.data.find((c) => c.id === course2._id.toString());
    assert(studCourse1 && studCourse1.isEnrolled === true, 'Student catalog correctly flags enrolled course as isEnrolled: true');
    assert(studCourse2 && studCourse2.isEnrolled === false, 'Student catalog correctly flags non-enrolled course as isEnrolled: false');

    // 12. Search filter works
    const searchRes = await fetch(`${BASE_URL}/courses?search=${code1}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && searchData.data.length === 1, 'Search query successfully filters assigned courses');

  } catch (err) {
    console.error('Test execution error:', err);
    assert(false, `Unexpected error during test execution: ${err.message}`);
  } finally {
    // Cleanup test data
    try {
      if (course1) await Course.deleteOne({ _id: course1._id });
      if (course2) await Course.deleteOne({ _id: course2._id });
      if (coordinator) await User.deleteOne({ _id: coordinator._id });
      if (instructor1) await User.deleteOne({ _id: instructor1._id });
      if (instructor2) await User.deleteOne({ _id: instructor2._id });
      if (student) {
        await Enrollment.deleteMany({ studentId: student._id });
        await User.deleteOne({ _id: student._id });
      }
      if (deactivatedInstructor) await User.deleteOne({ _id: deactivatedInstructor._id });
    } catch {
      // Ignore cleanup error
    }

    console.log('\n======================================================');
    console.log(`Test Execution Finished: ${results.passed} Passed, ${results.failed} Failed`);
    console.log('======================================================\n');
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

runCourseWorkspaceTests();
