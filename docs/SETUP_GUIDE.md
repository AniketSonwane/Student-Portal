# 🛠️ Installation & Setup Guide

This guide walks you through setting up the **Student Portal & Institutional Control Center** from scratch, including Google OAuth credentials, Google Sheets databases, Google Apps Script deployments, and local development.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. **Node.js**: v18.0.0 or later (v20+ recommended).
2. **Package Manager**: `npm` (v9+) or `yarn` / `pnpm`.
3. **Google Account**: Access to [Google Cloud Console](https://console.cloud.google.com/) and [Google Drive](https://drive.google.com/).
4. **Git**: Installed and configured on your machine.

---

## 🚀 Quick Start (Local Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/AniketSonwane/Student-Portal.git
cd "Student-Portal V4"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
Open `.env` in your text editor and fill in your credentials (see configuration details below).

### 4. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

---

## 🔑 Step-by-Step Google Cloud OAuth 2.0 Configuration

The application requires Google Sign-In to authenticate students and institutional administrators.

1. Navigate to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Create a new project (e.g., `Student-Portal-Production`).
3. Configure the **OAuth Consent Screen**:
   - User Type: **Internal** (if restricted to your Google Workspace institutional domain) or **External** (if using testing emails).
   - App Name: `Student Portal`
   - User Support Email: Your institutional administrator email.
   - Developer Contact Information: Administrator email.
   - Scopes: Add `email`, `profile`, and `openid`.
4. Create **OAuth 2.0 Client ID**:
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application Type: **Web application**.
   - Name: `Student Portal Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for local development)
     - `http://localhost:4173` (for previewing production builds)
     - `https://your-site.netlify.app` (your deployed Netlify domain)
     - `https://your-custom-domain.edu.in` (if using custom institutional domain)
   - **Authorized redirect URIs**:
     - Can be left blank for Google One Tap / Google Identity Services popups.
5. Copy your **Client ID** and paste it into `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID=111999142134-xxxxxxxxx.apps.googleusercontent.com
   ```

---

## 📄 Step-by-Step Google Sheets Setup

The application reads data directly from Google Sheets using Google's public CSV export endpoint (`/gviz/tq?tqx=out:csv`).

### 1. Create Required Spreadsheets
Create the following spreadsheets in your Google Drive:
1. **Student Profiles Sheet** (`VITE_GOOGLE_SHEETS_PROFILE_ID`)
2. **Semester 1 Marks Sheet** (`VITE_GOOGLE_SHEETS_SEM1_ID`)
3. **Semester 2 Marks Sheet** (`VITE_GOOGLE_SHEETS_SEM2_ID`)
4. **Semester 3 Marks Sheet** (`VITE_GOOGLE_SHEETS_SEM3_ID`)
5. **Attendance Intelligence Sheet** (`VITE_GOOGLE_SHEETS_ATTENDANCE_ID`)
6. **Exam Dates Sheet** (`VITE_GOOGLE_SHEETS_EXAM_DATES_ID`)
7. **Timetable Sheet** (`VITE_GOOGLE_SHEETS_TIMETABLE_ID`)
8. **Admin Control & Audit Sheet** (`VITE_GOOGLE_SHEETS_ADMIN_ID`)

> [!IMPORTANT]
> Refer to [GOOGLE_SHEETS_SCHEMA.md](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/docs/GOOGLE_SHEETS_SCHEMA.md) for the exact column headers and structure required for each sheet.

### 2. Set Sharing Permissions
For the web application to read these sheets without requiring service account keys:
1. Open the spreadsheet in Google Drive.
2. Click **Share** (top-right button).
3. Under **General access**, change from *Restricted* to:
   - **Anyone with the link can view** (Viewer role).
4. Extract the **Spreadsheet ID** from the browser URL:
   ```text
   https://docs.google.com/spreadsheets/d/18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k/edit
                                          ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                                                    SPREADSHEET ID
   ```
5. Place this ID in the corresponding `.env` variable.

---

## ⚡ Step-by-Step Google Apps Script Deployments

Three Apps Script files handle write operations (audit logs, lock states, timetable edits, and exam scheduling).

### Script 1: Admin Control & Login Audit (`Code.gs`)
1. Open your **Admin Control Google Spreadsheet**.
2. Click **Extensions > Apps Script**.
3. Delete the default placeholder code and paste the full contents of [`google-apps-script/Code.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/Code.gs).
4. Click **Deploy > New deployment**.
5. Click the gear icon next to "Select type" and choose **Web app**.
6. Set:
   - **Description**: `Admin Control & Audit API`
   - **Execute as**: `Me (your Google email)`
   - **Who has access**: `Anyone`
7. Click **Deploy**, authorize permissions with your Google account, and copy the **Web app URL**:
   ```text
   https://script.google.com/macros/s/AKfycby.../exec
   ```
8. Paste this URL into `VITE_GOOGLE_SHEETS_ADMIN_API_URL` in `.env`.

### Script 2: Timetable Master API (`TimetableSheet.gs`)
1. Open your **Timetable Google Spreadsheet**.
2. Click **Extensions > Apps Script**.
3. Paste the contents of [`google-apps-script/TimetableSheet.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/TimetableSheet.gs).
4. Deploy as a **Web app** with:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Copy the Web app URL and paste into `VITE_GOOGLE_SHEETS_TIMETABLE_API_URL` in `.env`.

### Script 3: Exam Dates Master API (`ExamDatesSheet.gs`)
1. Open your **Exam Dates Google Spreadsheet**.
2. Click **Extensions > Apps Script**.
3. Paste the contents of [`google-apps-script/ExamDatesSheet.gs`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/google-apps-script/ExamDatesSheet.gs).
4. Deploy as a **Web app** with:
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
5. Copy the Web app URL and paste into `VITE_GOOGLE_SHEETS_EXAM_DATES_API_URL` in `.env`.

---

## ⚙️ Environment Variables Reference Table

| Variable Name | Description | Required | Example Value |
|---|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID | **Yes** | `123456...apps.googleusercontent.com` |
| `VITE_GOOGLE_SHEETS_PROFILE_ID` | Student master profiles spreadsheet ID | **Yes** | `18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k` |
| `VITE_GOOGLE_SHEETS_SEM1_ID` | Semester 1 examination marks sheet ID | **Yes** | `167hosqqnr-PlwTZeU2dG3K1XUCBfZgNqD_mwG5oUDdI` |
| `VITE_GOOGLE_SHEETS_SEM2_ID` | Semester 2 examination marks sheet ID | **Yes** | `1AD1Fj5OvUujvzkGiB7AhDy49yULTlSRGFGTAhq1lAes` |
| `VITE_GOOGLE_SHEETS_SEM3_ID` | Semester 3 examination marks sheet ID | **Yes** | `1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA` |
| `VITE_GOOGLE_SHEETS_ATTENDANCE_ID` | Lecture attendance spreadsheet ID | **Yes** | `1M550WSsFjWpiYFxqIIDP0GQJk4G8XGzjyuHIng0rryg` |
| `VITE_GOOGLE_SHEETS_EXAM_DATES_ID` | Scheduled exam dates spreadsheet ID | **Yes** | `1NtEs-E5g_FwbJ7Bx4l3vAPmE6QH3hZH1KdZXqSUjf3c` |
| `VITE_GOOGLE_SHEETS_TIMETABLE_ID` | Class weekly timetable spreadsheet ID | **Yes** | `1bgsoMhbrmAuKni2lCJeKKcF3MFeUSGDjCmtJo-rWnWA` |
| `VITE_GOOGLE_SHEETS_ADMIN_ID` | Control & audit spreadsheet ID | **Yes** | `1Ruw-7w68IV9PH9-9qugyjF5kppcGH5otTgMAHiA--uI` |
| `VITE_GOOGLE_SHEETS_ADMIN_API_URL` | Apps Script URL for admin audit logging | **Yes** | `https://script.google.com/macros/s/.../exec` |
| `VITE_GOOGLE_SHEETS_TIMETABLE_API_URL` | Apps Script URL for timetable 2-way sync | Optional | `https://script.google.com/macros/s/.../exec` |
| `VITE_GOOGLE_SHEETS_EXAM_DATES_API_URL` | Apps Script URL for exam schedule sync | Optional | `https://script.google.com/macros/s/.../exec` |
| `VITE_ADMIN_EMAIL` | Primary administrator Google email | **Yes** | `admin@sbjit.edu.in` |
| `VITE_ADMIN_EMAILS` | Comma-separated list of secondary admin emails | Optional | `hod@sbjit.edu.in,dean@sbjit.edu.in` |

---

## 🌐 Netlify Deployment Guide

This project includes pre-configured [`netlify.toml`](file:///a:/My%20Data/VS%20Code/Personal%20Projects/StudentPortal/Student-Portal%20V4/netlify.toml) and serverless function handlers.

### Deploying via Netlify Git Integration
1. Push your repository to GitHub / GitLab.
2. Sign in to [Netlify](https://app.netlify.com/) and click **Add new site > Import an existing project**.
3. Select your repository.
4. Netlify automatically reads `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
5. Click **Add environment variables** and enter all the variables from your `.env` file.
6. Click **Deploy Site**.
7. Once your site is deployed (e.g. `https://student-portal.netlify.app`), copy that domain and add it to **Authorized JavaScript origins** in Google Cloud Console.

---

## 🔍 Troubleshooting & FAQs

### Error: "Access Denied. Your email is not enrolled."
- **Cause**: The email signed into Google is either not ending in `@sbjit.edu.in` or is not listed in column `D` (College Email ID) of the Student Profile Google Sheet.
- **Fix**: Verify that the student's email matches exactly (case-insensitive) in the Profile Sheet.

### Error: "Google Sheets responded with HTTP 404 or 403"
- **Cause**: The Google Spreadsheet permissions are set to "Restricted" rather than "Anyone with the link can view".
- **Fix**: Open the spreadsheet in Google Drive, click Share, and set General access to "Anyone with the link can view".

### Error: "Cross-Origin Request Blocked (CORS) on Apps Script"
- **Cause**: The Apps Script Web App was deployed with "Who has access" set to "Only myself".
- **Fix**: In Google Apps Script, click Deploy > Manage deployments > Edit > Who has access > Change to **Anyone**, and redeploy a new version.
