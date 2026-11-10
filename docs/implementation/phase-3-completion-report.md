# CampusBridge — Phase 3 Implementation Report: Instructor Course Workspace

## 1. Overview & Verification Status

- **Phase**: Phase 3 — Instructor Course Workspace
- **Branch**: `team1`
- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-04, FR-16, Section 12.3)
- **API Specification Authority**: `docs/api/instructor-api-spec.md` & `docs/api/security-access-control.md`
- **Ownership Boundaries**:
  - Academic Course Authoring, Course Archiving, and Faculty Course Assignments are owned strictly by the **Coordinator** (Developer 3).
  - Assigned Instructors hold teaching authority over their assigned courses, authorized student rosters, course resources (Phase 5), and assignments/grading (Phases 6–8).
  - Later phases (Phase 5: Resources, Phase 6: Assignments, Phase 7: Submissions, Phase 8: Grading, Phase 9: Progress, Phase 10: At-Risk Monitoring) remain cleanly isolated and un-implemented in Phase 3.

---

## 2. Exact SRS Requirements Implemented

| Requirement ID | Specification Requirement | Verification Status |
|---|---|---|
| **FR-04** | Coordinators assign one instructor per course. Assigned instructor accesses their assigned course workspace and teaching context. | **VERIFIED & COMPLETED** |
| **FR-16** | Role-based instructor workspace: view assigned teaching courses, course status, and enrolled student roster context. | **VERIFIED & COMPLETED** |
| **SEC-01 / SEC-04** | Role-based authorization & ownership: Instructors can only access courses assigned to them (`course.instructorId === req.user._id`). Cross-instructor access is rejected with `403 Forbidden`. | **VERIFIED & COMPLETED** |
| **SEC-02 / SEC-12** | Sensitive field protection: User password hashes and internal database keys are never exposed in course or roster payloads. | **VERIFIED & COMPLETED** |

---

## 3. Approved API Operations

### 3.1. List Assigned Courses
- **Method & Path**: `GET /api/v1/courses`
- **Access**: Protected (`authenticate`)
- **Behavior**:
  - `instructor`: Queries courses where `instructorId: req.user._id`. Populates instructor metadata and calculates `enrolledStudentsCount` from the `Enrollment` collection.
  - `student`: Queries active courses (`status: 'active'`) with `isEnrolled` flag.
  - `coordinator` / `admin`: Queries courses across the institution with optional status/search filters.
- **Response Format**: Standard CampusBridge envelope (`{ success: true, message, data: [...], pagination: null }`).

### 3.2. View Assigned Course Details & Student Roster
- **Method & Path**: `GET /api/v1/courses/:id`
- **Access**: Protected (`authenticate`)
- **Behavior**:
  - Validates MongoDB ObjectId format (`400 Bad Request` if invalid).
  - Finds course by ID (`404 Not Found` if missing).
  - Enforces Security Rule 3: If `req.user.role === 'instructor'`, verifies `course.instructorId.toString() === req.user._id.toString()`. Rejects with `403 Forbidden` if unauthorized.
  - Retrieves authorized enrolled student records from `Enrollment`, safely populated with student `name`, `email`, `program`, `year`, and `enrolledAt` without exposing sensitive fields.
- **Response Format**: Standard CampusBridge envelope (`{ success: true, message, data: { ... }, pagination: null }`).

---

## 4. Backend Files Created & Modified

1. **`server/src/controllers/course.controller.js`** (Created)
   - Implements `getCourses` with role-aware scoping and enrollment aggregation.
   - Implements `getCourseById` with strict assigned-instructor ownership guard (`403 Forbidden` on mismatch) and sanitized student roster population.
2. **`server/src/routes/course.routes.js`** (Created)
   - Exposes `GET /` and `GET /:id` mounted under `/api/v1/courses`, protected by `authenticate`.
3. **`server/src/server.js`** (Modified)
   - Mounted `courseRoutes` at `/api/v1/courses`.
4. **`server/src/utils/testCourseWorkspace.js`** (Created)
   - Comprehensive 25-case automated integration and security test suite.
5. **`server/package.json`** (Modified)
   - Registered `"test:courses": "node src/utils/testCourseWorkspace.js"`.

---

## 5. Frontend Files Created & Modified

1. **`client/src/pages/instructor/InstructorCoursesPage.jsx`** (Created)
   - Accessible at `/instructor/courses`.
   - Displays instructor's assigned courses in responsive cards, showing course code, title, status, description, and enrolled student counts.
   - Real-time search filter by course code or title, and status filter (`all`, `active`, `archived`).
   - Handles empty states, loading states, and API error states gracefully.
2. **`client/src/pages/instructor/InstructorCourseDetailsPage.jsx`** (Created)
   - Accessible at `/instructor/courses/:id`.
   - Displays course syllabus header, status, enrolled student count, and Coordinator ownership boundary callout.
   - Enrolled Student Roster table: student name, university email, degree program, academic year, and enrollment timestamp.
   - Filter input to search within the enrolled student roster.
   - Informational cards marking upcoming modules: Phase 5 (Learning Resources) and Phase 6 (Assignments).
3. **`client/src/pages/instructor/InstructorDashboard.jsx`** (Updated)
   - Replaced placeholder values with live API queries from `/api/v1/courses`.
   - Displays real metrics for "Assigned Courses" and "Enrolled Students".
   - Displays "My Teaching Courses" card section with direct navigation to course workspaces.
4. **`client/src/App.jsx`** (Modified)
   - Registered routes `/instructor/courses` and `/instructor/courses/:id` guarded by `<ProtectedRoute allowedRoles={['instructor', 'coordinator', 'admin']}>`.

---

## 6. Authorization & Security Enforcement

- **JWT Authentication**: Enforced via `authenticate` middleware on all course endpoints.
- **Account Status Guard**: Deactivated accounts (`active: false`) are blocked with `403 Forbidden`.
- **Assigned Instructor Ownership Guard**: An instructor attempting to access course details for a course assigned to another instructor receives `403 Forbidden: You can only access courses assigned to you.`
- **Client Identity Non-Trust**: `req.user._id` extracted from verified JWT is the single source of truth; client-provided instructor parameters are ignored.
- **Sensitive Field Redaction**: Enrolled student queries use explicit selection (`name email program year active`) and exclude `passwordHash`.

---

## 7. Test Results & Build Verification

### 7.1. Course Workspace Integration & Security Tests
Command: `npm run test:courses --prefix server`
- **Result**: **25 Passed, 0 Failed**
- Verified test cases:
  1. Unauthenticated request to `GET /courses` rejected (`401 Unauthorized`).
  2. Deactivated instructor rejected (`403 Forbidden`).
  3. Instructor 1 receives only their assigned courses (`200 OK`).
  4. Instructor 1 assigned list strictly excludes Instructor 2's courses.
  5. Enrolled count computed accurately on assigned course listing.
  6. Instructor 2 receives only their assigned courses.
  7. Assigned instructor accesses own course details (`200 OK`).
  8. Course details contain correct code, title, and enrolled students array.
  9. Enrolled student objects never expose `passwordHash`.
  10. Cross-instructor course details access rejected (`403 Forbidden`).
  11. Non-existent course ID returns `404 Not Found`.
  12. Malformed course ID returns `400 Bad Request`.
  13. Coordinator can view course details (`200 OK`).
  14. Student catalog correctly computes `isEnrolled` flag.
  15. Search query filters assigned courses.

### 7.2. Regression Tests
Command: `npm run test:profile --prefix server`
- **Result**: **35 Passed, 0 Failed** (all Phase 2 profile and CV security checks continue to pass).

### 7.3. Frontend Production Build
Command: `npm run build --prefix client`
- **Result**: **PASS** (Built in 1.83s, 0 syntax/JSX/bundling errors).

---

## 8. Known Limitations & Unresolved Ambiguities

1. **Course Creation & Archiving**: Owned by Coordinator (Developer 3) per SRS Section 12.3 and Cross-Team Integration Contract. Instructors have read-only access to course lifecycle status.
2. **Learning Resources & Assignments**: Resources and assignment authoring will be integrated in Phase 5 and Phase 6 respectively.
3. **Frontend Automated Unit Tests**: No frontend test harness (Vitest/Jest) is configured in `client/package.json`. Verification was executed via complete Vite production build and manual route inspection.

---

## 9. Git Working-Tree & Branch Status

- **Branch**: `team1`
- **No commit, push, merge, reset, or branch switch has occurred.**
