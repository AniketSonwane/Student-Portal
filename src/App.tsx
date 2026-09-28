import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { MarksPage } from './pages/Marks/MarksPage';
import { StatementPage } from './pages/Statement/StatementPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { AttendancePage } from './pages/Attendance/AttendancePage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { TermsPage } from './pages/Terms/TermsPage';
import { AdminPortalPage } from './pages/Admin/AdminPortalPage';
import { LoadingState } from './components/common/LoadingState';
import { InteractiveGridBackground } from './components/common/InteractiveGridBackground';
import { BottomNav } from './components/layout/BottomNav';
import { Footer } from './components/layout/Footer';
import { AdminInspectionBanner } from './components/layout/AdminInspectionBanner';
import { ScrollToTop } from './components/common/ScrollToTop';
import { ROUTES } from './utils/constants';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <LoadingState message="Verifying student authorization..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (prevents logged in users from seeing login again)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <LoadingState message="Loading portal..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Interactive Google Stitch Glowing Grid Background */}
        <InteractiveGridBackground />

        {/* Content Layer */}
        <div className="relative z-10 min-h-screen flex flex-col justify-between">
          <BrowserRouter>
            {/* Automatically scroll to top on every page / route change */}
            <ScrollToTop />

            {/* Admin Inspection Banner: Displays Back to Admin Dashboard button */}
            <AdminInspectionBanner />

            <div className="flex-1">
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
