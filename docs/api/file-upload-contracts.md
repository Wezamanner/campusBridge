# CampusBridge API: File Upload Contracts & Security Protocol
## Strict SRS v2.0 Compliance Baseline

- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-07, FR-23, SEC-07)
- **Base URI Prefix**: `/api/v1`

---

## 1. File Upload Matrix

| Upload Category | Responsible Role | Maximum File Size | Permitted MIME Types | Permitted Extensions | Storage Destination | Relevant SRS ID |
|---|---|---|---|---|---|---|
| **Student CV** | `student` | **2 MB** (2,097,152 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.pdf`, `.doc`, `.docx` | `server/uploads/cv/` | FR-23, SEC-07 |
| **Assignment Submission** | `student` | **5 MB** (5,242,880 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>`application/zip`<br>`application/x-zip-compressed`<br>`text/plain` | `.pdf`, `.doc`, `.docx`, `.zip`, `.txt` | `server/uploads/submissions/` | FR-07, SEC-07 |
| **Course Resource** | `instructor` | **10 MB** (10,485,760 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>`application/vnd.ms-powerpoint`<br>`application/vnd.openxmlformats-officedocument.presentationml.presentation`<br>`application/zip`<br>`text/plain` | `.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`, `.zip`, `.txt` | `server/uploads/resources/` | FR-04, FR-05 |

---

## 2. Student CV Upload Contract (FR-23, SEC-07)

### 2.1. Endpoint Specification
- **Endpoint**: `POST /api/v1/profile/cv`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required (`Bearer <JWT>`)
- **Role Permission**: `student` only
- **Form Field Name**: `cv`

### 2.2. Validation & Replacement Rules
1. Exactly one file attached under field name `cv`.
2. The file size must not exceed `2,097,152` bytes (2 MB).
3. The file must match permitted MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
4. File extension must be `.pdf`, `.doc`, or `.docx`.
5. **Replacement Rule**: Uploading a new CV replaces the earlier file and updates `User.cv`.

### 2.3. Responses
- **`200 OK`**:
  ```json
  {
    "success": true,
    "message": "CV uploaded and profile updated successfully.",
    "data": {
      "name": "Alex_Rivera_CV.pdf",
      "path": "/uploads/cv/cv-6732f1a2-1731195600000.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-11-10T00:00:00.000Z"
    },
    "pagination": null
  }
  ```
- **`413 Payload Too Large`**: File exceeds 2 MB limit.
- **`415 Unsupported Media Type`**: File is not PDF or Word.

---

## 3. Assignment Submission Upload Contract (FR-07, SEC-07)

### 3.1. Endpoint Specification
- **Endpoint**: `POST /api/v1/assignments/:id/submissions`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required (`Bearer <JWT>`)
- **Role Permission**: `student` only
- **Form Fields**:
  - `text` (string, optional if file provided)
  - `file` (binary, optional if text provided; max 5 MB)

### 3.2. Validation & Replacement Rules
1. Student must be enrolled in course.
2. File size must not exceed `5,242,880` bytes (5 MB).
3. Permitted file types: PDF, Word, ZIP, or text (`.pdf`, `.doc`, `.docx`, `.zip`, `.txt`).
4. Must be submitted before deadline, unless late work is permitted (`allowLate: true`).
5. **Replacement Rule**: Students may replace an earlier submission before the deadline or until graded (`status === 'Submitted'`). Once graded, submissions are immutable.

### 3.3. Responses
- **`201 Created` / `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Assignment submission recorded successfully.",
    "data": {
      "id": "6732f8a4e4b02a1b9c8d55aa",
      "assignmentId": "6732f7a4e4b02a1b9c8d4499",
      "status": "Submitted",
      "submittedAt": "2026-11-10T00:20:00.000Z"
    },
    "pagination": null
  }
  ```
- **`413 Payload Too Large`**: File exceeds 5 MB limit.
- **`415 Unsupported Media Type`**: File is not PDF, Word, ZIP, or text.
- **`422 Unprocessable Entity`**: Deadline passed without late submission allowed, or work is already graded.

---

## 4. Storage Security & Sanitation

1. **Filename Sanitization**: Files stored on disk use unique identifiers: `<category>-<userId>-<timestamp>.<ext>`.
2. **Directory Isolation**: Storage paths reside strictly within designated `uploads/` subdirectories.
3. **Execution Prevention**: The uploads directory is served statically with appropriate MIME headers and without script execution privileges.
