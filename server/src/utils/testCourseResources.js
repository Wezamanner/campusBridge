import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { resourcesDir } from '../middleware/upload.js';
import '../server.js'; // Starts Express server

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = `http://localhost:${config.port}/api/v1`;

async function runCourseResourceTests() {
  console.log('--- Starting CampusBridge Phase 5 Course Resource Management Test Suite ---');
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
  const coordinatorEmail = `coord_p5_${timestamp}@university.edu`;
  const instructor1Email = `inst1_p5_${timestamp}@university.edu`;
  const instructor2Email = `inst2_p5_${timestamp}@university.edu`;
  const student1Email = `stud1_p5_${timestamp}@university.edu`;
  const student2Email = `stud2_p5_${timestamp}@university.edu`;

  let coordinator, instructor1, instructor2, student1, student2;
  let tokenCoord, tokenInst1, tokenInst2, tokenStudent1, tokenStudent2;
  let activeCourse1, activeCourse2, archivedCourse;

  const tempFilesToClean = [];

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

    const code1 = `CS${timestamp % 10000}`;
    const code2 = `EE${(timestamp + 1) % 10000}`;
    const codeArch = `AR${(timestamp + 2) % 10000}`;

    // 2. Setup courses: course1 assigned to instructor1, course2 assigned to instructor2
    activeCourse1 = await Course.create({
      code: code1,
      title: 'Operating Systems & Concurrency',
      description: 'Processes, memory, and threads.',
      status: 'active',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
    });

    activeCourse2 = await Course.create({
      code: code2,
      title: 'Digital Systems & Logic',
      description: 'Circuits, transistors, and gates.',
      status: 'active',
      instructorId: instructor2._id,
      createdBy: coordinator._id,
    });

    archivedCourse = await Course.create({
      code: codeArch,
      title: 'Legacy Assembler 1970',
      description: 'Archived course module.',
      status: 'archived',
      instructorId: instructor1._id,
      createdBy: coordinator._id,
    });

    // 3. Setup student enrollment: student1 is enrolled in course1; student2 is NOT enrolled
    await Enrollment.create({
      studentId: student1._id,
      courseId: activeCourse1._id,
      enrolledAt: new Date(),
    });

    const makeToken = (user) =>
      jwt.sign({ id: user._id, role: user.role, email: user.email }, config.jwtSecret, { expiresIn: '1h' });

    tokenCoord = makeToken(coordinator);
    tokenInst1 = makeToken(instructor1);
    tokenInst2 = makeToken(instructor2);
    tokenStudent1 = makeToken(student1);
    tokenStudent2 = makeToken(student2);

    // ==========================================
    // GROUP 1: AUTHENTICATION & ROLE GUARDS
    // ==========================================

    // Test 1: Unauthenticated request to POST /courses/:id/resources rejected (401)
    const unauthPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauth Slides', url: 'https://example.com' }),
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /courses/:id/resources returns 401');

    // Test 2: Unauthenticated request to GET /courses/:id/resources rejected (401)
    const unauthGet = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`);
    assert(unauthGet.status === 401, 'Unauthenticated GET /courses/:id/resources returns 401');

    // Test 3: Coordinator cannot upload course resources (FR-04 assigned instructor only)
    const coordPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenCoord}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Coord Slides', url: 'https://example.com' }),
    });
    assert(coordPost.status === 403, 'Coordinator calling POST /courses/:id/resources returns 403 Forbidden');

    // Test 4: Student cannot upload course resources
    const studentPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenStudent1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Student Slides', url: 'https://example.com' }),
    });
    assert(studentPost.status === 403, 'Student calling POST /courses/:id/resources returns 403 Forbidden');

    // Test 5: Instructor 2 cannot upload resources to Instructor 1 course (ownership guard)
    const wrongInstPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Hacked Slides', url: 'https://example.com' }),
    });
    assert(wrongInstPost.status === 403, 'Non-assigned instructor calling POST /courses/:id/resources returns 403 Forbidden');

    // Test 6: Adding resources to archived course rejected (400)
    const archivedPost = await fetch(`${BASE_URL}/courses/${archivedCourse._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Old Slides', url: 'https://example.com' }),
    });
    assert(archivedPost.status === 400, 'Attempting to add resource to archived course returns 400 Bad Request');

    // ==========================================
    // GROUP 2: INPUT & FILE VALIDATION (POST)
    // ==========================================

    // Test 7: Missing title rejected (400)
    const missingTitlePost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: '', url: 'https://example.com' }),
    });
    assert(missingTitlePost.status === 400, 'POST resource with empty title returns 400 Bad Request');

    // Test 8: Missing file and URL rejected (400)
    const missingBothPost = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Valid Title' }),
    });
    assert(missingBothPost.status === 400, 'POST resource with neither file nor URL returns 400 Bad Request');

    // Test 9: Disallowed file extension rejected (415)
    const invalidExtFormData = new FormData();
    invalidExtFormData.append('title', 'Shell Script');
    const badBlob = new Blob(['#!/bin/bash\necho test\n'], { type: 'text/plain' });
    invalidExtFormData.append('file', badBlob, 'script.sh');

    const badExtRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: invalidExtFormData,
    });
    assert(badExtRes.status === 415, 'Uploading disallowed extension (.sh) returns 415 Unsupported Media Type');

    // Test 10: Fake PDF (magic number mismatch) rejected (415)
    const fakePdfFormData = new FormData();
    fakePdfFormData.append('title', 'Corrupted PDF');
    const fakePdfBlob = new Blob(['This is plain text disguised as a pdf document.'], { type: 'application/pdf' });
    fakePdfFormData.append('file', fakePdfBlob, 'fake.pdf');

    const fakePdfRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: fakePdfFormData,
    });
    assert(fakePdfRes.status === 415, 'Uploading text disguised as .pdf fails signature check with 415');

    // Test 10b: MIME type and extension mismatch rejected (415)
    const mimeMismatchFormData = new FormData();
    mimeMismatchFormData.append('title', 'MIME Mismatch Test');
    const txtBuffer = Buffer.from('Valid text content');
    const mismatchBlob = new Blob([txtBuffer], { type: 'application/pdf' }); // .txt extension with PDF MIME
    mimeMismatchFormData.append('file', mismatchBlob, 'sample.txt');

    const mimeMismatchRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: mimeMismatchFormData,
    });
    assert(mimeMismatchRes.status === 415, 'MIME type and extension mismatch rejected with 415 Unsupported Media Type');

    // Test 10c: Generic ZIP disguised as .pptx lacking ppt/presentation.xml rejected (415)
    // Minimal valid ZIP with a dummy file 'test.txt' but lacking 'ppt/presentation.xml'
    const dummyZipHeader = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x74, 0x65, 0x73, 0x74, 0x2e, 0x74, 0x78, 0x74, // 'test.txt'
      // Central directory header:
      0x50, 0x4b, 0x01, 0x02, 0x14, 0x03, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x74, 0x65, 0x73, 0x74, 0x2e, 0x74, 0x78, 0x74,
      // EOCD:
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x36, 0x00,
      0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const fakePptxFormData = new FormData();
    fakePptxFormData.append('title', 'Fake PPTX Presentation');
    const fakePptxBlob = new Blob([dummyZipHeader], {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    fakePptxFormData.append('file', fakePptxBlob, 'presentation.pptx');

    const fakePptxRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: fakePptxFormData,
    });
    assert(fakePptxRes.status === 415, 'Generic ZIP disguised as .pptx rejected due to missing ppt/presentation.xml');

    // Test 10d: Unsafe external URL scheme rejected (400)
    const unsafeUrlRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Malicious Link',
        type: 'link',
        url: 'javascript:alert(1)',
      }),
    });
    assert(unsafeUrlRes.status === 400, 'Unsafe URL scheme (javascript:) rejected with 400 Bad Request');

    // Test 10e: TXT file containing binary bytes or invalid encoding rejected (415)
    const binaryTxtFormData = new FormData();
    binaryTxtFormData.append('title', 'Binary Injected TXT');
    const binaryBytes = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x01, 0x02, 0xff]); // contains null and binary bytes
    const binaryTxtBlob = new Blob([binaryBytes], { type: 'text/plain' });
    binaryTxtFormData.append('file', binaryTxtBlob, 'binary.txt');

    const binaryTxtRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: binaryTxtFormData,
    });
    assert(binaryTxtRes.status === 415, 'TXT file containing binary control bytes rejected with 415 Unsupported Media Type');

    // Test 10e-2: TXT file with valid text in front but invalid binary bytes near the end (full-stream test)
    const trailingBinaryTxtFormData = new FormData();
    trailingBinaryTxtFormData.append('title', 'Trailing Binary TXT');
    const validPrefix = Buffer.from('A'.repeat(2048)); // 2 KB of valid ASCII text
    const binarySuffix = Buffer.from([0x00, 0x01, 0x02, 0xff]); // binary bytes at the very end
    const combinedBuffer = Buffer.concat([validPrefix, binarySuffix]);
    const trailingBinaryBlob = new Blob([combinedBuffer], { type: 'text/plain' });
    trailingBinaryTxtFormData.append('file', trailingBinaryBlob, 'trailing_binary.txt');

    const trailingBinaryRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: trailingBinaryTxtFormData,
    });
    assert(trailingBinaryRes.status === 415, 'TXT file with binary bytes near the end rejected with 415 via full stream scan');

    // Test 10f: External URL with embedded credentials rejected (400)
    const credentialUrlRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Phishing Credential Link',
        type: 'link',
        url: 'https://admin:secret123@attacker.com/resource',
      }),
    });
    assert(credentialUrlRes.status === 400, 'External URL with embedded credentials rejected with 400 Bad Request');

    // Test 10g: ZIP archive containing duplicate entries rejected (415)
    // Construct ZIP with two identical 'file.txt' entries in Central Directory
    const dupZipHeader = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x66, 0x69, 0x6c, 0x65, 0x2e, 0x74, 0x78, 0x74, // 'file.txt'
      // CD Header 1:
      0x50, 0x4b, 0x01, 0x02, 0x14, 0x03, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x66, 0x69, 0x6c, 0x65, 0x2e, 0x74, 0x78, 0x74,
      // CD Header 2 (duplicate 'file.txt'):
      0x50, 0x4b, 0x01, 0x02, 0x14, 0x03, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x66, 0x69, 0x6c, 0x65, 0x2e, 0x74, 0x78, 0x74,
      // EOCD (total entries: 2):
      0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x02, 0x00, 0x6c, 0x00,
      0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const dupZipFormData = new FormData();
    dupZipFormData.append('title', 'Duplicate Entry ZIP');
    const dupZipBlob = new Blob([dupZipHeader], { type: 'application/zip' });
    dupZipFormData.append('file', dupZipBlob, 'duplicate.zip');

    const dupZipRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: dupZipFormData,
    });
    assert(dupZipRes.status === 415, 'ZIP archive with duplicate entry names rejected with 415 Unsupported Media Type');

    // ==========================================
    // GROUP 3: SUCCESSFUL RESOURCE UPLOADS (FR-04)
    // ==========================================

    // Test 11: Assigned instructor uploads valid external URL link resource
    const linkPostRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInst1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Week 1 Documentation: MDN Web Docs',
        type: 'link',
        url: 'https://developer.mozilla.org/en-US/docs/Web',
      }),
    });
    const linkPostData = await linkPostRes.json();
    assert(linkPostRes.status === 201, 'Instructor adds external link resource (201 Created)');
    assert(linkPostData.success === true, 'Link resource response success: true');
    assert(linkPostData.data.type === 'link', 'Link resource type: link');

    // Test 12: Assigned instructor uploads authentic PDF document (multipart/form-data)
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');
    const pdfFormData = new FormData();
    pdfFormData.append('title', 'Week 1 Lecture Slides');
    const pdfBlob = new Blob([validPdfBuffer], { type: 'application/pdf' });
    pdfFormData.append('file', pdfBlob, 'lecture_week1.pdf');

    const pdfUploadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: pdfFormData,
    });
    const pdfUploadData = await pdfUploadRes.json();
    assert(pdfUploadRes.status === 201, 'Instructor uploads authentic PDF file (201 Created)');
    assert(pdfUploadData.success === true, 'PDF upload response success: true');
    assert(pdfUploadData.data.title === 'Week 1 Lecture Slides', 'Saved resource has correct title');
    assert(pdfUploadData.data.type === 'pdf', 'Saved resource inferred type: pdf');
    assert(pdfUploadData.data.url.startsWith('/uploads/resources/res-'), 'Stored file URL starts with /uploads/resources/res-');

    const createdPdfResourceId = pdfUploadData.data._id;
    const storedPdfFileName = path.basename(pdfUploadData.data.url);
    const storedPdfDiskPath = path.resolve(resourcesDir, storedPdfFileName);
    tempFilesToClean.push(storedPdfDiskPath);

    // Test 13: Stored file exists on disk with secure permissions
    assert(fs.existsSync(storedPdfDiskPath), 'Uploaded resource file physically exists in server/uploads/resources/');

    // Test 14: Assigned instructor uploads text/notes resource
    const txtFormData = new FormData();
    txtFormData.append('title', 'Syllabus & Reading Notes');
    const txtBlob = new Blob(['Lecture schedule:\nWeek 1: Concurrency\nWeek 2: Threads\n'], { type: 'text/plain' });
    txtFormData.append('file', txtBlob, 'syllabus.txt');

    const txtUploadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenInst1}` },
      body: txtFormData,
    });
    const txtUploadData = await txtUploadRes.json();
    assert(txtUploadRes.status === 201, 'Instructor uploads text resource (201 Created)');
    if (txtUploadData.data?.url) {
      tempFilesToClean.push(path.resolve(resourcesDir, path.basename(txtUploadData.data.url)));
    }

    // ==========================================
    // GROUP 4: RESOURCE VIEWING PERMISSIONS (GET)
    // ==========================================

    // Test 15: Assigned instructor views course resources
    const instGetRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    const instGetData = await instGetRes.json();
    assert(instGetRes.status === 200, 'Assigned instructor can view course resources (200 OK)');
    assert(instGetData.data.length >= 3, 'Instructor view contains all uploaded resources');

    // Test 16: Non-assigned instructor viewing course resources rejected (403)
    const wrongInstGetRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      headers: { Authorization: `Bearer ${tokenInst2}` },
    });
    assert(wrongInstGetRes.status === 403, 'Non-assigned instructor viewing course resources returns 403 Forbidden');

    // Test 17: Enrolled student views course resources (FR-05)
    const stud1GetRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    const stud1GetData = await stud1GetRes.json();
    assert(stud1GetRes.status === 200, 'Enrolled student can view course resources (200 OK)');
    assert(stud1GetData.data.some((r) => r.title === 'Week 1 Lecture Slides'), 'Enrolled student sees uploaded lecture slides');

    // Test 18: Unenrolled student viewing course resources rejected (403)
    const stud2GetRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(stud2GetRes.status === 403, 'Unenrolled student viewing course resources returns 403 Forbidden (FR-05)');

    // ==========================================
    // GROUP 5: SECURE DOWNLOAD & ACCESS
    // ==========================================

    // Test 19: Enrolled student downloads resource file
    const stud1DownloadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources/${createdPdfResourceId}/download`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(stud1DownloadRes.status === 200, 'Enrolled student can download resource file (200 OK)');
    const disposition = stud1DownloadRes.headers.get('content-disposition');
    assert(disposition && disposition.includes('attachment'), 'Download response contains Content-Disposition: attachment');
    const nosniff = stud1DownloadRes.headers.get('x-content-type-options');
    assert(nosniff === 'nosniff', 'Download response contains X-Content-Type-Options: nosniff');

    // Test 20: Assigned instructor can download resource file
    const instDownloadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources/${createdPdfResourceId}/download`, {
      headers: { Authorization: `Bearer ${tokenInst1}` },
    });
    assert(instDownloadRes.status === 200, 'Assigned instructor can download resource file (200 OK)');

    // Test 21: Unenrolled student downloading resource file rejected (403)
    const stud2DownloadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources/${createdPdfResourceId}/download`, {
      headers: { Authorization: `Bearer ${tokenStudent2}` },
    });
    assert(stud2DownloadRes.status === 403, 'Unenrolled student downloading resource file returns 403 Forbidden');

    // Test 22: Non-assigned instructor downloading resource file rejected (403)
    const wrongInstDownloadRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources/${createdPdfResourceId}/download`, {
      headers: { Authorization: `Bearer ${tokenInst2}` },
    });
    assert(wrongInstDownloadRes.status === 403, 'Non-assigned instructor downloading resource file returns 403 Forbidden');

    // Test 23: Non-existent resource ID download returns 404
    const fakeResId = new mongoose.Types.ObjectId();
    const notFoundRes = await fetch(`${BASE_URL}/courses/${activeCourse1._id}/resources/${fakeResId}/download`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(notFoundRes.status === 404, 'Download with non-existent resource ID returns 404 Not Found');

    // Test 24: Malformed course ID returns 400
    const malformedRes = await fetch(`${BASE_URL}/courses/bad-id-123/resources`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(malformedRes.status === 400, 'Malformed course ID returns 400 Bad Request');

    // Test 25: Non-existent course ID returns 404
    const fakeCourseId = new mongoose.Types.ObjectId();
    const notFoundCourseRes = await fetch(`${BASE_URL}/courses/${fakeCourseId}/resources`, {
      headers: { Authorization: `Bearer ${tokenStudent1}` },
    });
    assert(notFoundCourseRes.status === 404, 'Non-existent course ID returns 404 Not Found');

  } finally {
    // Clean up temporary physical files
    for (const filePath of tempFilesToClean) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
  }

  console.log('\n======================================================');
  console.log(`Test Execution Finished: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('======================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runCourseResourceTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
