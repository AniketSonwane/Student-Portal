# 🛡️ Institutional Administrator Manual

The **Institutional Control Center** (`/admin`) is the central command dashboard designed for college administrators, department heads, and academic audit officers to oversee portal operations, track security events, manage schedules, and review student change requests in real time.

---

## 🚪 Accessing the Admin Portal

1. Navigate to `/admin` in the browser URL.
2. Sign in with an authorized Google account configured in `VITE_ADMIN_EMAIL` or `VITE_ADMIN_EMAILS`.
3. If an unauthorized account attempts sign-in, access is immediately rejected and recorded in the security audit trail.

---

## 📈 Administrative Dashboard Metrics (KPIs)

Upon authentication, the top control deck displays instant operational statistics:

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  TOTAL LOGINS   │  TODAY LOGINS   │  SUCCESS RATE   │ ENROLLED ROSTER │
│      1,248      │       142       │      97.4%      │   68 Students   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
┌─────────────────┬─────────────────┬───────────────────────────────────┐
│ CHANGE TICKETS  │  SYSTEM STATUS  │          EMERGENCY ACTION         │
│   3 Pending     │   🟢 ACTIVE     │        [ 🔒 LOCK PORTAL ]         │
└─────────────────┴─────────────────┴───────────────────────────────────┘
```

- **Total Logins**: Aggregate authentication sessions recorded.
- **Today's Logins**: Active traffic count since 00:00 local time.
- **Success Rate**: Ratio of recognized student logins vs denied intrusion attempts.
- **Enrolled Roster**: Total verified student profiles detected from the master profile sheet.
- **Change Tickets**: Quantity of open student record correction requests.
- **System Status**: Indicates whether the student portal is publicly accessible or under maintenance lock.

---

## 🔒 Emergency Portal Lock (Maintenance Mode)

In the event of active grade entry, result moderation, database migrations, or scheduled maintenance:

### 1. Activating System Lockout
1. Click **Lock Portal** in the admin control header.
2. Enter an informative reason (e.g., *"End-Semester Examination marks moderation in progress. Portal will reopen at 4:00 PM."*).
3. Confirm the lockout.
4. The system updates the `Settings` tab in the Google Spreadsheet in under a second.

### 2. User Experience During Lockout
- **Students**: Any attempt to access dashboard, marks, attendance, or statements is blocked by the animated **PortalLockedScreen**, explaining the maintenance reason.
- **Administrators**: Maintain full, unrestricted access to `/admin` and can still simulate student sessions using Inspection Mode.

### 3. Deactivating System Lockout
- Click **Unlock Portal** in the control center. The platform immediately resumes standard public access.

---

## 🕵️ Student Directory & Inspection Mode

Administrators can simulate and review any student's exact portal view without needing their personal credentials.

### 1. Searching Enrolled Students
Use the dynamic search box in the **Student Directory** tab:
- Search by **USN** (e.g. `1SB23CS015`)
- Search by **Name** (e.g. `Aditya`)
- Search by **Email** or **Blood Group**

### 2. Launching Inspection Mode
1. Click **Inspect Portal** on the target student card.
2. The portal securely injects the selected student's profile context into your session and redirects you to the student `/dashboard`.
3. You can now verify:
   - Their exact SGPA and marks breakdown for Sem 1, 2, and 3.
   - Their lecture attendance percentages and elective allocations.
   - How their downloadable grade statement renders.

### 3. Returning to Admin Center
While in inspection mode, an elevated high-contrast banner (**AdminInspectionBanner**) remains anchored at the very top of the screen:
```
[ 🛡️ ADMIN INSPECTING: 1SB23CS015 - Aditya Sharma ]   [ ⬅ Return to Admin Portal ]
```
Clicking **Return to Admin Portal** clears the simulated context and returns you directly to `/admin`.

---

## 📜 Live Authentication Audit Log

Every student sign-in is audited and tracked with sub-second timestamps:

| Column | Information Captured |
|---|---|
| **Timestamp** | Exact date and time of the event (`DD MMM YYYY, HH:mm:ss`) |
| **Student** | Full student name and USN |
| **Email** | Google account address used |
| **Status** | 🟢 `SUCCESS` (Authorized student) <br> 🔴 `DENIED` (Unrecognized email) <br> ⛔ `BLOCKED` (Portal was locked) |
| **Device** | User-Agent string (browser, OS, device model) |
| **Reason** | Diagnostics if denied or blocked |

Filters allow administrators to isolate `DENIED` events to investigate unauthorized access attempts.

---

## 📬 Student Correction Requests (Tickets)

Students can submit discrepancy tickets from their Profile or Marks pages (e.g., inaccurate phone number, missing attendance credit, or grade discrepancy).

### Workflow:
1. Open the **Change Requests** tab in `/admin`.
2. Review the ticket details:
   - Student Name & USN
   - Target Field (`Phone`, `Blood Group`, `Attendance Discrepancy`)
   - Existing recorded value vs proposed new value
   - Student explanation & justification
3. Click **Approve** or **Reject**.
4. The ticket status updates immediately in the `ChangeRequests` sheet. Once approved, the administrator updates the corresponding cell in the master sheet.

---

## 📅 Visual Timetable Schedule Editor

The Timetable Manager provides a visual interface to manage class schedules across semesters without editing raw spreadsheet rows:

1. Select the semester tab (e.g., **Semester 3**).
2. Choose the day (**Monday** through **Saturday**).
3. Add or modify lecture periods:
   - Timing window (e.g., `09:15 AM - 10:15 AM`)
   - Course Code & Name
   - Room number / venue
   - Faculty instructor name
   - Period classification (`Theory`, `Lab`, or `Tutorial`)
4. Click **Save Timetable**.
5. The changes are dispatched to `TimetableSheet.gs`, which preserves existing rows for other semesters while updating the active semester in the Google Sheet.

---

## 📝 Exam Schedule Scheduler

Manage institutional test dates (CAE-1, CAE-2, Unit Tests, and ESE):

1. **Add Exam Entry**:
   - Select Semester.
   - Select Exam Type (`CAE-1`, `CAE-2`, `ESE`).
   - Pick Date (`YYYY-MM-DD`).
   - Enter Course Code, Name, Timings, and Exam Hall Venue.
   - Click **Add Exam Date** (dispatches to `ExamDatesSheet.gs`).
2. **Delete Exam Entry**:
   - Locate the exam card and click the trash icon.
   - Deletion removes the corresponding record directly from the master sheet.
