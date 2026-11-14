# CampusBridge API: Shared Standards & Protocol Specification
## Strict SRS v2.0 Compliance Baseline

- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0
- **Base URI Prefix**: `/api/v1`

---

## 1. Executive Summary & Architectural Scope

This document formalizes the unified REST API design conventions, payload structures, status codes, query protocols, and security headers across the CampusBridge platform. All developer workstreams adhere to these standards to maintain total consistency across the shared Express.js application and MongoDB database.

---

## 2. Global Standards & Protocol Rules

- **Base URL Prefix**: All endpoints must be versioned under:
  ```text
  /api/v1
  ```
- **Payload Format**: `application/json` (UTF-8) for standard request/response bodies; `multipart/form-data` for file uploads.
- **Authentication Header**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```
- **Stateless REST**: State resides in MongoDB; authentication uses stateless JWTs verified via `server/src/middleware/auth.js`.

---

## 3. Standard Response Envelopes

Every API endpoint responds with a predictable envelope format.

### 3.1. Standard Success Envelope (Single Entity / Action)

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

```json
{
  "success": false,
  "message": "Validation failed on request payload.",
  "errors": [
    {
      "field": "deadline",
      "message": "Assignment deadline must be a future date."
    }
  ]
}
```

---

## 4. HTTP Status Code Conventions

| HTTP Status | Name | CampusBridge Usage |
|---|---|---|
| `200` | OK | Successful GET, PUT, or PATCH operation. |
| `201` | Created | Successful POST operation creating a new record (submission, enrollment, task, message, assignment). |
| `204` | No Content | Successful deletion without a response body. |
| `400` | Bad Request | Syntactic request failure, malformed JSON, or missing required body fields. |
| `401` | Unauthorized | Missing, expired, invalid, or forged Bearer JWT. |
| `403` | Forbidden | Authenticated user lacks required role, lacks resource ownership, violates pairing rules, or account is deactivated (`active: false`). |
| `404` | Not Found | Requested entity or route does not exist. |
| `409` | Conflict | Business logic conflict (duplicate enrollment, duplicate application, duplicate submission). |
| `413` | Payload Too Large | Uploaded file exceeds configured limits (CV > 2 MB, Submission > 5 MB). |
| `415` | Unsupported Media Type | Uploaded file format or MIME type is not allowed. |
| `422` | Unprocessable Entity | Semantically invalid data (past deadline, score > maxScore, terminal application state). |
| `500` | Internal Server Error | Unhandled server exception (stack trace redacted in production). |

---

## 5. Pagination, Filtering, and Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | 1-based page index. |
| `limit` | Integer | `10` | Maximum items per page (maximum limit: `100`). |
| `search` | String | `""` | Search keyword for text matching. |
| `status` | String | (all) | Status filter matching model enums (e.g. `todo`, `done`, `Submitted`, `Graded`). |
| `courseId` | ObjectId | (none) | Filter records belonging to a specific course. |

---

## 6. Audit Logging Protocol (FR-35)

In accordance with requirement **FR-35**, state-altering operations record an immutable `ActivityLog` entry:

```javascript
{
  userId: req.user._id,
  action: 'SUBMIT_ASSIGNMENT',
  targetType: 'Submission',
  targetId: submission._id,
  meta: {
    courseCode: course.code,
    assignmentTitle: assignment.title
  }
}
```

*Security Guard (SEC-12)*: ActivityLog `meta` must never include passwords, tokens, or raw private message text.
