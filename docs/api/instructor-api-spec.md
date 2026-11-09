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

### 5.2. Monitor At-Risk Students (UC-I03, FR-16, FR-44)
- **Endpoint**: `GET /api/v1/progress?flagged=true` (or dashboard at-risk figure query)
- **SRS Traceability**: UC-I03, FR-16, FR-44
- **SRS Definition (UC-I03)**:
  > *"The system lists flagged students (low progress, missed deadlines, inactivity). Send a message if needed. Alternative flow: No students at risk: a message is shown. Postconditions: The instructor is informed."*
  >
  > *(Note: The SRS does not define numeric thresholds. Arbitrary cutoff values like 50% or 60% are excluded from the approved API contract per compliance audit).*
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Flagged at-risk students retrieved.",
    "data": [
      {
        "studentId": "67331811e4b02a1b9c8e33aa",
        "studentName": "Jordan Hayes",
        "courseCode": "CS301",
        "flags": {
          "lowProgress": true,
          "missedDeadlines": true,
          "inactivity": true
        }
      }
    ],
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
