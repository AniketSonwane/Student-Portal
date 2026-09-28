# 🎓 Student Portal & Institutional Control Center

A modern, high-performance academic portal and administrative dashboard built for real-time student performance tracking, attendance management, and institutional audit control.

---

## ✨ Features

### 👨‍🎓 Student Portal
- **Official Google Sign-In**: Strict verification against enrolled student records (`@sbjit.edu.in`).
- **Academic Performance**: Dynamic marks tracking across Semester 1, Semester 2, and Semester 3.
- **NPTEL & Honors Tracking**: Integrated certification course progress and elective allocations.
- **Attendance Intelligence**: Real-time lecture attendance metrics, percentage calculations, and minimum threshold warnings.
- **Official Grade Statements**: Downloadable and printable institutional grade cards with security watermarks.
- **Record Correction Requests**: In-app correction submissions for personal details, marks, and attendance discrepancies.

### 🛡️ Institutional Control Center (Admin Portal)
- **Exclusive Access**: Direct biometric-like Google Sign-In restricted to `2007aniketsonwane@gmail.com`.
- **Live Google Sheets Integration**: Real-time two-way synchronization via Google Apps Script Web App.
- **Audit & Security Logging**: Instant capture of authentication attempts, IP/device signatures, timestamps, and status.
- **Access Any Student**: Search and inspect any enrolled student profile with persistent top-level dashboard return navigation.
- **Emergency Portal Lock**: One-click system-wide lockout with custom maintenance notices displayed to students.
- **Change Request Approval**: Workflow to review, approve, or reject student-submitted record corrections.

### 🎨 Design & Aesthetics
- **Dark & Light Mode**: Fluid theme switching with persistent user preference storage.
- **Interactive Background**: Animated Google Stitch glowing grid with dynamic cursor hover lighting.
- **Mobile Responsive**: Adaptive desktop headers and mobile bottom navigation dock.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, PostCSS, Lucide React Icons
- **Authentication**: Google Identity Services (OAuth 2.0 JWT)
- **Backend / Serverless**: Netlify Serverless Functions, Google Apps Script
- **Hosting**: Netlify

---

## 📁 Project Structure

```text
Student-Portal/
├── public/                 # Static assets & Netlify _redirects
│   ├── favicon.svg
│   └── _redirects
├── netlify/                # Netlify serverless functions
│   └── functions/
├── src/
│   ├── components/         # Common, layout, marks, and UI components
│   ├── config/             # Semester & sheet configuration
│   ├── context/            # AuthContext and ThemeContext
│   ├── data/               # Roster & student fallback datasets
│   ├── pages/              # Admin, Attendance, Dashboard, Login, Marks, Profile, Settings, Statement
│   ├── services/           # Google Sheets API, Auth, Admin & Profile services
│   ├── styles/             # Tailwind & theme CSS
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Clean storage & route constants
│   ├── App.tsx             # Root routing & application shell
│   └── main.tsx            # Application entrypoint
├── netlify.toml            # Netlify build & redirect rules
├── package.json            # Project dependencies & scripts
└── vite.config.ts          # Vite configuration
```

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/Student-Portal.git
cd Student-Portal
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and provide your Google OAuth Client ID and Google Sheets configuration:
```bash
cp .env.example .env
```

### 3. Run Locally
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🌐 Netlify Deployment

This repository is pre-configured for automated Netlify deployment:
1. Connect this GitHub repository in your **Netlify Dashboard**.
2. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Add your deployed URL (`https://your-site-name.netlify.app`) to **Authorized JavaScript origins** in your Google Cloud Console.

---

## 📄 License
Internal Institutional Project — All rights reserved.
