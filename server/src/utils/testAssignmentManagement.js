import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Assignment } from '../models/Assignment.js';
import '../server.js'; // Starts Express server

const BASE_URL = `http://localhost:${config.port}/api/v1`;

async function runAssignmentTests() {
  console.log('--- Starting CampusBridge Phase 6 Assignment Management Test Suite ---');
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
  const coordinatorEmail = `coord_p6_${timestamp}@university.edu`;
  const instructor1Email = `inst1_p6_${timestamp}@university.edu`;
  const instructor2Email = `inst2_p6_${timestamp}@university.edu`;
  const student1Email = `stud1_p6_${timestamp}@university.edu`;
  const student2Email = `stud2_p6_${timestamp}@university.edu`;

  let coordinator, instructor1, instructor2, student1, student2;
  let tokenCoord, tokenInst1, tokenInst2, tokenStudent1, tokenStudent2;
  let activeCourse1, activeCourse2, archivedCourse;
  let createdAssignment1, createdAssignment2;

  try {
    // 1. Setup test users
    coordinator = await User.create({
      name: 'Coordinator Academic',
      email: coordinatorEmail,
      passwordHash: 'dummy_hash',
      role: 'coordinator',
      department: 'Dean Office',
    });

    instructor1 = await User.create({
      name: 'Prof. Donald Knuth',
      email: instructor1Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Computer Science',
    });

    instructor2 = await User.create({
      name: 'Dr. Grace Hopper',
      email: instructor2Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Electrical Engineering',
    });

    student1 = await User.create({
      name: 'Enrolled Student',
      email: student1Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'BS Computer Science',
      year: 3,
    });

    student2 = await User.create({
      name: 'Unenrolled Student',
      email: student2Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'BS Data Science',
      year: 2,
    });

    // Generate JWTs
    tokenCoord = jwt.sign({ id: coordinator._id, role: coordinator.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenInst1 = jwt.sign({ id: instructor1._id, role: instructor1.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenInst2 = jwt.sign({ id: instructor2._id, role: instructor2.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenStudent1 = jwt.sign({ id: student1._id, role: student1.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenStudent2 = jwt.sign({ id: student2._id, role: student2.role }, config.jwtSecret, { expiresIn: '1h' });

    // 2. Setup Courses
    const code1 = `CS${Math.floor(1000 + Math.random() * 8999)}`;
    const code2 = `EE${Math.floor(1000 + Math.random() * 8999)}`;
    const codeArch = `CS${Math.floor(1000 + Math.random() * 8999)}`;

    activeCourse1 = await Course.create({
      code: code1,
      title: 'Distributed Systems & Cloud Computing',
      description: 'Distributed architectures, consensus, RPC, and cloud computing principles.',
      status: 'active',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
    });

    activeCourse2 = await Course.create({
      code: code2,
      title: 'Digital Signal Processing',
      description: 'Signals, transforms, filters, and digital applications.',
      status: 'active',
      instructorId: instructor2._id,
      createdBy: coordinator._id,
    });

    archivedCourse = await Course.create({
      code: codeArch,
      title: 'Legacy Computing Systems',
      description: 'Archived coursework from previous semester.',
      status: 'archived',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
    });

    // 3. Setup Enrollment (student1 in activeCourse1)
    await Enrollment.create({
      studentId: student1._id,
      courseId: activeCourse1._id,
      enrolledAt: new Date(),
    });

    // Future deadline helper (3 days ahead)
    const futureDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // ----------------------------------------------------
    // Section 1: Authentication & Authorization (401 / 403)
    // ----------------------------------------------------
    console.log('\n--- Section 1: Auth & Authorization ---');

    // Test 1: Unauthenticated POST returns 401
    const unauthPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Lab 1', description: 'Test', deadline: futureDeadline }),
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /courses/:id/assignments returns 401');

    // Test 2: Unauthenticated GET /assignments returns 401
    const unauthGet = await fetch(`${BASE_URL}/assignments`);
    assert(unauthGet.status === 401, 'Unauthenticated GET /assignments returns 401');

    // Test 3: Student calling POST returns 403 Forbidden
    const studentPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent1}`,
      },
      body: JSON.stringify({ title: 'Student Assignment', description: 'Test', deadline: futureDeadline }),
    });
    assert(studentPost.status === 403, 'Student calling POST /courses/:id/assignments returns 403');

    // Test 4: Coordinator calling POST returns 403 Forbidden
    const coordPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCoord}`,
      },
      body: JSON.stringify({ title: 'Coord Assignment', description: 'Test', deadline: futureDeadline }),
    });
    assert(coordPost.status === 403, 'Coordinator calling POST /courses/:id/assignments returns 403');

    // Test 5: Non-assigned instructor (instructor2) creating assignment on instructor1 course returns 403
    const nonAssignedPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst2}`,
      },
      body: JSON.stringify({ title: 'Malicious Assignment', description: 'Test', deadline: futureDeadline }),
    });
    assert(nonAssignedPost.status === 403, 'Non-assigned instructor creating assignment returns 403 Forbidden');

    // ----------------------------------------------------
    // Section 2: Course Status & ID Validation
    // ----------------------------------------------------
    console.log('\n--- Section 2: Course Validation & Lifecycle Protection ---');

    // Test 6: Creating assignment on archived course returns 400
    const archivedPost = await fetch(`${BASE_URL}/courses/${archivedCourse._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Archived Lab', description: 'Test', deadline: futureDeadline }),
    });
    assert(archivedPost.status === 400, 'Creating assignment on archived course returns 400 Bad Request');

    // Test 7: Malformed course ID returns 400
    const malformedCoursePost = await fetch(`${BASE_URL}/courses/not-a-valid-id/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Lab', description: 'Test', deadline: futureDeadline }),
    });
    assert(malformedCoursePost.status === 400, 'Malformed course ID returns 400 Bad Request');

    // Test 8: Non-existent course ID returns 404
    const fakeId = new mongoose.Types.ObjectId();
    const notFoundCoursePost = await fetch(`${BASE_URL}/courses/${fakeId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Lab', description: 'Test', deadline: futureDeadline }),
    });
    assert(notFoundCoursePost.status === 404, 'Non-existent course ID returns 404 Not Found');

    // ----------------------------------------------------
    // Section 3: Payload Validation (FR-06)
    // ----------------------------------------------------
    console.log('\n--- Section 3: Assignment Field Validation ---');

    // Test 9: Missing title returns 400
    const noTitleRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ description: 'No title', deadline: futureDeadline }),
    });
    assert(noTitleRes.status === 400, 'Missing title returns 400 Bad Request');

    // Test 10: Title < 3 characters returns 400
    const shortTitleRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'ab', description: 'Valid desc', deadline: futureDeadline }),
    });
    assert(shortTitleRes.status === 400, 'Title < 3 chars returns 400 Bad Request');

    // Test 11: Missing description returns 400
    const noDescRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: '   ', deadline: futureDeadline }),
    });
    assert(noDescRes.status === 400, 'Empty description returns 400 Bad Request');

    // Test 12: Missing deadline returns 400
    const noDeadlineRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Valid desc' }),
    });
    assert(noDeadlineRes.status === 400, 'Missing deadline returns 400 Bad Request');

    // Test 13: Past deadline returns 400
    const pastDeadlineRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Valid desc', deadline: pastDeadline }),
    });
    assert(pastDeadlineRes.status === 400, 'Past deadline returns 400 Bad Request');

    // Test 14: Invalid date format returns 400
    const invalidDateRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Valid desc', deadline: 'invalid-date' }),
    });
    assert(invalidDateRes.status === 400, 'Invalid deadline format returns 400 Bad Request');

    // Test 15: maxScore < 1 returns 400
    const lowScoreRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Valid desc', deadline: futureDeadline, maxScore: 0 }),
    });
    assert(lowScoreRes.status === 400, 'maxScore < 1 returns 400 Bad Request');

    // Test 16: maxScore > 100 returns 400
    const highScoreRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({ title: 'Valid Title', description: 'Valid desc', deadline: futureDeadline, maxScore: 101 }),
    });
    assert(highScoreRes.status === 400, 'maxScore > 100 returns 400 Bad Request');

    // ----------------------------------------------------
    // Section 4: Successful Creation (201 Created)
    // ----------------------------------------------------
    console.log('\n--- Section 4: Assignment Creation Success ---');

    // Test 17: Valid creation with default score & late policy
    const createRes1 = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({
        title: 'Lab 1: REST API with Express',
        description: 'Build an Express API with CRUD endpoints and Mongoose schemas.',
        deadline: futureDeadline,
      }),
    });
    assert(createRes1.status === 201, 'Assigned instructor successfully creates assignment (201 Created)');
    const body1 = await createRes1.json();
    assert(body1.success === true, 'Response success is true');
    assert(body1.data.title === 'Lab 1: REST API with Express', 'Created assignment title matches input');
    assert(body1.data.maxScore === 100, 'Default maxScore is 100');
    assert(body1.data.allowLate === false, 'Default allowLate is false');
    assert(body1.data.courseId === activeCourse1._id.toString(), 'Response contains correct courseId string');
    assert(body1.pagination === null, 'Pagination is null');
    createdAssignment1 = body1.data;

    // Test 18: Valid creation with custom maxScore and allowLate = true
    const createRes2 = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInst1}`,
      },
      body: JSON.stringify({
        title: 'Project 1: Microservices Architecture',
        description: 'Design and deploy a containerized microservice.',
        deadline: futureDeadline,
        maxScore: 50,
        allowLate: true,
      }),
    });
    assert(createRes2.status === 201, 'Second assignment created with custom score and allowLate: true');
    const body2 = await createRes2.json();
    assert(body2.data.maxScore === 50, 'Custom maxScore is 50');
    assert(body2.data.allowLate === true, 'Custom allowLate is true');
    createdAssignment2 = body2.data;

    // ----------------------------------------------------
    // Section 5: List Assignments (GET /api/v1/assignments)
    // ----------------------------------------------------
    console.log('\n--- Section 5: List Assignments ---');

    // Test 19: Instructor 1 lists assignments across assigned courses
    const listInst1Res = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(listInst1Res.status === 200, 'Instructor 1 lists assignments (200 OK)');
    const listInst1Body = await listInst1Res.json();
    assert(Array.isArray(listInst1Body.data), 'Assignments data is an array');
    assert(listInst1Body.data.length >= 2, 'Instructor 1 receives at least 2 assignments');

    // Test 20: Instructor 1 queries by courseId
    const filterRes = await fetch(`${BASE_URL}/assignments?courseId=${activeCourse1._id}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(filterRes.status === 200, 'Instructor 1 queries with ?courseId (200 OK)');
    const filterBody = await filterRes.json();
    assert(filterBody.data.length >= 2, 'Filtered assignments match course');

    // Test 21: Instructor 2 querying instructor 1 course returns 403 Forbidden
    const unauthFilterRes = await fetch(`${BASE_URL}/assignments?courseId=${activeCourse1._id}`, {
      headers: { Authorization: `Bearer ${tokenInst2}` },
    });
    assert(unauthFilterRes.status === 403, 'Instructor 2 querying Instructor 1 course assignments returns 403');

    // Test 22: Student querying assignments in Phase 6 receives 403 Forbidden (Phase 7 activates student viewing)
    const studentListRes = await fetch(`${BASE_URL}/assignments?courseId=${activeCourse1._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(studentListRes.status === 403, 'Student querying assignments in Phase 6 returns 403 Forbidden (FR-07 isolation)');

    // Test 23: Student querying assignments without filter in Phase 6 receives 403 Forbidden
    const studentListNoFilterRes = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(studentListNoFilterRes.status === 403, 'Student listing assignments in Phase 6 returns 403 Forbidden (FR-07 isolation)');

    // Test 24: Coordinator querying assignments receives 403 Forbidden (unauthorized role)
    const coordListRes = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenCoord}` },
    });
    assert(coordListRes.status === 403, 'Coordinator listing assignments returns 403 Forbidden (role not authorized per contract)');

    // ----------------------------------------------------
    // Section 6: Single Assignment Details (GET /assignments/:id)
    // ----------------------------------------------------
    console.log('\n--- Section 6: Single Assignment Details ---');

    // Test 25: Instructor 1 gets details of their assignment
    const detailRes = await fetch(`${BASE_URL}/assignments/${createdAssignment1.id}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(detailRes.status === 200, 'Assigned instructor retrieves assignment details (200 OK)');
    const detailBody = await detailRes.json();
    assert(detailBody.data.id === createdAssignment1.id, 'Retrieved assignment ID matches');
    assert(detailBody.data.title === createdAssignment1.title, 'Retrieved title matches');
    assert(detailBody.data.description === 'Build an Express API with CRUD endpoints and Mongoose schemas.', 'Retrieved description matches');

    // Test 26: Instructor 2 getting details of instructor 1 assignment returns 403 Forbidden
    const unauthDetailRes = await fetch(`${BASE_URL}/assignments/${createdAssignment1.id}`, {
      headers: { Authorization: `Bearer ${tokenInst2}` },
    });
    assert(unauthDetailRes.status === 403, 'Unauthorized instructor viewing assignment details returns 403');

    // Test 27: Student viewing assignment details in Phase 6 receives 403 Forbidden (Phase 7 activates student viewing)
    const studentDetailRes = await fetch(`${BASE_URL}/assignments/${createdAssignment1.id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(studentDetailRes.status === 403, 'Student viewing assignment details in Phase 6 returns 403 Forbidden (FR-07 isolation)');

    // Test 28: Coordinator viewing assignment details receives 403 Forbidden (unauthorized role)
    const coordDetailRes = await fetch(`${BASE_URL}/assignments/${createdAssignment1.id}`, {
      headers: { Authorization: `Bearer ${tokenCoord}` },
    });
    assert(coordDetailRes.status === 403, 'Coordinator viewing assignment details returns 403 Forbidden (role not authorized per contract)');

    // Test 29: Malformed assignment ID returns 400
    const malformedAssignRes = await fetch(`${BASE_URL}/assignments/invalid-id`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(malformedAssignRes.status === 400, 'Malformed assignment ID returns 400 Bad Request');

    // Test 30: Non-existent assignment ID returns 404
    const notFoundAssignRes = await fetch(`${BASE_URL}/assignments/${fakeId}`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(notFoundAssignRes.status === 404, 'Non-existent assignment ID returns 404 Not Found');

    // ----------------------------------------------------
    // Section 7: Contract Boundary & Unsupported Endpoint Verification
    // ----------------------------------------------------
    console.log('\n--- Section 7: Contract Boundary Verification ---');

    // Test 31: GET /courses/:id/assignments is NOT an approved route (should return 404/405, not 200)
    const courseRouteRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/assignments`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(courseRouteRes.status === 404, 'GET /courses/:id/assignments is rejected (unsupported endpoint alias strictly removed)');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    results.failed++;
    results.details.push(`❌ ERROR: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`Test Execution Finished: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAssignmentTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
