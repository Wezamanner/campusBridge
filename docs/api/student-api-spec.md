# CampusBridge API Specification: Student Module
## Strict SRS v2.0 Compliance Baseline

- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0
- **Module Ownership**: Developer 1 & Developer 2 (Student & Instructor Stream)
- **Base URI Prefix**: `/api/v1`
- **Security & RBAC**: Bearer JWT (`Authorization: Bearer <token>`); Role must be `'student'`; Account must be active (`active: true`).

---

## 1. Functional Group A: Student Profile & Skills/CV (FR-03, FR-23, FR-38, FR-39)

### 1.1. Retrieve Own Profile
- **Endpoint**: `GET /api/v1/profile`
- **SRS Traceability**: FR-03, FR-23, FR-38
- **Role Permissions**: `student` (Self only)
- **Description**: Returns authenticated student's profile attributes: `name`, `email`, `role`, `program`, `year`, `skills`, `cv`, and `preferences.theme`. (Note: `department` is an instructor/staff field and is omitted from student schemas per SRS).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Profile retrieved successfully.",
    "data": {
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "name": "Alex Rivera",
      "email": "alex.rivera@campusbridge.edu",
      "role": "student",
      "active": true,
      "program": "Computer Science & Engineering",
      "year": 3,
      "skills": ["JavaScript", "React", "Node.js", "MongoDB"],
      "cv": {
        "name": "Alex_Rivera_CV.pdf",
        "path": "/uploads/cv/cv-6732f1a2-1731195600000.pdf",
        "size": 1048576,
        "mimeType": "application/pdf",
        "uploadedAt": "2026-11-09T18:00:00.000Z"
      },
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
- **SRS Traceability**: FR-03, FR-23, FR-38, FR-39
- **Role Permissions**: `student` (Self only)
- **Description**: Updates student editable attributes: `name`, `program`, `year`, `skills`, and `preferences.theme`.
- **Validation Rules (SRS FR-03, FR-23)**:
  - `name`: String, 2 to 100 characters.
  - `program`: String, max 100 characters.
  - `year`: Integer, 1 to 7.
  - `skills`: Array of strings, 2 to 30 characters each, no duplicates, max 15 items.
  - `preferences.theme`: Enum (`dark`, `light`).
- **Request Body**:
  ```json
  {
    "name": "Alex Rivera",
    "program": "Software Engineering",
    "year": 4,
    "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Tailwind CSS"],
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
      "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Tailwind CSS"],
      "preferences": { "theme": "dark" }
    },
    "pagination": null
  }
  ```

---

### 1.3. Upload / Replace CV Document
- **Endpoint**: `POST /api/v1/profile/cv`
- **SRS Traceability**: FR-23, SEC-07
- **Role Permissions**: `student` (Self only)
- **Content-Type**: `multipart/form-data`
- **Field Name**: `cv`
- **Validation Rules**:
  - Exactly one file uploaded.
  - Allowed file types: PDF or Word documents (`.pdf`, `.doc`, `.docx`).
  - Allowed MIME: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
  - Maximum file size: 2 MB (2,097,152 bytes).
  - Replacement: Replaces existing CV file if one was previously recorded.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "CV uploaded and attached to profile.",
    "data": {
      "name": "Alex_Rivera_CV.pdf",
      "path": "/uploads/cv/cv-6732f1a2-1731199999999.pdf",
      "size": 1250000,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-11-10T00:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

## 2. Functional Group B: Course Catalog & Enrollment (FR-04, FR-05)

### 2.1. Browse Course Catalog
- **Endpoint**: `GET /api/v1/courses`
- **SRS Traceability**: FR-04, FR-05
- **Role Permissions**: `student`, all authenticated roles
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
        "description": "Modern full-stack web application development.",
        "status": "active",
        "instructor": {
          "id": "6732e8f1e4b02a1b9c8d2a10",
          "name": "Dr. Sarah Jenkins"
        },
        "isEnrolled": false
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1, "hasNext": false, "hasPrev": false }
  }
  ```

---

### 2.2. View Course Details
- **Endpoint**: `GET /api/v1/courses/:id`
- **SRS Traceability**: FR-05
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
      "isEnrolled": true
    },
    "pagination": null
  }
  ```

---

### 2.3. Enroll in Course
- **Endpoint**: `POST /api/v1/courses/:id/enroll`
- **SRS Traceability**: FR-05
- **Preconditions**:
  - Course must exist and have `status: 'active'`.
  - Student must not already be enrolled.
- **Conflict Handling**: Returns `409 Conflict` if duplicate enrollment is attempted.
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Successfully enrolled in course CS301.",
    "data": {
      "enrollmentId": "6732f3b1e4b02a1b9c8d4a22",
      "courseId": "6732f1a2e4b02a1b9c8d3e4f",
      "studentId": "6732f1a2e4b02a1b9c8d3e4f",
      "enrolledAt": "2026-11-10T00:00:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 2.4. View Course Resources (Requires Enrollment)
- **Endpoint**: `GET /api/v1/courses/:id/resources`
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

## 3. Functional Group C: Assignments & Submissions (FR-06, FR-07, FR-08)

### 3.1. List Assignments
- **Endpoint**: `GET /api/v1/assignments`
- **SRS Traceability**: FR-06, FR-07
- **Role Permissions**: `student` (lists assignments for enrolled courses)
- **Query Parameters**:
  - `courseId`: Optional filter by course.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignments retrieved.",
    "data": [
      {
        "id": "6732f7a4e4b02a1b9c8d4499",
        "courseId": "6732f1a2e4b02a1b9c8d3e4f",
        "courseCode": "CS301",
        "title": "Lab 1: REST API with Express",
        "deadline": "2026-11-15T23:59:59.000Z",
        "maxScore": 100,
        "allowLate": false,
        "submissionStatus": "Submitted"
      }
    ],
    "pagination": null
  }
  ```

---

### 3.2. View Assignment Details
- **Endpoint**: `GET /api/v1/assignments/:id`
- **SRS Traceability**: FR-06, FR-07
- **Description**: Returns assignment instructions, deadline, max score, late submission policy, and student's own submission/grade details if submitted.
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
      "allowLate": false,
      "submission": {
        "id": "6732f8a4e4b02a1b9c8d55aa",
        "status": "Graded",
        "submittedAt": "2026-11-09T20:41:40.000Z",
        "grade": {
          "score": 95,
          "feedback": "Thorough test coverage.",
          "gradedAt": "2026-11-10T00:15:00.000Z"
        }
      }
    },
    "pagination": null
  }
  ```

---

### 3.3. Submit Assignment / Replace Submission
- **Endpoint**: `POST /api/v1/assignments/:id/submissions`
- **SRS Traceability**: FR-07, SEC-07
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `text`: String (optional if file provided).
  - `file`: Binary file (optional if text provided; max 5 MB).
- **Validation Rules (FR-07)**:
  - Student must be enrolled in course.
  - Allowed file formats: PDF, Word, ZIP, or text (`.pdf`, `.doc`, `.docx`, `.zip`, `.txt`).
  - Max file size: 5 MB (5,242,880 bytes).
  - Must be submitted before deadline unless `allowLate: true`.
  - May replace earlier submission before deadline or until graded.
- **Response `201 Created` (or `200 OK` on replace)**:
  ```json
  {
    "success": true,
    "message": "Assignment submitted successfully.",
    "data": {
      "id": "6732f8a4e4b02a1b9c8d55aa",
      "assignmentId": "6732f7a4e4b02a1b9c8d4499",
      "status": "Submitted",
      "submittedAt": "2026-11-10T00:20:00.000Z"
    },
    "pagination": null
  }
  ```

---

## 4. Functional Group D: Progress & Rankings (FR-09, FR-16, FR-17, FR-44)

### 4.1. View Learning Progress
- **Endpoint**: `GET /api/v1/progress`
- **SRS Traceability**: FR-09, FR-16, FR-44
- **Description**: Returns learning progress calculated per course and overall from submitted work.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Learning progress retrieved.",
    "data": {
      "overallPercent": 75,
      "courses": [
        {
          "courseId": "6732f1a2e4b02a1b9c8d3e4f",
          "code": "CS301",
          "title": "Full-Stack Web Development",
          "percent": 75,
          "averageScore": 95.0
        }
      ]
    },
    "pagination": null
  }
  ```

---

### 4.2. View Achievement Badges
- **Endpoint**: `GET /api/v1/achievements`
- **SRS Traceability**: FR-17
- **Description**: Returns achievement badges awarded for milestones.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Achievements retrieved.",
    "data": [
      {
        "id": "67330111e4b02a1b9c8d99aa",
        "badgeId": "FIRST_SUBMISSION",
        "title": "First Step",
        "description": "Submitted your first assignment on CampusBridge.",
        "icon": "award",
        "awardedAt": "2026-11-03T14:00:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 4.3. View Cohort Rankings
- **Endpoint**: `GET /api/v1/rankings`
- **SRS Traceability**: FR-17
- **Description**: Returns ranking of students by average submission score with first names and initials only (e.g. `Alex R.`), alongside the student's own standing.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Rankings retrieved.",
    "data": {
      "myRank": 3,
      "myAverageScore": 95.0,
      "leaderboard": [
        { "rank": 1, "displayName": "B. K.", "averageScore": 98.2 },
        { "rank": 2, "displayName": "M. T.", "averageScore": 96.5 },
        { "rank": 3, "displayName": "Alex R.", "averageScore": 95.0, "isCurrentUser": true }
      ]
    },
    "pagination": null
  }
  ```

---

## 5. Functional Group E: Internships & Applications (FR-10, FR-11, FR-12)

### 5.1. Browse Open Internships
- **Endpoint**: `GET /api/v1/internships`
- **SRS Traceability**: FR-10, FR-11
- **Query Parameters**:
  - `search`: Keyword string.
  - `skills`: Skill filter.
  - `type`: Enum (`Remote`, `Hybrid`, `On-site`).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Open internships retrieved.",
    "data": [
      {
        "id": "6732fd81e4b02a1b9c8d77aa",
        "title": "Full Stack Software Engineering Intern",
        "type": "Remote",
        "skills": ["JavaScript", "Node.js", "React", "MongoDB"],
        "requirements": ["Enrolled in CS or related program", "Experience with REST APIs"],
        "deadline": "2026-12-01T23:59:59.000Z"
      }
    ],
    "pagination": null
  }
  ```

---

### 5.2. Apply for Internship
- **Endpoint**: `POST /api/v1/internships/:id/applications`
- **SRS Traceability**: FR-11, FR-23
- **Validation (FR-11)**:
  - `message`: Required cover message string (min 10 characters).
  - Attached CV (from profile or upload).
  - Student may apply once per open internship (`409 Conflict` on duplicate).
- **Request Body**:
  ```json
  {
    "message": "I am applying for the full-stack internship position...",
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
      "appliedAt": "2026-11-10T00:25:00.000Z"
    },
    "pagination": null
  }
  ```

---

### 5.3. Track Applications & Withdraw
- **Endpoint**: `GET /api/v1/applications`
- **SRS Traceability**: FR-11, FR-12
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Applications retrieved.",
    "data": [
      {
        "id": "67330012e4b02a1b9c8d88bb",
        "internshipId": "6732fd81e4b02a1b9c8d77aa",
        "status": "Forwarded",
        "appliedAt": "2026-11-10T00:25:00.000Z"
      }
    ],
    "pagination": null
  }
  ```

- **Endpoint (Withdraw)**: `PATCH /api/v1/applications/:id/status`
- **SRS Traceability**: FR-11
- **Permission**: Student can only transition their own application to `'Withdrawn'`.
- **Request Body**:
  ```json
  {
    "status": "Withdrawn"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application withdrawn successfully.",
    "data": {
      "id": "67330012e4b02a1b9c8d88bb",
      "status": "Withdrawn"
    },
    "pagination": null
  }
  ```

---

## 6. Functional Group F: Personal Projects & Tasks (FR-27 to FR-32, ASM-02)

> **ASM-02 Constraint**: Projects and tasks belong strictly to Students.

### 6.1. Projects Management
- `GET /api/v1/projects` — List personal projects (`FR-27`, `FR-28`)
- `POST /api/v1/projects` — Create personal project with `name`, optional `description`, `status` (`active`, `completed`, `on_hold`), and `dueDate` (`FR-27`)
- `PUT /api/v1/projects/:id` — Update project fields (`FR-29`)
- `DELETE /api/v1/projects/:id` — Archive or delete personal project (`FR-29`)

### 6.2. Tasks Management
- `GET /api/v1/tasks` — List tasks, filtered by `status` (`todo`, `done`), `priority` (`low`, `medium`, `high`), or `projectId` (`FR-30`, `FR-31`)
- `POST /api/v1/tasks` — Create task with `title`, `priority`, `dueDate`, and optional `projectId` (`FR-30`)
- `PATCH /api/v1/tasks/:id` — Edit task fields or toggle status between `todo` and `done` (`FR-32`)
- `DELETE /api/v1/tasks/:id` — Delete task (`FR-32`)

---

## 7. Functional Group G: AI Learning Assistant (FR-19, FR-20, FR-21, CON-05)

> **CON-05 Rule**: Read-only educational assistance. Does not modify database records. Every response includes a guidance disclaimer.

### 7.1. AI Study Plan Generator
- **Endpoint**: `POST /api/v1/ai/study-plan`
- **SRS Traceability**: FR-19
- **Request Body**:
  ```json
  {
    "availableHours": 3
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Study plan generated.",
    "data": {
      "guidanceNotice": "This study plan is AI-generated for guidance only.",
      "plan": [
        {
          "day": "Day 1",
          "topics": ["Express Routing & Middleware"],
          "assignment": "Lab 1: REST API with Express"
        }
      ]
    },
    "pagination": null
  }
  ```

---

### 7.2. AI Question Answering
- **Endpoint**: `POST /api/v1/ai/ask`
- **SRS Traceability**: FR-20
- **Request Body**:
  ```json
  {
    "question": "What is the difference between authenticate and authorize middlewares?"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "AI answer generated.",
    "data": {
      "guidanceNotice": "AI responses are for educational support. Refer to instructor lectures for definitive criteria.",
      "answer": "Authentication identifies the user, while authorization checks whether the user has permission to access a specific resource."
    },
    "pagination": null
  }
  ```

---

### 7.3. AI Internship Skill Matching
- **Endpoint**: `GET /api/v1/ai/internship-matches`
- **SRS Traceability**: FR-21
- **Description**: Ranks open internships by overlap with student skills and shows recommendations.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Internship matches retrieved.",
    "data": {
      "guidanceNotice": "Skill match scores are heuristic indicators based on profile keywords.",
      "matches": [
        {
          "internshipId": "6732fd81e4b02a1b9c8d77aa",
          "title": "Full Stack Software Engineering Intern",
          "matchedSkills": ["JavaScript", "React", "Node.js", "MongoDB"],
          "missingSkills": []
        }
      ]
    },
    "pagination": null
  }
  ```

---

## 8. Functional Group H: Notifications, Messaging & Activity (FR-14, FR-25, FR-33, FR-34, FR-35, FR-36, FR-37)

- `GET /api/v1/notifications` — List in-app notifications (`FR-14`, `FR-25`)
- `GET /api/v1/notifications/unread-count` — Unread notification count (`FR-25`, `FR-43`)
- `PATCH /api/v1/notifications/:id/read` — Mark notification read (`FR-25`)
- `PATCH /api/v1/notifications/read-all` — Mark all read (`FR-25`)
- `GET /api/v1/messages/conversations` — Conversation threads with unread counts (`FR-34`)
- `GET /api/v1/messages/with/:userId` — Message history with specific permitted user (`FR-34`)
- `POST /api/v1/messages` — Send direct message (ASM-05: students may message instructors and coordinators only; student-to-student messaging is out of scope) (`FR-33`)
- `GET /api/v1/activity/recent` — Recent personal activity feed (`FR-35`, `FR-36`)
- `GET /api/v1/activity/weekly` — Weekly activity action counts by day (`FR-37`)
- `GET /api/v1/search?q=` — Global search across allowed resources (`FR-42`)
