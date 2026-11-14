# CampusBridge: SRS Traceability & Compliance Matrix

## 1. Compliance Audit Overview

This compliance matrix verifies every feature, endpoint, data field, validation rule, and workflow against the official **CampusBridge Software Requirements Specification (SRS) v2.0**.

### Classification Categories

- **Category A — Explicit SRS Requirement**: Directly specified in the official SRS.  
  *Action*: **KEEP**.
- **Category B — Necessary Technical Implementation Detail**: Required to implement an explicit SRS requirement safely and consistently (e.g. JWT extraction, ownership checks, standard status codes).  
  *Action*: **KEEP**.
- **Category C — Proposed or Assumed Functionality**: Introduced without explicit SRS authorization.  
  *Action*: **REMOVE** from approved contracts and isolate in `docs/api/proposed-enhancements.md`.
- **Category D — Contradicts the SRS**: In conflict with SRS text or constraints.  
  *Action*: **REMOVE / CORRECT IMMEDIATELY**.

---

## 2. Comprehensive Requirements Compliance Matrix

| SRS ID | Exact SRS Requirement Description | Associated API or Functionality | Classification | Action Taken |
|---|---|---|---|---|
| **FR-01** | Students register themselves. All users sign in with email and password. Passwords stored with bcrypt. | `POST /api/v1/auth/register`<br>`POST /api/v1/auth/login` | Category A (Explicit) | **Keep** — Shared auth engine |
| **FR-02** | Every page and endpoint is restricted by role and ownership. 401 when unauthenticated, 403 when forbidden. | `authenticate`, `authorize`, `checkOwnership` middleware | Category A (Explicit) | **Keep** — Foundation RBAC |
| **FR-03** | Users view and edit their profile (students: program, year; instructors: department; preferences: theme). | `GET /api/v1/profile`<br>`PUT /api/v1/profile` | Category A (Explicit) | **Keep** — Profile management |
| **FR-04** | Coordinators create courses and assign one instructor. Assigned instructor uploads learning resources. | `POST /api/v1/courses/:id/resources` | Category A (Explicit) | **Keep** — Resource authoring |
| **FR-05** | Students browse courses, enroll and open resources. Resources and assignments shown only after enrollment. | `GET /api/v1/courses`<br>`GET /api/v1/courses/:id`<br>`POST /api/v1/courses/:id/enroll`<br>`GET /api/v1/courses/:id/resources` | Category A (Explicit) | **Keep** — Catalog and enrollment |
| **FR-06** | Assigned instructor creates assignments with instructions, deadline, maximum score and late-submission setting. | `POST /api/v1/courses/:id/assignments`<br>`GET /api/v1/assignments/:id` | Category A (Explicit) | **Keep** — Assignment authoring |
| **FR-07** | Students submit text or file (PDF, Word, ZIP or text, up to 5 MB) before deadline; may replace until graded/due. | `POST /api/v1/assignments/:id/submissions`<br>`GET /api/v1/assignments/:id/submissions` | Category A (Explicit) | **Keep** — Submission lifecycle |
| **FR-08** | Instructors give score between 0 and maximum and written feedback. | `GET /api/v1/instructor/submissions`<br>`PATCH /api/v1/submissions/:id/grade` | Category A (Explicit) | **Keep** — Grading queue & evaluation |
| **FR-09** | System calculates progress per course and overall from submitted work. Recalculates after each submission. | `GET /api/v1/progress` | Category A (Explicit) | **Keep** — Progress tracking |
| **FR-10** | Coordinators post, edit and close verified internships. Students browse open internships. | `GET /api/v1/internships`<br>`GET /api/v1/internships/:id` | Category A (Explicit) | **Keep** — Internship discovery |
| **FR-11** | Students search internships, apply with message and CV, and may withdraw before final decision. | `POST /api/v1/internships/:id/applications`<br>`GET /api/v1/applications`<br>`PATCH /api/v1/applications/:id/status` (withdraw) | Category A (Explicit) | **Keep** — Application submission & withdraw |
| **FR-12** | Application status workflow: Submitted, Under review, Forwarded, Accepted, Rejected, Withdrawn. | `GET /api/v1/applications` (status & history) | Category A (Explicit) | **Keep** — Status history |
| **FR-13** | Coordinators register and manage partner organizations offering internships. | `GET /api/v1/companies`<br>`POST /api/v1/companies` | Category A (Explicit) | **Keep** — Coordinator dependency |
| **FR-14** | In-app notifications for deadlines, grades, application updates, new submissions, new applications. | `GET /api/v1/notifications` | Category A (Explicit) | **Keep** — Notification dispatch |
| **FR-15** | Key events sent by email (graceful fallback if SMTP fails). | Backend email worker trigger | Category A (Explicit) | **Keep** — Background notification |
| **FR-16** | Role-based dashboards: students (progress, deadlines, courses, internships); instructors (grading queue, at-risk, courses). | Dashboard read models and summary endpoints | Category A (Explicit) | **Keep** — Role dashboard models |
| **FR-17** | System awards milestone badges and ranks students by average submission score with first names and initials only. | `GET /api/v1/achievements`<br>`GET /api/v1/rankings` | Category A (Explicit) | **Keep** — Badges & Privacy ranking |
| **FR-18** | Coordinators and administrators export applications, student progress and user lists as CSV. | CSV report generator endpoints | Category A (Explicit) | **Keep** — Staff dependencies |
| **FR-19** | AI assistant builds day-by-day study plan from student's courses, deadlines and available hours. | `POST /api/v1/ai/study-plan` | Category A (Explicit) | **Keep** — Student AI study plan |
| **FR-20** | AI assistant answers questions about courses, the platform and internships (read-only). | `POST /api/v1/ai/ask` | Category A (Explicit) | **Keep** — Student AI Q&A |
| **FR-21** | AI assistant ranks open internships by overlap with student skills and shows recommendations. | `GET /api/v1/ai/internship-matches` | Category A (Explicit) | **Keep** — Student AI skill match |
| **FR-22** | Administrators create instructor/coordinator accounts, change roles, deactivate/reactivate users. | `PATCH /api/v1/admin/users/:id/status` | Category A (Explicit) | **Keep** — Admin auth guard |
| **FR-23** | Students maintain skills and upload one CV (PDF or Word, up to 2 MB). | `POST /api/v1/profile/cv` | Category A (Explicit) | **Keep** — CV upload / replace |
| **FR-24** | Administrators switch student self-registration on/off and publish dashboard announcement. | `GET /api/v1/admin/announcements` | Category A (Explicit) | **Keep** — Admin setting check |
| **FR-25** | Notification center with unread count; mark one or all as read. | `GET /api/v1/notifications/unread-count`<br>`PATCH /api/v1/notifications/:id/read`<br>`PATCH /api/v1/notifications/read-all` | Category A (Explicit) | **Keep** — Notification center |
| **FR-26** | Company hand-off list: Coordinators export forwarded applicants as CSV. | Coordinator CSV export | Category A (Explicit) | **Keep** — Coordinator feature |
| **FR-27** | Students create personal projects with name, optional description, status (active, completed, on_hold), due date. | `POST /api/v1/projects`<br>`GET /api/v1/projects` | Category A (Explicit) | **Keep** — Personal projects (ASM-02) |
| **FR-28** | Project cards show completion progress as share of completed tasks (ASM-03). | Calculated project progress % | Category A (Explicit) | **Keep** — Task-based progress |
| **FR-29** | Students edit project fields, archive or delete personal projects. | `PUT /api/v1/projects/:id`<br>`DELETE /api/v1/projects/:id` | Category A (Explicit) | **Keep** — Project management |
| **FR-30** | Students create tasks with title, priority (low, medium, high), due date, linked project. | `POST /api/v1/tasks`<br>`GET /api/v1/tasks` | Category A (Explicit) | **Keep** — Task management (ASM-04) |
| **FR-31** | Dashboard shows task list with status, due date, priority, filtered by status (todo, done) or project. | `GET /api/v1/tasks?status=&priority=&projectId=` | Category A (Explicit) | **Keep** — Task filters |
| **FR-32** | Students edit task fields and toggle status between todo and done. | `PATCH /api/v1/tasks/:id` | Category A (Explicit) | **Keep** — Task toggle |
| **FR-33** | Send direct messages (respecting ASM-05 pairing restrictions: students message instructors/coordinators). | `POST /api/v1/messages` | Category A (Explicit) | **Keep** — Direct messaging (ASM-05) |
| **FR-34** | Conversation threads list with unread counts and message history with specific user. | `GET /api/v1/messages/conversations`<br>`GET /api/v1/messages/with/:userId` | Category A (Explicit) | **Keep** — Message history |
| **FR-35** | System logs state mutations with actor, action, target, timestamp, sanitized metadata. | `ActivityLog` middleware hook | Category A (Explicit) | **Keep** — Audit trail |
| **FR-36** | Chronological recent activity list shown on dashboard. | `GET /api/v1/activity/recent` | Category A (Explicit) | **Keep** — Activity feed |
| **FR-37** | Weekly activity chart showing count of actions by day of week. | `GET /api/v1/activity/weekly` | Category A (Explicit) | **Keep** — Activity chart |
| **FR-38** | View and edit profile information and preferences. | `GET /api/v1/profile`<br>`PUT /api/v1/profile` | Category A (Explicit) | **Keep** — Profile preferences |
| **FR-39** | Dark and light theme switching; defaults to system setting (ASM-07). | `preferences.theme` in profile | Category A (Explicit) | **Keep** — Theme switch |
| **FR-40** | Dynamic sidebar navigation reflecting user role. | Frontend navigation config | Category A (Explicit) | **Keep** — Client shell |
| **FR-41** | Quick links on dashboard to frequent allowed actions. | Dashboard quick action links | Category A (Explicit) | **Keep** — Client shortcuts |
| **FR-42** | Global search across courses, internships, projects, tasks, messages (ASM-06). | `GET /api/v1/search?q=` | Category A (Explicit) | **Keep** — Search contract |
| **FR-43** | Notification popover in top navigation with unread count. | `GET /api/v1/notifications/unread-count` | Category A (Explicit) | **Keep** — Navigation indicator |
| **FR-44** | Dashboard analytics cards (progress, tasks, weekly activity, grading/risk counts). | Read model summary aggregations | Category A (Explicit) | **Keep** — Analytics summary |
| **FR-45** | Public landing page explaining platform with links to sign in and register. | Public landing page route | Category A (Explicit) | **Keep** — Public shell |
| **FR-46** | Public website displays active announcement. | `GET /api/v1/public/announcements` | Category A (Explicit) | **Keep** — Public announcements |
| **FR-47** | Administrators edit announcement and text blocks. | Admin content CMS | Category A (Explicit) | **Keep** — Admin content |
| **FR-48** | Password reset via email with single-use link. | Proposed future enhancement | Category C (Proposed) | **Separated** into proposed doc |
| **FR-49** | Notification preferences (email notification opt-in). | Proposed future enhancement | Category C (Proposed) | **Separated** into proposed doc |
| **FR-50** | Staff workspaces (instructors and coordinators keeping personal projects/tasks). | Proposed future enhancement | Category C (Proposed) | **Separated** into proposed doc (ASM-02) |
| **FR-51** | Activity export for compliance audits. | Proposed future enhancement | Category C (Proposed) | **Separated** into proposed doc |
| **FR-52** | Help and Support navigation item. | UI navigation placeholder (Content to be clarified) | Category C (Open Issue) | **Separated** — Navigation reserved; no backend contract assumed |

---

## 3. Audit of Phase 1 Additions & Removals

| Audited Item | Prior Implementation State | SRS Basis Check | Classification | Compliance Action |
|---|---|---|---|---|
| **Numeric At-Risk Thresholds** | Enforced 50% progress, 2 overdue assignments, 60% average grade | UC-I03 specifies flagging for low progress, missed deadlines, inactivity. **No numeric cutoffs exist in SRS.** | Category C (Proposed) | **REMOVED** from approved contract and OpenAPI/Postman. Moved to `proposed-enhancements.md` as PROP-01. |
| **Instructor AI Assignment Helper** | `POST /api/v1/instructor/ai/assignment-helper` | SRS Module M8 scopes AI strictly to student study plans (FR-19), Q&A (FR-20), and internship matching (FR-21). | Category C (Proposed) | **REMOVED** from approved contract, OpenAPI, and Postman. Moved to `proposed-enhancements.md` as PROP-02. |
| **Student CV Deletion** | `DELETE /api/v1/profile/cv` | SRS FR-23 only specifies uploading and replacing CV. Deletion is not a requirement. | Category C (Proposed) | **REMOVED** from approved contract, OpenAPI, and Postman. Moved to `proposed-enhancements.md` as PROP-03. |
| **Assignment Deletion Restriction** | Forbidden if student submissions exist | SRS FR-06 only defines assignment creation. Deletion and its blocking condition are unstated. | Category C (Proposed) | **REMOVED** from approved contract, OpenAPI, and Postman. Moved to `proposed-enhancements.md` as PROP-04. |
| **FR-52 Help & Support Option A** | Approved as Static FAQ / Directory | SRS Section 7.5 and Section 18 Issue 2 state behavior is unconfirmed and to be clarified. | Category C (Unresolved) | **REMOVED** claim of approval. Classified as unapproved open issue; navigation reserved only. |
| **GPA & Complex Analytics Formulas** | Included `averageGrade: 88.4` GPA calculation in progress response | SRS FR-09 only specifies calculating progress from submitted work. No GPA index exists in SRS. | Category C (Proposed) | **REMOVED** from response schemas and OpenAPI. |
| **Invented Student Profile Fields** | Included `department` on student profile | `department` belongs to Instructor/staff; Student profile has `program` and `year`. | Category D (Contradiction) | **CORRECTED** in student schemas and examples. |
