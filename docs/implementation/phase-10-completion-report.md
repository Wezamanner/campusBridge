# CampusBridge — Phase 10: At-Risk Student Monitoring
## Independent Implementation & Completion Report

- **Phase**: Phase 10 — At-Risk Student Monitoring
- **Module Authority**: CampusBridge Software Requirements Specification (SRS) v2.0
- **Team**: `team1`
- **Execution Mode**: Independent Implementation (Decoupled from Phases 6, 7, 8, 9)
- **Status**: Complete & Verified

---

## 1. Executive Summary

Phase 10 provides instructor-facing at-risk student monitoring capabilities to identify learners who require academic attention, intervention, or check-ins.

Crucially, Phase 10 was developed **independently** in an environment where upstream dependencies (Phase 6: Assignment Authoring, Phase 7: Student Submissions, Phase 8: Grading Queue, and Phase 9: Student Progress Analytics) are not yet fully active. Rather than fabricating fake data, creating mock collections, or inventing unapproved scoring algorithms, Phase 10 implements:

1. **Authoritative data providers** backed by verified active models (`Enrollment`, `Course`, `User`, `ActivityLog`).
2. **Decoupled provider architecture** with well-defined service interfaces for future Phase 6–9 data sources.
3. **Transparent data availability contracts**: indicators for which prerequisite data is missing explicitly return an `'insufficient_data'` state rather than treating missing data as zero or assuming students are safe.
4. **Strict SRS v2.0 alignment**: evaluates only the three flag dimensions explicitly named in SRS UC-I03 (`lowProgress`, `missedDeadlines`, `inactivity`) without arbitrary numeric cutoffs (confirming row 83 of `docs/api/srs-compliance-matrix.md`).

---

## 2. SRS Requirement & Traceability Mapping

| SRS / Spec ID | Description | Implementation Status | Technical Mechanism |
|---|---|---|---|
| **UC-I03** | **Monitor at-risk students**: Lists flagged students (low progress, missed deadlines, inactivity). Send a message if needed. If no students at risk, inform instructor. | **Fully Implemented** | `atRisk.service.js` evaluation engine, `GET /api/v1/instructor/at-risk`, `AtRiskMonitoringPage.jsx` |
| **FR-16** | **Role-based dashboards**: Instructors see grading queue, at-risk students, courses. | **Fully Implemented** (At-risk portion) | `GET /api/v1/instructor/at-risk/summary` feeds live at-risk stat card and preview table in `InstructorDashboard.jsx` |
| **FR-44** | **Dashboard analytics**: Instructors see grading and risk figures. | **Fully Implemented** (Risk figures) | Summary aggregator provides `totalEnrolled`, `totalAtRisk`, and `totalSafe` |
| **FR-02** | **Role-based access control**: Restrict access by role and ownership. 401 unauthenticated, 403 forbidden. | **Fully Implemented** | `authenticate`, `authorize('instructor')`, server-side instructor course scoping |
| **SEC-04** | **Server-side ownership verification**: Instructors access only their own assigned courses and enrolled students. | **Fully Implemented** | Instructor ID extracted strictly from verified JWT (`req.user._id`); course assignment verified against `Course.instructorId` |
| **FR-09** | **Progress calculation**: Progress per course and overall from submitted work. | **Partially Implemented** (Boundary Defined) | Reads `Progress` collection if records exist; returns `insufficient_data` when absent |
| **FR-06 / FR-07** | **Assignments & Submissions**: Missed deadlines evaluation. | **Partially Implemented** (Boundary Defined) | Evaluates overdue assignments and student submissions when present; returns `insufficient_data` when none exist |

---

## 3. Implemented Functionality Status

### A. Fully Implemented Functionality
- **Instructor Course Enrollee Aggregation**: Resolves all students actively enrolled in courses assigned to the authenticated instructor.
- **Inactivity Risk Indicator**: Evaluates whether a student has recorded actions in the authoritative `ActivityLog` collection (`inactivity` flag).
- **At-Risk Student Listing & Filtering**: Provides searching, course-code filtering, flag-type filtering, and flag-count sorting.
- **Individual Student Risk Assessment**: Deep-dive inspection of a student's indicators, reasons, enrollment date, and course context.
- **Monitoring Summary for Dashboard**: Aggregated metrics for live display on instructor stat cards (`totalEnrolled`, `totalAtRisk`, `totalSafe`).
- **Data Availability Reporting**: Comprehensive status reporting detailing which providers are active and which future phases block full data.
- **Role-Based Security & Isolation**: Strict JWT authentication, instructor role guard, and server-side course assignment enforcement.

### B. Partially Implemented Functionality (Data-Dependent)
- **Low Progress Indicator (`lowProgress`)**: Fully modeled and evaluated against the `Progress` collection. If progress records exist for an enrollment, the flag evaluates dynamically (0% with assignments = flagged; >0% = safe). If no progress record exists (due to pending Phase 7/8), it cleanly returns `insufficient_data`.
- **Missed Deadlines Indicator (`missedDeadlines`)**: Fully modeled and evaluated against `Assignment` and `Submission` collections. If past-deadline assignments exist, evaluates whether submissions were made. If no assignments or past deadlines exist (pending Phase 6/7), it cleanly returns `insufficient_data`.

### C. Functionality Blocked by Missing Dependencies
- **Assignment Performance Analytics (Scores & Feedback Trends)**: Blocked by Phase 6 (Assignment Authoring), Phase 7 (Student Submissions), and Phase 8 (Grading Queue). Clean service interface stubbed to return `{ available: false }`.
- **Progress Trend Analytics (Velocity & Longitudinal Progress)**: Blocked by Phase 9 (Student Progress Analytics). Clean service interface stubbed to return `{ available: false }`.

---

## 4. Backend Architecture

The backend implementation follows the layered architecture prescribed by CampusBridge (`server/src/services/`, `server/src/controllers/`, `server/src/routes/`):

```
server/src/
├── services/
│   └── atRisk.service.js       # Core monitoring domain logic & decoupled data providers
├── controllers/
│   └── atRisk.controller.js    # Express route handlers, query validation, response shaping
├── routes/
│   └── atRisk.routes.js        # Protected instructor routes with RBAC middleware
└── server.js                   # Registered at /api/v1/instructor/at-risk
```

### Decoupled Data Provider Interfaces

```
                    ┌──────────────────────────────────────────────┐
                    │            getAtRiskStudents()               │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬───────────────────┐
         │                  │                    │                   │
         ▼                  ▼                    ▼                   ▼
┌──────────────────┐ ┌──────────────┐ ┌────────────────────┐ ┌──────────────┐
│  Enrollment Data │ │Activity Data │ │  Progress Data     │ │Submission    │
│  Provider        │ │Provider      │ │  Provider          │ │Status        │
│  (Phase 4)       │ │(Phase 1 Log) │ │  (Cond. Phase 9)   │ │Provider      │
│  [ACTIVE]        │ │[ACTIVE]      │ │  [ACTIVE/FALLBACK] │ │(Cond. Ph 6-8)│
└──────────────────┘ └──────────────┘ └────────────────────┘ └──────────────┘
                                                 │                   │
                                                 ▼                   ▼
                                      ┌──────────────────────────────────────┐
                                      │ Future Phase Integration Boundaries: │
                                      │ • assignmentPerformanceProvider()    │
                                      │ • progressAnalyticsProvider()        │
                                      │ (Return { available: false })        │
                                      └──────────────────────────────────────┘
```

---

## 5. Approved API Endpoints

All endpoints are registered under `/api/v1/instructor/at-risk` and require Bearer JWT authentication and `role: 'instructor'`.

### 1. `GET /api/v1/instructor/at-risk/summary`
- **Description**: Lightweight statistics for dashboard cards (FR-16, FR-44).
- **Access**: Instructor only.
- **Sample Response**:
  ```json
  {
    "success": true,
    "message": "At-risk monitoring summary retrieved.",
    "data": {
      "summary": {
        "totalEnrolled": 24,
        "totalAtRisk": 3,
        "totalSafe": 21,
        "evaluatedAt": "2026-11-11T09:30:00.000Z"
      },
      "dataAvailability": { ... }
    },
    "pagination": null
  }
  ```

### 2. `GET /api/v1/instructor/at-risk/indicators`
- **Description**: Metadata on all defined indicators, their data sources, and dependency requirements.
- **Access**: Instructor only.

### 3. `GET /api/v1/instructor/at-risk`
- **Description**: Lists all flagged at-risk students across assigned courses (UC-I03).
- **Query Filters**: `courseCode`, `flag` (`lowProgress` | `missedDeadlines` | `inactivity`).
- **Access**: Instructor only (scoped strictly to instructor's assigned courses).

### 4. `GET /api/v1/instructor/at-risk/:studentId?courseId=:courseId`
- **Description**: Full risk assessment for an individual student in a specific course.
- **Access**: Instructor only (enforces course assignment and student enrollment).

---

## 6. Risk Assessment Rules

In strict compliance with the **SRS Compliance Matrix (row 83)**, arbitrary numeric cutoffs (such as "under 50% progress" or "2 missed assignments") are **not** hardcoded.

Evaluation rules strictly follow the explicit taxonomy in SRS UC-I03:

1. **`inactivity`**:
   - `lastActivityAt === null` (no recorded actions in `ActivityLog`) $\rightarrow$ `'flagged'`
   - `lastActivityAt !== null` $\rightarrow$ `'not_flagged'`

2. **`lowProgress`**:
   - No `Progress` record found $\rightarrow$ `'insufficient_data'`
   - `Progress` record exists and `totalAssignments === 0` $\rightarrow$ `'insufficient_data'`
   - `Progress` record exists and `percent === 0` with `totalAssignments > 0` $\rightarrow$ `'flagged'`
   - `Progress` record exists and `percent > 0` $\rightarrow$ `'not_flagged'`

3. **`missedDeadlines`**:
   - No past-deadline assignments in course $\rightarrow$ `'insufficient_data'`
   - Overdue assignments exist and `overdueCount > 0` $\rightarrow$ `'flagged'`
   - Overdue assignments exist and `overdueCount === 0` $\rightarrow$ `'not_flagged'`

4. **Overall At-Risk Determination**:
   - A student is flagged as at-risk if **any** active indicator is `'flagged'`.
   - Indicators returning `'insufficient_data'` do **not** trigger a false flag, nor do they suppress a student with another flagged indicator.

---

## 7. Frontend Components

The Phase 10 frontend follows the existing CampusBridge React design system (Tailwind CSS, Lucide icons, Dark/Light theme, Dashboard card wrappers):

1. **`RiskFlagBadge.jsx`**:
   - Visual badges for `'flagged'` (Rose), `'not_flagged'` (Emerald), and `'insufficient_data'` (Amber).
   - `DataAvailabilityNotice` rendering missing phase prerequisites.
2. **`AtRiskMonitoringPage.jsx` (`/instructor/students`)**:
   - Full monitoring dashboard with search, flag filter, course dropdown filter, and responsive data table.
   - Expandable inline `StudentDetailPanel` showing per-indicator reasoning and timestamps.
3. **`InstructorDashboard.jsx` (`/instructor/dashboard`)**:
   - Replaced placeholder values with live data calls to `fetchAtRiskSummary()` and `fetchAtRiskStudents()`.
   - Live stat card showing actual at-risk student counts and a preview table linking directly to the full monitoring dashboard.
4. **`atRisk.js` (API Service)**:
   - Clean client service wrapper with automatic JWT injection via the shared `api` client.

---

## 8. Automated Testing & Verification

### Test Suites Executed

1. **Phase 10 Dedicated Test Suite (`server/src/utils/testAtRisk.js`)**:
   - **44 Passed / 0 Failed**
   - Validates all 3 indicator evaluations, threshold-free logic, aggregator behavior, unauthenticated rejection (401), role-based restriction (403), JWT identity injection, student privacy sanitization, ObjectId validation, response shape conformance, insufficient-data handling, and integration boundary stability.

2. **Phase 2 Profile & CV Regression Suite (`server/src/utils/testProfile.js`)**:
   - **35 Passed / 0 Failed**
   - Validates zero regression across profile sanitization, file uploads, permissions, and security rules.

3. **Backend Syntax & Lint Verification**:
   - `node --check` executed on `server.js`, `atRisk.service.js`, `atRisk.controller.js`, `atRisk.routes.js` $\rightarrow$ **0 syntax errors**.

4. **Frontend Production Build**:
   - `vite build` $\rightarrow$ **Built successfully in 2.11s** (0 compilation errors).

---

## 9. Future Integration Interfaces (Phases 6–9)

When Phases 6, 7, 8, and 9 are implemented, they can seamlessly connect to `atRisk.service.js` without altering the core monitoring logic:

1. **Phase 6–8 (Assignment & Grading Integration)**:
   - Replace `assignmentPerformanceProvider` with queries against the completed `Grade` collection to enrich the `missedDeadlines` indicator with score trends and feedback velocity.
2. **Phase 9 (Student Progress Analytics Integration)**:
   - Connect `progressAnalyticsProvider` to consume computed trajectory metrics from the Phase 9 analytics engine.

---

## 10. Git Status & Safety Confirmation

- **Current Branch**: `team1`
- **Working Tree**: Contains only Phase 10 implementation files, tests, and documentation.
- **Git Restrictions Respected**: No commits made, no push executed, branches not switched, `main` and `mergeBranch` untouched.
