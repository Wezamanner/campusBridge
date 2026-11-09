# CampusBridge API Specification: Student Module

## 1. Module Overview & Responsibilities

The Student Module provides authenticated university students with full lifecycle capabilities across academic coursework, learning resource consumption, assignment submissions, personal project/task productivity boards, internship discovery/applications, AI-guided study planning, and achievement tracking.

- **Developer Ownership**: Developer 1 & Developer 2 (Phase 1 Contract).
- **Base URI Prefix**: `/api/v1/student`
- **Authentication**: All endpoints require a valid JWT passed via `Authorization: Bearer <token>`.
- **Role Enforcement**: User role must be `'student'`.
- **Account State**: Account must be active (`active: true`).

---

## 2. Functional Group A: Student Profile & CV Management

### 2.1. Retrieve Own Profile
- **Endpoint**: `GET /api/v1/student/profile`
- **SRS Traceability**: FR-03, FR-23, FR-38
- **Role Permissions**: `student` (Self only)
- **Description**: Returns the authenticated student's profile information, academic details, recorded skills, CV metadata, and UI preferences.
- **Request Headers**:
  ```http
  Authorization: Bearer <student_jwt>
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student profile retrieved successfully.",
    "data": {
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "name": "Alex Rivera",
      "email": "alex.rivera@campusbridge.edu",
      "role": "student",
      "active": true,
      "program": "Computer Science & Engineering",
      "year": 3,
      "department": "School of Information Technology",
      "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Python"],
      "cv": {
        "name": "Alex_Rivera_CV.pdf",
        "path": "/uploads/cv/cv-6732f1a2-1731195600000.pdf",
        "size": 1048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2026-11-09T18:00:00.000Z"
      },
      "preferences": {
        "theme": "dark"
      },
      "createdAt": "2026-11-01T10:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 2.2. Update Own Profile
- **Endpoint**: `PUT /api/v1/student/profile`
- **SRS Traceability**: FR-03, FR-23, FR-38, FR-39
- **Role Permissions**: `student` (Self only)
- **Description**: Updates student editable attributes: `name`, `program`, `year`, `department`, `skills`, and `preferences.theme`.
- **Validation**:
  - `name`: String, 2–100 characters.
  - `year`: Integer, 1–7.
  - `skills`: Array of strings, maximum 15 items, each 2–30 characters, no duplicates.
  - `preferences.theme`: Enum (`dark`, `light`).
- **Request Body**:
  ```json
  {
    "name": "Alex Rivera",
    "program": "Software Engineering",
    "year": 4,
    "skills": ["JavaScript", "React", "Node.js", "Docker", "Tailwind CSS"],
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
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "name": "Alex Rivera",
      "program": "Software Engineering",
      "year": 4,
      "skills": ["JavaScript", "React", "Node.js", "Docker", "Tailwind CSS"],
      "preferences": { "theme": "dark" }
    },
    "pagination": null
  }
  ```

---

### 2.3. Upload / Replace CV Document
- **Endpoint**: `POST /api/v1/student/profile/cv`
- **SRS Traceability**: FR-23, SEC-07
- **Role Permissions**: `student` (Self only)
- **Content-Type**: `multipart/form-data`
- **Field Name**: `cv`
- **Validation Rules**:
  - Max file size: 2 MB (2,097,152 bytes).
  - Allowed MIME: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
  - Allowed extensions: `.pdf`, `.doc`, `.docx`.
  - Automatically replaces and unlinks existing CV document on server filesystem.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "CV document uploaded and attached to profile.",
    "data": {
      "name": "Alex_Rivera_Updated_Resume.pdf",
      "path": "/uploads/cv/cv-6732f1a2-1731199999999.pdf",
      "size": 1542000,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-11-09T20:30:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 2.4. Delete / Remove CV Document
- **Endpoint**: `DELETE /api/v1/student/profile/cv`
- **SRS Traceability**: FR-23
- **Role Permissions**: `student` (Self only)
- **Description**: Unlinks the physical file from storage and sets `User.cv = null`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "CV document removed successfully.",
    "data": null,
    "pagination": null
  }
  ```

---

## 3. Functional Group B: Courses and Academic Enrollment

### 3.1. Browse Course Catalog
- **Endpoint**: `GET /api/v1/student/courses`
- **SRS Traceability**: FR-04, FR-05
- **Role Permissions**: `student`
- **Query Parameters**:
  - `search`: Keyword string matching course code or title.
  - `page`: Page index (default: `1`).
  - `limit`: Items per page (default: `10`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Available courses retrieved.",
    "data": [
      {
        "id": "6732f1a2e4b02a1b9c8d3e4f",
        "code": "CS301",
        "title": "Full-Stack Web Development",
        "description": "Comprehensive engineering with modern JavaScript stacks.",
        "status": "active",
        "instructor": {
          "id": "6732e8f1e4b02a1b9c8d2a10",
          "name": "Dr. Sarah Jenkins",
          "department": "Computer Science"
        },
        "isEnrolled": false,
        "enrolledCount": 42
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
  ```

---

### 3.2. View Course Details
- **Endpoint**: `GET /api/v1/student/courses/:courseId`
- **SRS Traceability**: FR-05
- **Description**: Returns detailed course syllabus, instructor bio, enrollment status, and public metadata.
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
      "instructor": {
        "id": "6732e8f1e4b02a1b9c8d2a10",
        "name": "Dr. Sarah Jenkins",
        "email": "sarah.jenkins@campusbridge.edu"
      },
      "isEnrolled": true,
      "enrolledAt": "2026-11-02T10:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 3.3. Enroll in a Course
- **Endpoint**: `POST /api/v1/student/courses/:courseId/enroll`
- **SRS Traceability**: FR-05
- **Preconditions**:
  - Course must exist and have `status: 'active'`.
  - Student must not already be enrolled.
- **Error if already enrolled**: `409 Conflict` (`"Student is already enrolled in this course."`).
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Successfully enrolled in course CS301.",
    "data": {
      "enrollmentId": "6732f3b1e4b02a1b9c8d4a22",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "studentId": "6732f1a2e4b02a1b9c8d3e4f",
      "enrolledAt": "2026-11-09T21:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 3.4. View Enrolled Courses
- **Endpoint**: `GET /api/v1/student/courses/enrolled`
- **SRS Traceability**: FR-05, FR-09
- **Description**: Returns all courses in which the requesting student is actively enrolled, along with calculated completion progress percentages.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Enrolled courses retrieved.",
    "data": [
      {
        "courseId": "6732f1a2e4b02a1b9c8d3e4f",
        "code": "CS301",
        "title": "Full-Stack Web Development",
        "instructorName": "Dr. Sarah Jenkins",
        "enrolledAt": "2026-11-02T10:00:00.000Z",
        "progressPercent": 75,
        "averageScore": 92.5
      }
    ],
    "pagination": null
  }
  ```

---

### 3.5. View Enrolled Course Resources
- **Endpoint**: `GET /api/v1/student/courses/:courseId/resources`
- **SRS Traceability**: FR-05
- **Security Guard**: Student must be actively enrolled in `courseId`. Non-enrolled students receive `403 Forbidden`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course learning resources retrieved.",
    "data": [
      {
        "_id": "6732f5c1e4b02a1b9c8d5a11",
        "title": "Week 1: Express REST Architecture Slides",
        "type": "slides",
        "url": "/uploads/resources/week1_slides.pdf",
        "addedAt": "2026-11-03T09:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 3.6. View Course Assignments
- **Endpoint**: `GET /api/v1/student/courses/:courseId/assignments`
- **SRS Traceability**: FR-05, FR-06, FR-07
- **Security Guard**: Requires active enrollment in `courseId`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Course assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "title": "Lab 1: REST API with Express",
        "description": "Build an Express API with CRUD endpoints and Mongoose schemas.",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false,
        "submissionStatus": "Submitted",
        "score": null,
        "isGraded": false
      }
    ],
    "pagination": null
  }
  ```

---

## 4. Functional Group C: Assignment Submissions & Grading Visibility

### 4.1. List All Assignments Across Enrolled Courses
- **Endpoint**: `GET /api/v1/student/assignments`
- **SRS Traceability**: FR-06, FR-07
- **Query Parameters**:
  - `status`: Filter by `'pending'` (not yet submitted), `'submitted'`, or `'graded'`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "courseCode": "CS301",
        "courseTitle": "Full-Stack Web Development",
        "title": "Lab 1: REST API with Express",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false,
        "hasSubmitted": true,
        "status": "Submitted",
        "submittedAt": "2026-11-09T20:41:40.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 4.2. Submit Assignment (or Replace Eligible Submission)
- **Endpoint**: `POST /api/v1/student/assignments/:assignmentId/submit`
- **SRS Traceability**: FR-07, SEC-07
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `text`: String (optional if file provided).
  - `file`: Binary file (optional if text provided; max 5 MB).
- **Validation & Replacement Rules**:
  - Allowed MIME: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/zip`, `text/plain`.
  - Deadline enforcement: Must be prior to deadline, unless `allowLate: true`.
  - If existing submission is `'Submitted'` (ungraded), replaces file/text and updates `submittedAt`.
  - If existing submission is `'Graded'`, rejects with `422 Unprocessable Entity` (`"Cannot replace a submission that has already been graded."`).
- **Response `201 Created` (or `200 OK` on replace)**:
  ```json
  {
    "success": true,
    "message": "Assignment submission recorded successfully.",
    "data": {
      "id": "6732f8a4e4b02a1b9c8d55aa",
      "assignmentId": "6732f7a4e4b02a1b9c8d4499",
      "text": "Completed all unit tests and Swagger documentation.",
      "file": {
        "name": "lab1_alex_rivera.zip",
        "path": "/uploads/submissions/sub-6732f1a2-6732f7a4-1731195700000.zip",
        "size": 2048500,
        "mimeType": "application/zip",
        "uploadedAt": "2026-11-09T20:41:40.000Z"
      },
      "status": "Submitted",
      "submittedAt": "2026-11-09T20:41:40.000Z"
    },
    "pagination": null
  }
  ```

---

### 4.3. View Own Submission and Grade/Feedback
- **Endpoint**: `GET /api/v1/student/assignments/:assignmentId/submission`
- **SRS Traceability**: FR-07, FR-08
- **Ownership Guard**: Student can only retrieve their own submission.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Submission and grading details retrieved.",
    "data": {
      "id": "6732f8a4e4b02a1b9c8d55aa",
      "assignmentId": "6732f7a4e4b02a1b9c8d4499",
      "status": "Graded",
      "submittedAt": "2026-11-09T20:41:40.000Z",
      "text": "Completed all unit tests and Swagger documentation.",
      "file": {
        "name": "lab1_alex_rivera.zip",
        "size": 2048500
      },
      "grade": {
        "score": 95,
        "maxScore": 100,
        "feedback": "Excellent schema design and comprehensive error handling.",
        "gradedAt": "2026-11-10T14:30:00.000Z",
        "graderName": "Dr. Sarah Jenkins"
      }
    },
    "pagination": null
  }
  ```

---

## 5. Functional Group D: Learning Progress & Academic Analytics

### 5.1. View Overall Learning Progress
- **Endpoint**: `GET /api/v1/student/progress`
- **SRS Traceability**: FR-09, FR-16, FR-44
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Overall learning progress retrieved.",
    "data": {
      "overallPercent": 82,
      "enrolledCoursesCount": 4,
      "completedCoursesCount": 1,
      "averageGrade": 88.4,
      "totalAssignmentsSubmitted": 12,
      "courses": [
        {
          "courseId": "6732f1a2e4b02a1b9c8d3e4f",
          "courseCode": "CS301",
          "title": "Full-Stack Web Development",
          "percent": 75,
          "averageScore": 95.0,
          "completedAssignments": 3,
          "totalAssignments": 4
        }
      ]
    },
    "pagination": null
  }
  ```

---

### 5.2. View Upcoming Academic Deadlines
- **Endpoint**: `GET /api/v1/student/deadlines`
- **SRS Traceability**: FR-06, FR-16, FR-44
- **Description**: Returns all unsubmitted assignments and pending project tasks sorted by nearest due date.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Upcoming deadlines retrieved.",
    "data": [
      {
        "type": "assignment",
        "id": "6732f7a4e4b02a1b9c8d4499",
        "title": "Lab 1: REST API with Express",
        "courseCode": "CS301",
        "dueDate": "2026-11-15T23:59:59.000Z",
        "daysRemaining": 6
      },
      {
        "type": "task",
        "id": "6732fa12e4b02a1b9c8d6611",
        "title": "Draft Architecture UML Diagram",
        "projectName": "Senior Capstone Project",
        "dueDate": "2026-11-16T18:00:00.000Z",
        "priority": "high"
      }
    ],
    "pagination": null
  }
  ```

---

## 6. Functional Group E: Internships & Application Tracking

### 6.1. Browse Open Internships
- **Endpoint**: `GET /api/v1/student/internships`
- **SRS Traceability**: FR-10, FR-11
- **Query Parameters**:
  - `search`: Keyword string.
  - `skills`: Comma-separated list of skills (e.g. `React,Node.js`).
  - `type`: Enum (`Remote`, `Hybrid`, `On-site`).
  - `page`, `limit`: Pagination parameters.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Open internships retrieved.",
    "data": [
      {
        "id": "6732fd81e4b02a1b9c8d77aa",
        "title": "Full Stack Software Engineering Intern",
        "company": {
          "id": "6732fc01e4b02a1b9c8d7701",
          "name": "Brolf Tech Systems",
          "website": "https://brolftech.com"
        },
        "type": "Remote",
        "skills": ["JavaScript", "Node.js", "React", "MongoDB"],
        "requirements": ["Enrolled in CS or equivalent", "Experience with REST APIs"],
        "deadline": "2026-12-01T23:59:59.000Z",
        "hasApplied": false
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false }
  }
  ```

---

### 6.2. Apply for Internship
- **Endpoint**: `POST /api/v1/student/internships/:internshipId/apply`
- **SRS Traceability**: FR-11, FR-23
- **Validation Rules**:
  - `message`: Required string, 10–2000 characters.
  - `useProfileCv`: Boolean (if true, attaches current `User.cv`).
  - Alternatively, multipart CV file attachment.
  - Student cannot apply more than once to the same internship (`409 Conflict`).
- **Request Body**:
  ```json
  {
    "message": "I am deeply passionate about full-stack engineering and have built scalable MERN applications...",
    "useProfileCv": true
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Application submitted successfully.",
    "data": {
      "id": "67330012e4b02a1b9c8d88bb",
      "internshipId": "6732fd81e4b02a1b9c8d77aa",
      "status": "Submitted",
      "appliedAt": "2026-11-09T21:15:00.000Z",
      "cv": { "name": "Alex_Rivera_CV.pdf" }
    },
    "pagination": null
  }
  ```

---

### 6.3. Track Own Internship Applications
- **Endpoint**: `GET /api/v1/student/applications`
- **SRS Traceability**: FR-11, FR-12
- **Ownership Guard**: Student can only see their own applications.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student applications retrieved.",
    "data": [
      {
        "id": "67330012e4b02a1b9c8d88bb",
        "internship": {
          "id": "6732fd81e4b02a1b9c8d77aa",
          "title": "Full Stack Software Engineering Intern",
          "companyName": "Brolf Tech Systems",
          "type": "Remote"
        },
        "status": "Forwarded",
        "appliedAt": "2026-11-09T21:15:00.000Z",
        "history": [
          { "status": "Submitted", "at": "2026-11-09T21:15:00.000Z" },
          { "status": "Under review", "at": "2026-11-10T09:00:00.000Z" },
          { "status": "Forwarded", "at": "2026-11-10T15:00:00.000Z", "notes": "Forwarded to hiring manager." }
        ]
      }
    ],
    "pagination": null
  }
  ```

---

### 6.4. Withdraw Eligible Application
- **Endpoint**: `POST /api/v1/student/applications/:applicationId/withdraw`
- **SRS Traceability**: FR-11, FR-12
- **Precondition**: Application status must not already be in a terminal state (`Accepted`, `Rejected`, or `Withdrawn`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application has been withdrawn successfully.",
    "data": {
      "id": "67330012e4b02a1b9c8d88bb",
      "status": "Withdrawn",
      "updatedAt": "2026-11-10T16:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

## 7. Functional Group F: Achievements, Badges & Cohort Rankings

### 7.1. Retrieve Earned Achievements & Badges
- **Endpoint**: `GET /api/v1/student/achievements`
- **SRS Traceability**: FR-17
- **Description**: Returns all badges awarded to the requesting student.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Achievements retrieved successfully.",
    "data": [
      {
        "id": "67330111e4b02a1b9c8d99aa",
        "badgeId": "FIRST_SUBMISSION",
        "title": "First Step",
        "description": "Submitted your first assignment on CampusBridge.",
        "icon": "award",
        "awardedAt": "2026-11-03T14:00:00.000Z"
      },
      {
        "id": "67330112e4b02a1b9c8d99ab",
        "badgeId": "PERFECT_SCORE",
        "title": "Perfectionist",
        "description": "Achieved a 100% score on a graded assignment.",
        "icon": "star",
        "awardedAt": "2026-11-05T16:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 7.2. Retrieve Cohort Leaderboard & Rankings (with Privacy Masking)
- **Endpoint**: `GET /api/v1/student/rankings`
- **SRS Traceability**: FR-17, SEC-04
- **Privacy Compliance**: Other students' full identities are masked unless explicitly opted into public display; current student sees their own rank and score in clear text.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Cohort rankings retrieved.",
    "data": {
      "myRank": 4,
      "myAverageScore": 92.5,
      "totalStudents": 128,
      "leaderboard": [
        { "rank": 1, "displayName": "B. K.", "averageScore": 98.2, "badgeCount": 6, "isCurrentUser": false },
        { "rank": 2, "displayName": "M. T.", "averageScore": 96.5, "badgeCount": 5, "isCurrentUser": false },
        { "rank": 3, "displayName": "S. W.", "averageScore": 94.0, "badgeCount": 4, "isCurrentUser": false },
        { "rank": 4, "displayName": "Alex Rivera", "averageScore": 92.5, "badgeCount": 4, "isCurrentUser": true }
      ]
    },
    "pagination": null
  }
  ```

---

## 8. Functional Group G: Personal Projects and Tasks (Student-Only per ASM-02)

> **Architectural Boundary (ASM-02)**: In strict accordance with the SRS and prompt instructions, personal projects and tasks belong exclusively to Students. Instructors do not have access to this feature.

### 8.1. List Personal Projects
- **Endpoint**: `GET /api/v1/student/projects`
- **SRS Traceability**: FR-27, FR-28, ASM-02, ASM-03
- **Query Parameters**:
  - `status`: Enum (`active`, `completed`, `on_hold`).
  - `archived`: Boolean (default: `false`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Personal projects retrieved.",
    "data": [
      {
        "id": "67330222e4b02a1b9c8daaaa",
        "name": "Senior Capstone Project",
        "description": "Autonomous drone navigation research.",
        "status": "active",
        "dueDate": "2026-12-15T00:00:00.000Z",
        "archived": false,
        "totalTasks": 10,
        "completedTasks": 6,
        "progressPercent": 60
      }
    ],
    "pagination": null
  }
  ```

---

### 8.2. Create Personal Project
- **Endpoint**: `POST /api/v1/student/projects`
- **SRS Traceability**: FR-27, ASM-02
- **Validation**:
  - `name`: Required string, 2–150 characters.
  - `status`: Optional enum (`active`, `completed`, `on_hold`), default: `active`.
  - `dueDate`: Optional date string.
- **Request Body**:
  ```json
  {
    "name": "Mobile AI Agent App",
    "description": "On-device LLM wrapper using React Native.",
    "status": "active",
    "dueDate": "2026-12-20T23:59:59.000Z"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Project created successfully.",
    "data": {
      "id": "67330233e4b02a1b9c8daabb",
      "name": "Mobile AI Agent App",
      "description": "On-device LLM wrapper using React Native.",
      "status": "active",
      "dueDate": "2026-12-20T23:59:59.000Z",
      "archived": false,
      "createdAt": "2026-11-09T21:30:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 8.3. Update Personal Project
- **Endpoint**: `PUT /api/v1/student/projects/:projectId`
- **SRS Traceability**: FR-27
- **Ownership Guard**: Must belong to `req.user._id`.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Project updated successfully.",
    "data": {
      "id": "67330233e4b02a1b9c8daabb",
      "name": "Mobile AI Agent App",
      "status": "completed"
    },
    "pagination": null
  }
  ```

---

### 8.4. Archive / Delete Personal Project
- **Endpoint**: `DELETE /api/v1/student/projects/:projectId`
- **SRS Traceability**: FR-29
- **Description**: Soft-archives the project (`archived: true`) or deletes if `hardDelete=true` query parameter is passed.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Project archived successfully.",
    "data": null,
    "pagination": null
  }
  ```

---

### 8.5. List Personal Tasks
- **Endpoint**: `GET /api/v1/student/tasks`
- **SRS Traceability**: FR-30, FR-31, ASM-04
- **Query Parameters**:
  - `projectId`: Optional ObjectId filter.
  - `status`: Enum (`todo`, `done`).
  - `priority`: Enum (`low`, `medium`, `high`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Tasks retrieved successfully.",
    "data": [
      {
        "id": "67330411e4b02a1b9c8dbb11",
        "projectId": "67330222e4b02a1b9c8daaaa",
        "title": "Complete literature review on pathfinding algorithms",
        "dueDate": "2026-11-12T18:00:00.000Z",
        "priority": "high",
        "status": "todo",
        "isOverdue": false
      }
    ],
    "pagination": null
  }
  ```

---

### 8.6. Create Personal Task
- **Endpoint**: `POST /api/v1/student/tasks`
- **SRS Traceability**: FR-30, ASM-04
- **Validation**:
  - `title`: Required string, 2–200 characters.
  - `priority`: Enum (`low`, `medium`, `high`), default: `medium`.
  - `status`: Enum (`todo`, `done`), default: `todo`.
  - `projectId`: Optional ObjectId (must belong to student).
- **Request Body**:
  ```json
  {
    "title": "Implement JWT verification unit test suite",
    "projectId": "67330222e4b02a1b9c8daaaa",
    "priority": "high",
    "dueDate": "2026-11-14T23:59:59.000Z"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Task created successfully.",
    "data": {
      "id": "67330422e4b02a1b9c8dbb22",
      "title": "Implement JWT verification unit test suite",
      "priority": "high",
      "status": "todo",
      "dueDate": "2026-11-14T23:59:59.000Z"
    },
    "pagination": null
  }
  ```

---

### 8.7. Toggle Task Completion Status
- **Endpoint**: `PATCH /api/v1/student/tasks/:taskId/status`
- **SRS Traceability**: FR-32, ASM-04
- **Request Body**:
  ```json
  {
    "status": "done"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Task status updated to done.",
    "data": {
      "id": "67330422e4b02a1b9c8dbb22",
      "status": "done",
      "completedAt": "2026-11-09T21:40:00.000Z"
    },
    "pagination": null
  }
  ```

---

## 9. Functional Group H: Notifications & Messaging

### 9.1. List Notifications
- **Endpoint**: `GET /api/v1/notifications`
- **SRS Traceability**: FR-14, FR-25, FR-43
- **Role Permissions**: `student`, `instructor` (Scoped to own user ID)
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Notifications retrieved.",
    "data": [
      {
        "id": "67330511e4b02a1b9c8dcc11",
        "type": "grade",
        "title": "Assignment Graded",
        "message": "Your submission for Lab 1 was graded: 95/100",
        "link": "/student/assignments/6732f7a4e4b02a1b9c8d4499",
        "read": false,
        "createdAt": "2026-11-09T20:45:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false }
  }
  ```

---

### 9.2. Unread Notification Count
- **Endpoint**: `GET /api/v1/notifications/unread-count`
- **SRS Traceability**: FR-25, FR-43
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Unread notification count retrieved.",
    "data": {
      "unreadCount": 3
    },
    "pagination": null
  }
  ```

---

### 9.3. Mark Notifications Read
- **Endpoint**: `PATCH /api/v1/notifications/:notificationId/read` (or `PATCH /api/v1/notifications/read-all`)
- **SRS Traceability**: FR-25
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Notification marked as read.",
    "data": {
      "id": "67330511e4b02a1b9c8dcc11",
      "read": true,
      "readAt": "2026-11-09T21:45:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 9.4. Retrieve Conversation Threads
- **Endpoint**: `GET /api/v1/messages/conversations`
- **SRS Traceability**: FR-33, FR-34, ASM-05
- **Description**: Returns all conversation threads for the student with last message snippet and unread message counter.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Conversations retrieved.",
    "data": [
      {
        "conversationKey": "6732e8f1_6732f1a2",
        "partner": {
          "id": "6732e8f1e4b02a1b9c8d2a10",
          "name": "Dr. Sarah Jenkins",
          "role": "instructor"
        },
        "lastMessage": {
          "body": "Office hours are scheduled tomorrow at 3 PM.",
          "createdAt": "2026-11-09T18:30:00.000Z"
        },
        "unreadCount": 1
      }
    ],
    "pagination": null
  }
  ```

---

### 9.5. Send Message (Enforcing ASM-05 Pairing Restrictions)
- **Endpoint**: `POST /api/v1/messages`
- **SRS Traceability**: FR-33, ASM-05
- **Restriction Rule (ASM-05)**: Students may only send messages to instructors teaching courses they are enrolled in, or coordinators. Sending a message to another student returns `403 Forbidden` (`"Direct messaging between students is not permitted."`).
- **Request Body**:
  ```json
  {
    "recipientId": "6732e8f1e4b02a1b9c8d2a10",
    "body": "Hello Dr. Jenkins, could you clarify whether the lab requires MongoDB replica sets?"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Message sent successfully.",
    "data": {
      "id": "67330611e4b02a1b9c8ddd11",
      "conversationKey": "6732e8f1e4b02a1b9c8d2a10_6732f1a2e4b02a1b9c8d3e4f",
      "senderId": "6732f1a2e4b02a1b9c8d3e4f",
      "recipientId": "6732e8f1e4b02a1b9c8d2a10",
      "body": "Hello Dr. Jenkins, could you clarify whether the lab requires MongoDB replica sets?",
      "readAt": null,
      "createdAt": "2026-11-09T21:50:00.000Z"
    },
    "pagination": null
  }
  ```

---

## 10. Functional Group I: Activity History

### 10.1. Retrieve Recent Personal Activity
- **Endpoint**: `GET /api/v1/student/activity`
- **SRS Traceability**: FR-35, FR-36
- **Query Parameters**: `limit` (default: `10`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Activity history retrieved.",
    "data": [
      {
        "id": "67330711e4b02a1b9c8dee11",
        "action": "SUBMIT_ASSIGNMENT",
        "targetType": "Submission",
        "meta": { "courseCode": "CS301", "assignmentTitle": "Lab 1" },
        "createdAt": "2026-11-09T20:41:40.000Z"
      },
      {
        "id": "67330712e4b02a1b9c8dee12",
        "action": "APPLY_INTERNSHIP",
        "targetType": "Application",
        "meta": { "internshipTitle": "Full Stack Intern", "company": "Brolf Tech" },
        "createdAt": "2026-11-09T21:15:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 10.2. Retrieve Weekly Activity Counts (for Dashboard Chart)
- **Endpoint**: `GET /api/v1/student/activity/weekly`
- **SRS Traceability**: FR-37
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Weekly activity metrics retrieved.",
    "data": {
      "days": [
        { "day": "Mon", "submissions": 1, "tasks": 3, "applications": 0 },
        { "day": "Tue", "submissions": 0, "tasks": 2, "applications": 1 },
        { "day": "Wed", "submissions": 1, "tasks": 4, "applications": 0 },
        { "day": "Thu", "submissions": 0, "tasks": 1, "applications": 0 },
        { "day": "Fri", "submissions": 2, "tasks": 3, "applications": 0 },
        { "day": "Sat", "submissions": 0, "tasks": 0, "applications": 0 },
        { "day": "Sun", "submissions": 0, "tasks": 1, "applications": 0 }
      ]
    },
    "pagination": null
  }
  ```

---

## 11. Functional Group J: AI Learning Assistant

> **AI Governance Guard (CON-05)**: The AI assistant is strictly read-only and informative. It cannot mutate grades, progress, enrollment, or user records. All responses return an explicit educational guidance notice.

### 11.1. AI Study Plan Generator
- **Endpoint**: `POST /api/v1/student/ai/study-plan`
- **SRS Traceability**: FR-19, CON-05
- **Description**: Synthesizes enrolled course syllabi, assignments, and deadlines into a personalized day-by-day revision roadmap.
- **Request Body**:
  ```json
  {
    "daysAvailable": 7,
    "dailyHours": 3,
    "focusCourseId": "6732f1a2e4b02a1b9c8d3e4f"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "AI study plan generated successfully.",
    "data": {
      "guidanceNotice": "This study plan is AI-generated for guidance only. Please verify dates against official course schedules.",
      "plan": [
        {
          "day": 1,
          "date": "2026-11-10",
          "topics": ["Express middleware architecture", "Error handling pipeline"],
          "recommendedDurationMinutes": 180,
          "relevantAssignment": "Lab 1: REST API with Express"
        }
      ]
    },
    "pagination": null
  }
  ```

---

### 11.2. AI Course & Platform Q&A
- **Endpoint**: `POST /api/v1/student/ai/ask`
- **SRS Traceability**: FR-20, CON-05
- **Request Body**:
  ```json
  {
    "question": "What is the difference between authenticate and authorize middlewares in our course framework?",
    "courseId": "6732f1a2e4b02a1b9c8d3e4f"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "AI answer generated.",
    "data": {
      "guidanceNotice": "AI responses are for educational support. Refer to instructor lectures for definitive criteria.",
      "answer": "In Express.js architecture, authentication verifies the identity of the incoming user (e.g. verifying the JWT), while authorization validates whether that identified user possesses the required role or ownership permissions to access a specific route."
    },
    "pagination": null
  }
  ```

---

### 11.3. AI Internship Skill Matching & Gap Analysis
- **Endpoint**: `POST /api/v1/student/ai/skill-match`
- **SRS Traceability**: FR-21, CON-05
- **Description**: Evaluates the student's skills recorded in `User.skills` against active internship postings, ranking top opportunities and highlighting missing skills.
- **Request Body**: `{}`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "AI skill match completed.",
    "data": {
      "guidanceNotice": "Skill match scores are heuristic indicators based on profile keywords.",
      "matches": [
        {
          "internshipId": "6732fd81e4b02a1b9c8d77aa",
          "title": "Full Stack Software Engineering Intern",
          "companyName": "Brolf Tech Systems",
          "matchScore": 80,
          "matchedSkills": ["JavaScript", "React", "Node.js", "MongoDB"],
          "missingSkills": ["Docker"],
          "recommendation": "High fit. Consider completing a brief Docker containerization tutorial to boost your candidate strength."
        }
      ]
    },
    "pagination": null
  }
  ```
