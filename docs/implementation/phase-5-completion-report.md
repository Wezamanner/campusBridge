# CampusBridge — Phase 5 Implementation Report: Course Resource Management

## 1. Overview & Verification Status

- **Phase**: Phase 5 — Course Resource Management
- **Branch**: `team1`
- **Functional Authority**: CampusBridge Software Requirements Specification (SRS) v2.0 (FR-04, FR-05, Section 12.3)
- **API Specification Authority**:
  - `docs/api/instructor-api-spec.md` (Sections 2.3 & 2.4)
  - `docs/api/student-api-spec.md` (Section 2.4)
  - `docs/api/openapi.yaml` (`/courses/{id}/resources`)
  - `docs/api/file-upload-contracts.md` (Section 1)
  - `docs/api/security-access-control.md` (Item 5, Lines 44–45)
- **Ownership Boundaries**:
  - Course creation, archiving, and instructor assignments remain exclusively owned by the **Academic Coordinator** (Developer 3).
  - Assigned Instructors upload, link, and manage course learning materials (FR-04).
  - Students access and download resources only after completing valid course enrollment (FR-05).
  - Cross-course and cross-instructor tampering is strictly blocked by server-side identity derivation.

---

## 2. SRS Requirement Traceability

| Requirement ID | Specification Requirement | Verification Status |
|---|---|---|
| **FR-04** | Coordinators create courses and assign one instructor. Assigned instructor uploads learning resources. | **VERIFIED & COMPLETED** |
| **FR-05** | Students browse courses, enroll, and open resources. Resources and assignments shown only after enrollment. | **VERIFIED & COMPLETED** |
| **SEC-04 / Rule 5** | Students must be actively enrolled before accessing enrollment-restricted course resources and assignments. | **VERIFIED & COMPLETED** |
| **SEC-07** | Inactive/Archived course protection: Instructors cannot add resources to archived courses (`status: 'archived'`). | **VERIFIED & COMPLETED** |
| **File Upload Contract** | Course resources enforce 10 MB maximum size limit and allowlisted MIME types/extensions (`.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`, `.zip`, `.txt`). | **VERIFIED & COMPLETED** |

---

## 3. Approved API Operations

### 3.1. Upload / Link Learning Resource
- **Method & Path**: `POST /api/v1/courses/:id/resources`
- **Role Permissions**: `instructor` (`authorize('instructor')`)
- **Ownership Guard**: Assigned instructor only (`course.instructorId === req.user._id`). Non-assigned instructors receive `403 Forbidden`.
- **Content-Type**:
  - `multipart/form-data`: form fields `title`, `type` (optional), and binary file under form field `file` or `resource` (max 10 MB).
  - `application/json`: payload `{ "title": "...", "type": "...", "url": "..." }`.
- **Validation**:
  - `title`: Required string, 1 to 150 characters.
  - `type`: Enum `['pdf', 'document', 'slides', 'link', 'video', 'other']`. Inferred from extension if omitted.
  - `file`: 10 MB limit (`10,485,760` bytes), inspected for signature/magic numbers.
  - `url`: Validated for HTTP/HTTPS format if external link.
- **Response Format**: `201 Created` with standard envelope (`{ success: true, message, data: { _id, title, type, url, addedAt }, pagination: null }`).

### 3.2. View Course Learning Resources
- **Method & Path**: `GET /api/v1/courses/:id/resources`
- **Role Permissions**: `student`, `instructor`
- **Context Guards**:
  - If `instructor`: Assigned instructor only (`course.instructorId === req.user._id`).
  - If `student`: Actively enrolled student only (`Enrollment.findOne({ studentId: req.user._id, courseId: course._id })`).
  - Unenrolled students and unauthorized instructors receive `403 Forbidden`.
- **Response Format**: `200 OK` (`{ success: true, message, data: [...], pagination: null }`).

### 3.3. Secure Resource Download
- **Method & Path**: `GET /api/v1/courses/:id/resources/:resourceId/download`
- **Role Permissions**: `student`, `instructor`
- **Context Guards**: Identical authorization guards as resource viewing.
- **Security Features**:
  - Path traversal rejection via `path.relative()` and strict basename checks.
  - Rejection of symlinks and non-regular files.
  - Streaming via Node readable stream without reading entire file into memory.
  - Headers: `Content-Disposition: attachment; filename=...; filename*=UTF-8''...`, `X-Content-Type-Options: nosniff`.
  - External links redirect via `302 Found`.

---

## 4. File Validation & Storage Protections

1. **Storage Isolation**: Physical files reside in `server/uploads/resources/`, strictly isolated with directory permission mode `0700`.
2. **File Permissions**: Saved resource files receive restrictive mode `0600`.
3. **Safe Storage Naming**: Files use cryptographically random UUIDs: `res-<courseId>-<cryptoUUID>.<ext>`. Original client filenames are never used for disk storage.
4. **Deep File Inspection**:
   - PDF: Magic signature `%PDF` (`25 50 44 46`).
   - DOC / PPT: Full 8-byte OLE compound file header (`D0 CF 11 E0 A1 B1 1A E1`).
   - DOCX: PK header (`50 4B 03 04`) with verified ZIP container, EOCD, and `word/document.xml`.
   - PPTX / ZIP: PK header (`50 4B 03 04`).
   - TXT: Valid UTF-8 / ASCII text without binary null bytes.
5. **Rollback & Cleanup**: Staged temp files are deleted immediately on validation failure; permanent files are unlinked if database persistence fails.

---

## 5. Files Created & Modified

### 5.1. Backend
1. **`server/src/middleware/upload.js`** (Modified)
   - Added `resourcesDir` with restrictive `0700` directory enforcement.
   - Added `handleResourceUpload` supporting optional/required multipart uploads up to 10 MB with 413/415 status formatting.
2. **`server/src/utils/validation.js`** (Modified)
   - Added `ALLOWED_RESOURCE_EXTENSIONS`, `ALLOWED_RESOURCE_MIME_TYPES`, `RESOURCE_TYPE_ENUM`.
   - Added `validateResourceFileSignature` and `validateResourceInput`.
3. **`server/src/controllers/course.controller.js`** (Modified)
   - Added `addCourseResource`: Assigned instructor guard, active course check, file signature validation, safe UUID storage, and metadata persistence.
   - Added `getCourseResources`: Role-based access enforcement for assigned instructors and enrolled students.
   - Added `downloadCourseResource`: Authenticated streaming with path containment, symlink rejection, and sanitized Content-Disposition headers.
4. **`server/src/routes/course.routes.js`** (Modified)
   - Registered `POST /:id/resources`, `GET /:id/resources`, and `GET /:id/resources/:resourceId/download`.
5. **`server/src/utils/testCourseResources.js`** (Created)
   - Automated 35-case integration test suite testing all permission gates, file types, upload limits, and secure downloads.
6. **`server/package.json`** (Modified)
   - Added `"test:resources": "PORT=5005 node src/utils/testCourseResources.js"`.

### 5.2. Frontend
1. **`client/src/pages/instructor/InstructorCourseDetailsPage.jsx`** (Modified)
   - Replaced Phase 5 placeholder notice with active Course Learning Resources dashboard card.
   - Features: List of uploaded resources with category badges, upload date, and download/link actions.
   - Integrated resource authoring form supporting both file uploads (up to 10 MB) and external web links.
   - Dismissible success and error banners with duplicate submission prevention.
2. **`client/src/pages/student/StudentCourseDetailsPage.jsx`** (Modified)
   - Replaced Phase 5 placeholder with active Course Learning Resources card.
   - Enrolled students view all materials uploaded by the instructor with direct authenticated download via `api.download`.
   - Non-enrolled students view university policy lock notice with one-click enrollment CTA.

---

## 6. Test Results & Build Verification

### 6.1. Course Resource Management Test Suite
Command: `npm run test:resources --prefix server`
- **Result**: **42 Passed, 0 Failed**
- Verified test areas:
  1. Unauthenticated requests to POST, GET, and download endpoints rejected (`401 Unauthorized`).
  2. Non-instructor roles (coordinators, students) calling upload endpoint rejected (`403 Forbidden`).
  3. Non-assigned instructors attempting to upload, view, or download resources rejected (`403 Forbidden`).
  4. Adding resources to archived courses rejected (`400 Bad Request`).
  5. Missing titles and missing payload rejected (`400 Bad Request`).
  6. Disallowed file extensions (.sh) rejected (`415 Unsupported Media Type`).
  7. Fake file signatures (e.g. text disguised as PDF) rejected (`415 Unsupported Media Type`).
  8. MIME type and extension mismatch (e.g. `.txt` with `application/pdf`) rejected (`415 Unsupported Media Type`).
  9. Generic ZIP archive disguised as `.pptx` lacking `ppt/presentation.xml` rejected (`415 Unsupported Media Type`).
  10. Unsafe URL schemes (e.g. `javascript:`) rejected (`400 Bad Request`).
  11. TXT files with binary control bytes rejected (`415 Unsupported Media Type`).
  12. TXT files with trailing binary bytes near file end rejected via full streaming scan (`415 Unsupported Media Type`).
  13. External URLs with embedded credentials rejected (`400 Bad Request`).
  14. ZIP archives with duplicate internal filenames rejected (`415 Unsupported Media Type`).
  15. Assigned instructors upload external link resources (`201 Created`).
  16. Assigned instructors upload authentic PDF documents with safe UUID filenames (`201 Created`).
  17. Assigned instructors upload authentic text reading notes (`201 Created`).
  18. Assigned instructors view all course resources (`200 OK`).
  19. Enrolled students view all course resources (`200 OK`).
  20. Unenrolled students viewing course resources rejected (`403 Forbidden`).
  21. Enrolled students securely download resource files (`200 OK` with attachment and nosniff headers).
  22. Assigned instructors securely download resource files (`200 OK`).
  23. Unenrolled students downloading resource files rejected (`403 Forbidden`).
  24. Non-assigned instructors downloading resource files rejected (`403 Forbidden`).
  25. Non-existent resource IDs return `404 Not Found`.
  26. Malformed course IDs return `400 Bad Request`.
  27. Non-existent course IDs return `404 Not Found`.

### 6.2. Regression Test Suites
1. **Student Course Browsing & Enrollment**: `npm run test:enrollment --prefix server` -> **30 Passed, 0 Failed**
2. **Instructor Course Workspace**: `npm run test:courses --prefix server` -> **25 Passed, 0 Failed**
3. **Student Profile & CV Management**: `npm run test:profile --prefix server` -> **35 Passed, 0 Failed**
4. **Frontend Production Build**: `npm run build --prefix client` -> **PASS (0 errors, 1.91s)**

---

## 7. Known Limitations & Unresolved Issues

1. **Resource Deletion / Replacement (`DELETE` / `PATCH`)**:
   - In accordance with the approved API contracts (`openapi.yaml` and `instructor-api-spec.md`), no delete or replace endpoint is defined for course resources. Therefore, resource deletion is strictly excluded from Phase 5 to avoid introducing unapproved endpoints.
2. **Assignments & Coursework (FR-06, FR-07, FR-08)**:
   - Assignment creation, deadlines, late submission toggles, and grading activate in Phases 6 and 7.

---

## 8. Git Status

- **Branch**: `team1`
- **Head Commit**: `3f6f8f85fad4cf854de02bcdc339d211feb745fa` (Phase 4)
- **Local working changes**: Strictly isolated to Phase 5 files.
- **Commit/Push status**: No commit, push, or merge executed. Ready for review.
