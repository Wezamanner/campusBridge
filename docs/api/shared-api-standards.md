# CampusBridge API: Shared Standards & Protocol Specification

## 1. Executive Summary & Purpose

This document defines the uniform API design standards, payload formats, authentication rules, error handling structures, and conventions for the CampusBridge university learning and internship platform. All four development streams (Student/Instructor, Coordinator, and Administrator) adhere to these unified contracts to guarantee seamless interoperability across the single MongoDB database instance and unified Express.js application.

---

## 2. API Design Principles & Base Architecture

- **Protocol**: RESTful HTTP over HTTPS (with localhost HTTP in development).
- **Format**: JSON (`application/json`) for standard requests and responses; `multipart/form-data` for file uploads.
- **Character Encoding**: UTF-8.
- **Prefix & Versioning**: All endpoints must be versioned and use the global prefix:
  ```text
  /api/v1
  ```
- **Language & Runtime**: Node.js (v18+) with Express.js and ES Modules (`import`/`export`).
- **Database Layer**: MongoDB (v6+) through Mongoose ODM.
- **State Management**: Stateless REST with short-lived JSON Web Tokens (JWT).

---

## 3. Standard Response Envelopes

Every API endpoint must respond using a consistent response wrapper. This enables frontend services and consumers to safely parse and process API outcomes without ad-hoc payload decoding.

### 3.1. Standard Success Envelope (Non-Paginated)

```json
{
  "success": true,
  "message": "Resource retrieved successfully.",
  "data": {
    "id": "6732f1a2e4b02a1b9c8d3e4f",
    "name": "Introduction to Computer Science",
    "code": "CS101"
  },
  "pagination": null
}
```

### 3.2. Standard Success Envelope (Paginated Collections)

For endpoints returning collections that support pagination:

```json
{
  "success": true,
  "message": "Courses retrieved successfully.",
  "data": [
    {
      "id": "6732f1a2e4b02a1b9c8d3e4f",
      "name": "Introduction to Computer Science",
      "code": "CS101"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3.3. Standard Error Envelope

When a client or server error occurs, the server responds with a descriptive message and an optional array of field-level validation errors:

```json
{
  "success": false,
  "message": "Validation failed on assignment submission.",
  "errors": [
    {
      "field": "deadline",
      "message": "Assignment submission deadline has passed."
    },
    {
      "field": "file",
      "message": "File size exceeds the 5 MB threshold."
    }
  ]
}
```

---

## 4. HTTP Status Code Conventions

The API adheres strictly to standard HTTP semantics:

| HTTP Status | Name | CampusBridge Usage |
|---|---|---|
| `200` | OK | Successful GET, PUT, or PATCH operation. Returned when modifying an existing entity. |
| `201` | Created | Successful POST operation creating a new record (assignment, submission, enrollment, project, task, message). |
| `204` | No Content | Successful DELETE operation with no body to return (or return 200 with message). |
| `400` | Bad Request | Syntactic request failure, malformed JSON, or missing required fields in request payload. |
| `401` | Unauthorized | Missing, expired, invalid, or forged Bearer JWT. Unauthenticated user accessing protected route. |
| `403` | Forbidden | Authenticated user lacks authorized role, lacks resource ownership, or user account is deactivated (`active: false`). |
| `404` | Not Found | Requested entity, route, or resource does not exist in the database. |
| `409` | Conflict | Business rule conflict (e.g. duplicate enrollment in same course, duplicate internship application, unique key violation). |
| `413` | Payload Too Large | Uploaded file exceeds configured limit (CV > 2 MB, Assignment Submission > 5 MB). |
| `415` | Unsupported Media Type | Uploaded file MIME type or extension not permitted. |
| `422` | Unprocessable Entity | Semantically invalid data (e.g., assignment deadline is in the past, grade score exceeds maxScore, invalid status transition). |
| `500` | Internal Server Error | Unexpected server runtime exception. In production, error stack trace is redacted. |

---

## 5. Pagination, Filtering, and Sorting Conventions

Collections that can grow unbounded must implement pagination, filtering, and sorting to protect server memory and network bandwidth.

### 5.1. Standard Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | 1-based page index. |
| `limit` | Integer | `10` | Maximum items per page (maximum allowed: `100`). |
| `sort` | String | `createdAt` | Field to sort by (e.g., `deadline`, `title`, `averageScore`). |
| `order` | String | `desc` | Sort direction: `asc` (ascending) or `desc` (descending). |
| `search` | String | `""` | Search keyword for text matching. |
| `status` | String | (all) | Filter by entity status (e.g., `todo`, `done`, `Submitted`, `Graded`, `active`). |

---

## 6. Authentication and Authorization Protocol

### 6.1. Bearer Token Format

All protected endpoints require the client to supply a valid JWT in the HTTP Authorization header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### 6.2. Roles and Role Hierarchy

CampusBridge defines four mutually exclusive user roles in `User.role`:

1. `student`: Enrolls in courses, submits assignments, tracks progress, manages personal projects/tasks, applies for internships, views achievements.
2. `instructor`: Manages course materials/resources, creates assignments, reviews and grades student submissions, monitors at-risk students.
3. `coordinator`: Creates and archives courses, assigns instructors, manages partner companies and internships, reviews applications.
4. `admin`: Manages user accounts and roles, controls self-registration, publishes system announcements, manages public content.

### 6.3. Account Status Check (Deactivation)

Per requirement **FR-22** and **SEC-04**, when a user's `active` property is `false`, any authenticated request must immediately reject with `403 Forbidden` and message:
`"Your account has been deactivated. Please contact an administrator."`

### 6.4. Data Privacy and Exposure Standards

1. **Password Hashes**: `passwordHash` must always have `select: false` in Mongoose and be stripped in `.toJSON()`.
2. **Tokens and Secrets**: Never return or log JWT secrets, session keys, or password reset tokens.
3. **Student Privacy**: A student can only view their own grades, submissions, CV, and progress. Course rosters shown to instructors only show enrolled students for their assigned course.
4. **Leaderboard Anonymity**: Public/cohort rankings must anonymize student identities (e.g. initials or Student ID hash) unless explicitly opted in.

---

## 7. Audit Logging Protocol

Per requirement **FR-35**, critical state-altering mutations automatically record an immutable `ActivityLog` entry:

```javascript
{
  userId: req.user._id,
  action: 'SUBMIT_ASSIGNMENT', // from defined ActivityLog enum
  targetType: 'Submission',
  targetId: submission._id,
  meta: {
    assignmentTitle: assignment.title,
    courseCode: course.code
  }
}
```

*Security Guard (SEC-12)*: ActivityLog `meta` must never include passwords, tokens, or raw private message text.
