import { LoginResponse, Student } from '../types/auth';
import { profileService } from './profile';
import { adminSheetService } from './adminSheetService';
import { AUTHORIZED_STUDENTS_ROSTER, AUTHORIZED_COLLEGE_EMAILS } from '../data/studentsRoster';

const TOKEN_KEY = 'student_portal_token';
const USER_KEY = 'student_portal_user';

export const authService = {
  /**
   * Check whether an email belongs to the 68 authorized college email IDs in the student directory.
   */
  isAuthorizedCollegeEmail(email: string): boolean {
    const normalized = (email || '').trim().toLowerCase();
    if (!normalized) return false;
    if (AUTHORIZED_COLLEGE_EMAILS.has(normalized)) return true;
    // Handle the typo in row 47 of the sheet
    if (normalized === 'shreyan.cse25@sbjit.edu.in' || normalized === 'shreyan.cse25@sbit.edu.in') {
      return true;
    }
    return false;
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

    // Check if user is the authorized administrator (2007aniketsonwane@gmail.com)
    if (adminSheetService.isAuthorizedAdminEmail(emailToVerify)) {
      adminSheetService.setAdminAuthenticated(true, {
        email: emailToVerify,
        name: 'Administrator (Aniket Sonwane)',
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

    // Fetch live roster directly from Google Sheet (with fallback to 68 authorized students)
    let roster = AUTHORIZED_STUDENTS_ROSTER;
    try {
      const sheetRes = await profileService.fetchAllStudents();
      if (sheetRes.success && sheetRes.data && sheetRes.data.length > 0) {
        roster = sheetRes.data;
      }
    } catch {
      roster = AUTHORIZED_STUDENTS_ROSTER;
    }

    // Check if portal is locked by admin
    const settings = adminSheetService.getPortalSettings();
    if (settings.is_locked) {
      await adminSheetService.recordLog({
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

    // Strict match: ONLY the college_email from the student details sheet (68 students)
    const student = roster.find((s) => {
      const colEmail = (s.college_email || '').trim().toLowerCase();
      if (!colEmail || colEmail === 'na') return false;

      if (colEmail === rawEmail) return true;

      // Handle the minor typo in sheet row 47 (sbit.edu.in vs sbjit.edu.in)
      if (
        s.usn === 'CS25176' &&
        (rawEmail === 'shreyan.cse25@sbjit.edu.in' || rawEmail === 'shreyan.cse25@sbit.edu.in')
      ) {
        return true;
      }

      return false;
    });

    if (!student) {
      await adminSheetService.recordLog({
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

    // Record successful login audit
    await adminSheetService.recordLog({
      email: student.college_email || rawEmail,
      student_name: student.name,
      usn: student.usn,
      status: 'SUCCESS',
    });

    const mockToken = `portal_jwt_${student.student_id}_${Date.now()}`;
    localStorage.setItem(TOKEN_KEY, mockToken);
    localStorage.setItem(USER_KEY, JSON.stringify(student));

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

    const roster = profileService.getAllLocal() || AUTHORIZED_STUDENTS_ROSTER;

    const student = roster.find((s) => {
      const colEmail = (s.college_email || '').trim().toLowerCase();
      if (!colEmail || colEmail === 'na') return false;
      if (colEmail === rawEmail) return true;
      if (
        s.usn === 'CS25176' &&
        (rawEmail === 'shreyan.cse25@sbjit.edu.in' || rawEmail === 'shreyan.cse25@sbit.edu.in')
      ) {
        return true;
      }
      return false;
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
    localStorage.removeItem('student_portal_admin_inspecting');
  },
};
