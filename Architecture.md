# Student Portal — Architecture Document

**Version:** 1.0  
**Status:** Initial Architecture  
**Project Size:** ~70 students  
**Frontend Hosting:** Netlify  
**Data Store:** Google Sheets  
**Authentication:** Google Sign-In  
**Architecture Style:** SPA + Serverless API  
**Primary Stack:** React + TypeScript + Vite + Tailwind CSS + Netlify Functions

---

# 1. Architecture Overview

The Student Portal will use a lightweight serverless architecture.

```text
┌──────────────────────────────┐
│          Student             │
│       Web Browser            │
└──────────────┬───────────────┘
               │
               │ HTTPS
               ▼
┌──────────────────────────────┐
│           Netlify            │
│                              │
│  React + TypeScript + Vite   │
│  Tailwind CSS                │
│  Client-side routing         │
└──────────────┬───────────────┘
               │
               │ Authenticated API
               ▼
┌──────────────────────────────┐
│      Netlify Functions       │
│                              │
│  Authentication validation   │
│  Authorization               │
│  Student data access         │
│  Marks                       │
│  Attendance                  │
│  Profile                     │
└──────────────┬───────────────┘
               │
               │ Google Sheets API
               ▼
┌──────────────────────────────┐
│        Google Sheets         │
│                              │
│ Students                     │
│ Marks                        │
│ Attendance                   │
│ Semester Summary             │
└──────────────────────────────┘
```

The browser should never directly access the private Google Sheets credentials.

---

# 2. Architectural Goals

The architecture should:

- Be simple enough for a small student group.
- Keep deployment easy.
- Keep operating costs low.
- Protect student information.
- Separate frontend and backend responsibilities.
- Keep Google Sheets private.
- Make academic data easy for the administrator to update.
- Support future migration to a proper database.
- Support light/dark mode globally.
- Avoid unnecessary infrastructure.

---

# 3. Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Development/build tool |
| Tailwind CSS | Styling |
| React Router | Client-side routing |
| Lucide React | Icons |

## Backend

| Technology | Purpose |
|---|---|
| Netlify Functions | Serverless API |
| Google APIs | Google authentication/data access |

## Data

| Technology | Purpose |
|---|---|
| Google Sheets | Initial database |
| Google Sheets API | Secure server-side data access |

## Hosting

| Service | Purpose |
|---|---|
| Netlify | Frontend + serverless functions |

## Development

| Tool | Purpose |
|---|---|
| Git | Version control |
| GitHub | Repository |
| npm | Package management |
| TypeScript | Static type checking |

---

# 4. High-Level Application Flow

```text
                    ┌──────────────┐
                    │    Login     │
                    └──────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Google Sign-In  │
                  └────────┬────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Authentication Valid │
                └──────────┬───────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │ Student Authorized │
                 └─────────┬──────────┘
                           │
                           ▼
                 ┌────────────────────┐
                 │    Dashboard       │
                 └─────────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Profile           Marks          Attendance
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                       Settings
```

---

# 5. Authentication Architecture

Google Sign-In is the primary authentication mechanism.

## Flow

```text
Student
   │
   ▼
Login Page
   │
   ▼
Google Sign-In
   │
   ▼
Google Authentication
   │
   ▼
Identity Token / Authenticated Session
   │
   ▼
Backend Validation
   │
   ▼
Find Google Email in Students Sheet
   │
   ├── Not Found → Access Denied
   │
   └── Found → Student Session
                         │
                         ▼
                     Dashboard
```

## Important Rule

A Google account being successfully authenticated does not automatically mean that the student is authorized to use the portal.

The authenticated email must exist in the authorized student records.

---

# 6. Authorization Architecture

Every protected API request must identify the authenticated user.

Example:

```text
GET /api/profile
```

The server determines the authenticated user's email and retrieves the matching student record.

The client should not be able to do this:

```text
GET /api/profile?student_id=123
```

and receive another student's information.

Instead:

```text
Authenticated User
       ↓
Server determines identity
       ↓
Find matching student
       ↓
Return only that student's data
```

This is an important security boundary.

---

# 7. Request Flow

A typical request will follow:

```text
React Component
      │
      ▼
API Service
      │
      ▼
Netlify Function
      │
      ├── Validate authentication
      │
      ├── Identify student
      │
      ├── Validate request
      │
      ▼
Google Sheets API
      │
      ▼
Google Sheets
      │
      ▼
Netlify Function
      │
      ▼
JSON Response
      │
      ▼
React UI
```

---

# 8. Frontend Architecture

The frontend follows a component-based architecture.

```text
App
│
├── Router
│
├── ThemeProvider
│
├── AuthProvider
│
└── Routes
    │
    ├── Login
    │
    ├── Dashboard
    │
    ├── Profile
    │
    ├── Marks
    │
    ├── Attendance
    │
    ├── Settings
    │
    └── Terms
```

---

# 9. Recommended Folder Structure

```text
student-portal/
│
├── public/
│   ├── favicon.svg
│   └── assets/
│
├── src/
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNavigation.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   └── ErrorState.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx
│   │   │   └── ProfileDetails.tsx
│   │   │
│   │   ├── marks/
│   │   │   ├── SemesterSelector.tsx
│   │   │   ├── MarksTable.tsx
│   │   │   ├── MarksSummary.tsx
│   │   │   └── DownloadMarks.tsx
│   │   │
│   │   └── attendance/
│   │       ├── AttendanceCard.tsx
│   │       ├── AttendanceSummary.tsx
│   │       └── AttendanceSemesterSelector.tsx
│   │
│   ├── pages/
│   │   ├── Login/
│   │   │   └── LoginPage.tsx
│   │   │
│   │   ├── Dashboard/
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── Profile/
│   │   │   └── ProfilePage.tsx
│   │   │
│   │   ├── Marks/
│   │   │   └── MarksPage.tsx
│   │   │
│   │   ├── Attendance/
│   │   │   └── AttendancePage.tsx
│   │   │
│   │   ├── Settings/
│   │   │   └── SettingsPage.tsx
│   │   │
│   │   └── Terms/
│   │       └── TermsPage.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── marks.ts
│   │   ├── attendance.ts
│   │   └── download.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useProfile.ts
│   │   ├── useMarks.ts
│   │   └── useAttendance.ts
│   │
│   ├── types/
│   │   ├── auth.ts
│   │   ├── student.ts
│   │   ├── marks.ts
│   │   └── attendance.ts
│   │
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── calculations.ts
│   │   └── constants.ts
│   │
│   ├── styles/
│   │   ├── index.css
│   │   └── theme.css
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── netlify/
│   │
│   └── functions/
│       ├── auth.ts
│       ├── profile.ts
│       ├── marks.ts
│       ├── attendance.ts
│       ├── student.ts
│       └── download-marks.ts
│
├── .env.example
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 10. Frontend Responsibilities

The frontend is responsible for:

- Rendering UI
- Routing
- Theme management
- Form interaction
- Client-side validation
- Displaying API data
- Loading states
- Error states
- Responsive behavior
- Download initiation
- User interaction

The frontend is **not** responsible for:

- Google Sheets credentials
- Service-account credentials
- Authoritative authorization
- Direct private spreadsheet access
- Security decisions

---

# 11. Backend Responsibilities

Netlify Functions are responsible for:

- Authentication verification
- Authorization
- Identifying the current student
- Google Sheets access
- Data validation
- Data transformation
- Marks retrieval
- Attendance retrieval
- Profile retrieval
- Secure downloads
- Server-side error handling

---

# 12. Netlify Functions

Recommended functions:

## `auth`

Responsibilities:

- Validate authentication information.
- Verify the Google identity.
- Determine whether the student is registered.

## `profile`

Responsibilities:

- Return authenticated student's profile.
- Update allowed profile fields.

## `marks`

Responsibilities:

- Retrieve semester marks.
- Return subject-level marks.
- Return semester summary.

## `attendance`

Responsibilities:

- Retrieve attendance records.
- Calculate/return attendance summaries.

## `student`

Responsibilities:

- Return basic dashboard information.

## `download-marks`

Responsibilities:

- Generate or return a professional semester marks PDF.

---

# 13. API Design

Use a simple REST-style API.

## Authentication

```text
POST /api/auth
```

## Current Student

```text
GET /api/student
```

## Profile

```text
GET /api/profile
PATCH /api/profile
```

## Marks

```text
GET /api/marks?semester=1
```

## Attendance

```text
GET /api/attendance?semester=1
```

## Download

```text
GET /api/download-marks?semester=1
```

The server must determine the student from the authenticated session rather than accepting an arbitrary student ID from the client.

---

# 14. API Response Format

Responses should use a consistent structure.

## Success

```json
{
  "success": true,
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You are not authorized to access this resource."
  }
}
```

Do not return stack traces or internal infrastructure details to the browser.

---

# 15. Google Sheets Architecture

Google Sheets will initially contain multiple tabs.

```text
Google Spreadsheet
│
├── Students
│
├── Marks
│
├── Attendance
│
└── Semester Summary
```

## Students

Used to identify authorized users and store profile information.

```text
student_id
usn
google_email
name
profile_image
current_semester
college_year
college_email
personal_email
phone
dob
pob
category
blood_group
```

## Marks

```text
student_id
semester
subject_code
subject_name
cae1
cae2
ese
tae1
tae2
tae3
total_internal
total_marks
grade
updated_at
```

## Attendance

```text
student_id
semester
subject_code
subject_name
total_classes
attended_classes
attendance_percentage
updated_at
```

## Semester Summary

```text
student_id
semester
sgpa
cgpa
total_marks
total_internal
```

---

# 16. Data Access Layer

Google Sheets access should be isolated inside backend utilities.

Example architecture:

```text
Netlify Function
       │
       ▼
Student Repository
       │
       ▼
Google Sheets Service
       │
       ▼
Google Sheets API
```

Avoid placing Google Sheets API calls directly inside every function.

Recommended backend structure:

```text
netlify/
└── functions/
    ├── profile.ts
    ├── marks.ts
    └── attendance.ts

netlify/
└── lib/
    ├── googleSheets.ts
    ├── auth.ts
    ├── studentRepository.ts
    └── errors.ts
```

This keeps data access reusable and easier to replace later.

---

# 17. Future Database Migration

Google Sheets is suitable for the initial scale, but the application should avoid coupling the entire frontend to Sheets.

The application should use an abstraction such as:

```text
Frontend
   ↓
API
   ↓
Repository
   ↓
Google Sheets
```

Later:

```text
Frontend
   ↓
API
   ↓
Repository
   ↓
PostgreSQL / Supabase / Firebase
```

The frontend should not need major changes when the database changes.

---

# 18. State Management

The application does not need a large state-management library initially.

Recommended:

- React Context for authentication.
- React Context for theme.
- Local component state for UI state.
- Custom hooks for server data.

Example:

```text
AuthContext
    └── Current authenticated student

ThemeContext
    └── Light/Dark mode

useMarks()
    └── Marks API state

useAttendance()
    └── Attendance API state

useProfile()
    └── Profile API state
```

A library such as TanStack Query can be introduced later if API caching and synchronization become more complex.

---

# 19. Routing Architecture

Recommended routes:

```text
/
├── /login
├── /dashboard
├── /profile
├── /marks
├── /attendance
├── /settings
└── /terms
```

Protected routes:

```text
/dashboard
/profile
/marks
/attendance
/settings
```

Public routes:

```text
/login
/terms
```

If an unauthenticated user attempts to open a protected route:

```text
Protected Page
      ↓
Authenticated?
      │
   NO ─┴─ YES
   ↓       ↓
 /login   Page
```

---

# 20. Layout Architecture

All authenticated pages should use a common layout.

```text
┌──────────────────────────────────────────┐
│ Header                         Theme     │
├────────────┬─────────────────────────────┤
│            │                             │
│ Profile    │                             │
│ Marks      │       Page Content          │
│ Attendance │                             │
│ Settings   │                             │
│            │                             │
└────────────┴─────────────────────────────┘
```

On mobile:

```text
┌──────────────────────┐
│ Header       Theme   │
├──────────────────────┤
│                      │
│     Page Content     │
│                      │
├──────────────────────┤
│ Profile Marks Attend │
└──────────────────────┘
```

---

# 21. Theme Architecture

Theme state should be global.

```text
ThemeContext
      │
      ├── Light
      └── Dark
```

Persist preference:

```text
Theme Selection
      ↓
localStorage
      ↓
ThemeContext
      ↓
Entire Application
```

Use CSS variables where possible.

Example:

```css
:root {
  --color-primary: #8048A8;
  --color-deep-purple: #3A0353;
  --color-cream: #F8D299;
  --color-orange: #F59E51;
}
```

Dark mode should change surface/background/text variables while preserving brand accents.

---

# 22. UI Design Architecture

The design system should be centralized.

## Core Colors

```text
Primary Purple:  #8048A8
Deep Purple:     #3A0353
Cream:           #F8D299
Orange:          #F59E51
```

## Typography

Primary font:

```text
Inter
```

Fallback:

```text
system-ui, sans-serif
```

## Border Radius

Use a consistent rounded style.

Recommended:

```text
Small:   8px
Medium:  12px
Large:   16px
XL:      20px
```

Avoid making every element extremely rounded.

---

# 23. Security Architecture

## Secrets

Never place secrets in:

```text
src/
public/
GitHub repository
frontend JavaScript
```

Use Netlify environment variables.

Example:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_SHEETS_ID
GOOGLE_SERVICE_ACCOUNT
```

## Spreadsheet

The Google Sheet must remain private.

Only the backend service should have permission to read/write it.

## Student Isolation

Every backend request must resolve:

```text
Authenticated Identity
        ↓
Student Record
        ↓
Student ID
        ↓
Student-specific data
```

Never trust a student ID supplied by the browser.

---

# 24. Error Handling Architecture

Errors should be categorized.

```text
Authentication Error
Authorization Error
Validation Error
Not Found
Google API Error
Internal Server Error
```

Example mapping:

```text
401 → Not authenticated
403 → Authenticated but unauthorized
404 → Data not found
400 → Invalid request
500 → Internal server error
```

The frontend should convert technical errors into user-friendly messages.

---

# 25. Loading Strategy

Pages should not block the entire application unnecessarily.

Example:

```text
Dashboard loads
      │
      ├── Profile summary
      ├── CGPA
      └── Attendance
```

Use skeleton states while data loads.

For marks:

```text
Select Semester
      ↓
Fetch marks
      ↓
Show skeleton
      ↓
Render table
```

---

# 26. Caching Strategy

Because marks and attendance can change, avoid long-lived caching for academic records.

Recommended:

- Cache static UI assets aggressively.
- Cache profile data for a short period if required.
- Fetch marks when semester selection changes.
- Fetch attendance when semester selection changes.
- Display `updated_at` where useful.

The source of truth remains Google Sheets.

---

# 27. Marks Calculation Architecture

Marks calculations should be implemented as pure utility functions where possible.

Example:

```text
Raw Marks
   ↓
Validation
   ↓
Internal Total
   ↓
Total Marks
   ↓
Grade
   ↓
SGPA Calculation
```

Example utility structure:

```text
src/utils/calculations.ts
```

The grading rules should be configurable rather than hard-coded throughout UI components.

---

# 28. Expected SGPA Architecture

Expected SGPA should be calculated from:

```text
Subject Marks
      +
Subject Credits
      +
Grade Rules
      ↓
Expected SGPA
```

The calculation should be isolated from the UI.

```text
calculateExpectedSGPA(
  subjects,
  gradingRules
)
```

If required data is missing:

```text
Expected SGPA unavailable
```

rather than an incorrect calculation.

---

# 29. PDF Download Architecture

The download process should be server-side if the PDF contains authoritative student data.

```text
Student
   ↓
Download Semester Marks
   ↓
Netlify Function
   ↓
Verify Student
   ↓
Fetch Marks
   ↓
Generate PDF
   ↓
Return PDF
```

The generated PDF should contain:

- Student name
- USN
- Semester
- Subject marks
- Total marks
- Grades
- SGPA if available
- Generation date

---

# 30. Performance Architecture

The expected user count is approximately 70 students.

The application should optimize for simplicity rather than complex distributed infrastructure.

## Recommended

- Code splitting
- Lazy-loaded routes where useful
- Optimized images
- Minimal dependencies
- API requests only when needed
- Reusable components
- Serverless functions for backend operations

No dedicated server is required for version 1.

---

# 31. Deployment Architecture

```text
Developer
   │
   ▼
GitHub Repository
   │
   ▼
Netlify
   │
   ├── Build React Application
   │
   ├── Deploy Frontend
   │
   └── Deploy Netlify Functions
            │
            ▼
       Google Sheets API
```

Every push to the main branch can trigger a Netlify deployment.

---

# 32. Environment Configuration

Use:

```text
.env.example
```

Example:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT=
```

Actual secrets must only exist in:

```text
Local .env
Netlify Environment Variables
```

Never commit the actual `.env` file.

---

# 33. Development Environments

Recommended environments:

```text
Development
     ↓
Preview
     ↓
Production
```

## Development

Used locally.

## Preview

Netlify-generated preview for testing changes.

## Production

The live student portal.

---

# 34. Git Workflow

Recommended branches:

```text
main
develop
feature/*
fix/*
```

Example:

```text
feature/login
feature/marks-page
feature/attendance
fix/mobile-navigation
```

Pull requests should be reviewed before merging into `main`.

For a small personal project, a simpler:

```text
main
feature/*
```

workflow is also sufficient.

---

# 35. Testing Architecture

## Unit Tests

Test:

- SGPA calculations
- Grade calculations
- Attendance calculations
- Validation functions
- Formatting utilities

## Component Tests

Test:

- Theme toggle
- Semester selector
- Marks table
- Login state
- Navigation

## Integration Tests

Test:

```text
Login → Dashboard
Dashboard → Marks
Dashboard → Attendance
```

## Security Tests

Verify:

- Unauthorized users cannot access protected pages.
- A student cannot request another student's data.
- Private Google credentials are never sent to the browser.

---

# 36. Suggested Testing Priority

For version 1:

```text
1. Authentication
2. Authorization
3. Student data isolation
4. Marks calculations
5. Attendance calculations
6. Main navigation
7. Theme
8. Responsive UI
9. Download marks
10. Visual polish
```

Security and data correctness should take priority over visual animations.

---

# 37. Architecture Decision Records

## ADR-001 — Google Sheets as Initial Database

**Decision:** Use Google Sheets for the first release.

**Reason:**

- Approximately 70 students.
- Simple administrator workflow.
- Low infrastructure complexity.
- Easy manual data management.

**Trade-off:**

Google Sheets is not intended to be the long-term database for a larger application.

---

## ADR-002 — Netlify Functions

**Decision:** Use Netlify Functions for backend operations.

**Reason:**

- Same deployment platform as frontend.
- No dedicated server required.
- Suitable for the expected scale.
- Easy environment-variable management.

---

## ADR-003 — React + TypeScript

**Decision:** Use React with TypeScript.

**Reason:**

- Component-based architecture.
- Good maintainability.
- Strong ecosystem.
- Type safety.
- Suitable for the dashboard-style application.

---

## ADR-004 — Global Theme Context

**Decision:** Manage light/dark mode globally.

**Reason:**

The theme toggle is shared across all pages and should behave consistently.

---

# 38. Migration Path

If the application grows beyond the initial requirements:

```text
Version 1

React
  ↓
Netlify Functions
  ↓
Google Sheets


Future

React
  ↓
API Layer
  ↓
PostgreSQL / Supabase
  ↓
Database
```

The repository/data-access layer should make this migration possible without rewriting the frontend.

---

# 39. Recommended Final Architecture

```text
                         INTERNET
                            │
                            ▼
                  ┌───────────────────┐
                  │      Netlify      │
                  │                   │
                  │ React + Vite      │
                  │ TypeScript        │
                  │ Tailwind          │
                  └─────────┬─────────┘
                            │
                            │ HTTPS
                            ▼
                  ┌───────────────────┐
                  │ Netlify Functions │
                  │                   │
                  │ Auth              │
                  │ Authorization     │
                  │ Profile           │
                  │ Marks             │
                  │ Attendance        │
                  │ Downloads         │
                  └─────────┬─────────┘
                            │
                 ┌──────────┴──────────┐
                 │                     │
                 ▼                     ▼
        ┌────────────────┐    ┌─────────────────┐
        │ Google APIs    │    │ Future Services │
        │                │    │                 │
        │ Authentication │    │ Notifications   │
        │ Sheets API     │    │ Email           │
        └───────┬────────┘    └─────────────────┘
                │
                ▼
        ┌─────────────────┐
        │  Google Sheets  │
        │                 │
        │ Students        │
        │ Marks           │
        │ Attendance      │
        │ Semester Data   │
        └─────────────────┘
```

---

# 40. Final Architecture Principle

The most important architectural principle is:

> **Keep the frontend simple, keep private data behind the serverless API, and keep the data layer replaceable.**

The initial system should be intentionally lightweight for approximately 70 students while maintaining clear boundaries between:

```text
UI
 ↓
Application Logic
 ↓
API
 ↓
Authorization
 ↓
Data Access
 ↓
Google Sheets
```

This structure provides a clean foundation for the Student Portal and leaves a straightforward migration path if Google Sheets is eventually replaced by a production database.
