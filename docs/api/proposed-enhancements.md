# CampusBridge: Proposed Enhancements

> [!WARNING]
> **NOT PART OF THE APPROVED SRS SCOPE**
>
> The items documented below represent proposed ideas, heuristics, and potential future enhancements evaluated during the Phase 1 architecture audit. **None of these items are approved requirements in the official CampusBridge SRS v2.0.**
>
> They are strictly excluded from the approved API specifications, the OpenAPI specification, the Postman collection, and the Phase 2 implementation scope.

---

## 1. Inventory of Category C Proposals

| Proposal ID | Proposed Feature / Rule | Origin | Reason for Exclusion from Approved Scope |
|---|---|---|---|
| **PROP-01** | Specific Numeric At-Risk Thresholds (Progress < 50%, 2+ Overdue Assignments, Score < 60%) | Phase 1 Proposed Heuristic | SRS UC-I03 and FR-16/FR-44 specify flagging students based on `low progress, missed deadlines, inactivity`, but **do not define fixed numeric cutoffs**. Mandating arbitrary numbers exceeds the SRS. |
| **PROP-02** | Instructor AI Assignment Helper (`POST /api/v1/ai/assignment-helper`) | Phase 1 Proposed Feature | SRS Section 7.2.4 (M8: FR-19, FR-20, FR-21), Section 11 (UC-S06), and Section 12.3 restrict AI assistant tools strictly to Students. No instructor AI feature exists in the SRS. |
| **PROP-03** | Student CV Deletion (`DELETE /api/v1/profile/cv`) | Phase 1 Proposed Endpoint | SRS FR-23 only requires students to maintain skills and upload one CV (replacing earlier uploads). Explicit CV deletion is not a functional requirement. |
| **PROP-04** | Assignment Deletion & Submission Guard (`DELETE /api/v1/assignments/:id`) | Phase 1 Proposed Endpoint & Rule | SRS FR-06 only specifies assignment creation and parameter validation. The restriction prohibiting deletion when submissions exist is an invented business rule. |
| **PROP-05** | Help and Support Option A (Static FAQ / Directory) | SRS Section 7.5 Option A | SRS FR-52 and Section 18 Issue 2 designate Help & Support as **To Be Clarified**. The navigation entry is reserved, but no behavioral contract or content is approved. |
| **PROP-06** | Staff Workspaces with Projects & Tasks | SRS FR-50 (PROP · C) | SRS qualification ASM-02 confirms projects and tasks belong to **students only**. Staff workspaces remain an unapproved future proposal. |
| **PROP-07** | GPA Formulas and Derived Academic Indices | Phase 1 Proposed Analytics | SRS FR-09 and FR-17 compute progress from submitted work and rank by average submission score. GPA calculations are not specified in the SRS. |

---

## 2. Detailed Proposal Specifications

### PROP-01: Heuristic Numeric Thresholds for At-Risk Students
- **Proposed Behavior**: Automatically flag a student as at-risk if `progressPercent < 50`, `unsubmittedOverdueCount >= 2`, or `averageScore < 60`.
- **Why Excluded**: The SRS states in UC-I03 that the system lists flagged students for `low progress, missed deadlines, inactivity`. Hardcoding 50%, 2 assignments, and 60% as binding system rules is an architectural assumption requiring stakeholder/faculty agreement before adoption.
- **Approved SRS Behavior**: The approved contract provides qualitative at-risk indicators (`lowProgress`, `missedDeadlines`, `inactivity`) without enforcing unverified numeric thresholds.

### PROP-02: Instructor AI Assignment Formulation Helper
- **Proposed Endpoint**: `POST /api/v1/instructor/ai/assignment-helper`
- **Proposed Behavior**: Generates suggested assignment instructions and rubric criteria for instructors.
- **Why Excluded**: SRS Module M8 (AI Learning Assistant) explicitly scopes AI to student study planning (FR-19), student Q&A (FR-20), and internship skill matching (FR-21). Extending AI generation to faculty workflows is outside the SRS baseline.

### PROP-03: CV Deletion Endpoint
- **Proposed Endpoint**: `DELETE /api/v1/profile/cv`
- **Proposed Behavior**: Unlinks the stored CV file and sets `cv = null`.
- **Why Excluded**: SRS FR-23 defines CV management as "upload one CV (PDF or Word, up to 2 MB)". Replacement of the existing CV upon new upload satisfies the SRS. Deletion is not specified.

### PROP-04: Assignment Deletion and Blocking Rule
- **Proposed Endpoint**: `DELETE /api/v1/assignments/:id`
- **Proposed Behavior**: Deletes an assignment only if zero submissions have been received.
- **Why Excluded**: SRS FR-06 specifies assignment creation with instructions, deadline, maximum score, and late-submission setting. Neither assignment deletion nor a deletion block is specified.

### PROP-05: Pre-emptively Approving Help & Support (FR-52 Option A)
- **Proposed Scope**: Static FAQ knowledge base and coordinator directory.
- **Why Excluded**: Section 7.5 and Section 18 of the SRS explicitly record FR-52 as an open issue: *"Until the team decides, the navigation entry is reserved and no behavior is assumed."* Approving Option A prematurely violates SRS governance.

### PROP-06: Staff Workspaces (FR-50)
- **Proposed Scope**: Grant instructors and coordinators personal task and project boards.
- **Why Excluded**: Classified as `PROP · C` in the SRS. Assumption ASM-02 explicitly restricts projects and tasks to students.
