# 🧠 Project Memory & Technical Knowledge Base
**Repository / Workspace**: `Student-Portal V4`  
**Last Updated**: November 2026  
**Purpose**: Comprehensive technical reference for future developers and AI agents. Read this file before inspecting or modifying code to avoid redundant scans and architectural mistakes.

---

## 🚫 Critical Project Rules (NEVER VIOLATE)

1. **PROHIBITED WORDS**:
   - The terms **`official`** and **`unofficial`** are **strictly forbidden** anywhere in user-facing UI, comments, console messages, commit notes, or backend code. Use words like *Institutional*, *Academic*, *Main*, *Standard*, *Student*, etc.
2. **NO HARDCODED SPREADSHEET OR FOLDER IDS**:
   - Never hardcode Google Sheet IDs (`1[a-zA-Z0-9_-]{25,}`), Google Drive Folder IDs, Google Apps Script URLs (`AKfycb...`), or sensitive credentials into any file in `src/` or `google-apps-script/`.
   - All IDs must come from `import.meta.env` (frontend) or `PropertiesService.getScriptProperties().getProperty(...)` / request payload (Apps Script backend).
3. **SYNC REQUIREMENT**:
   - Whenever any file in `src/` is added, edited, or deleted, `github_deploy_files/src/` **must** be mirrored using:
     ```powershell
     robocopy "src" "github_deploy_files\src" /MIR /NDL /NFL /NJH /NJS ; exit 0
     ```
   - Always run `npx.cmd tsc --noEmit ; npm.cmd run build` before declaring a task complete.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: React 18 with TypeScript (`.tsx`, `.ts`)
- **Build Tool**: Vite (`vite.config.ts`), runs on `http://localhost:3000/` in dev mode
- **Styling**: Tailwind CSS with custom dark/light theme variables in `src/styles/`
- **Database / CMS Backend**: Google Sheets & Google Drive accessed via Google Apps Script Web App (`google-apps-script/Code.gs`) and GViz CSV endpoints
- **Deployment Target**: Netlify (`netlify.toml` redirects `/api/*` and SPA routes `/* -> /index.html`)

---

## 📂 Key Directory & File Map

### 1. Root & Configuration
| Path | Purpose |
| :--- | :--- |
| `.env` / `.env.example` | All environment variables (`VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_SHEETS_*_ID`, `VITE_GOOGLE_DRIVE_*_ID`, etc.) |
| `src/config/sheetsConfig.ts` | Centralized config reading from `import.meta.env`. Fallbacks return empty strings (never hardcoded IDs). |
| `src/vite-env.d.ts` | TypeScript declarations for all Vite environment variables. |
| `src/utils/constants.ts` | Route paths (`ROUTES`), UI constants, navigation definitions. |
| `src/utils/cleanStorage.ts` | Startup storage janitor cleaning legacy mock keys from `localStorage` & `sessionStorage`. |

### 2. Authentication, Session & Access Control
| Path | Purpose |
| :--- | :--- |
| `src/context/AuthContext.tsx` | Global authentication provider. Manages Google OAuth, student session, portal lock checking (3s poll), and blocked user modal handling. |
| `src/services/auth.ts` | Student directory matching, session token management (30-minute auto-expiry in `sessionStorage`/`localStorage`). |
| `src/components/common/BlockedAccountModal.tsx` | Modal displayed to students when blocked in real time (shows 5s countdown then terminates session). |
| `src/pages/Login/LoginPage.tsx` | Google One Tap & button sign-in with instant admin routing and blocked user error notices. |

### 3. Institutional Admin Control Center
| Path | Purpose |
| :--- | :--- |
| `src/pages/Admin/AdminPortalPage.tsx` | Core Admin Dashboard. Contains login audit logs, student roster, blocked users manager, notices manager, exam timetable, exam dates, semester files, and portal lock switch. |
| `src/services/adminSheetService.ts` | Communicates with the Admin Google Sheet (`Logins`, `ChangeRequests`, `Settings`, `BlockedUsers`). Implements GViz CSV fast-path with `&_cb=${Date.now()}` cache busting and 5-minute reconciliation buffer. |
| `src/types/admin.ts` | Interfaces for `LoginLog`, `ChangeRequest`, `PortalSettings`, `BlockedUser`, `AdminStats`. |

### 4. Notices & Announcements
| Path | Purpose |
| :--- | :--- |
| `src/pages/Notices/NoticesPage.tsx` | Student view for circulars, notices, search, filtering by semester, and document previews. |
| `src/services/noticeService.ts` | Fetches notices via GViz CSV / Apps Script, publishes notices with multi-file Drive upload, handles update/delete operations. Times out after 12s with non-blocking background fallback. |
| `src/types/notice.ts` | TypeScript interface for `NoticeItem` and documents. |

### 5. Academic Data & Services
| Path | Purpose |
| :--- | :--- |
| `src/services/marks.ts` | Parses Sem 1, Sem 2, Sem 3 marks from Google Sheets via GViz CSV; calculates SGPA/CGPA, credits, grades. |
| `src/services/attendance.ts` | Fetches attendance percentages and lecture delivery metrics per subject. |
| `src/services/timetable.ts` | Weekly timetable data and day-by-day periods. |
| `src/services/examDates.ts` | Scheduled CAE-1, CAE-2, and ESE examination dates. |
| `src/services/semesterData.ts` | Fetches study materials directly from semester Google Drive folders. |
| `src/services/profile.ts` | Fetches and caches the full enrolled student directory from the Profile Sheet. |
| `src/services/sheetParser.ts` | Robust RFC 4180 compliant CSV parser with quote escaping support for GViz CSV outputs. |

### 6. Backend Google Apps Script
| Path | Purpose |
| :--- | :--- |
| `google-apps-script/Code.gs` | Main Apps Script Web App handling POST/GET for logs, change requests, portal lock, notices, Drive file uploads, and blocked users. Dynamically reads sheet IDs from `PropertiesService` or payload. |
| `google-apps-script/ExamDatesSheet.gs` | Web app for CAE/ESE exam schedules. |
| `google-apps-script/TimetableSheet.gs` | Web app for weekly lecture timetables. |

---

## ⚙️ Core Workflows & Logic

### A. Blocking / Unblocking Users
1. **Admin Action**:
   - Admin can block a user from either the **Blocked Users Modal** or directly from the **Activity / Login Logs** table using the `Block` / `Unblock` button.
   - `adminSheetService.blockUser()` immediately updates local memory, sets a 5-minute reconciliation buffer in `localStorage` (`RECENTLY_BLOCKED`), and dispatches a POST to Apps Script (`action: 'BLOCK_USER'`).
2. **Real-time Enforcement**:
   - Every active student tab polls `checkPortalLock(true)` every 3 seconds in `AuthContext.tsx`.
   - `checkIfStudentIsBlocked` checks all student identifiers: `student_id`, `usn`, `college_email`, `personal_email`, `google_email`.
   - When blocked:
     - Sets `blockedInfo` in `AuthContext`.
     - `GlobalBlockedUserHandler` in `App.tsx` pops open `BlockedAccountModal` with reason and a 5-second countdown.
     - On timeout or button click, logs user out (`authService.logout()`), saves reason in `sessionStorage`, and routes to `/login`.
3. **GViz Cache Safeguards**:
   - All GViz fetch URLs append `&_cb=${Date.now()}` to bypass Google CDN edge caching.
   - `reconcileBlockedUsers()` preserves blocked users during the TTL window even if Google Sheets edge proxy returns stale CSV data.

### B. Publishing Notices
1. Admin enters Title, Content, Semester, and optional attachments (PDF, JPG, PNG, etc.).
2. Admin clicks **Publish Notice to Drive & Sheet**.
3. `noticeService.publishNotice()` converts files to base64, dispatches to `Code.gs` with a 12s `AbortController` timeout.
4. `Code.gs` creates a dedicated folder in the notices root Drive folder, stores files with public viewer permissions, and writes a row in the `Notices` sheet tab.
5. Form resets cleanly inside a `try...finally` block in `AdminPortalPage.tsx` so the UI never stays stuck on *"Publishing Notice..."*.

### C. Portal Maintenance Lock
- Admin toggles **Lock Entire Portal** in Settings / Emergency Control.
- Apps Script updates the `Settings` sheet (`is_locked: TRUE`).
- Students are immediately logged out on their next 3s poll and redirected to `/login` with the custom maintenance message.

---

## 🛠️ Common Commands

- **Run Dev Server**:
  ```powershell
  npm run dev
  ```
- **Typecheck & Production Build**:
  ```powershell
  npx.cmd tsc --noEmit ; npm.cmd run build
  ```
- **Sync to Deploy Folder**:
  ```powershell
  robocopy "src" "github_deploy_files\src" /MIR /NDL /NFL /NJH /NJS ; exit 0
  ```
- **Verify No Hardcoded IDs**:
  ```powershell
  git grep -E "1[a-zA-Z0-9_-]{25,}" src/
  ```
