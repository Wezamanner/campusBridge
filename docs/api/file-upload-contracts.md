# CampusBridge API: File Upload Contracts & Security Protocol

## 1. Overview & Scope

CampusBridge processes document uploads for academic submissions, professional CVs, and course resources. To protect the host system and comply with the official Software Requirements Specification (SRS Section 7.2.1, 7.2.2, 9.2, and SEC-07), this contract defines strict limits, permitted formats, storage schemes, and validation workflows.

---

## 2. File Upload Matrix

| Upload Category | Responsible Role | Maximum File Size | Permitted MIME Types | Permitted Extensions | Storage Destination | Relevant SRS ID |
|---|---|---|---|---|---|---|
| **Student CV** | `student` | **2 MB** (2,097,152 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.pdf`, `.doc`, `.docx` | `server/uploads/cv/` | FR-23, SEC-07 |
| **Assignment Submission** | `student` | **5 MB** (5,242,880 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>`application/zip`<br>`application/x-zip-compressed`<br>`text/plain` | `.pdf`, `.doc`, `.docx`, `.zip`, `.txt` | `server/uploads/submissions/` | FR-07, SEC-07 |
| **Course Resource** | `instructor` | **10 MB** (10,485,760 bytes) | `application/pdf`<br>`application/msword`<br>`application/vnd.openxmlformats-officedocument.wordprocessingml.document`<br>`application/vnd.ms-powerpoint`<br>`application/vnd.openxmlformats-officedocument.presentationml.presentation`<br>`application/zip`<br>`text/plain` | `.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`, `.zip`, `.txt` | `server/uploads/resources/` | FR-04, FR-05 |

---

## 3. Student CV Upload Contract

### 3.1. Endpoint Specification

- **Endpoint**: `POST /api/v1/student/profile/cv`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required (`Bearer <JWT>`)
- **Role Permission**: `student` only
- **Form Field Name**: `cv`

### 3.2. Payload & File Validation Rules

1. Exactly one file must be attached under field name `cv`.
2. The file size must not exceed `2,097,152` bytes (2 MB).
3. The file must match one of the permitted MIME types:
   - `application/pdf`
   - `application/msword`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
4. The filename must end with `.pdf`, `.doc`, or `.docx` (case-insensitive).
5. Replacement Rule: If the student already has a CV recorded in `User.cv`, uploading a new CV will unlink/delete the previous physical file and update `User.cv` with the newly uploaded file reference.

### 3.3. Success Response (`200 OK` or `201 Created`)

```json
{
  "success": true,
  "message": "CV uploaded and profile updated successfully.",
  "data": {
    "name": "Alex_Rivera_CV_2026.pdf",
    "path": "/uploads/cv/cv-6732f1a2e4b02a1b9c8d3e4f-1731195600000.pdf",
    "size": 1048576,
    "mimeType": "application/pdf",
    "uploadedAt": "2026-11-09T20:40:00.000Z"
  },
  "pagination": null
}
```

### 3.4. Error Responses

- **File Too Large (`413 Payload Too Large`)**:
  ```json
  {
    "success": false,
    "message": "CV file size exceeds the maximum permitted limit of 2 MB.",
    "errors": [
      {
        "field": "cv",
        "message": "Maximum size allowed is 2 MB (2,097,152 bytes). Provided file is 3,145,728 bytes."
      }
    ]
  }
  ```
- **Invalid File Type (`415 Unsupported Media Type`)**:
  ```json
  {
    "success": false,
    "message": "Unsupported file format. Only PDF and Word documents are permitted for CVs.",
    "errors": [
      {
        "field": "cv",
        "message": "File format 'image/png' is not allowed. Supported extensions: .pdf, .doc, .docx."
      }
    ]
  }
  ```

---

## 4. Assignment Submission Upload Contract

### 4.1. Endpoint Specification

- **Endpoint**: `POST /api/v1/student/assignments/:assignmentId/submit`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Authentication**: Required (`Bearer <JWT>`)
- **Role Permission**: `student` only
- **Form Fields**:
  - `text` (string, optional if file is attached)
  - `file` (binary, optional if text is provided; required if text is omitted)

### 4.2. Business & Replacement Logic

1. **Enrollment Check**: Student must have an active enrollment in the course that owns the assignment.
2. **Deadline Check**: If `new Date() > assignment.deadline`, submission is rejected with `422 Unprocessable Entity` unless `assignment.allowLate === true`.
3. **Resubmission / Replacement Rule**:
   - A student may resubmit or replace their submission until the deadline or until the submission is graded (`status === 'Graded'`).
   - If a submission already exists in `status === 'Submitted'`, resubmitting updates the existing `Submission` document, cleans up the old file, saves the new file, updates `submittedAt` to current timestamp, and logs `SUBMIT_ASSIGNMENT`.
   - Once graded (`status === 'Graded'`), submissions are immutable and cannot be replaced.

### 4.3. Success Response (`200 OK` on replace, `201 Created` on first submit)

```json
{
  "success": true,
  "message": "Assignment submitted successfully.",
  "data": {
    "_id": "6732f8a4e4b02a1b9c8d55aa",
    "assignmentId": "6732f7a4e4b02a1b9c8d4499",
    "courseId": "6732f1a2e4b02a1b9c8d3e4f",
    "studentId": "6732f1a2e4b02a1b9c8d3e4f",
    "text": "Completed implementation according to specifications.",
    "file": {
      "name": "lab1_solution.zip",
      "path": "/uploads/submissions/sub-6732f1a2-6732f7a4-1731195700000.zip",
      "size": 2457600,
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

## 5. Security & File System Integrity Rules

To protect against file injection, arbitrary code execution, and path traversal vulnerabilities (SEC-07, SEC-11):

1. **Filename Sanitization**: Original filenames must never be used directly on the host disk. Filenames on disk must follow the sanitized pattern:
   ```text
   <category>-<userId>-<timestamp>-<randomHash>.<ext>
   ```
2. **Directory Traversal Protection**: Storage destinations are resolved with `path.join(__dirname, ...)` and guaranteed to reside within designated `/uploads` subtrees.
3. **MIME Verification & Magic Number Validation**: The backend must inspect both the HTTP Content-Type header and file binary header/extension before saving.
4. **Execution Prevention**: The `uploads/` directory must not execute scripts. Web servers serving static files must send `Content-Disposition: attachment` or strict `Content-Type` headers to prevent script interpretation.
5. **Disk Storage Cleanup**: When a user replaces a CV or submission, or deletes a resource, orphaned files must be unlinked from the filesystem.
