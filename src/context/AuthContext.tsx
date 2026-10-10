import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, Student } from '../types/auth';
import { authService } from '../services/auth';
import { adminSheetService } from '../services/adminSheetService';
import { PortalSettings } from '../types/admin';

interface AuthContextType extends AuthState {
  loginWithGoogle: (credential: string, emailHint?: string, profilePictureUrl?: string) => Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  loginAsStudent: (student: Student) => void;
  logout: (msg?: string) => void;
  clearError: () => void;
  updateUser: (updatedData: Partial<Student>) => void;
  isPortalLocked: boolean;
  lockReason: string | null;
  checkPortalLock: (force?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const checkPortalLock = async (force = false): Promise<boolean> => {
    try {
      const settings = await adminSheetService.fetchLiveSettings(force);
      setIsPortalLocked(settings.is_locked);
      setLockReason(settings.lock_reason || null);

      const isInspecting = localStorage.getItem('student_portal_admin_inspecting') === 'true';
      const isAdmin = adminSheetService.isAdminAuthenticated();

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
        }
      }
      return settings.is_locked;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Initial fetch of live settings on load
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
        }
      }
    };

    window.addEventListener('portal_settings_changed', handlePortalSettingsChanged);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'student_portal_admin_settings') {
        checkPortalLock(false);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('portal_settings_changed', handlePortalSettingsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    try {
      const student = authService.getCurrentStudent();
      const token = authService.getToken();

      if (student && token) {
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

    if (authService.isSessionExpired()) {
      logout();
      return;
    }

    const remainingTime = authService.getRemainingSessionTime();

    // Trigger logout when 30 minutes expire
    const timer = setTimeout(() => {
      logout();
    }, remainingTime);

    // Periodic check (every 10s) in case setTimeout was throttled/paused (e.g., laptop sleep/hibernation)
    const interval = setInterval(() => {
      if (authService.isSessionExpired()) {
        logout();
      } else {
        checkPortalLock(false);
      }
    }, 10000);

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
  }, [state.isAuthenticated]);

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
