# Student Portal — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Initial Product Specification  
**Target Users:** ~70 students  
**Hosting:** Netlify  
**Data Store:** Google Sheets  
**Primary Authentication:** Google Sign-In  
**Design Direction:** Minimal, modern, professional, responsive

---

## 1. Product Overview

The **Student Portal** is a web application for a group of approximately 70 students. It provides students with a single place to view their academic information, semester marks, attendance, profile information, and basic account settings.

The product should feel like a polished modern academic dashboard rather than a basic college website. The interface should be clean, spacious, responsive, accessible, and easy to understand.

The initial product is intentionally small and simple:

- Approximately 70 student accounts
- Google Sheets used as the initial data source
- Netlify used for hosting and serverless functionality
- Google Sign-In used for student authentication
- No complex admin dashboard is required in the first version
- Academic data is primarily read-only for students

---

## 2. Product Goals

### Primary Goals

1. Provide students with a professional personal academic portal.
2. Make semester marks easy to understand.
3. Make attendance information easy to check.
4. Give students a centralized profile page.
5. Provide simple account and application settings.
6. Support both light and dark themes across the entire website.
7. Work well on desktop, tablet, and mobile devices.
8. Keep the architecture simple enough to maintain for a small student group.
9. Use Google Sheets as an easy-to-manage initial database.
10. Keep student information protected from unauthorized access.

### Success Criteria

The first release should allow a student to:

- Sign in with Google.
- Access only their own student information.
- View their profile.
- View semester marks.
- Switch between semesters.
- View subject-wise internal/external marks.
- View total marks and grades.
- View semester attendance.
- View attendance averages.
- Download semester marks.
- View expected SGPA information.
- Change between light and dark mode.
- Contact the administrator.
- Sign out safely.

---

## 3. Target Users

### Primary User — Student

Students use the portal to check:

- Personal details
- USN / student identifier
- Current semester
- CGPA
- Attendance
- Semester marks
- Subject-wise marks
- Grades
- Academic performance information

### Secondary User — Administrator

The administrator primarily manages the data source.

For the initial version, administration can be handled through Google Sheets rather than a separate admin dashboard.

The administrator should be able to:

- Add students
- Update student information
- Update marks
- Update attendance
- Update semester information
- Correct academic records
- Manage basic portal information

---

# 4. User Flow

## 4.1 Login Flow

```text
Student opens website
        ↓
Student Login Page
        ↓
Google Sign-In
        ↓
Authentication
        ↓
Verify student account
        ↓
Student Dashboard
```

If the Google account is not registered:

```text
Google Sign-In
      ↓
Account not found
      ↓
Access denied
      ↓
Contact Administrator
```

Students must not be allowed to create arbitrary student accounts.

---

# 5. Page Structure

The application should contain the following primary pages:

1. Login
2. Student Dashboard
3. Profile
4. Semester Marks
5. Attendance
6. Settings
7. Terms & Conditions

A consistent navigation system should be used throughout the authenticated portion of the website.

---

# 6. Login Page

## Purpose

Provide a simple and professional entry point to the portal.

## Layout

Based on the provided wireframe:

- Portal branding/title
- Google Sign-In button
- Light/Dark mode control
- Minimal visual design
- Terms & Conditions access
- Developer/portal attribution if required

## Requirements

### Functional

- Display Google Sign-In.
- Authenticate using Google.
- Verify that the authenticated account belongs to a registered student.
- Redirect successful users to the dashboard.
- Show a clear error if the account is not authorized.
- Provide access to Terms & Conditions.
- Theme switcher must work on the login page.

### UX

The login page should contain very little unnecessary information.

The primary action should be obvious:

**Continue with Google**

---

# 7. Student Dashboard

## Purpose

Give the student a quick overview of their current academic status.

## Layout

The dashboard should follow the supplied wireframe.

### Main Information

- User image
- User name
- Current semester
- College year
- Current semester CGPA
- Attendance summary

### Navigation

A persistent navigation area should contain:

- Profile
- Semester Marks
- Attendance
- Settings

### Header

The header should include:

- Student/portal title
- Light/Dark mode toggle

## Dashboard Cards

Example:

```text
┌──────────────────────────────┐
│ User Image                   │
│                              │
│ User Details                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Current Semester             │
│ College Year                 │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Current Semester CGPA        │
│ Attendance                   │
└──────────────────────────────┘
```

The dashboard should prioritize the information students check most frequently.

---

# 8. Profile Page

## Purpose

Display the student's personal and contact information.

## Information

### Basic Information

- Profile image
- Name
- Age
- USN

### Personal Information

- Date of Birth
- Place of Birth
- Category
- Blood Group

### Contact Information

- College Email
- Personal Email
- Phone Number
- Social Links

## Actions

- Edit Details

The edit functionality should only allow fields that are intended to be student-editable.

Sensitive academic fields must not be editable by students.

## Security

The profile must only display the currently authenticated student's information.

---

# 9. Semester Marks Page

## Purpose

Allow students to view academic marks semester by semester.

## Semester Selection

The page should provide a semester selector.

Example:

```text
Choose Semester

[S1] [S2] [S3] [S4] [S5] [S6] [S7] [S8]
```

Only semesters containing available data need to be displayed.

## Subject Information

Each subject should display:

- Subject name/code
- CAE-1
- CAE-2
- ESE
- TAE-1
- TAE-2
- TAE-3
- Total Internals
- Total Marks
- Grade

The exact assessment fields should be configurable because the academic structure may change.

## Summary

Display:

- Total Internals
- Total Marks
- Grade
- SGPA where available

## Additional Actions

### Changes in Marks

Shows relevant information about marks that have changed or been updated.

### Download Semester Marks

Allow the student to download their selected semester marks.

Recommended initial format:

- PDF

Optional future format:

- CSV

### Expected SGPA

Provide an expected SGPA calculation based on currently available marks.

The calculation should clearly indicate that it is an estimate if some marks are not finalized.

---

# 10. Attendance Page

## Purpose

Provide a simple view of attendance across semesters.

## Layout

Based on the supplied wireframe:

```text
Choose Semester

Student Name                 Total Avg

[S1] [S2] [S3] [S4] [S5] ...
```

## Information

For each semester, display:

- Overall attendance percentage
- Total classes if available
- Classes attended if available
- Classes missed if available

Optional subject-level attendance can be added later.

## Visual Indicators

Attendance should be easy to understand.

Example:

```text
Attendance
86%

Present     86
Absent      14
```

Avoid relying only on color to communicate attendance status. Include the actual percentage/value.

---

# 11. Settings Page

## Purpose

Provide basic account and application settings.

## Options

### Sign Out

Safely end the current authenticated session.

### Contact Admin

Provide an easy way to contact the administrator.

Possible implementation:

- Email link
- Contact form
- College/admin email

### Change Theme

Allow the student to switch between:

- Light
- Dark

### Terms & Conditions

Open the Terms & Conditions page.

## Settings Wireframe

```text
┌─────────────────────────────┐
│ Sign Out                    │
├─────────────────────────────┤
│ Contact Admin               │
├─────────────────────────────┤
│ Change Theme                │
├─────────────────────────────┤
│ Terms and Conditions        │
└─────────────────────────────┘
```

---

# 12. Terms & Conditions

The application should have a dedicated Terms & Conditions page.

It should explain:

- Acceptable use
- Student responsibilities
- Academic data usage
- Account security
- Privacy expectations
- Data correction process
- Administrator responsibilities
- Contact information

The login page should provide access to this page.

---

# 13. Theme System

The light/dark mode control should be consistent across every page.

## Requirement

The selected theme should persist when navigating between pages.

Recommended implementation:

```text
Theme preference
      ↓
localStorage
      ↓
Applied globally
```

If the user selects Dark Mode, all application pages should use the dark theme.

## Theme Behavior

### Light Mode

- Bright background
- Dark text
- Light cards
- Purple/orange accent colors

### Dark Mode

- Deep purple background
- Light text
- Dark purple cards
- Purple/orange accents

Theme transitions should be subtle and should not create distracting animations.

---

# 14. Visual Design System

The supplied visual reference uses a purple and warm orange palette.

## Primary Colors

```text
Purple:
#8048A8

Deep Purple:
#3A0353

Light Orange / Cream:
#F8D299

Orange:
#F59E51
```

These colors should be treated as the core brand palette.

## Suggested Color Roles

### Primary Accent

`#8048A8`

Use for:

- Primary buttons
- Active navigation
- Links
- Important UI highlights

### Deep Background

`#3A0353`

Use for:

- Dark theme background
- Strong visual sections
- Brand elements

### Light Accent

`#F8D299`

Use sparingly for:

- Selected states
- Highlights
- Soft cards
- Important UI indicators

### Orange Accent

`#F59E51`

Use for:

- Secondary actions
- Highlights
- Progress/academic indicators
- Decorative elements

The UI should not use all four colors equally. Purple should remain the dominant brand color, while orange/cream should be used as supporting accents.

---

# 15. Typography

The website should use modern, professional, highly readable fonts.

## Recommended Font

**Inter**

Use Inter for:

- Headings
- Body text
- Buttons
- Navigation
- Numbers
- Tables

Alternative fonts:

- Manrope
- Plus Jakarta Sans
- DM Sans

Typography should have a clear hierarchy.

Example:

```text
Page Title
32px / Bold

Section Heading
22–24px / Semi-Bold

Card Heading
16–18px / Semi-Bold

Body
14–16px / Regular

Secondary Text
12–14px / Regular
```

The final implementation should avoid excessive font sizes and excessive font weights.

---

# 16. Component Design

All pages should use a shared component system.

## Required Components

- Header
- Theme Toggle
- Sidebar/Navigation
- Profile Card
- Information Card
- Button
- Primary Button
- Secondary Button
- Semester Selector
- Marks Table
- Attendance Card
- Modal
- Toast/Notification
- Loading State
- Error State
- Empty State

## Cards

Cards should have:

- Rounded corners
- Subtle borders/shadows
- Consistent padding
- Clear hierarchy
- Consistent spacing

Avoid excessive shadows.

---

# 17. Responsive Design

The portal must work on:

- Desktop
- Laptop
- Tablet
- Mobile

## Desktop

Use a sidebar navigation similar to the supplied wireframe.

## Tablet

Reduce card spacing and allow the layout to wrap naturally.

## Mobile

The sidebar should transform into:

- Bottom navigation
- Hamburger menu
- Or compact navigation drawer

The exact implementation can be selected during development based on usability.

Important information should remain readable without horizontal scrolling.

---

# 18. Data Architecture

Google Sheets will be used as the initial database because the project has approximately 70 students.

However, the browser should **not** directly expose private Google Sheets credentials.

Recommended architecture:

```text
Student Browser
      ↓
Frontend
      ↓
Netlify Functions / Secure API Layer
      ↓
Google Sheets API
      ↓
Google Sheets
```

This keeps API credentials and service-account credentials away from the client.

---

# 19. Google Sheets Structure

The spreadsheet should use separate sheets/tabs for different data types.

Recommended structure:

## Students

| Field | Description |
|---|---|
| student_id | Internal unique ID |
| usn | Student USN |
| google_email | Authorized Google account |
| name | Full name |
| profile_image | Image URL |
| current_semester | Current semester |
| college_year | Current academic year |
| college_email | College email |
| personal_email | Personal email |
| phone | Phone number |
| dob | Date of birth |
| pob | Place of birth |
| category | Category |
| blood_group | Blood group |

## Marks

| Field | Description |
|---|---|
| student_id | Student reference |
| semester | Semester |
| subject_code | Subject code |
| subject_name | Subject name |
| cae1 | CAE-1 |
| cae2 | CAE-2 |
| ese | ESE |
| tae1 | TAE-1 |
| tae2 | TAE-2 |
| tae3 | TAE-3 |
| total_internal | Internal total |
| total_marks | Overall marks |
| grade | Grade |
| updated_at | Last update |

## Attendance

| Field | Description |
|---|---|
| student_id | Student reference |
| semester | Semester |
| subject_code | Subject code |
| subject_name | Subject name |
| total_classes | Total classes |
| attended_classes | Attended classes |
| attendance_percentage | Attendance percentage |
| updated_at | Last update |

## Semester Summary

| Field | Description |
|---|---|
| student_id | Student reference |
| semester | Semester |
| sgpa | SGPA |
| cgpa | CGPA |
| total_marks | Semester total |
| total_internal | Internal total |

---

# 20. Authentication & Authorization

Google Sign-In should be the primary authentication method.

## Authentication

The system should verify the user's Google identity.

## Authorization

Authentication alone is not enough.

After login, the system should verify that the authenticated email exists in the authorized student records.

```text
Google Account
      ↓
Authenticated?
      ↓
Is email registered?
      ↓
YES → Student Portal
NO  → Access Denied
```

## Data Isolation

Every API request that returns student information must identify the authenticated student.

The frontend must never be able to request another student's records simply by changing a student ID in the browser.

---

# 21. Security Requirements

Because the portal contains student information, security is a core requirement.

### Required

- HTTPS
- Secure Google authentication
- Server-side authorization
- No Google service-account credentials in frontend code
- No spreadsheet credentials in frontend code
- Validate all API requests
- Validate student ownership before returning records
- Avoid exposing unnecessary personal information
- Do not store passwords
- Do not put sensitive data in URL query parameters
- Use environment variables for secrets
- Log important server-side errors without exposing private student data

### Important

Google Sheets should be treated as a data source, not as a public database.

The spreadsheet itself should not be publicly accessible.

---

# 22. Netlify Deployment

Netlify will host the application.

Recommended structure:

```text
Frontend
   ↓
Netlify
   ├── Static/SPA application
   └── Netlify Functions
            ↓
       Google Sheets API
```

## Environment Variables

Sensitive configuration should be stored using Netlify environment variables.

Examples:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_SHEETS_ID
GOOGLE_SERVICE_ACCOUNT
```

Exact variables depend on the selected authentication and Google API implementation.

These values must never be committed to Git.

---

# 23. Performance Requirements

The portal is designed for approximately 70 students, so extreme scaling is not required.

The application should still:

- Load quickly
- Minimize unnecessary API calls
- Cache safe/static information where appropriate
- Avoid loading all student data at login
- Request only the authenticated student's required records

Target:

- Fast initial page load
- Smooth page navigation
- No unnecessary full-page reloads

---

# 24. Loading & Error States

Every data-driven page should have proper states.

## Loading

Example:

```text
Loading your academic information...
```

Use skeleton loaders where appropriate.

## Empty State

Example:

```text
No marks are available for this semester yet.
```

## Error State

Example:

```text
We couldn't load your marks.

Please try again or contact the administrator.
```

Do not expose technical errors or API credentials to students.

---

# 25. Data Freshness

Because Google Sheets is the source of academic information, the portal should clearly handle recently updated data.

Possible approach:

- Fetch current information when opening a page.
- Show `Last updated` where useful.
- Avoid aggressive client-side caching for marks and attendance.
- Allow the administrator to update Sheets without changing frontend code.

---

# 26. Download Marks

Students should be able to download their selected semester marks.

Recommended output:

```text
Student Name
USN
Semester

Subject          Internal    ESE    Total    Grade
---------------------------------------------------
Subject 1        XX          XX     XX       A
Subject 2        XX          XX     XX       B+
...

Semester Total
SGPA
```

The downloaded document should have a professional layout and portal branding.

---

# 27. Expected SGPA

The Expected SGPA feature should calculate an estimated SGPA using the currently available marks and the institution's grading/credit rules.

The grading and credit rules must be configurable.

The interface should clearly distinguish:

```text
Expected SGPA: 8.42
```

from an official result:

```text
Official SGPA: 8.35
```

If required inputs are missing, the system should display an appropriate message rather than producing an unreliable result.

---

# 28. Accessibility

The website should follow basic accessibility principles.

Requirements:

- Good color contrast
- Keyboard-accessible controls
- Visible focus states
- Proper button labels
- Alt text for meaningful images
- Do not rely only on color
- Readable font sizes
- Accessible form controls
- Semantic HTML

---

# 29. UX Principles

The design should follow these principles:

### Minimal

Avoid unnecessary UI elements.

### Modern

Use clean cards, spacing, typography, and subtle interactions.

### Professional

Academic information should feel trustworthy and organized.

### Fast

Students should be able to find information quickly.

### Consistent

Buttons, cards, typography, navigation, and theme behavior should remain consistent across pages.

### Clear

Marks and attendance should be understandable at a glance.

---

# 30. Animation & Interaction

Animations should be subtle.

Recommended:

- Theme transition
- Card hover
- Button hover
- Page transition
- Dropdown/selector transition
- Toast appearance

Avoid:

- Excessive bouncing
- Large animations
- Slow transitions
- Animations that interfere with reading

Recommended transition duration:

```text
150–250ms
```

---

# 31. Admin Data Management

For version 1, the administrator can manage data directly through Google Sheets.

The admin workflow is:

```text
Administrator
     ↓
Google Sheets
     ↓
Update student/academic data
     ↓
Student opens portal
     ↓
Latest data is retrieved
```

A dedicated admin dashboard can be considered for a future version.

---

# 32. Out of Scope for Version 1

The following are not required for the initial release:

- Full college ERP
- Fee payment
- Course registration
- Online examinations
- Assignment submission
- Faculty dashboard
- Parent dashboard
- Chat system
- Push notifications
- Complex admin panel
- Social feed
- Public student directory

These may be considered in future releases.

---

# 33. Future Enhancements

Possible future features:

- Admin dashboard
- Faculty portal
- Notifications
- Attendance alerts
- Result announcements
- Assignment tracking
- Timetable
- Exam schedule
- Study resources
- Academic analytics
- CGPA prediction
- Subject-wise attendance graphs
- Student announcements
- Profile photo upload
- Export to Excel/CSV
- Progressive Web App (PWA)

---

# 34. Recommended Technical Stack

## Frontend

Recommended:

- React
- TypeScript
- Vite
- Tailwind CSS

Alternative:

- Next.js

For a Netlify-hosted project of this size, React + TypeScript is sufficient.

## UI

- Tailwind CSS
- Lucide React icons
- Inter / Manrope typography

## Authentication

- Google OAuth / Google Identity Services

## Backend

- Netlify Functions

## Database

- Google Sheets API

## Hosting

- Netlify

## Version Control

- Git
- GitHub

---

# 35. Suggested Project Structure

```text
student-portal/
│
├── src/
│   ├── components/
│   │   ├── Header
│   │   ├── Sidebar
│   │   ├── ThemeToggle
│   │   ├── Card
│   │   ├── Button
│   │   └── SemesterSelector
│   │
│   ├── pages/
│   │   ├── Login
│   │   ├── Dashboard
│   │   ├── Profile
│   │   ├── Marks
│   │   ├── Attendance
│   │   ├── Settings
│   │   └── Terms
│   │
│   ├── services/
│   │   ├── auth
│   │   ├── marks
│   │   ├── attendance
│   │   └── profile
│   │
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── styles/
│
├── netlify/
│   └── functions/
│
├── public/
│
├── .env.example
├── netlify.toml
├── package.json
└── README.md
```

---

# 36. Acceptance Criteria

## Authentication

- [ ] Student can sign in using Google.
- [ ] Unauthorized Google accounts are rejected.
- [ ] Student remains authenticated while navigating the portal.
- [ ] Student can sign out.

## Dashboard

- [ ] Student name is displayed correctly.
- [ ] Current semester is displayed.
- [ ] College year is displayed.
- [ ] Current CGPA is displayed.
- [ ] Attendance summary is displayed.
- [ ] Navigation works correctly.

## Profile

- [ ] Student can view profile information.
- [ ] Only the authenticated student's data is displayed.
- [ ] Editable fields can be updated if enabled.
- [ ] Academic fields cannot be modified by students.

## Marks

- [ ] Student can select a semester.
- [ ] Subject list is displayed.
- [ ] Internal marks are displayed.
- [ ] ESE marks are displayed.
- [ ] Total marks are displayed.
- [ ] Grade is displayed.
- [ ] Semester summary is displayed.
- [ ] Student can download semester marks.
- [ ] Expected SGPA works according to configured grading rules.

## Attendance

- [ ] Student can select a semester.
- [ ] Attendance percentage is displayed.
- [ ] Semester average is displayed where applicable.
- [ ] Missing data is handled gracefully.

## Settings

- [ ] Student can sign out.
- [ ] Student can contact the administrator.
- [ ] Student can change theme.
- [ ] Student can open Terms & Conditions.

## Theme

- [ ] Light mode works on every page.
- [ ] Dark mode works on every page.
- [ ] Theme preference persists between pages.
- [ ] Theme is readable and accessible.

## Responsive

- [ ] Desktop layout works.
- [ ] Tablet layout works.
- [ ] Mobile layout works.
- [ ] No important information requires horizontal scrolling.

## Security

- [ ] Google credentials/secrets are not exposed in frontend code.
- [ ] Google Sheets is not publicly exposed.
- [ ] Students cannot access another student's records.
- [ ] API endpoints validate authentication and authorization.

---

# 37. MVP Definition

Version 1 is complete when a registered student can:

```text
Google Login
     ↓
Dashboard
     ├── Profile
     ├── Semester Marks
     ├── Attendance
     └── Settings
```

and all displayed data is securely retrieved from Google Sheets for that authenticated student.

The interface must be responsive, polished, accessible, and support persistent light/dark mode.

---

# 38. Final Product Direction

The final website should feel like a **modern student productivity/academic portal**, not a traditional college website.

The visual identity should be based on:

- Deep purple
- Modern purple
- Warm cream
- Warm orange
- Clean white/dark surfaces
- Rounded cards
- Subtle shadows
- Generous spacing
- Professional typography
- Minimal icons
- Clear data presentation

The supplied wireframe should be treated as the **functional layout reference**, while the supplied purple/orange visual reference should guide the **visual identity and color direction**.

The implementation should preserve the simplicity of the wireframe while upgrading it into a polished production-quality web application.
