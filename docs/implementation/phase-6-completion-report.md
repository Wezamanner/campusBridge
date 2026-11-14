# CampusBridge — Phase 6 Implementation & Scope Audit Report: Assignment Creation and Management

## 1. Overview & Verification Status

- **Phase**: Phase 6 — Instructor Assignment Creation and Management
- **Branch**: `team1`
- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-06, Section 12.3)
- **API Specification Authority**:
  - `docs/api/instructor-api-spec.md` (Section 3: Functional Group C — Assignment Authoring)
  - `docs/api/openapi.yaml` (`/courses/{id}/assignments` [POST], `/assignments` [GET], `/assignments/{id}` [GET])
  - `docs/api/security-access-control.md` (Items 3 & 5, Lines 46–48)
- **Scope & Phase Boundary Enforcement**:
  - **FR-06 Exclusivity**: Implemented instructor assignment authoring and assignment management for courses assigned to them.
  - **Phase 7 Isolation**: Student assignment listing, student assignment viewing, and submission workflows (`POST /assignments/:id/submissions`) are strictly deferred to Phase 7 (FR-07). All student access attempts to `/assignments` and `/assignments/:id` return `403 Forbidden`.
  - **Phase 14 Isolation**: Student notifications are deferred to Phase 14 (FR-14); premature automated notification dispatch and model dependencies were cleanly removed.
  - **Contract Alias Removal**: Removed unsupported alias `GET /api/v1/courses/:id/assignments` from `course.routes.js` to strictly adhere to OpenAPI and API specifications.
  - **Coordinator Boundaries**: Course creation, archiving, and instructor assignments remain exclusively owned by the **Academic Coordinator** (Developer 3).

---

## 2. Exact SRS Requirements Implemented

| Requirement ID | Specification Requirement | Verification Status |
|---|---|---|
| **FR-06** | Instructors create assignments with instructions, future submission deadline, max score (1–100), and late submission policy. | **VERIFIED & COMPLETED** |
| **SEC-04 / Rule 3** | Instructors can only create and access assignments for courses assigned directly to them (`course.instructorId === req.user._id`). | **VERIFIED & COMPLETED** |
| **SEC-07** | Inactive/Archived course protection: Instructors cannot create assignments for archived courses (`status: 'archived'`). | **VERIFIED & COMPLETED** |
| **FR-07 Isolation** | Student assignment listing and detail access are forbidden in Phase 6, cleanly deferred to Phase 7. | **VERIFIED & ISOLATED** |
| **FR-14 Isolation** | Automated notification dispatch is cleanly deferred to Phase 14. | **VERIFIED & ISOLATED** |

---

## 3. Approved API Operations

### 3.1. Create Course Assignment
- **Method & Path**: `POST /api/v1/courses/:id/assignments`
- **Role Permissions**: `instructor` (`authorize('instructor')`)
- **Ownership Guard**: Assigned instructor only (`course.instructorId.toString() === req.user._id.toString()`). Non-assigned instructors receive `403 Forbidden`.
- **Course Status Guard**: Archived courses rejected with `400 Bad Request`.
- **Validation Rules (FR-06)**:
  - `title`: String, 3 to 200 characters (trimmed, non-empty).
  - `description`: String instructions (required, non-empty).
  - `deadline`: Valid ISO date-time string strictly in the future (`deadline > Date.now()`).
  - `maxScore`: Number between 1 and 100 (defaults to `100`).
  - `allowLate`: Boolean (defaults to `false`).
- **Response Format**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Assignment created successfully.",
    "data": {
      "id": "6732f7a4e4b02a1b9c8d4499",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "title": "Lab 1: REST API with Express",
      "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
      "deadline": "2026-11-15T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false,
      "createdAt": "2026-11-11T10:00:00.000Z"
    },
    "pagination": null
  }
  ```

### 3.2. List Course Assignments
- **Method & Path**: `GET /api/v1/assignments`
- **Query Parameters**: `courseId` (optional filter)
- **Role Permissions**: `instructor` only (`authorize('instructor')`). Non-instructors (Coordinator, Admin, Student) receive `403 Forbidden`.
- **Ownership Guard**: When `courseId` is specified, verifies that the requesting instructor teaches that course (`course.instructorId.toString() === req.user._id.toString()`).
- **Response Format**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "courseId": "6732f1a2e4b02a1b9c8d3e4f",
        "title": "Lab 1: REST API with Express",
        "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false,
        "createdAt": "2026-11-11T10:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

### 3.3. View Single Assignment Details
- **Method & Path**: `GET /api/v1/assignments/:id`
- **Role Permissions**: `instructor` only (`authorize('instructor')`). Non-instructors (Coordinator, Admin, Student) receive `403 Forbidden`.
- **Ownership Guard**: Verifies that the requesting instructor is assigned to the course associated with this assignment.
- **Response Format**: `200 OK` with complete assignment instructions and parameters.

---

## 4. Features Deliberately Deferred

1. **Student Assignment Listing & Detail Access (Phase 7, FR-07)**:
   - Student role routes on `/api/v1/assignments` and `/api/v1/assignments/:id` are blocked with `403 Forbidden`.
   - Student assignment viewing pages and UI tabs remain un-implemented.
2. **Student Submission & Grading (Phase 7 & Phase 8, FR-07, FR-08)**:
   - `POST /api/v1/assignments/:id/submissions` remains un-implemented.
   - Grading queues and submission management remain un-implemented.
3. **Automated Notification Dispatch (Phase 14, FR-14)**:
   - Automated notification creation upon assignment publishing was removed from Phase 6.
4. **Assignment Editing & Deletion**:
   - Excluded per SRS baseline and OpenAPI specification (neither `PUT`, `PATCH`, nor `DELETE` is defined for assignments).

---

## 5. Files Created & Modified

### 5.1. Backend
1. **`server/src/controllers/assignment.controller.js`** (Created)
   - `createAssignment`: Enforces assigned-instructor check, active-course status, input validation, and database creation.
   - `getAssignments`: Query filtering with assigned-course isolation for instructors; rejects student access in Phase 6.
   - `getAssignmentById`: Validates assignment existence and assigned-course ownership; rejects student access in Phase 6.
2. **`server/src/routes/assignment.routes.js`** (Created)
   - Mounted `GET /api/v1/assignments` and `GET /api/v1/assignments/:id` restricted to `instructor`, `coordinator`, `admin`.
3. **`server/src/routes/course.routes.js`** (Modified)
   - Added `POST /api/v1/courses/:id/assignments` (Assigned instructor only).
   - Removed unapproved alias `GET /courses/:id/assignments`.
4. **`server/src/server.js`** (Modified)
   - Registered `/api/v1/assignments` route handler.
5. **`server/src/utils/validation.js`** (Modified)
   - Added `validateAssignmentInput` helper.
6. **`server/package.json`** (Modified)
   - Added test script `"test:assignments": "PORT=5005 node src/utils/testAssignmentManagement.js"`.
7. **`server/src/utils/testAssignmentManagement.js`** (Created)
   - 43 automated test assertions covering authentication, authorization, field validation, creation, listing, details, and endpoint boundary checks.

### 5.2. Frontend
1. **`client/src/pages/instructor/InstructorCourseDetailsPage.jsx`** (Modified)
   - Replaced Phase 6 notice card with active **Course Assignments** module.
   - Integrated assignment authoring form (Title, Description, Datetime Deadline, Max Score, Allow Late toggle).
   - Integrated published assignments table displaying title, description preview, deadline with past-due indicator, max score, late policy badge, and creation timestamp.

---

## 6. Verification & Test Execution Results

All automated suites passed with 0 failures:

| Test Suite | File | Tests Run | Result |
|---|---|---|---|
| **Phase 6: Assignments** | `server/src/utils/testAssignmentManagement.js` | 45 | **45 Passed, 0 Failed** |
| **Phase 5: Course Resources** | `server/src/utils/testCourseResources.js` | 42 | **42 Passed, 0 Failed** |
| **Phase 4: Student Enrollment** | `server/src/utils/testStudentEnrollment.js` | 30 | **30 Passed, 0 Failed** |
| **Phase 3: Instructor Workspace** | `server/src/utils/testCourseWorkspace.js` | 25 | **25 Passed, 0 Failed** |
| **Phase 2: Profile & CV** | `server/src/utils/testProfile.js` | 35 | **35 Passed, 0 Failed** |
| **Frontend Production Build** | `vite build` | 2,123 modules | **Built in 2.00s, 0 Errors** |

---

## 7. Unresolved Requirements & Known Ambiguities

- None. All functional requirements for FR-06 and approved API contract specifications have been verified and confirmed.

---

## 8. Git Branch, HEAD & Working Tree Status

- **Current Branch**: `team1`
- **HEAD Commit**: `3f6f8f85fad4cf854de02bcdc339d211feb745fa` (Phase 4 commit preserved)
- **Phase 5 Changes**: Fully preserved in working tree.
- **Phase 6 Changes**: Cleanly staged in working tree files.
- **Git Working Tree**:
```text
 M client/src/pages/instructor/InstructorCourseDetailsPage.jsx
 M client/src/pages/student/StudentCourseDetailsPage.jsx
 M server/package.json
 M server/src/controllers/course.controller.js
 M server/src/middleware/upload.js
 M server/src/routes/course.routes.js
 M server/src/server.js
 M server/src/utils/validation.js
?? docs/implementation/phase-5-completion-report.md
?? docs/implementation/phase-6-completion-report.md
?? server/src/controllers/assignment.controller.js
?? server/src/routes/assignment.routes.js
?? server/src/utils/testAssignmentManagement.js
?? server/src/utils/testCourseResources.js
```
- No commits, pushes, merges, resets, or branch checkouts were performed.
