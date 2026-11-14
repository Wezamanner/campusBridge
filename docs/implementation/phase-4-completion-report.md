# CampusBridge — Phase 4 Implementation Report: Student Course Browsing & Enrollment

## 1. Overview & Verification Status

- **Phase**: Phase 4 — Student Course Browsing and Enrollment
- **Branch**: `team1`
- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-05, Section 12.3)
- **API Specification Authority**: `docs/api/student-api-spec.md` Section 2 & `docs/api/security-access-control.md`
- **Ownership Boundaries**:
  - Course creation, course archiving, and faculty assignments remain owned by the **Academic Coordinator** (Developer 3).
  - Assigned Instructors manage course resources (Phase 5) and coursework assignments (Phase 6).
  - Students browse active course catalog, view course details, and enroll in active courses (FR-05).
  - Student privacy is strictly maintained: student rosters are hidden from student users.

---

## 2. Exact SRS Requirements Implemented

| Requirement ID | Specification Requirement | Verification Status |
|---|---|---|
| **FR-05** | Students browse courses, enroll in active courses, and open course details. Course resources and assignments are restricted to enrolled students. | **VERIFIED & COMPLETED** |
| **NFR-15 / SEC-04** | Duplicate enrollment prevention: A student cannot enroll in the same course more than once. The database enforces a compound unique constraint `{ studentId: 1, courseId: 1 }`. Duplicate attempts return `409 Conflict`. | **VERIFIED & COMPLETED** |
| **SEC-01 / SEC-04** | Role-based authorization & ownership: Only authenticated students can call the enrollment endpoint (`authorize('student')`). Student identity is derived exclusively from the verified JWT (`req.user._id`). | **VERIFIED & COMPLETED** |
| **SEC-07** | Inactive/Archived course protection: Students cannot enroll in archived courses (`status: 'archived'`). | **VERIFIED & COMPLETED** |
| **SEC-02 / SEC-12** | Student privacy: Students viewing course details cannot view other students enrolled in the course. | **VERIFIED & COMPLETED** |

---

## 3. Approved API Operations

### 3.1. Browse Course Catalog
- **Method & Path**: `GET /api/v1/courses`
- **Role Permissions**: `student`, all authenticated roles
- **Behavior**:
  - Automatically queries active courses (`status: 'active'`).
  - Computes `isEnrolled` per course for the authenticated student.
  - Supports keyword search by course code, title, or instructor.
  - For students, `instructor` exposes only `{ id, name }` strictly matching Section 2.1 of `student-api-spec.md`. `email` and `department` are excluded.
- **Response Format**: Standard CampusBridge envelope (`{ success: true, message, data: [...], pagination: null }`).

### 3.2. View Course Details
- **Method & Path**: `GET /api/v1/courses/:id`
- **Role Permissions**: All authenticated roles
- **Behavior**:
  - Returns course metadata: `code`, `title`, `description`, `status`.
  - For students, `instructor` exposes only `{ id, name, email }` strictly matching Section 2.2 of `student-api-spec.md`. `department` is excluded.
  - Returns `isEnrolled: boolean` reflecting the calling student's status.
  - Strictly hides `enrolledStudents` roster and any private student data.
- **Response Format**: Standard CampusBridge envelope (`{ success: true, message, data: { ... }, pagination: null }`).

### 3.3. Enroll in Course
- **Method & Path**: `POST /api/v1/courses/:id/enroll`
- **Role Permissions**: `student` (`authorize('student')`)
- **Preconditions**:
  - Valid ObjectId format (`400 Bad Request` if malformed).
  - Course must exist (`404 Not Found` if missing).
  - Course must be active (`400 Bad Request` if archived).
  - Student not already enrolled (`409 Conflict` if duplicate).
- **Postconditions**:
  - Creates record in `Enrollment` collection: `{ studentId: req.user._id, courseId: course._id, enrolledAt: Date }`.
  - Returns `201 Created` with enrollment details.

---

## 4. Backend Files Created & Modified

1. **`server/src/controllers/course.controller.js`** (Modified)
   - Added `enrollCourse`: validates course active status, checks for duplicate enrollments, creates `Enrollment` record, catches duplicate key errors (`11000`) and returns `409 Conflict`.
2. **`server/src/routes/course.routes.js`** (Modified)
   - Added `router.post('/:id/enroll', authorize('student'), enrollCourse)`.
3. **`server/src/utils/testStudentEnrollment.js`** (Created)
   - Automated 24-case integration test suite verifying catalog visibility, active vs. archived rules, enrollment creation, duplicate prevention, concurrent race conditions, and role guards.
4. **`server/package.json`** (Modified)
   - Added `"test:enrollment": "node src/utils/testStudentEnrollment.js"`.

---

## 5. Frontend Files Created & Modified

1. **`client/src/pages/student/StudentCoursesPage.jsx`** (Created)
   - Accessible at `/student/courses`.
   - Displays university courses in responsive cards matching the established palette (`#101735`, `#00C8FF`, `#1C2948`, `#8CEBFF`, `#F5F8FC`).
   - Tabs: "All Courses" and "My Enrolled".
   - Search filter by course code, title, description, or instructor name.
   - Quick one-click enrollment directly from catalog card with loading spinner and duplicate prevention.
   - Clear enrollment success and error alerts.
2. **`client/src/pages/student/StudentCourseDetailsPage.jsx`** (Created)
   - Accessible at `/student/courses/:id`.
   - Course overview, syllabus details, and assigned instructor profile.
   - Enrollment status card: displays confirmation if enrolled, or primary enrollment button if not enrolled.
   - Learning resources and assignments notice indicating unlock state per FR-05.
   - Hides all roster data to protect student privacy.
3. **`client/src/App.jsx`** (Modified)
   - Registered `/student/courses` and `/student/courses/:id` inside `<ProtectedRoute allowedRoles={['student']}>`.

---

## 6. Authorization & Enrollment Rules

- **Authentication**: Mandatory via Bearer JWT on all course endpoints.
- **Role Enforcement**: `POST /courses/:id/enroll` rejects instructors, coordinators, and administrators with `403 Forbidden` (`Access restricted to [student]`).
- **Student Identity**: Derived strictly from `req.user._id`.
- **Duplicate Prevention**: Rejects duplicate enrollment requests with `409 Conflict: Student is already enrolled in this course.`
- **Archived Course Protection**: Rejects enrollment attempts in archived courses with `400 Bad Request: Cannot enroll in an archived or inactive course.`
- **Student Privacy**: `enrolledStudents` is excluded when the requesting user has role `student`.

---

## 7. Test Results & Build Verification

### 7.1. Student Enrollment Integration Test Suite
Command: `npm run test:enrollment --prefix server`
- **Result**: **30 Passed, 0 Failed**
- Verified test cases:
  1. Unauthenticated request to enroll rejected (`401 Unauthorized`).
  2. Non-student (instructor) enrollment attempt rejected (`403 Forbidden`).
  3. Student catalog contains active course and strictly excludes archived courses.
  4. Initial enrollment state for student is `isEnrolled: false`.
  5. Student catalog exposes instructor `id` and `name`, strictly omitting `email` and `department`.
  6. Student views course details (`200 OK`).
  7. Course details exposes instructor `id`, `name`, and `email`, strictly omitting `department`.
  8. Student view of course details strictly hides other students roster (`enrolledStudents` undefined).
  9. Successful student enrollment returns `201 Created` and persists in MongoDB.
  10. Duplicate enrollment attempt returns `409 Conflict`.
  11. Catalog query reflects updated `isEnrolled: true` for enrolled student.
  12. Second student still sees `isEnrolled: false` (per-student isolation).
  13. Attempt to enroll in archived course returns `400 Bad Request`.
  14. Malformed course ID returns `400 Bad Request`.
  15. Nonexistent course ID returns `404 Not Found`.
  16. Concurrent enrollment requests safely resolve with exactly one `201 Created` and one `409 Conflict`.
  17. MongoDB maintains exact single enrollment constraint under concurrent load.

### 7.2. Regression Tests
1. `npm run test:courses --prefix server`: **25 Passed, 0 Failed** (Instructor Course Workspace intact).
2. `npm run test:profile --prefix server`: **35 Passed, 0 Failed** (Student Profile & CV intact).

### 7.3. Frontend Production Build
Command: `npm run build --prefix client`
- **Result**: **PASS** (Built in 1.92s, 0 syntax/JSX/bundling errors).

---

## 8. Known Limitations

1. **Course Learning Resources (FR-05)**: Learning resource upload and download workflows activate in Phase 5.
2. **Assignments & Submissions (FR-06, FR-07)**: Assignment creation and submission workflows activate in Phases 6 and 7.
3. **Course Creation & Archiving**: Owned by Coordinator (Developer 3).

---

## 9. Git Working-Tree & Branch Status

- **Branch**: `team1`
- **No commit, push, merge, reset, or branch switch has occurred.**
