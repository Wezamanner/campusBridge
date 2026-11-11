# CampusBridge API Specification: Instructor Module
## Strict SRS v2.0 Compliance Baseline

- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0
- **Module Ownership**: Developer 1 & Developer 2 (Student & Instructor Stream)
- **Base URI Prefix**: `/api/v1`
- **Security & RBAC**: Bearer JWT (`Authorization: Bearer <token>`); Role must be `'instructor'`; Account must be active (`active: true`).
- **Course Assignment Guard**: Instructors can only manage and grade courses assigned to them by Coordinators (`course.instructorId === req.user._id`).

---

## 1. Functional Group A: Instructor Profile Management (FR-03, FR-38, FR-39)

### 1.1. Retrieve Own Profile
- **Endpoint**: `GET /api/v1/profile`
- **SRS Traceability**: FR-03, FR-38
- **Role Permissions**: `instructor` (Self only)
- **Description**: Returns instructor's profile: `name`, `email`, `role`, `department`, and `preferences.theme`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully.",
    "data": {
      "id": "6732e8f1e4b02a1b9c8d2a10",
      "name": "Dr. Sarah Jenkins",
      "email": "sarah.jenkins@campusbridge.edu",
      "role": "instructor",
      "active": true,
      "department": "Computer Science & Engineering",
      "preferences": {
        "theme": "dark"
      }
    },
    "pagination": null
  }
  ```

---

### 1.2. Update Own Profile & Preferences
- **Endpoint**: `PUT /api/v1/profile`
- **SRS Traceability**: FR-03, FR-38, FR-39
- **Validation**:
  - `name`: String, 2 to 100 characters.
  - `department`: String, max 100 characters.
  - `preferences.theme`: Enum (`dark`, `light`).
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah Jenkins",
    "department": "Department of Computer Science",
    "preferences": {
      "theme": "dark"
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Profile updated successfully.",
    "data": {
      "id": "6732e8f1e4b02a1b9c8d2a10",
      "name": "Dr. Sarah Jenkins",
      "department": "Department of Computer Science",
      "preferences": { "theme": "dark" }
    },
    "pagination": null
  }
  ```

---

## 2. Functional Group B: Assigned Courses & Learning Resources (FR-04, FR-05)

### 2.1. List Assigned Courses
- **Endpoint**: `GET /api/v1/courses`
- **SRS Traceability**: FR-04, FR-05, Section 12.3
- **Description**: Returns courses where `instructorId` matches the authenticated instructor.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assigned courses retrieved.",
    "data": [
      {
        "id": "6732f1a2e4b02a1b9c8d3e4f",
        "code": "CS301",
        "title": "Full-Stack Web Development",
        "description": "Modern full-stack web application development.",
        "status": "active"
      }
    ],
    "pagination": null
  }
  ```

---

### 2.2. View Assigned Course Details
- **Endpoint**: `GET /api/v1/courses/:id`
- **SRS Traceability**: FR-04, FR-05
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course details retrieved.",
    "data": {
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "code": "CS301",
      "title": "Full-Stack Web Development",
      "description": "Modern full-stack web application development.",
      "status": "active",
      "instructorId": "6732e8f1e4b02a1b9c8d2a10"
    },
    "pagination": null
  }
  ```

---

### 2.3. Upload Course Learning Resource
- **Endpoint**: `POST /api/v1/courses/:id/resources`
- **SRS Traceability**: FR-04, Section 12.3
- **Security Guard**: Assigned instructor only (`Course.instructorId === req.user._id`).
- **Validation**:
  - `title`: Required string, max 150 characters.
  - `type`: Enum (`pdf`, `document`, `slides`, `link`, `video`, `other`).
  - `url`: Required URL or file reference.
- **Request Body**:
  ```json
  {
    "title": "Week 2: Express Routing & Middleware Slides",
    "type": "slides",
    "url": "/uploads/resources/week2_slides.pdf"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Course resource added successfully.",
    "data": {
      "_id": "67331011e4b02a1b9c8dff11",
      "title": "Week 2: Express Routing & Middleware Slides",
      "type": "slides",
      "url": "/uploads/resources/week2_slides.pdf",
      "addedAt": "2026-11-10T00:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 2.4. View Course Learning Resources
- **Endpoint**: `GET /api/v1/courses/:id/resources`
- **SRS Traceability**: FR-05
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Resources retrieved.",
    "data": [
      {
        "_id": "67331011e4b02a1b9c8dff11",
        "title": "Week 2: Express Routing & Middleware Slides",
        "type": "slides",
        "url": "/uploads/resources/week2_slides.pdf",
        "addedAt": "2026-11-10T00:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

## 3. Functional Group C: Assignment Authoring (FR-06)

### 3.1. Create Assignment for Course
- **Endpoint**: `POST /api/v1/courses/:id/assignments`
- **SRS Traceability**: FR-06, Section 12.3
- **Security Guard**: Assigned instructor only (`Course.instructorId === req.user._id`).
- **Validation Rules (FR-06)**:
  - `title`: String, 3 to 200 characters.
  - `description`: Required string instructions.
  - `deadline`: Future Date.
  - `maxScore`: Number, 1 to 100 (default: 100).
  - `allowLate`: Boolean (default: false).
- **Post-Action**: Triggers notification to enrolled students (FR-14).
- **Request Body**:
  ```json
  {
    "title": "Lab 1: REST API with Express",
    "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
    "deadline": "2026-11-15T23:59:59.000Z",
    "maxScore": 100,
    "allowLate": false
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Assignment created successfully.",
    "data": {
      "id": "6732f7a4e4b02a1b9c8d4499",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "title": "Lab 1: REST API with Express",
      "deadline": "2026-11-15T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false
    },
    "pagination": null
  }
  ```

---

### 3.2. List and View Course Assignments
- **Endpoint**: `GET /api/v1/assignments`
- **SRS Traceability**: FR-06, Section 12.3
- **Query Parameters**: `courseId`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "title": "Lab 1: REST API with Express",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false
      }
    ],
    "pagination": null
  }
  ```

- **Endpoint**: `GET /api/v1/assignments/:id`
- **SRS Traceability**: FR-06, Section 12.3
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment details retrieved.",
    "data": {
      "id": "6732f7a4e4b02a1b9c8d4499",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "title": "Lab 1: REST API with Express",
      "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
      "deadline": "2026-11-15T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false
    },
    "pagination": null
  }
  ```



---

## 4. Functional Group D: Submission Review & Grading (FR-07, FR-08, FR-09)

### 4.1. Retrieve Submissions Queue
- **Endpoint**: `GET /api/v1/instructor/submissions`
- **SRS Traceability**: FR-07, FR-08, Section 12.3
- **Description**: Returns student submissions for courses assigned to the instructor.
- **Query Parameters**:
  - `courseId`: Optional filter.
  - `status`: Optional filter (`Submitted`, `Graded`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Submissions retrieved.",
    "data": [
      {
        "id": "6732f8a4e4b02a1b9c8d55aa",
        "assignmentId": "6732f7a4e4b02a1b9c8d4499",
        "assignmentTitle": "Lab 1: REST API with Express",
        "studentId": "6732f1a2e4b02a1b9c8d3e4f",
        "studentName": "Alex Rivera",
        "status": "Submitted",
        "submittedAt": "2026-11-09T20:41:40.000Z",
        "text": "Completed all endpoints and error handlers.",
        "file": {
          "name": "lab1_alex_rivera.zip",
          "path": "/uploads/submissions/sub-6732f1a2-6732f7a4-1731195700000.zip",
          "size": 2048500
        }
      }
    ],
    "pagination": null
  }
  ```

---

### 4.2. Grade Submission & Provide Feedback
- **Endpoint**: `PATCH /api/v1/submissions/:id/grade`
- **SRS Traceability**: FR-08, FR-09, Section 12.3
- **Security Guard**: Assigned instructor only.
- **Validation Rules (FR-08)**:
  - `score`: Number, 0 <= score <= assignment.maxScore.
  - `feedback`: String, max 1000 characters.
- **System Postconditions (FR-08, FR-09, FR-14)**:
  - Records score and feedback.
  - Updates submission status to `'Graded'`.
  - Recalculates student course progress and overall progress.
  - Dispatches notification to student.
- **Request Body**:
  ```json
  {
    "score": 95,
    "feedback": "Thorough test coverage and clean middleware implementation."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Submission graded successfully.",
    "data": {
      "submissionId": "6732f8a4e4b02a1b9c8d55aa",
      "status": "Graded",
      "grade": {
        "score": 95,
        "maxScore": 100,
        "feedback": "Thorough test coverage and clean middleware implementation.",
        "gradedAt": "2026-11-10T00:30:00.000Z"
      }
    },
    "pagination": null
  }
  ```

---

## 5. Functional Group E: Student Progress & At-Risk Monitoring (FR-09, FR-16, FR-44, UC-I03)

### 5.1. View Student Progress in Assigned Courses
- **Endpoint**: `GET /api/v1/progress`
- **SRS Traceability**: FR-09, Section 12.3
- **Role Permissions**: `instructor` (returns progress of own courses)
- **Description**: Returns progress calculated from submitted work for students in the instructor's courses.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course student progress retrieved.",
    "data": [
      {
        "courseId": "6732f1a2e4b02a1b9c8d3e4f",
        "studentId": "6732f1a2e4b02a1b9c8d3e4f",
        "studentName": "Alex Rivera",
        "percent": 75,
        "averageScore": 95.0,
        "atRisk": false
      }
    ],
    "pagination": null
  }
  ```

---

### 5.2. Monitor At-Risk Students (UC-I03, FR-16, FR-44) — Phase 10

> **Decoupled Architecture Note**: In Phase 10, at-risk monitoring is decoupled from the future Phase 9 Progress API (`GET /api/v1/progress`). Phase 10 provides dedicated endpoints under `/api/v1/instructor/at-risk` to evaluate available authoritative data without depending on or mocking Phase 9 progress analytics.

#### 5.2.1. Retrieve At-Risk Monitoring Summary
- **Endpoint**: `GET /api/v1/instructor/at-risk/summary`
- **SRS Traceability**: FR-16, FR-44
- **Role Permissions**: `instructor`
- **Description**: Returns lightweight monitoring statistics (`totalEnrolled`, `totalAtRisk`, `totalSafe`) and a data availability report for instructor dashboard stat cards. Evaluates unique students across the instructor's assigned courses.
- **Response `200 OK`**:
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
      "dataAvailability": {
        "enrollment": { "available": true, "description": "Student enrollment data is available." },
        "activity": { "available": true, "description": "Platform activity log is available." },
        "progress": { "available": false, "description": "No progress records found.", "blockedBy": ["Phase 7: Student Submissions", "Phase 8: Grading Queue"] },
        "submissionHistory": { "available": false, "description": "No submission records found.", "blockedBy": ["Phase 6: Assignment Authoring", "Phase 7: Student Submissions"] },
        "assignmentPerformance": { "available": false, "blockedBy": ["Phase 6: Assignment Authoring", "Phase 7: Student Submissions", "Phase 8: Grading Queue"] },
        "progressAnalytics": { "available": false, "blockedBy": ["Phase 9: Student Progress Analytics"] }
      }
    },
    "pagination": null
  }
  ```

#### 5.2.2. Retrieve Available Risk Indicators Metadata
- **Endpoint**: `GET /api/v1/instructor/at-risk/indicators`
- **SRS Traceability**: UC-I03, FR-16
- **Role Permissions**: `instructor`
- **Description**: Returns metadata describing all defined risk indicators, their authoritative data sources, and missing phase dependencies.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Available risk indicators retrieved.",
    "data": {
      "indicators": [
        {
          "id": "inactivity",
          "label": "Platform Inactivity",
          "description": "Student has no recorded platform activity in the ActivityLog.",
          "srsReference": "UC-I03 (\"inactivity\")",
          "dataSource": "ActivityLog collection",
          "available": true,
          "blockedBy": null
        },
        {
          "id": "lowProgress",
          "label": "Low Course Progress",
          "description": "Student has 0% progress in a course where assignments exist.",
          "srsReference": "UC-I03 (\"low progress\"), FR-09",
          "dataSource": "Progress collection (populated by Phase 7 & 8)",
          "available": true,
          "blockedBy": ["Phase 7: Student Submissions", "Phase 8: Grading Queue"]
        },
        {
          "id": "missedDeadlines",
          "label": "Missed Assignment Deadlines",
          "description": "Student has at least one past-deadline assignment with no submission.",
          "srsReference": "UC-I03 (\"missed deadlines\"), FR-06, FR-07",
          "dataSource": "Assignment + Submission collections",
          "available": true,
          "blockedBy": ["Phase 6: Assignment Authoring", "Phase 7: Student Submissions"]
        }
      ]
    },
    "pagination": null
  }
  ```

#### 5.2.3. List At-Risk Students
- **Endpoint**: `GET /api/v1/instructor/at-risk`
- **SRS Traceability**: UC-I03, FR-16, FR-44
- **Role Permissions**: `instructor` (scoped strictly to instructor's assigned courses)
- **Query Parameters**:
  - `courseCode`: Optional course code filter (e.g. `CS301`).
  - `flag`: Optional flag filter (`lowProgress`, `missedDeadlines`, `inactivity`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "1 at-risk student(s) identified across assigned courses.",
    "data": {
      "atRiskStudents": [
        {
          "studentId": "67331811e4b02a1b9c8e33aa",
          "studentName": "Jordan Hayes",
          "studentEmail": "jordan.hayes@campusbridge.edu",
          "program": "Software Engineering",
          "year": 2,
          "courseId": "6732f1a2e4b02a1b9c8d3e4f",
          "courseCode": "CS301",
          "courseTitle": "Full-Stack Web Development",
          "enrolledAt": "2026-11-09T18:00:00.000Z",
          "flagCount": 1,
          "flags": {
            "lowProgress": "insufficient_data",
            "missedDeadlines": "insufficient_data",
            "inactivity": "flagged"
          },
          "riskReasons": [
            {
              "indicator": "inactivity",
              "reason": "No platform activity has been recorded for this student."
            }
          ]
        }
      ],
      "summary": {
        "totalEnrolled": 24,
        "totalAtRisk": 1,
        "totalSafe": 23,
        "evaluatedAt": "2026-11-11T09:30:00.000Z"
      },
      "dataAvailability": { ... }
    },
    "pagination": null
  }
  ```

#### 5.2.4. Individual Student Risk Assessment
- **Endpoint**: `GET /api/v1/instructor/at-risk/:studentId?courseId=:courseId`
- **SRS Traceability**: UC-I03, FR-16
- **Role Permissions**: `instructor`
- **Query Parameters**:
  - `courseId`: Required MongoDB ObjectId of course assigned to the instructor.
- **Path Parameters**:
  - `studentId`: Required MongoDB ObjectId of student enrolled in the course.
- **Security Check**: Returns `404 Not Found` if course is not assigned to the authenticated instructor or if the student is not enrolled in the course.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "At-risk assessment retrieved for Jordan Hayes in CS301.",
    "data": {
      "studentId": "67331811e4b02a1b9c8e33aa",
      "studentName": "Jordan Hayes",
      "studentEmail": "jordan.hayes@campusbridge.edu",
      "program": "Software Engineering",
      "year": 2,
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "courseCode": "CS301",
      "courseTitle": "Full-Stack Web Development",
      "enrolledAt": "2026-11-09T18:00:00.000Z",
      "isAtRisk": true,
      "flagCount": 1,
      "flags": {
        "lowProgress": "insufficient_data",
        "missedDeadlines": "insufficient_data",
        "inactivity": "flagged"
      },
      "indicators": {
        "inactivity": {
          "status": "flagged",
          "reason": "No platform activity has been recorded for this student.",
          "lastActivityAt": null
        },
        "lowProgress": {
          "status": "insufficient_data",
          "reason": "No progress record exists for this student in this course.",
          "progressData": null
        },
        "missedDeadlines": {
          "status": "insufficient_data",
          "reason": "No assignment records found for this course.",
          "missedCount": 0
        }
      },
      "assessedAt": "2026-11-11T09:30:00.000Z",
      "dataAvailability": { ... }
    },
    "pagination": null
  }
  ```

---

## 6. Functional Group F: Notifications, Messaging & Activity (FR-14, FR-25, FR-33, FR-34, FR-35, FR-36)

- `GET /api/v1/notifications` — Retrieve instructor notifications (`FR-14`, `FR-25`)
- `GET /api/v1/messages/conversations` — View conversation threads (`FR-34`)
- `GET /api/v1/messages/with/:userId` — Retrieve message history with user (`FR-34`)
- `POST /api/v1/messages` — Send direct message (ASM-05: staff may message any permitted user, such as checking in with a flagged student) (`FR-33`)
- `GET /api/v1/activity/recent` — View recent instructor actions (`FR-35`, `FR-36`)

---

## 7. Functional Group G: AI Assistant Scoping Notice (M8, FR-19 to FR-21, CON-05)

> **Strict SRS Alignment**:
> In accordance with the official CampusBridge SRS v2.0 (Module M8, Use Case UC-S06, and Section 12.3 REST API structure), **all AI assistant functionality is scoped strictly to Students** (`/api/v1/ai/study-plan`, `/api/v1/ai/ask`, `/api/v1/ai/internship-matches`).
>
> There are **no AI assistant endpoints for Instructors** in the approved SRS scope. Proposed extensions are documented separately in `docs/api/proposed-enhancements.md`.
