# CampusBridge – University Learning & Internship Platform

> **Brolf Tech Remote Internship Challenge 2026 • Project 4**  
> A unified web platform joining university academic learning management and corporate internship placement.

---

## 1. Technology Stack

- **Frontend**: JavaScript (ES Modules), React.js, Vite, JSX, Tailwind CSS, Lucide Icons
- **Backend**: JavaScript (ES Modules), Node.js, Express.js
- **Database**: MongoDB, Mongoose ODM
- **Authentication & Security**: JSON Web Tokens (JWT), bcryptjs password hashing, RBAC middleware
- **API Testing**: Postman collection & cURL

---

## 2. Team Structure & Module Responsibilities

| Role / Module | Developer Assignment | Core Responsibilities |
| :--- | :--- | :--- |
| **Student Module** | **Developer 1 & Developer 2** | Course enrollment, resource viewing, assignment submissions, internship search & application tracking, personal projects & tasks, AI assistant, badges & leaderboard. |
| **Instructor Module** | **Developer 1 & Developer 2** | Course materials & resources management, assignment creation, submission grading queue & feedback, at-risk student monitoring. |
| **Coordinator Module** | **Developer 3** | Course creation & instructor assignment, partner company registration, internship posting, student application review & company forwarding, CSV exports. |
| **Administrator Module** | **Developer 4** | User accounts & staff provisioning (instructors, coordinators), role assignment, account activation/deactivation, system announcements, public landing content management. |

*All 4 developers share one centralized authentication engine, one MongoDB database instance, and unified REST API contracts.*

---

## 3. Strict UI Design System & Palette

- **Deep Navy**: `#101735` (Primary background for dark mode)
- **Electric Cyan**: `#00C8FF` (Primary interactive highlight & accents)
- **Soft White**: `#F5F8FC` (Text in dark mode, background in light mode)
- **Slate Navy**: `#1C2948` (Card & sidebar surfaces in dark mode)
- **Ice Blue**: `#8CEBFF` (Secondary accents & progress indicators)

Visual direction adheres strictly to the UI references:
- Dark navy background with luminous electric cyan highlights
- Modern futuristic technology aesthetic with glowing borders and soft shadows
- Rounded dashboard cards and responsive sidebar navigation
- Top navigation with search, notifications indicator, and seamless dark/light theme toggle

---

## 4. Project Directory Structure

```text
CampusBridge/
│
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── layouts/
│       ├── pages/
│       │   ├── public/
│       │   ├── student/
│       │   ├── instructor/
│       │   ├── coordinator/
│       │   └── admin/
│       ├── context/
│       ├── hooks/
│       ├── services/
│       ├── routes/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
│
├── server/
│   └── src/
│       ├── config/
│       ├── models/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── utils/
│       └── server.js
│
├── .gitignore
└── README.md
```

---

## 5. 15-Phase Development Roadmap (4-Day Sprint)

```mermaid
flowchart TD
  subgraph Day 1 : Core Architecture & Identity
    P1[Phase 1: Project Initialization & Health Diagnostics]
    P2[Phase 2: Database Schemas & Mongoose Models]
    P3[Phase 3: Centralized JWT & RBAC Authentication]
    P4[Phase 4: Shared UI Design System & Shell Layout]
  end

  subgraph Day 2 : Core Academic Workflows
    P5[Phase 5: Course Management & Enrollment]
    P6[Phase 6: Assignment Workflow & Submissions]
    P7[Phase 7: Grading Queue & Academic Progress Engine]
    P8[Phase 8: Student Personal Workspace & Tasks]
  end

  subgraph Day 3 : Internship Engine & Staff Workspaces
    P9[Phase 9: Partner Companies & Internship Postings]
    P10[Phase 10: Internship Application Lifecycle Workflow]
    P11[Phase 11: Coordinator & Admin Dashboards + Reports]
    P12[Phase 12: In-App Notifications & Direct Messaging]
  end

  subgraph Day 4 : AI Assistant, Public Site & Integration
    P13[Phase 13: AI Learning Assistant & Skill Matcher]
    P14[Phase 14: Public Landing Page & Content CMS]
    P15[Phase 15: End-to-End Audit, Testing & Production Release]
  end

  P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9 --> P10 --> P11 --> P12 --> P13 --> P14 --> P15
```

- **Phase 1: Project Initialization & Health Diagnostics (Completed)**
  Directory tree alignment, Vite + React setup, Express ES modules API, MongoDB connection, environment configuration, and health check endpoint.
- **Phase 2: Database Schemas & Data Layer (Day 1)**
  Define Mongoose models: `User`, `Course`, `Enrollment`, `Assignment`, `Submission`, `Grade`, `PartnerOrganization`, `Internship`, `Application`, `Progress`, `Achievement`, `Notification`, `Announcement`, `Project`, `Task`, `Message`, `ActivityLog`.
- **Phase 3: Centralized JWT & Role-Based Authentication (Day 1)**
  Registration, secure login with bcrypt comparison, JWT issuance, verifyAuth and role authorization middlewares for 4 roles.
- **Phase 4: Shared UI Design System & Application Shell (Day 1)**
  Header with search and notification badge, dynamic sidebar per role, dark/light theme switching context, rounded cards and buttons.
- **Phase 5: Course Management & Student Enrollment (Day 2)**
  Coordinators create courses and assign instructors; students browse course catalog and enroll.
- **Phase 6: Assignment Creation & Student Submissions (Day 2)**
  Instructors post assignments with deadlines; students upload text or file submissions.
- **Phase 7: Grading Queue & Progress Tracking Engine (Day 2)**
  Instructors score submissions and provide feedback; real-time recalculation of student course progress.
- **Phase 8: Student Workspace: Personal Projects & Tasks (Day 2)**
  Personal task board (todo/done), project progress tracker, recent activity feed.
- **Phase 9: Partner Companies & Internship Postings (Day 3)**
  Coordinators register partner companies and publish verified internship opportunities.
- **Phase 10: Internship Application Lifecycle Workflow (Day 3)**
  Students apply with CV and message; coordinator reviews, forwards to partner company, and records decision (Accepted/Rejected).
- **Phase 11: Coordinator & Admin Dashboards + CSV Reports (Day 3)**
  Coordinator and Administrator summary analytics, student export and applicant handoff CSV generators.
- **Phase 12: In-App Notifications & Direct Messaging (Day 3)**
  Notification center for grades, deadlines, and status updates; 1-to-1 role-permitted messaging.
- **Phase 13: AI Learning Assistant & Skill Matching (Day 4)**
  Generative AI study planning, Q&A assistant, and skill-to-internship matching.
- **Phase 14: Public Landing Page & Announcement Banner (Day 4)**
  Futuristic landing page reflecting design reference, active announcement ticker, dynamic registration toggle.
- **Phase 15: End-to-End System Integration & Verification (Day 4)**
  RBAC security audit, cross-role journey tests, responsive validation (360px to 1440px), Postman test suite verification.

---

## 6. Installation & Startup Instructions

### Prerequisites
- **Node.js**: v18.x or later (v26.x tested)
- **MongoDB**: Community Server running locally on port 27017

### 1. Install Dependencies
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Verify or adjust `server/.env` (defaults are preconfigured):
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/campusbridge
JWT_SECRET=supersecret_campusbridge_jwt_dev_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

### 3. Run the Backend Server
```bash
cd server
npm run dev
# Server runs on http://localhost:5001
```

### 4. Run the Frontend Client
In a separate terminal:
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

### 5. Verify System Health
Open your browser or run:
```bash
curl http://localhost:5001/api/v1/health
```
Expected response:
```json
{
  "success": true,
  "message": "CampusBridge API is operational",
  "data": {
    "status": "UP",
    "database": "connected",
    "uptime": "1s",
    "timestamp": "2026-11-09T11:00:51.272Z",
    "environment": "development"
  }
}
```
