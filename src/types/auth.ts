export interface Student {
  student_id: string;
  usn: string;
  google_email: string;
  name: string;
  profile_image?: string;
  current_semester: number;
  college_year: string;
  college_email?: string;
  personal_email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  pob?: string;
  address?: string;
  category?: string;
  blood_group?: string;
  age?: number | string;
  cgpa?: string;
  sr_no?: string | number;
  socials?: {
    github?: string;
    instagram?: string;
    leetcode?: string;
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
}

export interface AuthState {
  user: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  success: boolean;
  isAdmin?: boolean;
  data?: {
    student: Student;
    token: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
