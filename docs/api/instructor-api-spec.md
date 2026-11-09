# CampusBridge API Specification: Instructor Module

## 1. Module Overview & Responsibilities

The Instructor Module provides academic faculty members with full authority to manage assigned course learning materials, author assignments, evaluate student submissions through a dedicated grading queue, provide qualitative and quantitative feedback, monitor student progress, and proactively identify at-risk learners.

- **Developer Ownership**: Developer 1 & Developer 2 (Phase 1 Contract).
- **Base URI Prefix**: `/api/v1/instructor`
- **Authentication**: All endpoints require a valid JWT passed via `Authorization: Bearer <token>`.
- **Role Enforcement**: User role must be `'instructor'`.
- **Account State**: Account must be active (`active: true`).
- **Assignment Guard**: An instructor can only access and modify courses where `Course.instructorId.toString() === req.user._id.toString()`.

---

## 2. Functional Group A: Instructor Profile Management

### 2.1. Retrieve Own Profile
- **Endpoint**: `GET /api/v1/instructor/profile`
- **SRS Traceability**: FR-03, FR-38
- **Role Permissions**: `instructor` (Self only)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Instructor profile retrieved successfully.",
    "data": {
      "id": "6732e8f1e4b02a1b9c8d2a10",
      "name": "Dr. Sarah Jenkins",
      "email": "sarah.jenkins@campusbridge.edu",
      "role": "instructor",
      "department": "School of Information Technology",
      "preferences": {
        "theme": "dark"
      },
      "assignedCoursesCount": 3,
      "createdAt": "2026-11-01T09:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 2.2. Update Own Profile
- **Endpoint**: `PUT /api/v1/instructor/profile`
- **SRS Traceability**: FR-03, FR-38, FR-39
- **Validation**:
  - `name`: String, 2–100 characters.
  - `department`: String, max 100 characters.
  - `preferences.theme`: Enum (`dark`, `light`).
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah Jenkins",
    "department": "Department of Computer Science & Software Engineering",
    "preferences": {
      "theme": "dark"
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Instructor profile updated successfully.",
    "data": {
      "id": "6732e8f1e4b02a1b9c8d2a10",
      "name": "Dr. Sarah Jenkins",
      "department": "Department of Computer Science & Software Engineering",
      "preferences": { "theme": "dark" }
    },
    "pagination": null
  }
  ```

---

## 3. Functional Group B: Assigned Course Management

### 3.1. Retrieve Assigned Courses
- **Endpoint**: `GET /api/v1/instructor/courses`
- **SRS Traceability**: FR-04, FR-05
- **Description**: Returns all courses assigned to the authenticated instructor by Coordinators.
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
        "description": "Comprehensive engineering with modern JavaScript stacks.",
        "status": "active",
        "enrolledCount": 42,
        "activeAssignmentsCount": 3,
        "pendingGradingCount": 8,
        "atRiskCount": 2
      }
    ],
    "pagination": null
  }
  ```

---

### 3.2. View Assigned Course Details
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId`
- **SRS Traceability**: FR-04, FR-05
- **Security Guard**: Instructor must be assigned to `courseId`. Unauthorized access returns `403 Forbidden`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course details retrieved.",
    "data": {
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "code": "CS301",
      "title": "Full-Stack Web Development",
      "description": "Comprehensive engineering with modern JavaScript stacks.",
      "status": "active",
      "enrolledCount": 42,
      "resourcesCount": 6,
      "assignmentsCount": 4,
      "createdAt": "2026-11-01T10:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 3.3. View Enrolled Student Roster
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/students`
- **SRS Traceability**: FR-05, FR-09
- **Security Guard**: Assigned instructor only.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course student roster retrieved.",
    "data": [
      {
        "studentId": "6732f1a2e4b02a1b9c8d3e4f",
        "name": "Alex Rivera",
        "email": "alex.rivera@campusbridge.edu",
        "enrolledAt": "2026-11-02T10:00:00.000Z",
        "progressPercent": 75,
        "averageScore": 92.5,
        "submissionsCount": 3,
        "isAtRisk": false
      }
    ],
    "pagination": null
  }
  ```

---

### 3.4. View Course Aggregate Statistics
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/stats`
- **SRS Traceability**: FR-09, FR-16, FR-44
- **Security Guard**: Assigned instructor only.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course statistics calculated.",
    "data": {
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "code": "CS301",
      "enrolledCount": 42,
      "averageClassProgress": 68.4,
      "averageClassScore": 84.2,
      "submissionRatePercent": 89.1,
      "totalSubmissions": 126,
      "pendingGradingCount": 8,
      "atRiskStudentsCount": 2
    },
    "pagination": null
  }
  ```

---

## 4. Functional Group C: Course Learning Resources

### 4.1. List Course Resources
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/resources`
- **SRS Traceability**: FR-04, FR-05
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course resources retrieved.",
    "data": [
      {
        "_id": "6732f5c1e4b02a1b9c8d5a11",
        "title": "Week 1: Architecture Slides",
        "type": "slides",
        "url": "/uploads/resources/week1_slides.pdf",
        "addedAt": "2026-11-03T09:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 4.2. Add Learning Resource
- **Endpoint**: `POST /api/v1/instructor/courses/:courseId/resources`
- **SRS Traceability**: FR-04, FR-05
- **Security Guard**: Assigned instructor only.
- **Validation**:
  - `title`: Required string, max 150 characters.
  - `type`: Enum (`pdf`, `document`, `slides`, `link`, `video`, `other`).
  - `url`: Required valid URL or file path.
- **Request Body**:
  ```json
  {
    "title": "Week 2: Express Routing & Middleware",
    "type": "document",
    "url": "https://storage.campusbridge.edu/courses/cs301/week2_notes.pdf"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Resource added to course CS301.",
    "data": {
      "_id": "67331011e4b02a1b9c8dff11",
      "title": "Week 2: Express Routing & Middleware",
      "type": "document",
      "url": "https://storage.campusbridge.edu/courses/cs301/week2_notes.pdf",
      "addedAt": "2026-11-09T22:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 4.3. Update Learning Resource
- **Endpoint**: `PUT /api/v1/instructor/courses/:courseId/resources/:resourceId`
- **SRS Traceability**: FR-04
- **Security Guard**: Assigned instructor only.
- **Request Body**:
  ```json
  {
    "title": "Week 2: Express Routing & Middleware (Updated)",
    "type": "document",
    "url": "https://storage.campusbridge.edu/courses/cs301/week2_notes_v2.pdf"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Resource updated successfully.",
    "data": {
      "_id": "67331011e4b02a1b9c8dff11",
      "title": "Week 2: Express Routing & Middleware (Updated)",
      "type": "document",
      "url": "https://storage.campusbridge.edu/courses/cs301/week2_notes_v2.pdf"
    },
    "pagination": null
  }
  ```

---

### 4.4. Delete Learning Resource
- **Endpoint**: `DELETE /api/v1/instructor/courses/:courseId/resources/:resourceId`
- **SRS Traceability**: FR-04
- **Security Guard**: Assigned instructor only.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Resource removed from course.",
    "data": null,
    "pagination": null
  }
  ```

---

## 5. Functional Group D: Assignment Authoring & Management

### 5.1. List Course Assignments
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/assignments`
- **SRS Traceability**: FR-06
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
        "allowLate": false,
        "submissionsCount": 24,
        "gradedCount": 16
      }
    ],
    "pagination": null
  }
  ```

---

### 5.2. Create Assignment for Assigned Course
- **Endpoint**: `POST /api/v1/instructor/courses/:courseId/assignments`
- **SRS Traceability**: FR-06
- **Security Guard**: Assigned instructor only.
- **Validation**:
  - `title`: Required string, 3–200 characters.
  - `description`: Required string.
  - `deadline`: Required future Date.
  - `maxScore`: Number between 1 and 100 (default: 100).
  - `allowLate`: Boolean (default: false).
- **Post-Action**: Triggers notification generation to all enrolled students (FR-14).
- **Request Body**:
  ```json
  {
    "title": "Lab 2: MongoDB Schemas & Indexing",
    "description": "Create 3 normalized Mongoose models with validation hooks and compound indexes.",
    "deadline": "2026-11-22T23:59:59.000Z",
    "maxScore": 100,
    "allowLate": false
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Assignment created successfully and enrolled students notified.",
    "data": {
      "id": "67331211e4b02a1b9c8e11aa",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "title": "Lab 2: MongoDB Schemas & Indexing",
      "description": "Create 3 normalized Mongoose models with validation hooks and compound indexes.",
      "deadline": "2026-11-22T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false,
      "createdAt": "2026-11-09T22:10:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 5.3. View Assignment Details
- **Endpoint**: `GET /api/v1/instructor/assignments/:assignmentId`
- **SRS Traceability**: FR-06
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment details retrieved.",
    "data": {
      "id": "67331211e4b02a1b9c8e11aa",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "title": "Lab 2: MongoDB Schemas & Indexing",
      "description": "Create 3 normalized Mongoose models with validation hooks and compound indexes.",
      "deadline": "2026-11-22T23:59:59.000Z",
      "maxScore": 100,
      "allowLate": false,
      "submissionsCount": 0,
      "gradedCount": 0
    },
    "pagination": null
  }
  ```

---

### 5.4. Update Assignment
- **Endpoint**: `PUT /api/v1/instructor/assignments/:assignmentId`
- **SRS Traceability**: FR-06
- **Security Guard**: Assigned instructor only.
- **Validation**: Deadline cannot be changed to the past.
- **Request Body**:
  ```json
  {
    "description": "Clarified instructions: include unit test coverage for unique indexes.",
    "deadline": "2026-11-23T23:59:59.000Z"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment updated successfully.",
    "data": {
      "id": "67331211e4b02a1b9c8e11aa",
      "deadline": "2026-11-23T23:59:59.000Z"
    },
    "pagination": null
  }
  ```

---

### 5.5. Delete Assignment
- **Endpoint**: `DELETE /api/v1/instructor/assignments/:assignmentId`
- **SRS Traceability**: FR-06
- **Safety Rule**: Rejects deletion with `409 Conflict` if student submissions have already been received (`"Cannot delete an assignment that has active student submissions."`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment deleted successfully.",
    "data": null,
    "pagination": null
  }
  ```

---

## 6. Functional Group E: Submission Review & Grading Queue

### 6.1. Retrieve Global Grading Queue
- **Endpoint**: `GET /api/v1/instructor/grading-queue`
- **SRS Traceability**: FR-07, FR-08
- **Description**: Returns all un-graded submissions across all courses taught by the instructor, sorted by submission timestamp.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Grading queue retrieved.",
    "data": [
      {
        "submissionId": "6732f8a4e4b02a1b9c8d55aa",
        "assignmentId": "6732f7a4e4b02a1b9c8d4499",
        "assignmentTitle": "Lab 1: REST API with Express",
        "courseCode": "CS301",
        "student": {
          "id": "6732f1a2e4b02a1b9c8d3e4f",
          "name": "Alex Rivera",
          "email": "alex.rivera@campusbridge.edu"
        },
        "submittedAt": "2026-11-09T20:41:40.000Z",
        "hasFile": true,
        "fileName": "lab1_alex_rivera.zip",
        "status": "Submitted"
      }
    ],
    "pagination": null
  }
  ```

---

### 6.2. Retrieve Submissions for a Specific Course
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/submissions`
- **SRS Traceability**: FR-07, FR-08
- **Query Parameters**:
  - `assignmentId`: Optional ObjectId filter.
  - `status`: Enum (`Submitted`, `Graded`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course submissions retrieved.",
    "data": [
      {
        "submissionId": "6732f8a4e4b02a1b9c8d55aa",
        "assignmentTitle": "Lab 1: REST API with Express",
        "studentName": "Alex Rivera",
        "status": "Submitted",
        "submittedAt": "2026-11-09T20:41:40.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 6.3. Retrieve Single Submission Details
- **Endpoint**: `GET /api/v1/instructor/submissions/:submissionId`
- **SRS Traceability**: FR-07, FR-08
- **Security Guard**: Assigned instructor only.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Submission details retrieved.",
    "data": {
      "submissionId": "6732f8a4e4b02a1b9c8d55aa",
      "assignment": {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "title": "Lab 1: REST API with Express",
        "maxScore": 100
      },
      "student": {
        "id": "6732f1a2e4b02a1b9c8d3e4f",
        "name": "Alex Rivera",
        "email": "alex.rivera@campusbridge.edu"
      },
      "text": "Completed all unit tests and Swagger documentation.",
      "file": {
        "name": "lab1_alex_rivera.zip",
        "path": "/uploads/submissions/sub-6732f1a2-6732f7a4-1731195700000.zip",
        "size": 2048500,
        "mimeType": "application/zip"
      },
      "status": "Submitted",
      "submittedAt": "2026-11-09T20:41:40.000Z",
      "grade": null
    },
    "pagination": null
  }
  ```

---

### 6.4. Grade Submission
- **Endpoint**: `POST /api/v1/instructor/submissions/:submissionId/grade`
- **SRS Traceability**: FR-08, FR-09, FR-14, FR-35
- **Security Guard**: Assigned instructor only.
- **Validation Rules**:
  - `score`: Required number, 0 <= score <= assignment.maxScore.
  - `feedback`: String, max 1000 characters.
- **Side Effects**:
  1. Creates or updates `Grade` record.
  2. Updates `Submission.status` to `'Graded'`.
  3. Triggers `Progress` recalculation for the student in that course (FR-09).
  4. Dispatches notification to student (FR-14).
  5. Records `GRADE_ASSIGNMENT` in `ActivityLog` (FR-35).
- **Request Body**:
  ```json
  {
    "score": 95,
    "feedback": "Outstanding implementation of middleware pipeline and thorough exception handling."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Submission graded successfully and progress recalculated.",
    "data": {
      "gradeId": "67331511e4b02a1b9c8e22aa",
      "submissionId": "6732f8a4e4b02a1b9c8d55aa",
      "score": 95,
      "maxScore": 100,
      "feedback": "Outstanding implementation of middleware pipeline and thorough exception handling.",
      "gradedAt": "2026-11-09T22:20:00.000Z",
      "recalculatedCourseProgress": 75,
      "recalculatedAverageScore": 92.5
    },
    "pagination": null
  }
  ```

---

### 6.5. Update Existing Grade
- **Endpoint**: `PUT /api/v1/instructor/submissions/:submissionId/grade`
- **SRS Traceability**: FR-08, FR-09
- **Request Body**:
  ```json
  {
    "score": 98,
    "feedback": "Updated score after reviewing bonus unit test assertions."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Grade updated successfully.",
    "data": {
      "score": 98,
      "feedback": "Updated score after reviewing bonus unit test assertions."
    },
    "pagination": null
  }
  ```

---

## 7. Functional Group F: Student Progress Monitoring & At-Risk Analytics

### 7.1. View Course Student Progress Roster
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/progress`
- **SRS Traceability**: FR-09, FR-16, FR-44
- **Security Guard**: Assigned instructor only.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course progress roster retrieved.",
    "data": [
      {
        "studentId": "6732f1a2e4b02a1b9c8d3e4f",
        "studentName": "Alex Rivera",
        "progressPercent": 75,
        "averageScore": 92.5,
        "submittedAssignments": 3,
        "totalAssignments": 4,
        "isAtRisk": false
      }
    ],
    "pagination": null
  }
  ```

---

### 7.2. Identify At-Risk Students & Diagnostic Reasons
- **Endpoint**: `GET /api/v1/instructor/courses/:courseId/at-risk`
- **SRS Traceability**: FR-09, FR-16, FR-44

> **At-Risk Criteria Agreement**: In adherence to Section 8.F of the architectural guidelines, the at-risk classification uses clear, documented, explainable rules:
> 1. Course Progress < 50%
> 2. Missed / Unsubmitted Deadlines >= 2
> 3. Graded Average Score < 60%
>
> If any condition is satisfied, the student is flagged along with human-readable diagnostic reasons.

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "At-risk students identified.",
    "data": [
      {
        "studentId": "67331811e4b02a1b9c8e33aa",
        "name": "Jordan Hayes",
        "email": "jordan.hayes@campusbridge.edu",
        "progressPercent": 25,
        "averageScore": 52.0,
        "unsubmittedCount": 3,
        "riskFactors": [
          "Low course progress (25% vs 50% minimum)",
          "3 overdue unsubmitted assignments",
          "Current average score is 52.0% (below 60% passing threshold)"
        ],
        "recommendedAction": "Send direct message check-in or suggest AI study plan"
      }
    ],
    "pagination": null
  }
  ```

---

### 7.3. Instructor Dashboard Summary Metrics
- **Endpoint**: `GET /api/v1/instructor/dashboard/summary`
- **SRS Traceability**: FR-16, FR-44
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Instructor dashboard metrics retrieved.",
    "data": {
      "totalCoursesTaught": 3,
      "totalStudentsEnrolled": 118,
      "pendingGradingCount": 8,
      "atRiskStudentsCount": 3,
      "recentGradedSubmissions": [
        {
          "submissionId": "6732f8a4e4b02a1b9c8d55aa",
          "studentName": "Alex Rivera",
          "score": 95,
          "courseCode": "CS301",
          "gradedAt": "2026-11-09T22:20:00.000Z"
        }
      ]
    },
    "pagination": null
  }
  ```

---

## 8. Functional Group G: Notifications, Messaging & Activity

### 8.1. Retrieve Instructor Notifications
- **Endpoint**: `GET /api/v1/notifications`
- **SRS Traceability**: FR-14, FR-25
- **Description**: Returns notifications relevant to the instructor (e.g. new student assignment submissions, coordinator messages).

---

### 8.2. Instructor Messaging & Student Check-In
- **Endpoint**: `POST /api/v1/messages`
- **SRS Traceability**: FR-33, ASM-05
- **Permission**: Instructors can message students enrolled in their assigned courses, coordinators, and administrators.
- **Request Body**:
  ```json
  {
    "recipientId": "67331811e4b02a1b9c8e33aa",
    "body": "Hi Jordan, I noticed you missed the last two lab submissions. Please let me know if you need assistance during office hours."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Message dispatched successfully.",
    "data": {
      "id": "67331911e4b02a1b9c8e44aa",
      "recipientId": "67331811e4b02a1b9c8e33aa",
      "body": "Hi Jordan, I noticed you missed the last two lab submissions...",
      "createdAt": "2026-11-09T22:30:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 8.3. Instructor Activity Log
- **Endpoint**: `GET /api/v1/instructor/activity`
- **SRS Traceability**: FR-35, FR-36
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Instructor activity retrieved.",
    "data": [
      {
        "id": "67331955e4b02a1b9c8e55aa",
        "action": "GRADE_ASSIGNMENT",
        "targetType": "Grade",
        "meta": { "courseCode": "CS301", "studentName": "Alex Rivera", "score": 95 },
        "createdAt": "2026-11-09T22:20:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

## 9. Functional Group H: Instructor AI Teaching Assistant

> **AI Governance Guard (CON-05)**: The assistant provides teaching formulation assistance, rubric suggestions, and course summarization. It is strictly advisory and cannot create assignments, grade work, or modify database records directly.

### 9.1. AI Assignment Formulation Helper
- **Endpoint**: `POST /api/v1/instructor/ai/assignment-helper`
- **SRS Traceability**: FR-20, CON-05
- **Request Body**:
  ```json
  {
    "topic": "MongoDB Aggregation Pipeline",
    "courseId": "6732f1a2e4b02a1b9c8d3e4f",
    "difficultyLevel": "intermediate",
    "estimatedTimeHours": 4
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "AI assignment suggestions generated.",
    "data": {
      "guidanceNotice": "AI generation is intended for drafting assistance. Faculty review is required before publishing.",
      "suggestedTitle": "Lab 3: Aggregation Pipelines & Analytics Reports",
      "suggestedInstructions": "Students will design an aggregation pipeline to compute average course grades, identify at-risk distribution buckets, and generate cohort summary reports.",
      "suggestedRubric": [
        { "criteria": "Correct pipeline stages ($match, $group, $sort)", "points": 40 },
        { "criteria": "Performance optimization with index prefixing", "points": 30 },
        { "criteria": "Accuracy of statistical summary outputs", "points": 30 }
      ]
    },
    "pagination": null
  }
  ```
