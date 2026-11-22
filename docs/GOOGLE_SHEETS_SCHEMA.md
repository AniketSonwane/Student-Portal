# 📑 Google Sheets Schema Reference

The **Student Portal & Institutional Control Center** uses Google Sheets as a real-time headless database. This reference defines the exact tabs, column schemas, data types, and formatting conventions required for each spreadsheet.

---

## 🗂️ Overview of Spreadsheets

| # | Spreadsheet Name | Env Variable | Sheet / Tab Name | Purpose |
|---|---|---|---|---|
| 1 | **Student Directory & Profiles** | `VITE_GOOGLE_SHEETS_PROFILE_ID` | `Sheet1` or `Profiles` | Enrolled student master records & authentication whitelist |
| 2 | **Semester 1 Examination** | `VITE_GOOGLE_SHEETS_SEM1_ID` | `Master-Sheet`, `SEM1-Details` | Sem 1 marks, assessments, grades, credits |
| 3 | **Semester 2 Examination** | `VITE_GOOGLE_SHEETS_SEM2_ID` | `Master-Sheet`, `sem2-details` | Sem 2 marks, assessments, grades, credits |
| 4 | **Semester 3 Examination** | `VITE_GOOGLE_SHEETS_SEM3_ID` | `Master-Sheet`, `sem3-details`, `NPTEL` | Sem 3 marks, assessments, NPTEL honors |
| 5 | **Attendance Intelligence** | `VITE_GOOGLE_SHEETS_ATTENDANCE_ID` | `Sheet1` | Subject-wise and aggregate lecture attendance metrics |
| 6 | **Weekly Timetable** | `VITE_GOOGLE_SHEETS_TIMETABLE_ID` | `Timetable` | Class schedule across Monday - Saturday |
| 7 | **Examination Dates** | `VITE_GOOGLE_SHEETS_EXAM_DATES_ID` | `ExamDates` | CAE-1, CAE-2, and ESE dates, timings, venues |
| 8 | **Admin & Institutional Control** | `VITE_GOOGLE_SHEETS_ADMIN_ID` | `Logins`, `ChangeRequests`, `Settings` | Audit logs, student correction tickets, system locks |

---

## 1. 👤 Student Profiles & Directory Sheet

> **Spreadsheet ID Variable**: `VITE_GOOGLE_SHEETS_PROFILE_ID`  
> **Tab**: `Sheet1` (or first sheet)

Contains verified student records. Only email addresses present in Column D (`College Email ID`) are authorized to sign in.

| Col | Header Name | Data Type | Example Value | Description |
|:---:|---|---|---|---|
| **A** | `Sr. No.` | Number | `1` | Serial roll number |
| **B** | `USN` | String | `1SB23CS001` | Unique Student University Number |
| **C** | `Student Name` | String | `Aniket Sonwane` | Full legal student name |
| **D** | `College Email ID` | String | `aniket.cs23@sbjit.edu.in` | **Primary Login Identifier** |
| **E** | `Personal Email ID` | String | `student@gmail.com` | Personal backup contact |
| **F** | `Mobile Number` | String | `9876543210` | 10-digit phone number |
| **G** | `Gender` | String | `Male` / `Female` | Gender identity |
| **H** | `Blood Group` | String | `O+` | Emergency medical blood group |
| **I** | `Age` | Number | `20` | Age in years |
| **J** | `Date of Birth` | String | `15/08/2004` | Date of birth |
| **K** | `Place of Birth` | String | `Nagpur` | City / place of birth |
| **L** | `LeetCode Profile` | String | `https://leetcode.com/u/...` | LeetCode coding URL |
| **M** | `LinkedIn Profile` | String | `https://linkedin.com/in/...` | Professional profile link |
| **N** | `GitHub Profile` | String | `https://github.com/...` | Code repository profile link |
| **O** | `Instagram Handle` | String | `aniket_01` | Social handle |
| **P** | `CGPA` | Number | `8.75` | Cumulative Grade Point Average |
| **Q** | `Current Semester` | Number | `3` | Semester currently enrolled |
| **R** | `College Year` | String | `2nd Year` | Academic year level |
| **S** | `Category` | String | `General` / `OBC` | Admission category quota |
| **T** | `Permanent Address` | String | `Nagpur, Maharashtra, 440001`| Residential home address |

---

## 2. 📚 Academic Marks Sheets (Sem 1, Sem 2, Sem 3)

> **Spreadsheet ID Variables**: `VITE_GOOGLE_SHEETS_SEM1_ID`, `VITE_GOOGLE_SHEETS_SEM2_ID`, `VITE_GOOGLE_SHEETS_SEM3_ID`

Each semester spreadsheet consists of a **Master-Sheet** containing student scores, and an optional **Details** tab listing subject codes and credits.

### A. `Master-Sheet` Tab
Columns are dynamically grouped per subject. A typical layout comprises:
- **Col A**: Serial No.
- **Col B**: USN (`1SB23CS001`)
- **Col C**: Student Name
- **Subsequent Columns**: Subject score blocks containing:
  - Assessment 1 (e.g. `CAE-1` max 30)
  - Assessment 2 (e.g. `CAE-2` max 30)
  - Teacher Assessment (`TA` max 10)
  - End-Semester Examination (`ESE` max 60)
  - Subject Total & Grade Point
- **Final Columns**:
  - `Total Credits Earned`
  - `SGPA` (Semester Grade Point Average, e.g. `8.82`)
  - `Result Status` (`PASS` / `PROMOTED` / `FAIL`)

### B. `SEM-Details` Tab (e.g. `SEM1-Details`, `sem2-details`, `sem3-details`)
Maps raw subject acronyms to their institutional catalog title and credit weight:

| Col | Header Name | Example Value | Description |
|:---:|---|---|---|
| **A** | `Subject Code` | `DMGT` | Unique course code |
| **B** | `Subject Name` | `Discrete Mathematics & Graph Theory` | Full catalog title |
| **C** | `Credits` | `4` | Academic credit value |
| **D** | `Course Type` | `Theory` / `Practical` / `Activity` | Component classification |

---

## 3. 📊 Attendance Intelligence Sheet

> **Spreadsheet ID Variable**: `VITE_GOOGLE_SHEETS_ATTENDANCE_ID`  
> **Tab**: `Sheet1`

The attendance sheet tracks lecture counts with pairwise columns `(Attended Count, Percentage)`:

| Col Index | Subject Code | Description | Fallback Total Lectures |
|:---:|---|---|:---:|
| **Col 0 (A)** | `SRN` | Serial Number | — |
| **Col 1 (B)** | `USN` | University Seat Number | — |
| **Col 2 (C)** | `Name` | Student Name | — |
| **Col 3, 4 (D, E)** | `CAO` | Computer Architecture and Organization (Attended, %) | 36 |
| **Col 5, 6 (F, G)** | `DSA` | Data Structures & Algorithms (Attended, %) | 31 |
| **Col 7, 8 (H, I)** | `DSAL` | Data Structures & Algorithms Lab (Attended, %) | 12 |
| **Col 9, 10 (J, K)** | `ED` | Entrepreneurship Development (Attended, %) | 21 |
| **Col 11, 12 (L, M)**| `DMGT` | Discrete Mathematics & Graph Theory (Attended, %) | 52 |
| **Col 13, 14 (N, O)**| `ES` | Environmental Studies (Attended, %) | 21 |
| **Col 15, 16 (P, Q)**| `FCC` | Fundamentals of Cloud Computing Lab (Attended, %) | 10 |
| **Col 17, 18 (R, S)**| `MDM` | Multidisciplinary Minor Elective (Attended, %) | Dynamic |
| **Col 19, 20 (T, U)**| `OE` | Open Elective Course (Attended, %) | Dynamic |
| **Col 21 (V)** | `Total Attended` | Total lectures attended by student | — |
| **Col 22 (W)** | `Total Delivered`| Total lectures conducted by faculty | — |
| **Col 23 (X)** | `Aggregate %` | Cumulative attendance percentage | — |

### Attendance Status Thresholds
- 🟢 **Safe**: $\ge 75\%$
- 🟡 **Warning**: $65\% \text{ to } 74.99\%$ (Conditionally eligible for exams)
- 🔴 **Critical**: $< 65\%$ (Debarred / Requires immediate administrative intervention)

---

## 4. 📅 Class Timetable Master Sheet

> **Spreadsheet ID Variable**: `VITE_GOOGLE_SHEETS_TIMETABLE_ID`  
> **Tab**: `Timetable`

| Col | Header Name | Data Type | Example Value | Description |
|:---:|---|---|---|---|
| **A** | `Semester` | Number | `3` | Semester number (1, 2, or 3) |
| **B** | `Day` | String | `Monday` | `Monday` through `Saturday` |
| **C** | `Period` | Number | `1` | Period sequence (1, 2, 3...) |
| **D** | `Timings` | String | `09:15 AM - 10:15 AM` | Exact lecture window |
| **E** | `Subject Code` | String | `DSA` | Course acronym |
| **F** | `Subject Name` | String | `Data Structures & Algorithms` | Subject catalog name |
| **G** | `Room` | String | `Hall 304` | Classroom or laboratory venue |
| **H** | `Faculty` | String | `Prof. Sharma` | Instructor name |
| **I** | `Type` | String | `Theory` / `Lab` / `Tutorial` | Period format |

---

## 5. 📝 Examination Schedule Sheet

> **Spreadsheet ID Variable**: `VITE_GOOGLE_SHEETS_EXAM_DATES_ID`  
> **Tab**: `ExamDates`

| Col | Header Name | Data Type | Example Value | Description |
|:---:|---|---|---|---|
| **A** | `Semester` | Number | `3` | Semester number |
| **B** | `Exam Type` | String | `CAE-1` | `CAE-1`, `CAE-2`, `Unit Test`, `ESE` |
| **C** | `Date` | String | `26-10-26` or `2026-10-26` | Exam date (standardized by app) |
| **D** | `Subject Name` | String | `Data Structures & Algorithms` | Course name |
| **E** | `Subject Code` | String | `DSA` | Course code |
| **F** | `Timings` | String | `10:00 AM - 01:00 PM` | Exam session duration |
| **G** | `Venue` | String | `Examination Hall A` | Assigned seating hall |
| **H** | `Status` | String | `Upcoming` / `Completed` | Explicit status override |

---

## 6. 🛡️ Institutional Admin Control Sheet

> **Spreadsheet ID Variable**: `VITE_GOOGLE_SHEETS_ADMIN_ID`

Managed automatically by `google-apps-script/Code.gs`. Contains three distinct tabs:

### Tab 1: `Logins` (Audit Trail)
| Col | Header | Description |
|:---:|---|---|
| **A** | `ID` | Unique UUID event token |
| **B** | `Timestamp` | ISO 8601 creation timestamp |
| **C** | `Student Name` | Name of user who attempted sign-in |
| **D** | `USN` | University Seat Number |
| **E** | `Email` | Google account email address |
| **F** | `Status` | `SUCCESS`, `DENIED`, or `BLOCKED` |
| **G** | `Device` | Client User-Agent / device signature |
| **H** | `Reason` | Rejection details (e.g. "Email not recognized in directory") |

### Tab 2: `ChangeRequests` (Correction Workflow)
| Col | Header | Description |
|:---:|---|---|
| **A** | `ID` | Unique request ticket ID |
| **B** | `Submitted At` | Submission timestamp |
| **C** | `USN` | Requesting student's USN |
| **D** | `Name` | Requesting student's name |
| **E** | `Field` | Target field (`Phone`, `Blood Group`, `Attendance Discrepancy`) |
| **F** | `Old Value` | Existing value currently on record |
| **G** | `New Value` | Proposed updated value |
| **H** | `Reason` | Student justification notes |
| **I** | `Status` | `PENDING`, `APPROVED`, or `REJECTED` |

### Tab 3: `Settings` (Emergency Lock)
| Cell Range | Key | Value | Description |
|:---:|---|---|---|
| **A1 : B1** | `is_locked` | `TRUE` / `FALSE` | Toggle system-wide student lockout |
| **A2 : B2** | `lock_reason` | String | Custom maintenance message shown to students |
