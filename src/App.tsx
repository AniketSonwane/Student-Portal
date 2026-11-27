import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BlockedAccountModal } from './components/common/BlockedAccountModal';
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { MarksPage } from './pages/Marks/MarksPage';
import { StatementPage } from './pages/Statement/StatementPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { AttendancePage } from './pages/Attendance/AttendancePage';
import { ExamDatesPage } from './pages/ExamDates/ExamDatesPage';
import { TimetablePage } from './pages/Timetable/TimetablePage';
import { SemesterDataPage } from './pages/SemesterData/SemesterDataPage';
import { NoticesPage } from './pages/Notices/NoticesPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { TermsPage } from './pages/Terms/TermsPage';
import { AdminPortalPage } from './pages/Admin/AdminPortalPage';
import { LoadingState } from './components/common/LoadingState';
import { InteractiveGridBackground } from './components/common/InteractiveGridBackground';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { AdminInspectionBanner } from './components/layout/AdminInspectionBanner';
import { ScrollToTop } from './components/common/ScrollToTop';
import { adminSheetService } from './services/adminSheetService';
import { authService } from './services/auth';
import { ROUTES } from './utils/constants';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isPortalLocked, blockedInfo } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <LoadingState message="Verifying student authorization..." />
      </div>
    );
  }

  const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
  const isAdmin = adminSheetService.isAdminAuthenticated();

  // If portal is locked and user is not an administrator / inspecting, redirect to login
  if (isPortalLocked && !isInspecting && !isAdmin) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // If student is blocked and no modal is open, sign out immediately
  if (!isInspecting && !isAdmin && !blockedInfo) {
    const student = authService.getCurrentStudent();
    if (student) {
      const blocked = adminSheetService.checkIfStudentIsBlocked([
        student.student_id,
        student.usn,
        student.college_email,
        student.personal_email,
        student.google_email,
      ]);
      if (blocked) {
        const reasonMsg = blocked.reason
          ? `Your account (${blocked.userId}) has been blocked by administrator: "${blocked.reason}".`
          : `Your account (${blocked.userId}) has been blocked by administrator.`;
        try {
          sessionStorage.setItem('student_portal_blocked_reason', reasonMsg);
        } catch {}
        authService.logout();
        return <Navigate to={ROUTES.LOGIN} replace />;
      }
    }
  }

  if (!isAuthenticated && !blockedInfo) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (prevents logged in users from seeing login again)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, isPortalLocked } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <LoadingState message="Loading portal..." />
      </div>
    );
  }

  const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
  const isAdmin = adminSheetService.isAdminAuthenticated();

  if (isAuthenticated && (!isPortalLocked || isInspecting || isAdmin)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

// Global Blocked User Handler Component
const GlobalBlockedUserHandler: React.FC = () => {
  const { blockedInfo, dismissBlockedAndLogout } = useAuth();
  const [countdown, setCountdown] = React.useState(5);
  const dismissRef = React.useRef(dismissBlockedAndLogout);
  dismissRef.current = dismissBlockedAndLogout;

  React.useEffect(() => {
    if (!blockedInfo) {
      setCountdown(5);
      return;
    }

    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dismissRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [blockedInfo?.userId]);

  return (
    <BlockedAccountModal
      isOpen={Boolean(blockedInfo)}
      blockedUser={blockedInfo?.userId}
      studentName={blockedInfo?.studentName}
      reason={blockedInfo?.reason}
      secondsRemaining={countdown}
      onAcknowledge={dismissBlockedAndLogout}
    />
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Global Blocked User Alert Modal */}
        <GlobalBlockedUserHandler />

        {/* Interactive Google Stitch Glowing Grid Background */}
        <InteractiveGridBackground />

        {/* Content Layer */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <BrowserRouter>
            {/* Automatically scroll to top on every page / route change */}
            <ScrollToTop />

            {/* Admin Inspection Banner: Displays Back to Admin Dashboard button */}
            <AdminInspectionBanner />

            <div className="flex-1 flex flex-col">
              <Routes>
                {/* Public Routes */}
                <Route
                  path={ROUTES.LOGIN}
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route path={ROUTES.TERMS} element={<TermsPage />} />
                <Route path={ROUTES.ADMIN} element={<AdminPortalPage />} />

                {/* Protected Routes */}
                <Route
                  path={ROUTES.DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.MARKS}
                  element={
                    <ProtectedRoute>
                      <MarksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.PROFILE}
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ATTENDANCE}
                  element={
                    <ProtectedRoute>
                      <AttendancePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.EXAM_DATES}
                  element={
                    <ProtectedRoute>
                      <ExamDatesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.TIMETABLE}
                  element={
                    <ProtectedRoute>
                      <TimetablePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.SEMESTER_DATA}
                  element={
                    <ProtectedRoute>
                      <SemesterDataPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.NOTICES}
                  element={
                    <ProtectedRoute>
                      <NoticesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.STATEMENT}
                  element={
                    <ProtectedRoute>
                      <StatementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default Redirection */}
                <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
                <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
              </Routes>
            </div>

            {/* Global Developer Attribution Footer Centered on All Pages */}
            <Footer />

            {/* Mobile Navigation Bar */}
            <BottomNav />
          </BrowserRouter>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
