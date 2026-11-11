# CampusBridge — Phase 10: At-Risk Student Monitoring
## Final Independent Implementation & Compliance Audit Report

- **Audit Date**: 2026-11-11
- **Target Branch**: `team1`
- **Scope**: Phase 10 (At-Risk Student Monitoring) Independent Implementation
- **Authoritative Baseline**: CampusBridge SRS v2.0 (`docs/srs/srs.txt`), `docs/api/srs-compliance-matrix.md`, `docs/api/instructor-api-spec.md`, `docs/api/security-access-control.md`
- **Auditor Role**: Independent Software Quality & Compliance Auditor

---

## 1. Executive Verdict

### **VERDICT: PASS (ALL APPROVED DEFECTS RESOLVED & VERIFIED)**

The Phase 10 implementation on branch `team1` successfully accomplishes its primary objective: delivering an independent, instructor-facing At-Risk Student Monitoring feature without implementing or faking unfinished upstream phases (Phase 6: Assignment Authoring, Phase 7: Student Submissions, Phase 8: Grading Queue, Phase 9: Student Progress Analytics).

All 5 approved corrections (D-1 through D-5) have been implemented and independently verified:
- **D-1 (Missed Deadline Logic)**: Corrected indicator behavior to return `not_flagged` (0 missed) when assignments exist in a course but no deadlines have passed yet, instead of returning false `insufficient_data`. Full regression tests added.
- **D-2 (API Documentation Synchronization)**: Synchronized `docs/api/instructor-api-spec.md` (Section 5.2) and `docs/api/openapi.yaml` to document the 4 dedicated Phase 10 endpoints under `/api/v1/instructor/at-risk/*`. Clarified `/progress` scope without claiming `/progress?flagged=true` is the active endpoint.
- **D-3 (Unique Student Aggregation)**: Updated `getAtRiskStudents` to deduplicate students across courses using unique `Set` tracking. `totalEnrolled`, `totalAtRisk`, and `totalSafe` strictly reflect unique students without double-counting multi-course enrollments.
- **D-4 (Test Quality & Service Exports)**: Exported core evaluation functions from `atRisk.service.js` (`evaluateInactivity`, `evaluateLowProgress`, `evaluateMissedDeadlines`, `computeAtRiskStatus`) and refactored `testAtRisk.js` to exercise production code directly.
- **D-5 (Inactivity Ambiguity Documentation)**: Documented the unresolved SRS UC-I03 inactivity time horizon ambiguity without inventing an arbitrary cutoff, maintaining strict SRS compliance.

**Key Strengths**:
- **Zero Mock / Fabricated Data**: No fake student, submission, or progress records were introduced.
- **Honest Data Availability Architecture**: When prerequisite data from Phases 6–9 is absent, indicators explicitly evaluate to `insufficient_data` with user-facing explanations, rather than falsely classifying students as safe or assuming zero progress.
- **Robust Access Control**: All endpoints enforce authentication and instructor-only RBAC via verified JWT tokens. Server-side ownership verification guarantees instructors can only access students enrolled in their own assigned courses.
- **Clean Decoupling**: Well-defined provider boundaries exist for future Phase 6–9 integration (`assignmentPerformanceProvider`, `progressAnalyticsProvider`).
- **Zero Build or Syntax Regressions**: Backend passes `node --check`, frontend production build completes with 0 errors, and the regression test suite passes 47/47 at-risk tests and 35/35 profile tests.

---

## 2. SRS Requirement & Compliance Audit

| Requirement / Spec ID | SRS Requirement Summary | Implementation State | Audit Findings & Verification |
|---|---|---|---|
| **UC-I03** | Monitor at-risk students: lists flagged students (low progress, missed deadlines, inactivity). Send a message if needed. If no students at risk, inform instructor. | **PASS** | Fully implemented in `atRisk.service.js`, `atRisk.controller.js`, and `AtRiskMonitoringPage.jsx`. Evaluates all 3 flags; displays empty state when none are at risk. |
| **FR-16** | Role-based dashboards: instructors view courses, grading queue, and at-risk students. | **PASS** | `InstructorDashboard.jsx` stat card and preview table fetch live figures via `GET /api/v1/instructor/at-risk/summary` and `GET /api/v1/instructor/at-risk`. |
| **FR-44** | Dashboard analytics: instructors view grading and risk figures. | **PASS** | Risk figures (`totalEnrolled`, `totalAtRisk`, `totalSafe`) computed and returned in standard response envelope. |
| **FR-02** | Role-based access control: every page and endpoint restricted by role and ownership. 401 when unauthenticated, 403 when forbidden. | **PASS** | Route middleware `authenticate` and `authorize('instructor')` applied in `atRisk.routes.js`. Verified server-side. |
| **SEC-04** | Server-side role & ownership: instructors reach only their own courses and students. | **PASS** | Instructor identity strictly extracted from JWT (`req.user._id`). Course assignment verified against `Course.instructorId`. |
| **Compliance Matrix Row 83** | "Numeric At-Risk Thresholds" (e.g. 50% cutoff, 2 missed deadlines) REMOVED from approved contract. | **PASS** | Implementation invents no numeric formulas or arbitrary cutoffs. Flags are threshold-free and grounded in authoritative data. |

---

## 3. Risk-Indicator Logic Audit

### A. Inactivity Indicator (`inactivity`)
- **Data Source**: `ActivityLog` collection (`server/src/models/ActivityLog.js`).
- **Association**: Correctly queries `{ userId: { $in: studentIds } }`.
- **Latest Timestamp**: Extracted via aggregation `$group: { _id: '$userId', lastActivityAt: { $first: '$createdAt' } }` sorted by `createdAt: -1`.
- **Scoping**: Activity logging in CampusBridge (FR-35/36/37) is platform-wide per student. It is not partitioned by course.
- **Threshold Integrity**: No arbitrary time cutoff (e.g., 7 or 14 days) was invented.
- **Identified Issue (Spec Ambiguity)**: A student with zero activity logs is flagged (`status: 'flagged'`). However, a student with any activity log entry (even months ago) evaluates to `not_flagged`. The SRS v2.0 names "inactivity" but does not define a time horizon. This is an unresolved specification ambiguity.

### B. Low Progress Indicator (`lowProgress`)
- **Data Source**: `Progress` collection (`server/src/models/Progress.js`).
- **Missing Data Handling**: When no progress record exists for a student in a course, it evaluates to `status: 'insufficient_data'` with a descriptive reason. Missing data is **never** treated as zero progress or safe.
- **Threshold Integrity**: Does not enforce arbitrary cutoffs (e.g., `<50%`). Only flags when assignments exist in the course and the student has recorded 0% progress (`percent === 0 && totalAssignments > 0`). If `totalAssignments === 0`, it returns `insufficient_data`.

### C. Missed Deadlines Indicator (`missedDeadlines`)
- **Data Source**: `Assignment` and `Submission` collections (`server/src/models/Assignment.js`, `server/src/models/Submission.js`).
- **Deadlines**: Queries assignments where `deadline < now`.
- **Submission Matching**: Matches submissions against overdue assignment IDs per student.
- **Identified Defect (Edge Case)**: Lines 183–189 of `atRisk.service.js` query only overdue assignments (`deadline: { $lt: now }`). If a course has assignments but none have reached their deadline yet, `overdueAssignments` is empty. The function returns an empty map, causing `evaluateMissedDeadlines` to return `insufficient_data` with the message *"No past-deadline assignments found for this course. This indicator requires Phase 6 (assignment creation) to be active."* If assignments exist and none are past due, the student has not missed any deadlines (`not_flagged` with 0 missed), rather than indicating Phase 6 is inactive.

### D. Risk Aggregation
- **Aggregator Logic**: `isAtRisk` is true if any flag evaluates to `'flagged'`.
- **Insufficient Data Safety**: Flags with `'insufficient_data'` do not falsely trigger an at-risk state, nor do they suppress students with other active flags.
- **Identified Issue (Enrollment vs. Student Count)**: Lines 464–520 of `atRisk.service.js` aggregate at the **enrollment level** (student $\times$ course). If Student A is enrolled in two courses taught by the same instructor and is inactive, Student A is evaluated twice, incrementing `totalAtRisk` by 2 and `totalEnrolled` by 2. The UI table displays student-course rows correctly, but the dashboard stat card displays the value under the label "At-Risk Students".

---

## 4. Backend API & Security Audit

### Evaluated Endpoints

#### 1. `GET /api/v1/instructor/at-risk/summary`
- **Authentication**: Enforced (`401` if missing/invalid token).
- **Authorization**: Enforced (`403` if role is student, coordinator, or admin).
- **Ownership**: Scoped to courses where `instructorId === req.user._id`.
- **Payload Shape**: Conforms to shared API standards (`{ success, message, data: { summary, dataAvailability }, pagination: null }`).

#### 2. `GET /api/v1/instructor/at-risk/indicators`
- **Authentication**: Enforced.
- **Authorization**: Enforced (`role: 'instructor'`).
- **Payload Shape**: Returns metadata array for all 5 indicators (3 active, 2 future-blocked).

#### 3. `GET /api/v1/instructor/at-risk`
- **Authentication**: Enforced.
- **Authorization**: Enforced (`role: 'instructor'`).
- **Ownership**: Scoped strictly to instructor's assigned courses.
- **Query Filters**: `courseCode` (normalized uppercase string) and `flag` (whitelisted to `['lowProgress', 'missedDeadlines', 'inactivity']`).
- **Sanitization**: Password hash, CV file path, and private internal notes are excluded at the query level (`select('_id name email program year')`).

#### 4. `GET /api/v1/instructor/at-risk/:studentId?courseId=:courseId`
- **Authentication**: Enforced.
- **Authorization**: Enforced (`role: 'instructor'`).
- **Input Validation**: Both `studentId` and `courseId` are validated via `mongoose.isValidObjectId()`. Rejects invalid IDs with `400 Bad Request`.
- **Ownership & Enrollment**: Checks `Course.findOne({ _id: courseId, instructorId: req.user._id })` and `Enrollment.findOne({ studentId, courseId })`. Returns `404` if not assigned or not enrolled, preventing enumeration.

### Specification Routing Discrepancy
- In `docs/api/instructor-api-spec.md` (Section 5.2) and `docs/api/openapi.yaml`, the endpoint was originally documented as `GET /api/v1/progress?flagged=true`.
- To avoid prematurely implementing the Phase 9 Progress API (`/api/v1/progress`), Phase 10 was mounted at `/api/v1/instructor/at-risk/*`.
- **Finding**: The documentation in `instructor-api-spec.md` and OpenAPI should be updated to reflect `/api/v1/instructor/at-risk/*`, or an alias route should be established when Phase 9 is implemented.

---

## 5. Frontend Integration Audit

- **`client/src/App.jsx`**: Routes `/instructor/students` and `/instructor/at-risk` are guarded with `<ProtectedRoute allowedRoles={['instructor']}>`. Unauthenticated users are redirected to login; unauthorized roles to their own dashboards.
- **`client/src/pages/instructor/AtRiskMonitoringPage.jsx`**:
  - Displays loading skeleton (`LoadingState`) during fetches.
  - Displays error banner on network/API failure.
  - Displays `EmptyState` when no students are flagged.
  - Client-side search filters by name, email, course, and program without reloading.
  - Includes `DataAvailabilityNotice` explaining unavailable indicators.
- **`client/src/pages/instructor/InstructorDashboard.jsx`**:
  - Hardcoded demonstration submission records were completely removed.
  - The "At-Risk Students" stat card and preview table bind to live API data.
  - Links directly to `/instructor/students`.
- **`client/src/components/atRisk/RiskFlagBadge.jsx`**:
  - High visual contrast: Rose (`Flagged`), Emerald (`OK`), Amber (`No Data`).
- **No Mock Data**: No hardcoded student or risk objects remain in the active UI flow.

---

## 6. Test Verification & Actual Execution Results

### 1. Phase 10 Automated Test Suite
- **Command**: `cd server && node src/utils/testAtRisk.js`
- **Actual Result**: `47 Passed, 0 Failed`
- **Audit Evaluation**:
  - Direct import and invocation of production evaluation functions (`evaluateInactivity`, `evaluateLowProgress`, `evaluateMissedDeadlines`, `computeAtRiskStatus`).
  - D-1 regression tests verified across 5 required scenarios (future deadlines, overdue unsubmitted, completed submissions, missing assignments, missing submission tracking).
  - D-3 multi-course unique-student deduplication verified.
  - Covers indicator evaluation logic, boundary condition handling, input validation, and response shapes.

### 2. Phase 2 Profile & CV Regression Suite
- **Command**: `cd server && node src/utils/testProfile.js`
- **Actual Result**: `35 Passed, 0 Failed`
- **Audit Evaluation**: Confirms zero regression in shared authentication, sanitization, and profile schemas.

### 3. Backend Syntax Check
- **Command**: `cd server && node --check src/server.js src/services/atRisk.service.js src/controllers/atRisk.controller.js src/routes/atRisk.routes.js`
- **Actual Result**: `0 syntax errors` (exited with code 0).

### 4. Frontend Production Build
- **Command**: `cd client && npm run build` (`vite build`)
- **Actual Result**: `✓ built in 2.05s` (2,118 modules transformed, 0 build errors).

---

## 7. Git & Working Tree Audit

- **Current Branch**: `team1` (confirmed via `git branch --show-current`).
- **Git State**: All working-tree changes remain unstaged. No commits (`git commit`) and no pushes (`git push`) were performed.
- **Branch Scope**: Branches `main`, `mergeBranch`, and `team2` remain completely untouched.
- **Modified Files**:
  - `client/src/App.jsx` (added Phase 10 instructor routes)
  - `client/src/pages/instructor/InstructorDashboard.jsx` (wired live at-risk data, removed demo submissions)
  - `docs/api/instructor-api-spec.md` (updated Section 5.2 for Phase 10 dedicated endpoints)
  - `docs/api/openapi.yaml` (added 4 at-risk endpoints and documented decoupling from `/progress`)
  - `server/package.json` (added `test:at-risk` npm script)
  - `server/src/server.js` (registered `/api/v1/instructor/at-risk` router)
- **Untracked Phase 10 Files**:
  - `client/src/components/atRisk/RiskFlagBadge.jsx`
  - `client/src/pages/instructor/AtRiskMonitoringPage.jsx`
  - `client/src/services/atRisk.js`
  - `docs/implementation/phase-10-completion-report.md`
  - `docs/implementation/phase-10-final-audit-report.md`
  - `server/src/controllers/atRisk.controller.js`
  - `server/src/routes/atRisk.routes.js`
  - `server/src/services/atRisk.service.js`
  - `server/src/utils/testAtRisk.js`

---

## 8. Defect Log & Resolution Status

| # | Severity | File Path | Line Range | Defect Description | Resolution Status |
|---|---|---|---|---|---|
| **D-1** | Medium | `server/src/services/atRisk.service.js` | Lines 183–236, Lines 370–415 | **False `insufficient_data` when assignments exist with future deadlines**: When assignments exist in a course but none are overdue yet, `submissionStatusProvider` returns an empty map, causing `evaluateMissedDeadlines` to claim Phase 6 is inactive instead of recognizing that zero deadlines were missed. | **RESOLVED**: Updated `submissionStatusProvider` to check course assignment existence; `evaluateMissedDeadlines` now returns `status: 'not_flagged', missedCount: 0` when assignments exist but none are overdue. Verified by 5 regression tests. |
| **D-2** | Medium | `docs/api/instructor-api-spec.md`<br>`docs/api/openapi.yaml` | `instructor-api-spec.md`: L374–520<br>`openapi.yaml`: L330–500 | **Endpoint Specification Sync Discrepancy**: The pre-existing API draft specified `GET /api/v1/progress?flagged=true`. In Phase 10 independent implementation, the endpoints were mounted under `/api/v1/instructor/at-risk/*`. The API documentation was not synchronized. | **RESOLVED**: Both documents updated to document all 4 endpoints (`/summary`, `/indicators`, `GET /`, `/:studentId`), their roles, parameters, responses, and security guards. Validated via `python3 yaml.safe_load`. |
| **D-3** | Low | `server/src/services/atRisk.service.js` | Lines 484–545 | **Metric Duplication for Multi-Course Students**: Students enrolled in multiple courses under the same instructor are counted multiple times in `totalAtRisk` and `totalEnrolled`, rather than deduplicating unique students for the dashboard stat card. | **RESOLVED**: Aggregator in `getAtRiskStudents` now tracks unique student IDs across courses via `Set` data structures. `totalEnrolled = allStudentIds.size`, `totalAtRisk = atRiskStudentIds.size`, `totalSafe = totalEnrolled - totalAtRisk`. |
| **D-4** | Low | `server/src/utils/testAtRisk.js` | Lines 55–150 | **Inlined Evaluation Logic in Tests**: `testAtRisk.js` duplicated evaluation functions inline rather than exporting and importing them from `atRisk.service.js`. | **RESOLVED**: Production evaluation functions are now exported from `atRisk.service.js` and imported directly in `testAtRisk.js`. Inline duplicates eliminated. |
| **D-5** | Spec Ambiguity | `server/src/services/atRisk.service.js`<br>`docs/srs/srs.txt` | `atRisk.service.js`: L310–335 | **Unspecified Inactivity Horizon**: SRS UC-I03 does not define a time horizon for inactivity. The service flags only students with zero lifetime activity to avoid inventing a threshold, meaning dormant students with old activity are not flagged. | **DOCUMENTED**: Fully documented in this audit report. No arbitrary cutoff (e.g. 7 or 14 days) was invented, in strict accordance with Compliance Matrix row 83. Requires future SRS stakeholder clarification. |

---

## 9. Resolution Details & Implementation Verification

### D-1: Missed Deadlines Logic Correction
- In `server/src/services/atRisk.service.js`, `submissionStatusProvider` checks `Assignment.countDocuments({ courseId: { $in: courseIds } })`.
- If assignments exist for a course but none are overdue (`totalOverdueAssignments === 0`), `evaluateMissedDeadlines` returns `{ status: 'not_flagged', reason: 'Assignments exist for this course, but none are past deadline yet. No deadlines missed.', missedCount: 0 }`.
- If no assignments exist at all in the course, it returns `{ status: 'insufficient_data', reason: 'No assignments exist for this course. Missed deadlines requires Phase 6 (assignment creation) to be active.' }`.
- If an assignment is past deadline and unsubmitted, it returns `{ status: 'flagged', reason: 'Student has missed ... overdue assignment(s)...', missedCount: N }`.
- Regression suite in `testAtRisk.js` exercises all 5 mandated scenarios; all pass.

### D-2: API Documentation Alignment
- `docs/api/instructor-api-spec.md` updated under Section 5.2 to detail:
  - `GET /api/v1/instructor/at-risk/summary`
  - `GET /api/v1/instructor/at-risk/indicators`
  - `GET /api/v1/instructor/at-risk`
  - `GET /api/v1/instructor/at-risk/:studentId?courseId=:courseId`
- `docs/api/openapi.yaml` updated to define paths for all 4 endpoints, along with full request parameters, response schemas, and status codes. Clarified that `/progress` is planned for Phase 9 and does not implement at-risk monitoring. Python YAML parser confirmed valid syntax (41 paths).

### D-3: Unique Student Aggregation
- `getAtRiskStudents(instructorId, options)` deduplicates across assigned courses:
  - `allStudentIds = new Set()` tracks unique enrolled students.
  - `atRiskStudentIds = new Set()` tracks unique students with at least one active flag.
  - `totalSafe = allStudentIds.size - atRiskStudentIds.size`.
  - Ensures mathematical consistency (`totalEnrolled = totalAtRisk + totalSafe`).

### D-4: Test Coverage & Service Function Imports
- Functions exported from `server/src/services/atRisk.service.js`:
  - `evaluateInactivity(lastActivityAt)`
  - `evaluateLowProgress(progressRecord)`
  - `evaluateMissedDeadlines(submissionStatus)`
  - `computeAtRiskStatus(flags, reasons)`
- `server/src/utils/testAtRisk.js` imports these production functions directly, eliminating code duplication and ensuring tests validate production logic.

### D-5: Inactivity Specification Ambiguity (SRS UC-I03)
- **Specification Background**: SRS UC-I03 states: *"The system lists flagged students (low progress, missed deadlines, inactivity)..."*
- **Ambiguity**: The SRS provides no definition of what constitutes "inactivity" — neither a time window (e.g., 7 days, 14 days, 30 days) nor an inactivity metric.
- **SRS Compliance Policy**: Compliance Matrix row 83 explicitly states that arbitrary numeric thresholds were removed from the approved contract and must not be invented.
- **Implementation Decision**: In the absence of an approved time horizon, the monitoring service inspects `ActivityLog`. If a student has zero lifetime activity records (`lastActivityAt === null`), the student is flagged (`status: 'flagged'`). If any activity has been recorded, the student evaluates to `not_flagged` with a timestamp note.
- **Recommendation**: Stakeholders should establish an official time horizon (e.g., in a future SRS revision) before any sliding time cutoff is implemented.

---

## 10. Confirmation of Safety Constraints

In accordance with explicit safety instructions:
- Current branch confirmed: `team1`.
- **No commits (`git commit`) and no pushes (`git push`)** have been executed.
- **No git reset, clean, stash, or checkout** was performed.
- All pre-existing working-tree modifications have been preserved.
- Phases 6, 7, 8, and 9 remain unimplemented.
- No invented numeric thresholds or business rules were added.
- All modifications are strictly limited to the approved corrections D-1 through D-5.
