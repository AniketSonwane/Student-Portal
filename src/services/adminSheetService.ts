import { LoginLog, ChangeRequest, PortalSettings, AdminStats } from '../types/admin';
import { profileService } from './profile';
import { cleanupUnnecessaryStorage } from '../utils/cleanStorage';
import { TIMETABLE_SPREADSHEET_ID, EXAM_DATES_SPREADSHEET_ID } from '../config/sheetsConfig';

const STORAGE_KEYS = {
  LOGS: 'student_portal_admin_logs',
  REQUESTS: 'student_portal_admin_change_requests',
  SETTINGS: 'student_portal_admin_settings',
  ADMIN_AUTH: 'student_portal_admin_authenticated',
  SHEET_URL: 'student_portal_admin_sheet_url',
};


export const adminSheetService = {
  /**
   * Get configured Google Apps Script Web App URL for Dashboard Login & Audit Logging
   */
  getScriptUrl(): string {
    const envUrl =
      (import.meta.env.VITE_GOOGLE_SHEETS_ADMIN_API_URL as string) ||
      (import.meta.env.VITE_ADMIN_SHEET_URL as string) ||
      '';
    const stored = localStorage.getItem(STORAGE_KEYS.SHEET_URL);
    if (stored && !stored.startsWith('https://script.google.com')) {
      localStorage.removeItem(STORAGE_KEYS.SHEET_URL);
      return envUrl;
    }
    return stored || envUrl;
  },

  /**
   * Get configured Timetable Apps Script Web App URL
   */
  getTimetableScriptUrl(): string {
    const envUrl =
      (import.meta.env.VITE_GOOGLE_SHEETS_TIMETABLE_API_URL as string) || '';
    const stored = localStorage.getItem('student_portal_timetable_sheet_url');
    if (stored && !stored.startsWith('https://script.google.com')) {
      localStorage.removeItem('student_portal_timetable_sheet_url');
      return envUrl;
    }
    return stored || envUrl;
  },

  /**
   * Get configured Exam Dates Apps Script Web App URL
   */
  getExamDatesScriptUrl(): string {
    const envUrl =
      (import.meta.env.VITE_GOOGLE_SHEETS_EXAM_DATES_API_URL as string) || '';
    const stored = localStorage.getItem('student_portal_exam_dates_sheet_url');
    if (stored && !stored.startsWith('https://script.google.com')) {
      localStorage.removeItem('student_portal_exam_dates_sheet_url');
      return envUrl;
    }
    return stored || envUrl;
  },

  /**
   * Set Google Apps Script Web App URL
   */
  setScriptUrl(url: string) {
    if (!url || !url.trim() || !url.startsWith('https://script.google.com')) {
      localStorage.removeItem(STORAGE_KEYS.SHEET_URL);
    } else {
      localStorage.setItem(STORAGE_KEYS.SHEET_URL, url.trim());
    }
  },

  /**
   * Check if Admin is currently authenticated in this browser session
   */
  isAdminAuthenticated(): boolean {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  },

  /**
   * Set Admin session authentication
   */
  setAdminAuthenticated(val: boolean, adminUser?: { email: string; name?: string; picture?: string }) {
    if (val) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      if (adminUser) {
        localStorage.setItem('student_portal_admin_user', JSON.stringify(adminUser));
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
      localStorage.removeItem('student_portal_admin_user');
    }
  },

  /**
   * Get authenticated Admin user details
   */
  getAdminUser(): { email: string; name?: string; picture?: string } | null {
    try {
      const raw = localStorage.getItem('student_portal_admin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if an email is authorized to access the Admin Portal
   */
  isAuthorizedAdminEmail(email: string): boolean {
    const raw = (email || '').toLowerCase().trim();
    if (!raw) return false;
    const allowed: string[] = [];
    const envAdmin = (import.meta.env.VITE_ADMIN_EMAIL as string) || '';
    if (envAdmin) allowed.push(envAdmin.toLowerCase().trim());
    const envAdminList = (import.meta.env.VITE_ADMIN_EMAILS as string) || '';
    if (envAdminList) {
      envAdminList.split(',').forEach((e) => allowed.push(e.trim().toLowerCase()));
    }
    return allowed.includes(raw);
  },



  _cachedLogs: [] as LoginLog[],

  /**
   * Retrieve all Login Logs (in-memory, direct synced with Google Sheet, no localStorage)
   */
  getLogs(): LoginLog[] {
    // Purge any legacy logs from localStorage
    if (localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
    }
    return this._cachedLogs || [];
  },

  /**
   * Fetch live data directly from Google Apps Script Web App
   */
  async fetchLiveFromSheet(): Promise<{
    success: boolean;
    logs: LoginLog[];
    requests: ChangeRequest[];
    settings: PortalSettings;
    error?: string;
  }> {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      return {
        success: false,
        logs: this.getLogs(),
        requests: this.getChangeRequests(),
        settings: this.getPortalSettings(),
        error: 'No Google Apps Script URL configured.',
      };
    }

    try {
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Invalid API response format');
      }

      const rawData = json.data;

      // 1. Parse Logs from sheet
      let parsedLogs: LoginLog[] = [];
      if (Array.isArray(rawData.logs) && rawData.logs.length > 1) {
        for (let i = 1; i < rawData.logs.length; i++) {
          const row = rawData.logs[i];
          if (!row || !row[0]) continue;
          const rawStatus = String(row[5] || '').toUpperCase();
          parsedLogs.push({
            id: String(row[0]),
            timestamp: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
            student_name: String(row[2] || 'Unknown User'),
            usn: String(row[3] || 'N/A'),
            email: String(row[4] || ''),
            status:
              rawStatus === 'DENIED' || rawStatus === 'BLOCKED'
                ? (rawStatus as any)
                : 'SUCCESS',
            device: String(row[6] || 'Web Browser'),
            reason: String(row[7] || ''),
          });
        }
        parsedLogs.reverse();
      }

      // Filter out demo seed logs and admin actions, but KEEP all real successful, denied, and unknown student logins!
      parsedLogs = parsedLogs.filter(
        (l) =>
          !l.id.startsWith('log-10') &&
          !l.id.startsWith('test-') &&
          !this.isAuthorizedAdminEmail(l.email) &&
          !l.reason?.includes('Admin')
      );

      // Keep directly in-memory cache, do NOT store logs in localStorage
      this._cachedLogs = parsedLogs;
      localStorage.removeItem(STORAGE_KEYS.LOGS);

      // 2. Parse Change Requests from sheet
      let parsedRequests: ChangeRequest[] = [];
      if (Array.isArray(rawData.requests) && rawData.requests.length > 1) {
        for (let i = 1; i < rawData.requests.length; i++) {
          const row = rawData.requests[i];
          if (!row || !row[0]) continue;
          parsedRequests.push({
            id: String(row[0]),
            submitted_at: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
            student_usn: String(row[2] || ''),
            student_name: String(row[3] || ''),
            field_name: String(row[4] || ''),
            old_value: String(row[5] || ''),
            new_value: String(row[6] || ''),
            reason: String(row[7] || ''),
            status: (String(row[8] || 'PENDING').toUpperCase() as any),
          });
        }
        parsedRequests.reverse();
      }

      // Always store sheet requests (and filter any demo requests)
      parsedRequests = parsedRequests.filter((r) => !r.id.startsWith('req-0'));
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(parsedRequests));

      // 3. Parse Settings from sheet
      const currentSettings = this.getPortalSettings();
      if (Array.isArray(rawData.settings) && rawData.settings.length > 0) {
        for (const row of rawData.settings) {
          if (!row || !row[0]) continue;
          const key = String(row[0]).trim().toLowerCase();
          const val = row[1];
          if (key === 'is_locked') {
            currentSettings.is_locked = val === true || String(val).toUpperCase() === 'TRUE';
          }
          if (key === 'lock_reason' && val !== undefined) {
            currentSettings.lock_reason = String(val);
          }
        }
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(currentSettings));
        this._lastSettingsFetch = Date.now();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portal_settings_changed', { detail: currentSettings }));
        }
      }

      return {
        success: true,
        logs: parsedLogs,
        requests: parsedRequests,
        settings: currentSettings,
      };
    } catch (err: any) {
      console.warn('Live Google Sheet fetch failed, falling back to local cache:', err);
      return {
        success: false,
        logs: this.getLogs(),
        requests: this.getChangeRequests(),
        settings: this.getPortalSettings(),
        error: err?.message || 'Failed to fetch from Google Sheet',
      };
    }
  },

  /**
   * Record a new student login event (directly synced to Google Sheet, no localStorage)
   */
  async recordLog(data: {
    email: string;
    student_name?: string;
    usn?: string;
    status: 'SUCCESS' | 'DENIED' | 'BLOCKED';
    reason?: string;
  }): Promise<LoginLog | null> {
    // NEVER record logs for administrator or admin inspection actions
    if (this.isAuthorizedAdminEmail(data.email) || (data.reason && data.reason.includes('Admin'))) {
      return null;
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let device = 'Web Browser';
    if (userAgent.includes('Mobile')) device = 'Mobile Device';
    else if (userAgent.includes('Macintosh')) device = 'macOS';
    else if (userAgent.includes('Windows')) device = 'Windows PC';
    else if (userAgent.includes('Linux')) device = 'Linux PC';

    const newLog: LoginLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      student_name: data.student_name || 'Unknown User',
      email: data.email,
      usn: data.usn || 'N/A',
      status: data.status,
      device,
      reason: data.reason || (data.status === 'DENIED' ? 'Unauthorized email account' : ''),
    };

    // Update in-memory cache
    if (!this._cachedLogs) this._cachedLogs = [];
    this._cachedLogs.unshift(newLog);

    // Keep localStorage free of login logs
    localStorage.removeItem(STORAGE_KEYS.LOGS);

    // Directly sync log to Google Apps Script Web App in the background (fire-and-forget)
    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ADD_LOG',
          log: newLog,
        }),
      }).catch((err) => {
        console.warn('Could not sync log to Google Sheet Web App:', err);
      });
    }

    return newLog;
  },

  /**
   * Clear all login logs (admin action)
   */
  clearLogs() {
    this._cachedLogs = [];
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  },

  /**
   * Retrieve all Change Requests (filtering legacy demo requests)
   */
  getChangeRequests(): ChangeRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!raw) return [];
    try {
      const parsed: ChangeRequest[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((r) => !r.id.startsWith('req-0'));
    } catch {
      return [];
    }
  },

  /**
   * Purge all unnecessary and demo items from browser localStorage immediately
   */
  purgeDemoData() {
    cleanupUnnecessaryStorage();
  },

  /**
   * Submit a student change request
   */
  async submitChangeRequest(data: {
    student_usn: string;
    student_name: string;
    field_name: string;
    old_value: string;
    new_value: string;
    reason?: string;
  }): Promise<ChangeRequest> {
    const safeNewValue =
      data.new_value.startsWith('+') || data.new_value.startsWith('=')
        ? `'${data.new_value}`
        : data.new_value;
    const safeOldValue =
      data.old_value && (data.old_value.startsWith('+') || data.old_value.startsWith('='))
        ? `'${data.old_value}`
        : data.old_value;

    const newReq: ChangeRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      submitted_at: new Date().toISOString(),
      status: 'PENDING',
      ...data,
      old_value: safeOldValue,
      new_value: safeNewValue,
    };

    const list = this.getChangeRequests();
    list.unshift(newReq);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));

    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'ADD_REQUEST',
            request: newReq,
          }),
        });
      } catch (err) {
        console.warn('Could not sync request to Google Sheet:', err);
      }
    }

    return newReq;
  },

  /**
   * Update Change Request Status (Approve / Reject)
   */
  async updateChangeRequestStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    admin_note?: string
  ): Promise<boolean> {
    const list = this.getChangeRequests();
    const req = list.find((r) => r.id === id);
    if (!req) return false;

    req.status = status;
    if (admin_note) req.admin_note = admin_note;
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));

    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'UPDATE_REQUEST',
            id,
            status,
            admin_note,
          }),
        });
      } catch (err) {
        console.warn('Could not sync update to Google Sheet:', err);
      }
    }

    return true;
  },

  /**
   * Sync newly added exam date to Google Apps Script Web App
   */
  async addExamDateToSheet(exam: any): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = this.getExamDatesScriptUrl();
    if (!scriptUrl) return { success: false, error: 'Google Apps Script Web App URL is not configured' };
    const payload = {
      action: 'ADD_EXAM_DATE',
      spreadsheetId: EXAM_DATES_SPREADSHEET_ID,
      exam,
    };
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: json.success !== false, error: json.error };
      }
      return { success: true };
    } catch (err: any) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      } catch (fallbackErr: any) {
        console.warn('Could not sync exam date to Google Sheet:', fallbackErr);
        return { success: false, error: fallbackErr.message };
      }
    }
  },

  /**
   * Delete exam date from Google Apps Script Web App
   */
  async deleteExamDateFromSheet(id: string, exam?: any): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = this.getExamDatesScriptUrl();
    if (!scriptUrl) return { success: false, error: 'Google Apps Script Web App URL is not configured' };
    const payload = {
      action: 'DELETE_EXAM_DATE',
      spreadsheetId: EXAM_DATES_SPREADSHEET_ID,
      examId: id,
      subjectCode: exam?.subjectCode,
      semester: exam?.semester,
      date: exam?.date,
    };
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: json.success !== false, error: json.error };
      }
      return { success: true };
    } catch {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr.message };
      }
    }
  },

  /**
   * Sync updated timetable schedule to Google Apps Script Web App
   */
  async saveTimetableToSheet(semester: number, schedule: any[]): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = this.getTimetableScriptUrl();
    if (!scriptUrl) return { success: false, error: 'Google Apps Script Web App URL is not configured' };
    const payload = {
      action: 'SAVE_TIMETABLE',
      semester,
      spreadsheetId: TIMETABLE_SPREADSHEET_ID,
      schedule,
    };
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: json.success !== false, error: json.error };
      }
      return { success: true };
    } catch (err: any) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      } catch (fallbackErr: any) {
        console.warn('Could not sync timetable to Google Sheet:', fallbackErr);
        return { success: false, error: fallbackErr.message };
      }
    }
  },

  _lastSettingsFetch: 0,

  /**
   * Fetch live portal settings directly from Google Apps Script Web App
   */
  async fetchLiveSettings(forceRefresh = false): Promise<PortalSettings> {
    const cached = this.getPortalSettings();
    const now = Date.now();
    // Cache for 60 seconds unless forced
    if (!forceRefresh && this._lastSettingsFetch && now - this._lastSettingsFetch < 60000) {
      return cached;
    }

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) return cached;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(scriptUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return cached;
      const json = await response.json();
      if (!json.success || !json.data || !json.data.settings) return cached;

      const rawSettings = json.data.settings;
      if (Array.isArray(rawSettings) && rawSettings.length > 0) {
        for (const row of rawSettings) {
          if (!row || !row[0]) continue;
          const key = String(row[0]).trim().toLowerCase();
          const val = row[1];
          if (key === 'is_locked') {
            cached.is_locked = val === true || String(val).toUpperCase() === 'TRUE';
          }
          if (key === 'lock_reason' && val !== undefined) {
            cached.lock_reason = String(val);
          }
        }
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cached));
        this._lastSettingsFetch = now;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portal_settings_changed', { detail: cached }));
        }
      }
      return cached;
    } catch (err) {
      console.warn('Could not fetch live settings from Google Sheet:', err);
      return cached;
    }
  },

  /**
   * Retrieve Portal Settings (Lock status, maintenance message)
   */
  getPortalSettings(): PortalSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const envAdmin = (import.meta.env.VITE_ADMIN_EMAIL as string) || '';
    const envAdminList = (import.meta.env.VITE_ADMIN_EMAILS as string) || '';
    const configuredAdmins: string[] = [
      ...(envAdmin ? [envAdmin.toLowerCase().trim()] : []),
      ...(envAdminList ? envAdminList.split(',').map((e) => e.trim().toLowerCase()) : []),
    ];

    if (!raw) {
      const defaultSettings: PortalSettings = {
        is_locked: false,
        lock_reason: 'System maintenance and grade synchronisation in progress.',
        allowed_admin_emails: configuredAdmins,
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {
        is_locked: false,
        lock_reason: 'System maintenance in progress.',
        allowed_admin_emails: configuredAdmins,
      };
    }
  },

  /**
   * Toggle or update Portal Lock
   */
  async setPortalLock(locked: boolean, reason?: string): Promise<PortalSettings> {
    const current = this.getPortalSettings();
    current.is_locked = locked;
    if (reason !== undefined) current.lock_reason = reason;
    if (locked) {
      current.locked_at = new Date().toISOString();
      current.locked_by = 'Administrator';
    } else {
      current.locked_at = undefined;
    }

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(current));
    this._lastSettingsFetch = Date.now();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portal_settings_changed', { detail: current }));
    }

    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SET_LOCK',
            is_locked: locked,
            lock_reason: current.lock_reason,
            locked_at: current.locked_at,
          }),
        });
      } catch (err) {
        console.warn('Could not sync lock status to Google Sheet:', err);
      }
    }

    return current;
  },

  /**
   * Calculate aggregated Admin Dashboard stats
   */
  getAdminStats(passedLogs?: LoginLog[]): AdminStats {
    const logs = passedLogs || this.getLogs();
    const requests = this.getChangeRequests();
    const settings = this.getPortalSettings();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.timestamp.startsWith(todayStr));
    const successfulLogins = logs.filter((l) => l.status === 'SUCCESS').length;
    const deniedLogins = logs.filter((l) => l.status === 'DENIED' || l.status === 'BLOCKED').length;
    const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

    return {
      total_logins: logs.length,
      today_logins: todayLogs.length,
      successful_logins: successfulLogins,
      denied_logins: deniedLogins,
      current_students_count: profileService.getAllLocal().length,
      pending_change_requests: pendingRequests,
      is_portal_locked: settings.is_locked,
    };
  },

  /**
   * Export logs as CSV format string
   */
  exportLogsCSV(passedLogs?: LoginLog[]): string {
    const logs = passedLogs || this.getLogs();
    const headers = ['ID', 'Timestamp', 'Student Name', 'USN', 'Email', 'Status', 'Device', 'Reason'];
    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.student_name}"`,
      `"${l.usn}"`,
      `"${l.email}"`,
      `"${l.status}"`,
      `"${l.device || ''}"`,
      `"${l.reason || ''}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
