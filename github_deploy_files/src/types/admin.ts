export interface LoginLog {
  id: string;
  timestamp: string; // ISO string or formatted date
  student_name: string;
  email: string;
  usn: string;
  status: 'SUCCESS' | 'DENIED' | 'BLOCKED';
  device?: string;
  ip?: string;
  reason?: string;
}

export interface ChangeRequest {
  id: string;
  student_usn: string;
  student_name: string;
  field_name: string; // e.g., 'Phone Number', 'Blood Group', 'Attendance Discrepancy'
  old_value: string;
  new_value: string;
  reason?: string;
  submitted_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note?: string;
}

export interface PortalSettings {
  is_locked: boolean;
  lock_reason?: string;
  locked_at?: string;
  locked_by?: string;
  allowed_admin_emails: string[];
}

export interface AdminStats {
  total_logins: number;
  today_logins: number;
  successful_logins: number;
  denied_logins: number;
  current_students_count: number;
  pending_change_requests: number;
  is_portal_locked: boolean;
}
