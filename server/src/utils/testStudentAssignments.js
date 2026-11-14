import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Grade } from '../models/Grade.js';
import { submissionsDir } from '../middleware/upload.js';
import '../server.js'; // Starts Express server on PORT

const BASE_URL = `http://localhost:${config.port}/api/v1`;

async function runStudentAssignmentTests() {
  console.log('--- Starting CampusBridge Phase 7 Student Assignment & Submission Test Suite ---');
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
  const inst1Email = `inst1_p7_${timestamp}@university.edu`;
  const inst2Email = `inst2_p7_${timestamp}@university.edu`;
  const student1Email = `stud1_p7_${timestamp}@university.edu`;
  const student2Email = `stud2_p7_${timestamp}@university.edu`;
  const coordEmail = `coord_p7_${timestamp}@university.edu`;

  let instructor1, instructor2, student1, student2, coordinator;
  let tokenInst1, tokenInst2, tokenStudent1, tokenStudent2, tokenCoord;
  let course1, course2;
  let assignmentNormal, assignmentLateAllowed, assignmentPastDue;

  try {
    // 1. Setup users
    instructor1 = await User.create({
      name: 'Dr. Ada Lovelace',
      email: inst1Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Computer Science',
    });

    instructor2 = await User.create({
      name: 'Dr. Alan Turing',
      email: inst2Email,
      passwordHash: 'dummy_hash',
      role: 'instructor',
      department: 'Mathematics',
    });

    student1 = await User.create({
      name: 'Enrolled Alice',
      email: student1Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'BS CS',
      year: 3,
    });

    student2 = await User.create({
      name: 'Unenrolled Bob',
      email: student2Email,
      passwordHash: 'dummy_hash',
      role: 'student',
      program: 'BS CS',
      year: 2,
    });

    coordinator = await User.create({
      name: 'Coord Charlie',
      email: coordEmail,
      passwordHash: 'dummy_hash',
      role: 'coordinator',
      department: 'Academic Office',
    });

    // JWT tokens
    tokenInst1 = jwt.sign({ id: instructor1._id, role: instructor1.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenInst2 = jwt.sign({ id: instructor2._id, role: instructor2.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenStudent1 = jwt.sign({ id: student1._id, role: student1.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenStudent2 = jwt.sign({ id: student2._id, role: student2.role }, config.jwtSecret, { expiresIn: '1h' });
    tokenCoord = jwt.sign({ id: coordinator._id, role: coordinator.role }, config.jwtSecret, { expiresIn: '1h' });

    // 2. Setup Courses
    course1 = await Course.create({
      code: `CS${Math.floor(1000 + Math.random() * 8999)}`,
      title: 'Full-Stack Web Architecture',
      description: 'Comprehensive course on web platforms.',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
      status: 'active',
    });

    course2 = await Course.create({
      code: `CS${Math.floor(1000 + Math.random() * 8999)}`,
      title: 'Discrete Structures',
      description: 'Foundations of computer science.',
      instructorId: instructor2._id,
      createdBy: coordinator._id,
      status: 'active',
    });

    // 3. Enroll student1 in course1 ONLY
    await Enrollment.create({
      studentId: student1._id,
      courseId: course1._id,
    });

    // 4. Create assignments
    // Normal assignment due tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    assignmentNormal = await Assignment.create({
      courseId: course1._id,
      createdBy: instructor1._id,
      title: 'Assignment 1: REST API Backend',
      description: 'Implement Express REST API with Mongoose schemas.',
      deadline: tomorrow,
      maxScore: 100,
      allowLate: false,
    });

    // Late allowed assignment (set deadline in past via updateOne to simulate passed deadline)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    assignmentLateAllowed = await Assignment.create({
      courseId: course1._id,
      createdBy: instructor1._id,
      title: 'Assignment 2: Database Modeling',
      description: 'Design ER diagrams and schemas.',
      deadline: tomorrow,
      maxScore: 50,
      allowLate: true,
    });
    await Assignment.updateOne({ _id: assignmentLateAllowed._id }, { $set: { deadline: yesterday } });

    // Past due assignment without late submission (deadline in past via updateOne)
    assignmentPastDue = await Assignment.create({
      courseId: course1._id,
      createdBy: instructor1._id,
      title: 'Assignment 3: Strict Deadline Quiz',
      description: 'Timely submission required.',
      deadline: tomorrow,
      maxScore: 25,
      allowLate: false,
    });
    await Assignment.updateOne({ _id: assignmentPastDue._id }, { $set: { deadline: yesterday } });

    // ==========================================
    // GROUP 1: AUTHENTICATION & ROLE AUTHORIZATION
    // ==========================================
    console.log('\n--- Group 1: Authentication & Role Authorization ---');

    // Test 1: Unauthenticated listing returns 401
    const unauthList = await fetch(`${BASE_URL}/assignments`);
    assert(unauthList.status === 401, 'Unauthenticated GET /api/v1/assignments returns 401');

    // Test 2: Unauthenticated view returns 401
    const unauthView = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}`);
    assert(unauthView.status === 401, 'Unauthenticated GET /api/v1/assignments/:id returns 401');

    // Test 3: Unauthenticated submission returns 401
    const unauthSubmit = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      body: JSON.stringify({ text: 'test' }),
    });
    assert(unauthSubmit.status === 401, 'Unauthenticated POST /api/v1/assignments/:id/submissions returns 401');

    // Test 4: Unauthenticated download returns 401
    const unauthDownload = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submission/download`);
    assert(unauthDownload.status === 401, 'Unauthenticated GET /api/v1/assignments/:id/submission/download returns 401');

    // Test 5: Instructor/Coordinator attempting to submit returns 403 (student only)
    const instSubmit = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'instructor response' }),
    });
    assert(instSubmit.status === 403, 'Instructor POST /api/v1/assignments/:id/submissions returns 403 Forbidden');

    const coordSubmit = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCoord}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'coordinator response' }),
    });
    assert(coordSubmit.status === 403, 'Coordinator POST /api/v1/assignments/:id/submissions returns 403 Forbidden');

    // ==========================================
    // GROUP 2: STUDENT ASSIGNMENT LISTING (GET /assignments)
    // ==========================================
    console.log('\n--- Group 2: Student Assignment Listing ---');

    // Test 6: Enrolled student listing assignments
    const listRes1 = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const listData1 = await listRes1.json();
    assert(listRes1.status === 200, 'Enrolled student GET /api/v1/assignments returns 200');
    assert(Array.isArray(listData1.data) && listData1.data.length === 3, 'Enrolled student retrieves all 3 assignments for enrolled course');
    assert(
      listData1.data[0].submissionStatus === 'Not Submitted',
      'Unsubmitted assignment has submissionStatus === "Not Submitted"'
    );
    assert(Boolean(listData1.data[0].courseCode), 'Assignment includes courseCode');

    // Test 7: Filter by enrolled courseId
    const listFilter = await fetch(`${BASE_URL}/assignments?courseId=${course1._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(listFilter.status === 200, 'Student filtering by enrolled courseId returns 200');

    // Test 8: Filter by course where student is NOT enrolled -> 403
    const listUnenrolledFilter = await fetch(`${BASE_URL}/assignments?courseId=${course2._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(listUnenrolledFilter.status === 403, 'Student querying assignments for non-enrolled course returns 403');

    // Test 9: Unenrolled student listing assignments gets empty list
    const listRes2 = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    const listData2 = await listRes2.json();
    assert(listRes2.status === 200 && listData2.data.length === 0, 'Unenrolled student retrieves empty assignments list');

    // ==========================================
    // GROUP 3: STUDENT VIEW ASSIGNMENT DETAILS (GET /assignments/:id)
    // ==========================================
    console.log('\n--- Group 3: View Assignment Details ---');

    // Test 10: Enrolled student viewing assignment details (unsubmitted)
    const viewRes1 = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const viewData1 = await viewRes1.json();
    assert(viewRes1.status === 200, 'Enrolled student viewing assignment details returns 200');
    assert(viewData1.data.id === assignmentNormal._id.toString(), 'Assignment id matches');
    assert(viewData1.data.submission === null, 'Unsubmitted assignment returns submission: null');

    // Test 11: Unenrolled student viewing assignment details returns 403
    const viewUnenrolled = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(viewUnenrolled.status === 403, 'Unenrolled student viewing assignment returns 403 Forbidden');

    // Test 12: Invalid assignment id returns 400
    const viewInvalidId = await fetch(`${BASE_URL}/assignments/invalid-id-format`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(viewInvalidId.status === 400, 'Invalid assignment ID returns 400 Bad Request');

    // Test 13: Non-existent assignment id returns 404
    const fakeId = new mongoose.Types.ObjectId();
    const viewNotFound = await fetch(`${BASE_URL}/assignments/${fakeId}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(viewNotFound.status === 404, 'Non-existent assignment returns 404 Not Found');

    // ==========================================
    // GROUP 4: SUBMISSION VALIDATIONS & DEADLINES
    // ==========================================
    console.log('\n--- Group 4: Submission Validations & Deadlines ---');

    // Test 14: Submitting without text and without file returns 400
    const emptyForm = new FormData();
    const emptyRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: emptyForm,
    });
    assert(emptyRes.status === 400, 'Submitting without text or file returns 400 Bad Request');

    // Test 15: Submitting to course where student is NOT enrolled returns 403
    const unenrolledSubForm = new FormData();
    unenrolledSubForm.append('text', 'My homework solution');
    const unenrolledSubRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent2}` },
      body: unenrolledSubForm,
    });
    assert(unenrolledSubRes.status === 403, 'Unenrolled student submitting returns 403 Forbidden');

    // Test 16: Submitting past deadline when allowLate is false returns 422
    const pastDueForm = new FormData();
    pastDueForm.append('text', 'Late homework submission attempt');
    const pastDueRes = await fetch(`${BASE_URL}/assignments/${assignmentPastDue._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: pastDueForm,
    });
    assert(pastDueRes.status === 422, 'Submitting past deadline with allowLate: false returns 422 Unprocessable Entity');

    // Test 17: Disallowed file extension returns 415
    const badExtForm = new FormData();
    badExtForm.append('file', new Blob(['console.log("bad");'], { type: 'text/javascript' }), 'malicious.js');
    const badExtRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: badExtForm,
    });
    assert(badExtRes.status === 415, 'Submitting disallowed file extension (.js) returns 415');

    // Test 18: File signature mismatch returns 415
    const fakePdfForm = new FormData();
    fakePdfForm.append('file', new Blob(['Plain text not a real PDF document'], { type: 'application/pdf' }), 'solution.pdf');
    const fakePdfRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: fakePdfForm,
    });
    assert(fakePdfRes.status === 415, 'Submitting text disguised as .pdf returns 415 Unsupported Media Type');

    // Test 19: File size > 5 MB returns 413
    const oversizedBlob = new Blob([new Uint8Array(5 * 1024 * 1024 + 1024)], { type: 'text/plain' });
    const oversizedForm = new FormData();
    oversizedForm.append('file', oversizedBlob, 'huge.txt');
    const oversizedRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: oversizedForm,
    });
    assert(oversizedRes.status === 413, 'Submitting file exceeding 5 MB returns 413 Payload Too Large');

    // ==========================================
    // GROUP 5: SUCCESSFUL SUBMISSIONS & REPLACEMENTS
    // ==========================================
    console.log('\n--- Group 5: Successful Submissions & Replacements ---');

    // Test 20: Text-only submission returns 201 Created
    const textSubForm = new FormData();
    textSubForm.append('text', 'Here is my complete lab writeup for Assignment 1.');
    const textSubRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: textSubForm,
    });
    const textSubData = await textSubRes.json();
    assert(textSubRes.status === 201, 'Text-only submission returns 201 Created');
    assert(textSubData.data.status === 'Submitted', 'Submission status is "Submitted"');

    // Test 21: Check assignment details reflects submission
    const viewAfterSub = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const viewAfterSubData = await viewAfterSub.json();
    assert(viewAfterSubData.data.submission?.text === 'Here is my complete lab writeup for Assignment 1.', 'Assignment details includes submission text');

    // Test 22: Replace submission with file attachment returns 200 OK
    const sampleTxtContent = 'CampusBridge Phase 7 Assignment Submission Content.\nLine 2 of solution.';
    const validTxtBlob = new Blob([sampleTxtContent], { type: 'text/plain' });
    const replaceForm = new FormData();
    replaceForm.append('text', 'Updated writeup with attached file.');
    replaceForm.append('file', validTxtBlob, 'solution_v2.txt');

    const replaceRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: replaceForm,
    });
    const replaceData = await replaceRes.json();
    assert(replaceRes.status === 200, 'Replacing submission before deadline returns 200 OK');
    assert(replaceData.data.file?.name === 'solution_v2.txt', 'Updated submission contains attached file name');

    // Test 23: Verify assignments list reflects submissionStatus === 'Submitted'
    const listAfterSub = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const listAfterSubData = await listAfterSub.json();
    const subItem = listAfterSubData.data.find((a) => a.id === assignmentNormal._id.toString());
    assert(subItem?.submissionStatus === 'Submitted', 'Assignments list reflects submissionStatus === "Submitted"');

    // Test 24: Submitting to late-allowed assignment past deadline returns 201 Created
    const lateAllowedForm = new FormData();
    lateAllowedForm.append('text', 'Submitted past deadline because allowLate is true.');
    const lateAllowedRes = await fetch(`${BASE_URL}/assignments/${assignmentLateAllowed._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: lateAllowedForm,
    });
    assert(lateAllowedRes.status === 201, 'Submitting past deadline when allowLate: true returns 201 Created');

    // ==========================================
    // GROUP 6: FILE DOWNLOAD & SECURITY
    // ==========================================
    console.log('\n--- Group 6: File Download & Security ---');

    // Test 25: Student downloading own submitted file returns 200
    const downloadRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submission/download`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(downloadRes.status === 200, 'Student downloading own submitted file returns 200 OK');
    const downloadedText = await downloadRes.text();
    assert(downloadedText === sampleTxtContent, 'Downloaded file content matches uploaded bytes');
    const dispHeader = downloadRes.headers.get('content-disposition');
    assert(dispHeader && dispHeader.includes('solution_v2.txt'), 'Content-Disposition header includes correct filename');

    // Test 26: Student downloading submission when no file attached returns 404
    const downloadNoFileRes = await fetch(`${BASE_URL}/assignments/${assignmentLateAllowed._id}/submission/download`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(downloadNoFileRes.status === 404, 'Downloading when submission has no file returns 404');

    // Test 27: Unenrolled student attempting to download returns 403
    const downloadUnenrolledRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submission/download`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(downloadUnenrolledRes.status === 403, 'Unenrolled student attempting to download returns 403');

    // Test 28: Assigned instructor downloading student submission via ?studentId= returns 200
    const instructorDownload = await fetch(
      `${BASE_URL}/assignments/${assignmentNormal._id}/submission/download?studentId=${student1._id}`,
      { headers: { Authorization: `Bearer ${tokenInst1}` } }
    );
    assert(instructorDownload.status === 200, 'Assigned instructor downloading student submission returns 200 OK');

    // Test 29: Unassigned instructor downloading student submission returns 403
    const unassignedInstDownload = await fetch(
      `${BASE_URL}/assignments/${assignmentNormal._id}/submission/download?studentId=${student1._id}`,
      { headers: { Authorization: `Bearer ${tokenInst2}` } }
    );
    assert(unassignedInstDownload.status === 403, 'Unassigned instructor downloading student submission returns 403');

    // ==========================================
    // GROUP 7: GRADED SUBMISSION IMMUTABILITY
    // ==========================================
    console.log('\n--- Group 7: Graded Submission Immutability ---');

    // Find the existing submission
    const existingSub = await Submission.findOne({
      assignmentId: assignmentNormal._id,
      studentId: student1._id,
    });

    // Create Grade and mark submission as 'Graded'
    existingSub.status = 'Graded';
    await existingSub.save();

    const createdGrade = await Grade.create({
      submissionId: existingSub._id,
      assignmentId: assignmentNormal._id,
      studentId: student1._id,
      courseId: course1._id,
      graderId: instructor1._id,
      score: 95,
      maxScore: 100,
      feedback: 'Excellent REST API design and test suite.',
    });

    // Test 30: Assignment details returns graded submission with grade info
    const viewGradedRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const viewGradedData = await viewGradedRes.json();
    assert(viewGradedRes.status === 200, 'Viewing graded assignment returns 200');
    assert(viewGradedData.data.submission?.status === 'Graded', 'Submission status is "Graded"');
    assert(viewGradedData.data.submission?.grade?.score === 95, 'Grade score is 95');
    assert(viewGradedData.data.submission?.grade?.feedback.includes('Excellent'), 'Grade feedback is included');

    // Test 31: Assignment list reflects submissionStatus === 'Graded'
    const listGradedRes = await fetch(`${BASE_URL}/assignments`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const listGradedData = await listGradedRes.json();
    const gradedItem = listGradedData.data.find((a) => a.id === assignmentNormal._id.toString());
    assert(gradedItem?.submissionStatus === 'Graded', 'Assignment list reflects submissionStatus === "Graded"');

    // Test 32: Attempting to replace a graded submission returns 422
    const replaceGradedForm = new FormData();
    replaceGradedForm.append('text', 'Trying to modify after grade is assigned');
    const replaceGradedRes = await fetch(`${BASE_URL}/assignments/${assignmentNormal._id}/submissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenStudent1}` },
      body: replaceGradedForm,
    });
    assert(replaceGradedRes.status === 422, 'Resubmitting a graded assignment returns 422 Unprocessable Entity');

  } catch (err) {
    console.error('Test suite error:', err);
    assert(false, `Unexpected test exception: ${err.message}`);
  } finally {
    // Cleanup
    try {
      console.log('\n--- Cleaning up test data ---');
      if (student1) {
        const subs = await Submission.find({ studentId: student1._id });
        for (const sub of subs) {
          if (sub.file?.path && fs.existsSync(sub.file.path)) {
            try { fs.unlinkSync(sub.file.path); } catch (e) {}
          }
        }
        await Submission.deleteMany({ studentId: student1._id });
        await Grade.deleteMany({ studentId: student1._id });
        await Enrollment.deleteMany({ studentId: student1._id });
        await User.findByIdAndDelete(student1._id);
      }
      if (student2) await User.findByIdAndDelete(student2._id);
      if (instructor1) await User.findByIdAndDelete(instructor1._id);
      if (instructor2) await User.findByIdAndDelete(instructor2._id);
      if (coordinator) await User.findByIdAndDelete(coordinator._id);
      if (course1) {
        await Assignment.deleteMany({ courseId: course1._id });
        await Course.findByIdAndDelete(course1._id);
      }
      if (course2) {
        await Assignment.deleteMany({ courseId: course2._id });
        await Course.findByIdAndDelete(course2._id);
      }
      console.log('Cleanup completed.');
    } catch (cleanErr) {
      console.warn('Cleanup error:', cleanErr.message);
    }

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${results.passed + results.failed}`);
    console.log(`PASSED: ${results.passed}`);
    console.log(`FAILED: ${results.failed}`);
    console.log(`========================================\n`);

    if (results.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runStudentAssignmentTests();
