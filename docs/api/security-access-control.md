# CampusBridge API: Security, Authorization & Access-Control Architecture
## Strict SRS v2.0 Compliance Baseline

- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (SEC-01 to SEC-12, Section 9)
- **Base URI Prefix**: `/api/v1`

---

## 1. Security Rules Architecture

CampusBridge implements defense-in-depth security spanning authentication, role-based access control (RBAC), fine-grained object ownership verification, contextual course-enrollment guards, and strict file validation.

The system reuses the centralized authentication middleware located in `server/src/middleware/auth.js` and adheres strictly to the SRS security specifications.

---

## 2. The 10 Mandatory Security Rules

| # | Security Rule | Implementation Mechanism | Enforcement Layer | Relevant SRS ID |
|---|---|---|---|---|
| **1** | Students can only access and modify their own private records. | `checkOwnership((req) => req.user._id)` | Express route middleware & controller query filters | SEC-04, FR-02 |
| **2** | Students cannot access another student's submissions, grades, CV, or private progress. | Route-level student ID match; rejection with `403 Forbidden` | `checkOwnership` middleware & Mongoose queries | SEC-04, FR-02 |
| **3** | Instructors can only manage courses assigned to them. | Query verification: `course.instructorId.toString() === req.user._id.toString()` | `checkInstructorCourseAssignment` middleware | FR-04, FR-06 |
| **4** | Instructors can only grade submissions belonging to their assigned courses. | Query joins submission -> assignment -> course, verifying instructor assignment | Grading controller & route middleware | FR-08, SEC-04 |
| **5** | Students must be actively enrolled before accessing enrollment-restricted course resources and assignments. | Verification against `Enrollment` collection `{ studentId, courseId }` | `checkStudentEnrollment` middleware | FR-05, SEC-04 |
| **6** | Coordinator-only operations remain Coordinator-only. | `authorize('coordinator')` | Route-level RBAC middleware | FR-02, SEC-01 |
| **7** | Administrator-only operations remain Administrator-only. | `authorize('admin')` | Route-level RBAC middleware | FR-02, SEC-01 |
| **8** | File upload restrictions enforced on backend, not just frontend. | Multer configuration + MIME type inspection + size limits | Upload middleware (`uploadCv`, `uploadSubmission`) | SEC-07, FR-07, FR-23 |
| **9** | Never expose password hashes or sensitive user data. | Mongoose `select: false`, `.toJSON()` sanitization, redaction in logs | Model schema & JSON serialization | SEC-02, SEC-12 |
| **10** | Validate all MongoDB ObjectIds, request bodies, and file inputs. | Schema-level validation, regex checks, and `mongoose.isValidObjectId` | Validation middleware & controller input sanitizers | SEC-06, SEC-11 |

---

## 3. Role Permission Matrix (Audited Approved Operations)

| Endpoint Path | Method | Allowed Roles | Ownership / Context Guard | Relevant SRS ID |
|---|---|---|---|---|
| `/api/v1/auth/me` | GET | All authenticated roles | Current user | FR-01 |
| `/api/v1/profile` | GET, PUT | All authenticated roles | Own record (`req.user._id`) | FR-03, FR-38 |
| `/api/v1/profile/cv` | POST | `student` | Own record (`req.user._id`) | FR-23, SEC-07 |
| `/api/v1/courses` | GET | All authenticated roles | Filtered by role | FR-04, FR-05 |
| `/api/v1/courses/:id` | GET | All authenticated roles | Public active course metadata | FR-05 |
| `/api/v1/courses/:id/enroll` | POST | `student` | Duplicate enrollment check | FR-05 |
| `/api/v1/courses/:id/resources` | GET | `student`, `instructor` | Requires enrollment or assigned instructor | FR-05 |
| `/api/v1/courses/:id/resources` | POST | `instructor` | Assigned instructor only | FR-04 |
| `/api/v1/assignments` | GET | `student`, `instructor` | Enrolled or assigned courses | FR-06, FR-07 |
| `/api/v1/assignments/:id` | GET | `student`, `instructor` | Enrolled or assigned courses | FR-06, FR-07 |
| `/api/v1/courses/:id/assignments` | POST | `instructor` | Assigned instructor only | FR-06 |
| `/api/v1/assignments/:id/submissions` | POST | `student` | Enrolled student only | FR-07 |
| `/api/v1/instructor/submissions` | GET | `instructor` | Assigned courses only | FR-08 |
| `/api/v1/submissions/:id/grade` | PATCH | `instructor` | Assigned instructor only | FR-08 |
| `/api/v1/internships` | GET | All authenticated roles | Open internships | FR-10 |
| `/api/v1/internships/:id` | GET | All authenticated roles | Open internship details | FR-10 |
| `/api/v1/internships/:id/applications` | POST | `student` | Enforces one application per student | FR-11 |
| `/api/v1/applications` | GET | `student` | Own applications only | FR-11 |
| `/api/v1/applications/:id/status` | PATCH | `student` | Student can only withdraw own application | FR-11, FR-12 |
| `/api/v1/progress` | GET | `student`, `instructor` | Student: own progress; Instructor: own courses | FR-09 |
| `/api/v1/achievements` | GET | `student` | Own achievements | FR-17 |
| `/api/v1/rankings` | GET | `student` | First names and initials only (privacy rule) | FR-17 |
| `/api/v1/projects` | GET, POST | `student` | Own projects only (ASM-02) | FR-27, FR-28 |
| `/api/v1/projects/:id` | PUT, DELETE | `student` | Own project only (ASM-02) | FR-29 |
| `/api/v1/tasks` | GET, POST | `student` | Own tasks only (ASM-02, ASM-04) | FR-30, FR-31 |
| `/api/v1/tasks/:id` | PATCH, DELETE | `student` | Own task only (ASM-02) | FR-32 |
| `/api/v1/ai/study-plan` | POST | `student` | Read-only guidance (CON-05) | FR-19 |
| `/api/v1/ai/ask` | POST | `student` | Read-only guidance (CON-05) | FR-20 |
| `/api/v1/ai/internship-matches` | GET | `student` | Read-only guidance (CON-05) | FR-21 |
| `/api/v1/notifications` | GET | All authenticated roles | Own notifications only | FR-14, FR-25 |
| `/api/v1/notifications/unread-count` | GET | All authenticated roles | Own count only | FR-25, FR-43 |
| `/api/v1/notifications/:id/read` | PATCH | All authenticated roles | Own notification only | FR-25 |
| `/api/v1/notifications/read-all` | PATCH | All authenticated roles | Own notifications only | FR-25 |
| `/api/v1/messages/conversations` | GET | All authenticated roles | Own threads only | FR-34 |
| `/api/v1/messages/with/:userId` | GET | All authenticated roles | Own history only | FR-34 |
| `/api/v1/messages` | POST | All authenticated roles | Enforces ASM-05 allowed pairing | FR-33 |
| `/api/v1/activity/recent` | GET | All authenticated roles | Own recent actions | FR-35, FR-36 |
| `/api/v1/activity/weekly` | GET | All authenticated roles | Own activity counts | FR-37 |
| `/api/v1/search` | GET | All authenticated roles | Resources permitted to user role | FR-42 |

---

## 4. Privacy & Messaging Pairing Enforcement (ASM-05)

1. **Student Isolation**: No endpoint accepts an external student ID parameter allowing access to another student's CV, submissions, grades, or private progress. `req.user._id` is strictly injected from the verified JWT.
2. **Cohort Privacy (FR-17)**: Rankings display only first names and initials (e.g. `Alex R.`), preventing full identity exposure across cohorts.
3. **Messaging Permissions (ASM-05)**:
   - Students may initiate messages to:
     - Instructors teaching courses the student is actively enrolled in.
     - Platform Coordinators.
   - Student-to-student messaging is strictly forbidden and rejected with `403 Forbidden` (`"Direct messaging between students is not permitted."`).
   - Staff may message any permitted user.
