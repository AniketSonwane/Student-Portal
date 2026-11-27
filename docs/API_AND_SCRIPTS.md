# 📡 API Endpoints & Serverless Scripts Reference

This document provides complete technical specifications for the serverless functions and Google Apps Script Web Apps powering the **Student Portal & Institutional Control Center**.

---

## 🌐 Netlify Serverless Function: Marks & Data Proxy

### `GET /.netlify/functions/marks`
Provides an edge-cached proxy with CORS support to safely query Google Sheets CSV exports from environments where client-side Google API access is blocked or restricted.

- **Source Code**: [`netlify/functions/marks.ts`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/netlify/functions/marks.ts)
- **Response Format**: `text/csv; charset=utf-8` (or `application/json` on error)
- **Cache-Control**: `public, max-age=120` (2 minutes edge cache)

#### Query Parameters:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `spreadsheetId` or `sheetId` | `string` | **Yes** | The Google Spreadsheet ID |
| `sheet` | `string` | No (Default: `Master-Sheet`) | Specific tab name to query |

#### Example Request:
```http
GET /.netlify/functions/marks?spreadsheetId=1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA&sheet=Master-Sheet HTTP/1.1
Host: student-portal.netlify.app
```

#### Example Error Response (400 Bad Request):
```json
{
  "success": false,
  "error": "Spreadsheet ID is required."
}
```

---

## 📜 Google Apps Script: Admin Control & Audit API (`Code.gs`)

- **Source Code**: [`google-apps-script/Code.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/Code.gs)
- **Deployment URL**: Configured in `VITE_GOOGLE_SHEETS_ADMIN_API_URL`
- **Output**: JSON (`ContentService.MimeType.JSON`)

### 1. `GET /exec` (Query Data & Settings)

#### Action: Fetch All Admin Records
```http
GET https://script.google.com/macros/s/.../exec HTTP/1.1
```
**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "logs": [["ID", "Timestamp", "Student Name", "USN", "Email", "Status", "Device", "Reason"], ...],
    "requests": [["ID", "Submitted At", "USN", "Name", "Field", "Old Value", "New Value", "Reason", "Status"], ...],
    "settings": [["is_locked", "FALSE"], ["lock_reason", ""]]
  }
}
```

#### Action: Fetch System Lock Settings Only
```http
GET https://script.google.com/macros/s/.../exec?action=SETTINGS HTTP/1.1
```
**Response (200 OK)**:
```json
{
  "success": true,
  "settings": [["is_locked", "FALSE"], ["lock_reason", ""]]
}
```

---

### 2. `POST /exec` Actions

All POST requests should have `Content-Type: application/json`.

#### Action: `ADD_LOG` (Append Session Audit)
Appends a student sign-in event into the `Logins` tab.

**Payload**:
```json
{
  "action": "ADD_LOG",
  "log": {
    "id": "log_1728709400000",
    "timestamp": "2026-10-12T10:30:00.000Z",
    "student_name": "Aniket Sonwane",
    "usn": "1SB23CS001",
    "email": "aniket.cs23@sbjit.edu.in",
    "status": "SUCCESS",
    "device": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "reason": ""
  }
}
```
**Response**:
```json
{ "success": true }
```

---

#### Action: `ADD_REQUEST` (Submit Correction Ticket)
Inserts a new student correction ticket into the `ChangeRequests` tab.

**Payload**:
```json
{
  "action": "ADD_REQUEST",
  "request": {
    "id": "req_1728709415000",
    "submitted_at": "2026-10-12T10:30:15.000Z",
    "student_usn": "1SB23CS001",
    "student_name": "Aniket Sonwane",
    "field_name": "Mobile Number",
    "old_value": "9876543210",
    "new_value": "9123456789",
    "reason": "Updated phone number",
    "status": "PENDING"
  }
}
```
**Response**:
```json
{ "success": true }
```

---

#### Action: `SET_LOCK` (Emergency Maintenance Lock)
Updates `is_locked` and `lock_reason` in cells `A1:B2` of the `Settings` tab.

**Payload**:
```json
{
  "action": "SET_LOCK",
  "is_locked": true,
  "lock_reason": "End-Semester Examination moderation in progress. Expected back at 16:00."
}
```
**Response**:
```json
{ "success": true }
```

---

## 📅 Google Apps Script: Timetable API (`TimetableSheet.gs`)

- **Source Code**: [`google-apps-script/TimetableSheet.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/TimetableSheet.gs)
- **Deployment URL**: Configured in `VITE_GOOGLE_SHEETS_TIMETABLE_API_URL`

### 1. `GET /exec?semester={number}`
Fetches schedule rows for a specific semester.

**Response**:
```json
{
  "success": true,
  "semester": 3,
  "data": [
    ["Semester", "Day", "Period", "Timings", "Subject Code", "Subject Name", "Room", "Faculty", "Type"],
    [3, "Monday", 1, "09:15 AM - 10:15 AM", "DSA", "Data Structures & Algorithms", "Hall 304", "Prof. Sharma", "Theory"]
  ]
}
```

### 2. `POST /exec` (`SAVE_TIMETABLE`)
Atomically updates the specified semester's weekly timetable without affecting other semesters.

**Payload**:
```json
{
  "action": "SAVE_TIMETABLE",
  "semester": 3,
  "schedule": [
    {
      "day": "Monday",
      "lectures": [
        {
          "period": 1,
          "timings": "09:15 AM - 10:15 AM",
          "subjectCode": "DSA",
          "subjectName": "Data Structures & Algorithms",
          "room": "Hall 304",
          "faculty": "Prof. Sharma",
          "type": "Theory"
        }
      ]
    }
  ]
}
```

---

## 📝 Google Apps Script: Exam Dates API (`ExamDatesSheet.gs`)

- **Source Code**: [`google-apps-script/ExamDatesSheet.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/ExamDatesSheet.gs)
- **Deployment URL**: Configured in `VITE_GOOGLE_SHEETS_EXAM_DATES_API_URL`

### 1. `POST /exec` (`ADD_EXAM_DATE`)
Appends an exam date entry into the `ExamDates` sheet. Automatically converts standard `YYYY-MM-DD` inputs to match institutional sheet formatting.

**Payload**:
```json
{
  "action": "ADD_EXAM_DATE",
  "exam": {
    "semester": 3,
    "examType": "CAE-1",
    "date": "2026-10-26",
    "subjectCode": "DSA",
    "subjectName": "Data Structures & Algorithms",
    "timings": "10:00 AM - 01:00 PM",
    "venue": "Examination Hall A",
    "status": "Upcoming"
  }
}
```

### 2. `POST /exec` (`DELETE_EXAM_DATE`)
Deletes an exam date matching the given semester and course code.

**Payload**:
```json
{
  "action": "DELETE_EXAM_DATE",
  "semester": 3,
  "subjectCode": "DSA"
}
```
