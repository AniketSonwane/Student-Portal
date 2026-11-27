import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthState, Student } from '../types/auth';
import { authService } from '../services/auth';
import { adminSheetService } from '../services/adminSheetService';
import { BlockedUser, PortalSettings } from '../types/admin';
import { ROUTES } from '../utils/constants';

export interface BlockedSessionInfo {
  userId: string;
  studentName?: string;
  reason?: string;
}

interface AuthContextType extends AuthState {
  loginWithGoogle: (credential: string, emailHint?: string, profilePictureUrl?: string) => Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  loginAsStudent: (student: Student) => void;
  logout: (msg?: string) => void;
  clearError: () => void;
  updateUser: (updatedData: Partial<Student>) => void;
  isPortalLocked: boolean;
  lockReason: string | null;
  checkPortalLock: (force?: boolean) => Promise<boolean>;
  blockedInfo: BlockedSessionInfo | null;
  dismissBlockedAndLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatBlockedReasonMessage(blocked: BlockedUser): string {
  return blocked.reason
    ? `Your account (${blocked.userId}) has been blocked by administrator: "${blocked.reason}".`
    : `Your account (${blocked.userId}) has been blocked by administrator.`;
}

function getStudentBlockEntry(student: Student | null): BlockedUser | null {
  if (!student) return null;
  return adminSheetService.checkIfStudentIsBlocked([
    student.student_id,
    student.usn,
    student.college_email,
    student.personal_email,
    student.google_email,
  ]);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [isPortalLocked, setIsPortalLocked] = useState<boolean>(() => {
    return adminSheetService.getPortalSettings().is_locked;
  });
  const [lockReason, setLockReason] = useState<string | null>(() => {
    return adminSheetService.getPortalSettings().lock_reason || null;
  });
  const [blockedInfo, setBlockedInfo] = useState<BlockedSessionInfo | null>(null);

  const triggerBlockedPopup = useCallback((blocked: BlockedUser, student: Student) => {
    const reasonMsg = formatBlockedReasonMessage(blocked);
    try {
      sessionStorage.setItem('student_portal_blocked_reason', reasonMsg);
    } catch {}

    setBlockedInfo((prev) => {
      if (prev && prev.userId === blocked.userId) return prev;
      return {
        userId: blocked.userId,
        studentName: student.name,
        reason: blocked.reason || 'Blocked by administrator',
      };
    });
  }, []);

  const dismissBlockedAndLogout = useCallback(() => {
    const reason =
      blockedInfo?.reason
        ? `Your account (${blockedInfo.userId}) has been blocked by administrator: "${blockedInfo.reason}".`
        : sessionStorage.getItem('student_portal_blocked_reason') ||
          'Your account has been blocked by administrator.';
    try {
      sessionStorage.setItem('student_portal_blocked_reason', reason);
    } catch {}

    setBlockedInfo(null);
    authService.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: reason,
    });

    if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.LOGIN) {
      window.location.replace(ROUTES.LOGIN);
    }
  }, [blockedInfo]);

  const checkPortalLock = async (force = false): Promise<boolean> => {
    try {
      const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
      const isAdmin = adminSheetService.isAdminAuthenticated();
      const onAdminRoute = typeof window !== 'undefined' && window.location.pathname === ROUTES.ADMIN;
      const activeStudent = authService.getCurrentStudent();
      const shouldCheckBlocked = Boolean(activeStudent && !isInspecting && !onAdminRoute);

      const [settings] = await Promise.all([
        adminSheetService.fetchLiveSettings(force),
        shouldCheckBlocked ? adminSheetService.fetchBlockedUsers(force) : Promise.resolve(null),
      ]);
      setIsPortalLocked(settings.is_locked);
      setLockReason(settings.lock_reason || null);

      if (settings.is_locked && !isInspecting && !isAdmin) {
        const student = authService.getCurrentStudent();
        if (student) {
          authService.logout();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: settings.lock_reason || 'The portal is currently locked for maintenance by the administrator.',
          });
          if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.LOGIN) {
            window.location.href = ROUTES.LOGIN;
          }
        }
      }

      if (shouldCheckBlocked) {
        const student = authService.getCurrentStudent();
        const blocked = getStudentBlockEntry(student);
        if (blocked && student) {
          triggerBlockedPopup(blocked, student);
          return true;
        }
      }
      return settings.is_locked;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Initial fetch of live settings and blocked status on load
    checkPortalLock(true);

    const handlePortalSettingsChanged = (e: Event) => {
      const customEvt = e as CustomEvent<PortalSettings>;
      if (customEvt.detail) {
        setIsPortalLocked(customEvt.detail.is_locked);
        setLockReason(customEvt.detail.lock_reason || null);
        const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
        const isAdmin = adminSheetService.isAdminAuthenticated();
        if (customEvt.detail.is_locked && !isInspecting && !isAdmin && authService.getCurrentStudent()) {
          authService.logout();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: customEvt.detail.lock_reason || 'The portal is currently locked for maintenance by the administrator.',
          });
          if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.LOGIN) {
            window.location.replace(ROUTES.LOGIN);
          }
        }
      }
    };

    const evaluateLocalBlockState = () => {
      const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
      const onAdminRoute = typeof window !== 'undefined' && window.location.pathname === ROUTES.ADMIN;
      if (isInspecting || onAdminRoute) return;
      const student = authService.getCurrentStudent();
      const blocked = getStudentBlockEntry(student);
      if (blocked && student) {
        triggerBlockedPopup(blocked, student);
      }
    };

    window.addEventListener('portal_settings_changed', handlePortalSettingsChanged);
    window.addEventListener('portal_blocked_users_changed', evaluateLocalBlockState);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'student_portal_admin_settings') {
        checkPortalLock(false);
      } else if (e.key === 'student_portal_admin_blocked_users') {
        adminSheetService._cachedBlockedUsers = null;
        evaluateLocalBlockState();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Periodic live lock and block check every 3 seconds for real-time enforcement
    const lockTimer = setInterval(() => {
      checkPortalLock(true);
    }, 3000);

    return () => {
      clearInterval(lockTimer);
      window.removeEventListener('portal_settings_changed', handlePortalSettingsChanged);
      window.removeEventListener('portal_blocked_users_changed', evaluateLocalBlockState);
      window.removeEventListener('storage', handleStorage);
    };
  }, [triggerBlockedPopup]);

  useEffect(() => {
    try {
      const student = authService.getCurrentStudent();
      const token = authService.getToken();

      if (student && token) {
        const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
        const isAdmin = adminSheetService.isAdminAuthenticated();

        if (!isInspecting && !isAdmin) {
          const blocked = getStudentBlockEntry(student);
          if (blocked) {
            const reasonMsg = formatBlockedReasonMessage(blocked);
            try {
              sessionStorage.setItem('student_portal_blocked_reason', reasonMsg);
            } catch {}
            authService.logout();
            setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: reasonMsg,
            });
            if (typeof window !== 'undefined' && window.location.pathname !== ROUTES.LOGIN) {
              window.location.replace(ROUTES.LOGIN);
            }
            return;
          }
        }

        // If an active session exists without an explicit login timestamp, initialize it now
        if (!authService.getLoginTime()) {
          authService.setLoginTime();
        }

        if (!authService.isSessionExpired()) {
          setState({
            user: student,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          // Session expired after 30 minutes
          authService.logout();
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loginAsStudent = (student: Student) => {
    const token = `admin_inspect_${student.student_id}_${Date.now()}`;
    localStorage.setItem('student_portal_token', token);
    localStorage.setItem('student_portal_user', JSON.stringify(student));
    localStorage.setItem('student_portal_admin_inspecting', 'true');
    authService.setLoginTime();
    setState({
      user: student,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  };

  const loginWithGoogle = async (credential: string, emailHint?: string, profilePictureUrl?: string): Promise<{ success: boolean; isAdmin?: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await authService.loginWithGoogle(credential, emailHint, profilePictureUrl);

      if (result.isAdmin) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return { success: true, isAdmin: true };
      }

      if (result.success && result.data) {
        setState({
          user: result.data.student,
          token: result.data.token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return { success: true };
      } else {
        const errorMsg = result.error?.message || 'Login failed. Please verify your credentials.';
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: errorMsg,
        });
        return { success: false, error: errorMsg };
      }
    } catch {
      const errorMsg = 'An unexpected error occurred during authentication.';
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMsg,
      });
      return { success: false, error: errorMsg };
    }
  };

  const logout = (msg?: string) => {
    authService.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: msg || null,
    });
  };

  // 30-minute Session timeout management
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Only primary admin session configured in environment never expires; student sessions expire after 30 minutes
    if (authService.isTimeoutExempt()) {
      // Still check portal lock periodically, but no session timeout
      const interval = setInterval(() => {
        checkPortalLock(false);
      }, 10000);
      return () => clearInterval(interval);
    }

    if (authService.isSessionExpired()) {
      logout();
      return;
    }

    const remainingTime = authService.getRemainingSessionTime();

    // Trigger logout when 30 minutes expire
    const timer = setTimeout(() => {
      logout();
    }, remainingTime);

    // Periodic check (every 3s) for session expiry (portal lock & block checks run on the primary timer)
    const interval = setInterval(() => {
      if (authService.isSessionExpired()) {
        logout();
      }
    }, 3000);

    // Immediate check on tab visibility change or window focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (authService.isSessionExpired()) {
          logout();
        } else {
          checkPortalLock(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [state.isAuthenticated, state.user]);

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const updateUser = (updatedData: Partial<Student>) => {
    const updated = authService.updateCurrentStudent(updatedData);
    if (updated) {
      setState((prev) => ({ ...prev, user: updated }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        loginWithGoogle,
        loginAsStudent,
        logout,
        clearError,
        updateUser,
        isPortalLocked,
        lockReason,
        checkPortalLock,
        blockedInfo,
        dismissBlockedAndLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
