import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, Student } from '../types/auth';
import { authService } from '../services/auth';

interface AuthContextType extends AuthState {
  loginWithGoogle: (credential: string, emailHint?: string) => Promise<{ success: boolean; isAdmin?: boolean; error?: string }>;
  loginAsStudent: (student: Student) => void;
  logout: () => void;
  clearError: () => void;
  updateUser: (updatedData: Partial<Student>) => void;
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

  useEffect(() => {
    try {
      const student = authService.getCurrentStudent();
      const token = authService.getToken();

      if (student && token) {
        setState({
          user: student,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
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
    setState({
      user: student,
      token,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  };

  const loginWithGoogle = async (credential: string, emailHint?: string): Promise<{ success: boolean; isAdmin?: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await authService.loginWithGoogle(credential, emailHint);

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

  const logout = () => {
    authService.logout();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  };

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
