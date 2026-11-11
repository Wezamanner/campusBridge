# CampusBridge — Phase 7 Implementation & Verification Report: Student Assignment Viewing and Submission

## 1. Executive Summary & Verification Status

- **Phase**: Phase 7 — Student Assignment Viewing and Submission
- **Working Branch**: `team1`
- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-07, Section 12.3; UC-S03, Lines 3633–3673)
- **API Specification Authority**:
  - `docs/api/student-api-spec.md` (Section 3: Functional Group C — Assignments & Submissions)
  - `docs/api/file-upload-contracts.md` (Section 3: Assignment Submission Upload Contract)
  - `docs/api/security-access-control.md` (FR-07, SEC-07, Section 4: File Storage Security)
  - `docs/api/cross-team-integration-contract.md`
- **Scope & Phase Boundary Enforcement**:
  - **FR-07 Exclusivity**: Enrolled students can view assignments for their enrolled courses, inspect assignment instructions, deadlines, max scores, and submission policies, submit text and/or file attachments (up to 5 MB), replace previous submissions prior to deadline or grading, and securely download submitted files.
  - **Phase 8 Isolation**: Instructor assignment grading and feedback authoring are strictly deferred to Phase 8 (FR-08). Submissions marked `Graded` are rendered immutably to the student.
  - **Phase 9/10 Isolation**: Student progress analytics and at-risk monitoring are deferred to Phases 9 and 10 (FR-09, FR-10).
  - **Phase 14 Isolation**: Student and instructor notification triggers remain strictly deferred to Phase 14 (FR-14).
  - **Phase 15 Isolation**: AI feedback and assistant features are strictly deferred to Phase 15.
  - **Academic Coordinator Boundaries**: Course creation, archiving, and instructor assignments remain exclusively owned by Developer 3 (Academic Coordinator).

---

## 2. Implemented SRS Requirements & Contracts

| Requirement ID | Specification Requirement | Verification Status |
|---|---|---|
| **FR-07** | Enrolled students view assignments belonging to enrolled courses, including instructions, deadline, max score, and submission status. | **VERIFIED & COMPLETED** |
| **FR-07 (Submission)** | Enrolled students submit work via text response, file attachment (up to 5 MB), or both. Permitted formats: PDF, Word (DOC, DOCX), ZIP, text (TXT). | **VERIFIED & COMPLETED** |
| **FR-07 (Replacement)** | Students may replace earlier submissions before the deadline or until graded (`status === 'Submitted'`). Once graded, submissions are immutable. | **VERIFIED & COMPLETED** |
| **FR-07 (Late Policy)** | Submissions past the deadline are rejected with `422 Unprocessable Entity` unless `allowLate: true`. | **VERIFIED & COMPLETED** |
| **SEC-07 / NFR-15** | Role & Enrollment Authorization: Students can only view and submit to assignments for courses in which they are actively enrolled. Unenrolled students receive `403 Forbidden`. | **VERIFIED & COMPLETED** |
| **SEC-07 (File Security)** | Deep signature inspection (magic numbers, EOCD/Central Directory validation for DOCX/ZIP, full-stream binary scans for TXT), UUID-based disk storage, restrictive `0700`/`0600` permissions, and traversal defense. | **VERIFIED & COMPLETED** |

---

## 3. Approved API Operations

### 3.1. List Assignments
- **Method & Path**: `GET /api/v1/assignments`
- **Query Parameters**: `courseId` (optional)
- **Role Permissions**: `instructor` (FR-06), `student` (FR-07). All other roles receive `403 Forbidden`.
- **Student Logic**:
  - If `courseId` is provided: verifies student enrollment in `courseId`. Returns `403 Forbidden` if not enrolled.
  - If `courseId` is omitted: retrieves assignments across all courses where student has an active `Enrollment`.
  - Injects `courseCode`, `courseTitle`, and `submissionStatus` (`Not Submitted`, `Submitted`, `Graded`) per assignment.
- **Response Format `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "courseId": "6732f1a2e4b02a1b9c8d3e4f",
        "courseCode": "CS301",
        "courseTitle": "Full-Stack Web Development",
        "title": "Lab 1: REST API with Express",
        "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false,
        "submissionStatus": "Submitted",
        "createdAt": "2026-11-11T10:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

### 3.2. View Assignment Details
- **Method & Path**: `GET /api/v1/assignments/:id`
- **Role Permissions**: `instructor` (FR-06), `student` (FR-07).
- **Student Authorization Guard**:
  - Student must be actively enrolled in the assignment's parent course. Unenrolled students receive `403 Forbidden`.
- **Response Payload**:
  - Returns complete instructions, deadline, maxScore, and allowLate policy.
  - If student has not submitted: `submission: null`.
  - If student submitted: includes `id`, `status`, `submittedAt`, `text`, attached `file` metadata (`name`, `size`, `mimeType`), and `grade` object if graded (`score`, `feedback`, `gradedAt`).
- **Response Format `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment details retrieved.",
    "data": {
      "id": "6732f7a4e4b02a1b9c8d4499",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "courseCode": "CS301",
      "courseTitle": "Full-Stack Web Development",
      "title": "Lab 1: REST API with Express",
      "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
      "deadline": "2026-11-15T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false,
      "submission": {
        "id": "6732f8a4e4b02a1b9c8d55aa",
        "status": "Submitted",
        "submittedAt": "2026-11-11T12:00:00.000Z",
        "text": "Completed Express controllers and test suites.",
        "file": {
          "name": "solution_v1.zip",
          "size": 1048576,
          "mimeType": "application/zip"
        },
        "grade": null
      },
      "createdAt": "2026-11-11T10:00:00.000Z"
    },
    "pagination": null
  }
  ```

### 3.3. Submit Assignment / Replace Submission
- **Method & Path**: `POST /api/v1/assignments/:id/submissions`
- **Content-Type**: `multipart/form-data`
- **Role Permissions**: `student` only. Instructors and coordinators receive `403 Forbidden`.
- **Validation Pipeline**:
  1. Valid assignment ID format and existence check (`400`/`404`).
  2. Student course enrollment verification (`403 Forbidden` if not enrolled).
  3. Deadline enforcement: if `now > assignment.deadline && !assignment.allowLate`, rejected with `422 Unprocessable Entity`.
  4. Graded submission immutability: if existing submission has `status === 'Graded'`, rejected with `422 Unprocessable Entity`.
  5. Content requirement: at least one of `text` or `file` must be provided (or existing content retained). Missing both returns `400 Bad Request`.
  6. File validation: 5 MB size limit (`413 Payload Too Large`), extension whitelist (`.pdf`, `.doc`, `.docx`, `.zip`, `.txt`), declared MIME matching, and deep signature verification (`415 Unsupported Media Type`).
  7. Replacement lifecycle: if an earlier submission exists, previous physical file is securely unlinked from disk, replacement file is moved to `server/uploads/submissions/` with cryptographic UUID name and `0600` permissions, and record updated. Returns `200 OK` on replace, `201 Created` on new submission.

### 3.4. Secure Download of Submitted File
- **Method & Path**: `GET /api/v1/assignments/:id/submission/download`
- **Query Parameters**: `studentId` (required when called by instructor; ignored/derived from JWT when called by student).
- **Role Permissions**: `student` (own submission only), `instructor` (assigned instructor for course only).
- **Security Protections**:
  - Student A cannot download Student B's submission (`targetStudentId = req.user._id`).
  - Path traversal characters (`..`, `/`, `\`, `\0`) rejected.
  - Symlinks and non-regular files strictly rejected (`fs.lstatSync`).
  - Filename sanitized per RFC 6266 / RFC 5987.
  - Security headers: `Content-Type`, `Content-Disposition: attachment; filename=...`, `X-Content-Type-Options: nosniff`.

---

## 4. Frontend Implementation

1. **Coursework & Assignments on Course Details (`client/src/pages/student/StudentCourseDetailsPage.jsx`)**:
   - Replaced placeholder banner with active assignments feed for enrolled students.
   - Fetches assignments via `GET /api/v1/assignments?courseId=:id`.
   - Displays assignment titles, due dates, max score, late policy tag, and status badges (`Pending Submission`, `Submitted`, `Graded`, `Past Due`).
   - One-click navigation link to `/student/assignments/:id`.

2. **Dedicated Student Assignment & Submission Page (`client/src/pages/student/StudentAssignmentDetailsPage.jsx`)**:
   - Header with course code, title, deadline, max score, and late policy.
   - Instructions card rendering detailed assignment description and submission requirements.
   - Evaluation & Grade card (displayed when graded) showing score, percentage, instructor feedback, and evaluation date.
   - Current Submission card with written answer display, attached file info, and authenticated download button.
   - Interactive submission & replacement form with client-side 5 MB file size check, extension validation, loading state, and error handling.
   - Automatic form lockdown when submissions are closed or assignment is graded.

3. **Client Routing (`client/src/App.jsx`)**:
   - Protected route `/student/assignments/:id` registered for `student` role with `StudentAssignmentDetailsPage`.

---

## 5. Automated Verification & Regression Results

### 5.1. Phase 7 Test Suite (`npm run test:student-assignments --prefix server`)
- **Total Tests**: 45
- **Passed**: 45
- **Failed**: 0
- **Coverage Highlights**:
  - Unauthenticated access returns `401` across all endpoints.
  - Instructor/Coordinator access to submission endpoint returns `403`.
  - Student assignment listing returns enrolled course assignments only.
  - Querying non-enrolled `courseId` returns `403`.
  - View assignment details returns `submission: null` when not submitted.
  - Unenrolled view returns `403`.
  - Submitting without text or file returns `400`.
  - Unenrolled student submitting returns `403`.
  - Submitting past deadline when `allowLate: false` returns `422`.
  - Disallowed extension (.js) returns `415`.
  - Text disguised as .pdf fails signature check with `415`.
  - Submitting file > 5 MB returns `413`.
  - Text-only submission returns `201`.
  - File-only and replacement before deadline returns `200`.
  - Assignment list and detail views update status to `Submitted`.
  - Submitting past deadline when `allowLate: true` returns `201`.
  - Student downloading own submitted file returns `200` with matching content.
  - Downloading without file returns `404`.
  - Unenrolled student downloading returns `403`.
  - Assigned instructor downloading student submission via `?studentId=` returns `200`.
  - Unassigned instructor downloading student submission returns `403`.
  - Graded submission returns grade and feedback on GET.
  - Resubmitting a graded assignment returns `422`.

### 5.2. Regression Suite Summary
| Test Suite | Command | Tests Run | Result |
|---|---|---|---|
| **Phase 7 Student Assignments** | `npm run test:student-assignments --prefix server` | 45 | **45 Passed, 0 Failed** |
| **Phase 6 Instructor Assignments** | `npm run test:assignments --prefix server` | 46 | **46 Passed, 0 Failed** |
| **Phase 5 Course Resources** | `npm run test:resources --prefix server` | 42 | **42 Passed, 0 Failed** |
| **Phase 4 Student Enrollment** | `npm run test:enrollment --prefix server` | 30 | **30 Passed, 0 Failed** |
| **Phase 3 Instructor Workspace** | `npm run test:courses --prefix server` | 25 | **25 Passed, 0 Failed** |
| **Phase 2 Profile & CV** | `npm run test:profile --prefix server` | 35 | **35 Passed, 0 Failed** |
| **Phase 1 Authentication & RBAC** | `npm run test:auth --prefix server` | 26 | **26 Passed, 0 Failed** |
| **Mongoose Models Suite** | `npm run test:models --prefix server` | 29 | **29 Passed, 0 Failed** |
| **Frontend Production Build** | `npm run build --prefix client` | Vite v6.4.5 | **Built in 1.94s, 0 Errors** |

---

## 6. Git Safety & Working Tree Status

- **Branch**: Exclusively on `team1`.
- **Commit History**:
  - `80dc809` (Phase 6): `feat(instructor): implement assignment management`
  - `37b6a50` (Phase 5): `feat(resources): implement course resource management`
  - `3f6f8f8` (Phase 4): `feat(student): implement course browsing and enrollment`
- **Protected Boundaries**: No commits made, no push, no merge, no branch switching. `main` and `mergeBranch` remain untouched.
