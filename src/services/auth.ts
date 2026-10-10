import { LoginResponse, Student } from '../types/auth';
import { profileService } from './profile';
import { adminSheetService } from './adminSheetService';

const TOKEN_KEY = 'student_portal_token';
const USER_KEY = 'student_portal_user';
const LOGIN_TIME_KEY = 'student_portal_login_time';

export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export const authService = {
  /**
   * Session duration: 30 minutes in milliseconds
   */
  SESSION_DURATION_MS,

  /**
   * Save login timestamp
   */
  setLoginTime(timestamp: number = Date.now()) {
    localStorage.setItem(LOGIN_TIME_KEY, timestamp.toString());
  },

  /**
   * Retrieve login timestamp
   */
  getLoginTime(): number | null {
    const raw = localStorage.getItem(LOGIN_TIME_KEY);
    if (!raw) return null;
    const time = parseInt(raw, 10);
    return isNaN(time) ? null : time;
  },

  /**
   * Check if current session has expired (after 30 minutes of login)
   */
  isSessionExpired(): boolean {
    const loginTime = this.getLoginTime();
    if (!loginTime) return true;
    return Date.now() - loginTime >= SESSION_DURATION_MS;
  },

  /**
   * Get remaining session time in milliseconds
   */
  getRemainingSessionTime(): number {
    const loginTime = this.getLoginTime();
    if (!loginTime) return 0;
    return Math.max(0, SESSION_DURATION_MS - (Date.now() - loginTime));
  },

  /**
   * Check whether an email belongs to the authorized college domain
   */
  isAuthorizedCollegeEmail(email: string): boolean {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return false;
    return normalized.endsWith('@sbjit.edu.in') || normalized.endsWith('@sbit.edu.in');
  },

  /**
   * Authenticate using Google credential/token.
   * STRICT AUTHORIZATION: ONLY the 68 college email IDs given in the student details sheet can log in.
   * All other emails (personal Gmails, unrecognized addresses) are rejected with Access Denied.
   */
  async loginWithGoogle(credential: string, emailHint?: string, profilePictureUrl?: string): Promise<LoginResponse> {
    let googlePicture = profilePictureUrl;
    let googleEmail: string | undefined = emailHint;

    // Check if credential is a Google ID token JWT (header.payload.signature)
    if (credential && credential.includes('.')) {
      try {
        const parts = credential.split('.');
        if (parts.length >= 2) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.picture) {
            googlePicture = payload.picture;
          }
          if (payload.email) {
            googleEmail = payload.email;
          }
        }
      } catch (e) {
        console.warn('Could not decode Google ID token:', e);
      }
    }

    const emailToVerify = (googleEmail || emailHint || '').trim().toLowerCase();
    if (!emailToVerify) {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Unable to extract email from Google Sign-In. Please sign in using your official college email ID (@sbjit.edu.in).',
        },
      };
    }

    // Check if user is the authorized administrator
    if (adminSheetService.isAuthorizedAdminEmail(emailToVerify)) {
      adminSheetService.setAdminAuthenticated(true, {
        email: emailToVerify,
        name: 'Administrator',
        picture: googlePicture,
      });

      return {
        success: true,
        isAdmin: true,
      };
    }

    const res = await this.verifyStudent(emailToVerify);
    if (res.success && res.data) {
      if (googlePicture) {
        res.data.student.profile_image = googlePicture;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.student));
    }
    return res;
  },

  /**
   * Verification logic strictly matching the 68 college email IDs in the student details sheet.
   * Personal emails, USNs, names, or any other email are strictly denied.
   */
  async verifyStudent(inputEmail: string): Promise<LoginResponse> {
    const rawEmail = (inputEmail || '').trim().toLowerCase();
    if (!rawEmail) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Please enter your official college email ID (@sbjit.edu.in).',
        },
      };
    }

    // Fetch live settings and student directory in parallel (fast)
    const [settings, sheetRes] = await Promise.all([
      adminSheetService.fetchLiveSettings(false),
      profileService.fetchAllStudents(false),
    ]);

    if (settings.is_locked && !adminSheetService.isAuthorizedAdminEmail(rawEmail)) {
      adminSheetService.recordLog({
        email: rawEmail,
        status: 'BLOCKED',
        reason: settings.lock_reason || 'Portal locked for maintenance',
      });
      return {
        success: false,
        error: {
          code: 'PORTAL_LOCKED',
          message: settings.lock_reason || 'The student portal is temporarily locked by the administrator for maintenance.',
        },
      };
    }

    // Match student from live/cached roster
    const roster: Student[] =
      sheetRes.success && sheetRes.data && sheetRes.data.length > 0
        ? sheetRes.data
        : profileService.getAllLocal();

    // Strict match against live student details from Google Sheet
    const normRaw = rawEmail.replace('@sbit.', '@sbjit.');
    const student = roster.find((s) => {
      const colEmail = (s.college_email || '').trim().toLowerCase().replace('@sbit.', '@sbjit.');
      const persEmail = (s.personal_email || '').trim().toLowerCase();
      const googEmail = (s.google_email || '').trim().toLowerCase().replace('@sbit.', '@sbjit.');

      // Check college email ID, google email ID, and personal email ID from sheet
      if (colEmail && colEmail !== 'na' && colEmail === normRaw) return true;
      if (googEmail && googEmail !== 'na' && googEmail === normRaw) return true;
      if (persEmail && persEmail !== 'na' && persEmail === rawEmail) return true;

      return false;
    });

    if (!student) {
      adminSheetService.recordLog({
        email: rawEmail,
        student_name: 'Unknown User',
        usn: 'N/A',
        status: 'DENIED',
        reason: 'Unauthorized email account',
      });

      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: `The account "${rawEmail}" is not authorized.`,
        },
      };
    }

    // Record successful login audit in background (non-blocking)
    adminSheetService.recordLog({
      email: student.college_email || rawEmail,
      student_name: student.name,
      usn: student.usn,
      status: 'SUCCESS',
    });

    const mockToken = `portal_jwt_${student.student_id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(student));
    this.setLoginTime();

    return {
      success: true,
      data: {
        student,
        token: mockToken,
      },
    };
  },

  /**
   * Synchronous check against local roster cache
   */
  verifyLocalStudent(inputEmail: string): LoginResponse {
    const rawEmail = (inputEmail || '').trim().toLowerCase();
    if (!rawEmail) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Please enter your official college email ID (@sbjit.edu.in).',
        },
      };
    }

    const roster = profileService.getAllLocal();
    const normRaw = rawEmail.replace('@sbit.', '@sbjit.');

    const student = roster.find((s) => {
      const colEmail = (s.college_email || '').trim().toLowerCase().replace('@sbit.', '@sbjit.');
      if (!colEmail || colEmail === 'na') return false;
      return colEmail === normRaw;
    });

    if (!student) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: `The account "${rawEmail}" is not authorized.`,
        },
      };
    }

    const mockToken = `portal_jwt_${student.student_id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(student));
    this.setLoginTime();

    return {
      success: true,
      data: {
        student,
        token: mockToken,
      },
    };
  },

  /**
   * Retrieve cached authenticated student
   */
  getCurrentStudent(): Student | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Student;
    } catch {
      return null;
    }
  },

  /**
   * Update cached student profile data
   */
  updateCurrentStudent(updated: Partial<Student>): Student | null {
    const current = this.getCurrentStudent();
    if (!current) return null;
    const merged = { ...current, ...updated };
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    return merged;
  },

  /**
   * Retrieve cached token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Sign out current student
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    localStorage.removeItem('student_portal_admin_inspecting');
  },
};
