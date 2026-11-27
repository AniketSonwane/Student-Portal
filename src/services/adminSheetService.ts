import { LoginLog, ChangeRequest, PortalSettings, AdminStats, BlockedUser } from '../types/admin';
import { profileService } from './profile';
import { cleanupUnnecessaryStorage } from '../utils/cleanStorage';
import { TIMETABLE_SPREADSHEET_ID, EXAM_DATES_SPREADSHEET_ID, ADMIN_SPREADSHEET_ID } from '../config/sheetsConfig';
import { parseCSV } from './sheetParser';

const STORAGE_KEYS = {
  LOGS: 'student_portal_admin_logs',
  REQUESTS: 'student_portal_admin_change_requests',
  SETTINGS: 'student_portal_admin_settings',
  ADMIN_AUTH: 'student_portal_admin_authenticated',
  SHEET_URL: 'student_portal_admin_sheet_url',
  BLOCKED_USERS: 'student_portal_admin_blocked_users',
  RECENTLY_BLOCKED: 'student_portal_admin_recently_blocked',
  RECENTLY_UNBLOCKED: 'student_portal_admin_recently_unblocked',
};

const RECONCILIATION_TTL_MS = 5 * 60 * 1000;
const BLOCKED_USERS_SHEET_NAMES = ['blocked users', 'Blocked Users', 'BlockedUsers'];
const INVALID_IDENTIFIERS = new Set(['', 'na', 'n/a', 'none', '-', 'null', 'undefined']);

function normalizeIdentifier(val: string): string {
  return val.trim().toLowerCase().replace('@sbit.', '@sbjit.');
}

function isBlockedUsersHeader(row: any[]): boolean {
  if (!row || row.length < 2) return false;
  const c0 = String(row[0] || '').trim().toLowerCase();
  const c1 = String(row[1] || '').trim().toLowerCase();
  const c3 = String(row[3] || '').trim().toLowerCase();
  if (c3 === 'usn') return false;
  return c0 === 'timestamp' && (c1.includes('user') || c1 === 'id' || c1.includes('usn'));
}

function parseBlockedUserRows(rows: any[][], requireHeader: boolean): BlockedUser[] | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return requireHeader ? null : [];
  }
  const hasHeader = isBlockedUsersHeader(rows[0]) ||
    String(rows[0][1] || '').trim().toLowerCase().includes('user');
  if (requireHeader && !isBlockedUsersHeader(rows[0])) {
    return null;
  }

  const startIndex = hasHeader ? 1 : 0;
  const parsed: BlockedUser[] = [];
  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[1]) continue;
    const userId = String(r[1]).trim();
    if (!userId) continue;
    let timestamp = new Date().toISOString();
    if (r[0]) {
      const d = new Date(r[0]);
      if (!isNaN(d.getTime())) timestamp = d.toISOString();
    }
    parsed.push({
      timestamp,
      userId,
      studentName: r[2] ? String(r[2]).trim() : undefined,
      reason: r[3] ? String(r[3]).trim() : undefined,
      blockedBy: r[4] ? String(r[4]).trim() : undefined,
    });
  }
  parsed.reverse();
  return parsed;
}


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
   * Get primary administrator email securely configured in environment
   */
  getPrimaryAdminEmail(): string {
    return ((import.meta.env.VITE_ADMIN_EMAIL as string) || '').toLowerCase().trim();
  },

  /**
   * Check if an email matches the primary administrator configured in environment
   */
  isPrimaryAdminEmail(email: string): boolean {
    const primary = this.getPrimaryAdminEmail();
    if (!primary) return false;
    return (email || '').toLowerCase().trim() === primary;
  },

  /**
   * Check if an email is authorized to access the Admin Portal
   */
  isAuthorizedAdminEmail(email: string): boolean {
    const raw = (email || '').toLowerCase().trim();
    if (!raw) return false;
    const allowed: string[] = [];
    const envAdmin = this.getPrimaryAdminEmail();
    if (envAdmin) allowed.push(envAdmin);
    const envAdminList = (import.meta.env.VITE_ADMIN_EMAILS as string) || '';
    if (envAdminList) {
      envAdminList.split(',').forEach((e) => allowed.push(e.trim().toLowerCase()));
    }
    return allowed.includes(raw);
  },



  _cachedLogs: [] as LoginLog[],
  _deletedRequestIds: new Set<string>(),
  _cachedBlockedUsers: null as BlockedUser[] | null,
  _lastBlockedUsersFetch: 0,

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
   * Fast-path: Fetch administrative activity logs, change requests, and settings directly via GViz CSV
   */
  async fetchFromGviz(): Promise<{
    success: boolean;
    logs: LoginLog[];
    requests: ChangeRequest[];
    settings: PortalSettings;
  } | null> {
    const adminSheetId = ADMIN_SPREADSHEET_ID;
    if (!adminSheetId) return null;

    try {
      const isDev = import.meta.env.DEV;
      const getGvizUrl = (sheet: string) => {
        const extra = sheet === 'Settings' ? '&headers=1' : '';
        const cacheBuster = `&_cb=${Date.now()}`;
        return isDev
          ? `/api/sheets-proxy/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}${extra}${cacheBuster}`
          : `https://docs.google.com/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}${extra}${cacheBuster}`;
      };

      const [logRes, reqRes, setRes] = await Promise.all([
        fetch(getGvizUrl('Logins')).catch(() => null),
        fetch(getGvizUrl('ChangeRequests')).catch(() => null),
        fetch(getGvizUrl('Settings')).catch(() => null),
      ]);

      if (!logRes || !logRes.ok) return null;

      const logText = await logRes.text();
      const logRows = parseCSV(logText);
      let parsedLogs: LoginLog[] = [];
      if (logRows.length > 1) {
        for (let i = 1; i < logRows.length; i++) {
          const row = logRows[i];
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

      parsedLogs = parsedLogs.filter(
        (l) =>
          !l.id.startsWith('log-10') &&
          !l.id.startsWith('test-') &&
          !this.isAuthorizedAdminEmail(l.email) &&
          !l.reason?.includes('Admin')
      );

      this._cachedLogs = parsedLogs;
      localStorage.removeItem(STORAGE_KEYS.LOGS);

      // Parse change requests
      let parsedRequests: ChangeRequest[] = [];
      if (reqRes && reqRes.ok) {
        const reqText = await reqRes.text();
        const reqRows = parseCSV(reqText);
        if (reqRows.length > 1) {
          for (let i = 1; i < reqRows.length; i++) {
            const row = reqRows[i];
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
      }

      parsedRequests = parsedRequests.filter(
        (r) => !r.id.startsWith('req-0') && !this._deletedRequestIds.has(r.id)
      );
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(parsedRequests));

      // Parse settings
      const currentSettings = this.getPortalSettings();
      const nowTime = Date.now();
      const isRecentlySet = this._lastSettingsFetch && this._lastSettingsFetch > nowTime;
      if (!isRecentlySet && setRes && setRes.ok) {
        const setText = await setRes.text();
        const setLines = setText.split(/\r?\n/);
        for (const line of setLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const m = trimmed.match(/^"([^"]+)"\s*,\s*"((?:[^"]|"")*)"/) ||
                    trimmed.match(/^"([^"]+)"\s*,\s*([^,]*)/) ||
                    trimmed.match(/^([^,]+)\s*,\s*"((?:[^"]|"")*)"/) ||
                    trimmed.match(/^([^,]+)\s*,\s*([^,]*)/);
          if (m) {
            const key = m[1].trim().toLowerCase();
            const val = m[2].replace(/""/g, '"').trim();
            if (key === 'is_locked') {
              currentSettings.is_locked = val.toUpperCase() === 'TRUE';
            }
            if (key === 'lock_reason' && val) {
              currentSettings.lock_reason = val;
            }
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
    } catch (err) {
      console.warn('Direct GViz fetch error in adminSheetService:', err);
      return null;
    }
  },

  /**
   * Fetch live data directly from Google Apps Script Web App (with GViz CSV fast-path & automatic failover)
   */
  async fetchLiveFromSheet(): Promise<{
    success: boolean;
    logs: LoginLog[];
    requests: ChangeRequest[];
    settings: PortalSettings;
    error?: string;
  }> {
    // 1. Try blazing-fast direct GViz CSV fetch first (~150ms)
    try {
      const gvizResult = await this.fetchFromGviz();
      if (gvizResult && gvizResult.success && gvizResult.logs.length > 0) {
        return gvizResult;
      }
    } catch (e) {
      console.warn('GViz fast-path fetch had an issue, checking Apps Script Web App:', e);
    }

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      const gvizFallback = await this.fetchFromGviz();
      if (gvizFallback) return gvizFallback;

      return {
        success: false,
        logs: this.getLogs(),
        requests: this.getChangeRequests(),
        settings: this.getPortalSettings(),
        error: 'No Google Apps Script URL configured.',
      };
    }

    try {
      const fullUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}spreadsheetId=${ADMIN_SPREADSHEET_ID}`;
      const response = await fetch(fullUrl);
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

      // Always store sheet requests (and filter any demo requests and deleted requests)
      parsedRequests = parsedRequests.filter(
        (r) => !r.id.startsWith('req-0') && !this._deletedRequestIds.has(r.id)
      );
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
      console.warn('Apps Script Web App fetch failed, falling back to direct GViz CSV:', err);
      const gvizFallback = await this.fetchFromGviz();
      if (gvizFallback) {
        return gvizFallback;
      }
      return {
        success: false,
        logs: this.getLogs(),
        requests: this.getChangeRequests(),
        settings: this.getPortalSettings(),
        error: err?.message || 'Failed to fetch database records',
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
    this.postToScript({
      action: 'ADD_LOG',
      log: newLog,
    }).catch((err) => {
      console.warn('Could not sync log to Google Sheet Web App:', err);
    });

    return newLog;
  },

  /**
   * Universal robust helper to send payloads to Google Apps Script Web App.
   * Handles Google 302 redirects and cross-origin security restrictions on Netlify.
   */
  async postToScript(payload: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    const scriptUrl = this.getScriptUrl();
    const bodyObj = {
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      ...payload,
    };
    const bodyStr = JSON.stringify(bodyObj);

    // 1. In production on Netlify, try serverless proxy endpoint (/api/admin-proxy) first
    if (typeof window !== 'undefined' && !import.meta.env.DEV) {
      try {
        const proxyRes = await fetch('/api/admin-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
        });
        if (proxyRes.ok) {
          try {
            const pJson = await proxyRes.json();
            if (pJson && pJson.success !== false) {
              return { success: true, data: pJson };
            }
            if (pJson && pJson.error) {
              return { success: false, error: pJson.error };
            }
          } catch {}
          return { success: true };
        }
      } catch (proxyErr) {
        console.warn('Netlify proxy call failed, falling back to direct script URL:', proxyErr);
      }
    }

    if (!scriptUrl) {
      return { success: false, error: 'Google Apps Script Web App URL is not configured.' };
    }

    // 2. For BLOCK_USER / UNBLOCK_USER / ADD_LOG, build GET fallback URL (preserves params across 302 redirects)
    let getUrl = '';
    if (payload.action === 'BLOCK_USER' || payload.action === 'UNBLOCK_USER' || payload.action === 'ADD_LOG') {
      try {
        const params = new URLSearchParams();
        params.set('action', payload.action);
        params.set('spreadsheetId', ADMIN_SPREADSHEET_ID);
        if (payload.action === 'BLOCK_USER' || payload.action === 'UNBLOCK_USER') {
          if (payload.userId) params.set('userId', payload.userId);
          if (payload.email) params.set('email', payload.email);
          if (Array.isArray(payload.altIds) && payload.altIds.length > 0) {
            params.set('altIds', payload.altIds.join(','));
          }
          if (payload.studentName) params.set('studentName', payload.studentName);
          if (payload.reason) params.set('reason', payload.reason);
          if (payload.blockedBy) params.set('blockedBy', payload.blockedBy);
          if (payload.timestamp) params.set('timestamp', payload.timestamp);
        } else if (payload.action === 'ADD_LOG' && payload.log) {
          params.set('id', payload.log.id || '');
          params.set('timestamp', payload.log.timestamp || '');
          params.set('student_name', payload.log.student_name || '');
          params.set('usn', payload.log.usn || '');
          params.set('email', payload.log.email || '');
          params.set('status', payload.log.status || '');
          params.set('device', payload.log.device || '');
          params.set('reason', payload.log.reason || '');
        }
        getUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}${params.toString()}`;
      } catch (getErr) {
        console.warn('GET URL build failed:', getErr);
      }
    }

    // For BLOCK_USER / UNBLOCK_USER, GET with JSON response confirms sheet persistence without duplicate writes
    if ((payload.action === 'BLOCK_USER' || payload.action === 'UNBLOCK_USER') && getUrl) {
      try {
        const getRes = await fetch(getUrl, { redirect: 'follow' });
        if (getRes.ok) {
          try {
            const gJson = await getRes.json();
            if (gJson && gJson.success !== false) {
              return { success: true, data: gJson };
            }
            if (gJson && gJson.error) {
              return { success: false, error: gJson.error };
            }
          } catch {
            return { success: true };
          }
        }
      } catch {
        // Fall through to POST / no-cors below
      }
    } else if (payload.action === 'ADD_LOG' && getUrl) {
      fetch(getUrl, { mode: 'no-cors' }).catch(() => {});
    }

    // 3. Direct browser POST fetch to Google Apps Script
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr,
        redirect: 'follow',
      });

      if (res.ok) {
        try {
          const json = await res.json();
          if (json && json.success !== false) {
            return { success: true, data: json };
          }
          if (json && json.error) {
            return { success: false, error: json.error };
          }
        } catch {
          return { success: true };
        }
      }
      return { success: true };
    } catch {
      // 4. Fallback: send via fire-and-forget no-cors POST / GET
      try {
        if (getUrl) {
          await fetch(getUrl, { mode: 'no-cors' });
        } else {
          await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: bodyStr,
          });
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Network error' };
      }
    }
  },
  clearLogs() {
    this._cachedLogs = [];
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  },

  /**
   * Load recently blocked users buffer to prevent CDN cache overwrites
   */
  getRecentlyBlocked(): Record<string, { blockedUser: BlockedUser; timestamp: number }> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_BLOCKED);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  },

  saveRecentlyBlocked(data: Record<string, { blockedUser: BlockedUser; timestamp: number }>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENTLY_BLOCKED, JSON.stringify(data));
    } catch {}
  },

  /**
   * Load recently unblocked user IDs buffer to prevent CDN cache resurrection
   */
  getRecentlyUnblocked(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_UNBLOCKED);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  },

  saveRecentlyUnblocked(data: Record<string, number>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENTLY_UNBLOCKED, JSON.stringify(data));
    } catch {}
  },

  /**
   * Reconcile remote blocked users list with recent local admin actions
   */
  reconcileBlockedUsers(remoteList: BlockedUser[]): BlockedUser[] {
    const now = Date.now();
    const recentlyBlocked = this.getRecentlyBlocked();
    const recentlyUnblocked = this.getRecentlyUnblocked();

    for (const [k, v] of Object.entries(recentlyBlocked)) {
      if (now - v.timestamp > RECONCILIATION_TTL_MS) {
        delete recentlyBlocked[k];
      }
    }
    for (const [k, ts] of Object.entries(recentlyUnblocked)) {
      if (now - ts > RECONCILIATION_TTL_MS) {
        delete recentlyUnblocked[k];
      }
    }

    const workingMap = new Map<string, BlockedUser>();
    for (const item of remoteList) {
      const cleanKey = normalizeIdentifier(item.userId || '');
      if (!cleanKey) continue;
      if (recentlyUnblocked[cleanKey]) continue;
      workingMap.set(cleanKey, item);
    }

    for (const [cleanKey, record] of Object.entries(recentlyBlocked)) {
      if (!workingMap.has(cleanKey)) {
        workingMap.set(cleanKey, record.blockedUser);
      }
    }

    this.saveRecentlyBlocked(recentlyBlocked);
    this.saveRecentlyUnblocked(recentlyUnblocked);

    return Array.from(workingMap.values());
  },

  /**
   * Get all Blocked Users from memory or localStorage
   */
  getBlockedUsers(): BlockedUser[] {
    if (this._cachedBlockedUsers) return this._cachedBlockedUsers;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BLOCKED_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this._cachedBlockedUsers = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading blocked users from localStorage:', e);
    }
    return [];
  },

  /**
   * Save Blocked Users to memory and localStorage
   */
  setBlockedUsers(list: BlockedUser[], emitEvent = false): void {
    this._cachedBlockedUsers = list;
    this._lastBlockedUsersFetch = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_USERS, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving blocked users to localStorage:', e);
    }
    if (emitEvent && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portal_blocked_users_changed', { detail: list }));
    }
  },

  /**
   * Check if student identifiers match any entry in the blocked users list
   */
  checkIfStudentIsBlocked(identifiers: (string | undefined | null)[]): BlockedUser | null {
    const searchSet = new Set<string>();
    for (const id of identifiers) {
      if (!id || typeof id !== 'string') continue;
      const norm = normalizeIdentifier(id);
      if (INVALID_IDENTIFIERS.has(norm)) continue;
      searchSet.add(norm);
    }
    if (searchSet.size === 0) return null;

    const blockedList = this.getBlockedUsers();
    for (const b of blockedList) {
      const bId = normalizeIdentifier(b.userId || '');
      if (INVALID_IDENTIFIERS.has(bId)) continue;
      if (searchSet.has(bId)) {
        return b;
      }
    }
    return null;
  },

  /**
   * Check if a single identifier is blocked
   */
  isUserBlocked(identifier: string): boolean {
    return Boolean(this.checkIfStudentIsBlocked([identifier]));
  },

  /**
   * Fetch live blocked users list from 'blocked users' tab via Apps Script & GViz CSV
   */
  async fetchBlockedUsers(force = false): Promise<BlockedUser[]> {
    const now = Date.now();
    if (!force && this._cachedBlockedUsers && now - this._lastBlockedUsersFetch < 4000) {
      return this._cachedBlockedUsers;
    }

    const adminSheetId = ADMIN_SPREADSHEET_ID;
    const scriptUrl = this.getScriptUrl();

    // 1. When forced, query Apps Script Web App (or Netlify proxy) directly for zero-cache spreadsheet read
    if (force && (scriptUrl || (typeof window !== 'undefined' && !import.meta.env.DEV))) {
      const endpoints: string[] = [];
      if (typeof window !== 'undefined' && !import.meta.env.DEV) {
        endpoints.push(
          `/api/admin-proxy?action=GET_BLOCKED_USERS&spreadsheetId=${encodeURIComponent(adminSheetId)}&_cb=${now}`
        );
      }
      if (scriptUrl) {
        endpoints.push(
          `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=GET_BLOCKED_USERS&spreadsheetId=${encodeURIComponent(adminSheetId)}&_cb=${now}`
        );
      }

      for (const endpoint of endpoints) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 3500);
          const response = await fetch(endpoint, { signal: ctrl.signal });
          clearTimeout(tid);

          if (response.ok) {
            const json = await response.json();
            if (json.success && Array.isArray(json.blocked)) {
              const parsed = parseBlockedUserRows(json.blocked, false) || [];
              const reconciled = this.reconcileBlockedUsers(parsed);
              this.setBlockedUsers(reconciled, false);
              return reconciled;
            }
          }
        } catch {
          // Try next endpoint / GViz fallback
        }
      }
    }

    // 2. Direct GViz CSV fetch checking 'blocked users' tab (and case variants)
    if (adminSheetId) {
      const isDev = import.meta.env.DEV;
      for (const sheetName of BLOCKED_USERS_SHEET_NAMES) {
        try {
          const cacheBuster = `&_cb=${Date.now()}`;
          const gvizUrl = isDev
            ? `/api/sheets-proxy/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1${cacheBuster}`
            : `https://docs.google.com/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1${cacheBuster}`;
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 2500);
          const res = await fetch(gvizUrl, { signal: ctrl.signal });
          clearTimeout(tid);

          if (res.ok) {
            const text = await res.text();
            if (text) {
              const rows = parseCSV(text);
              const parsed = parseBlockedUserRows(rows, true);
              if (parsed !== null) {
                const reconciled = this.reconcileBlockedUsers(parsed);
                this.setBlockedUsers(reconciled, false);
                return reconciled;
              }
            }
          }
        } catch (gErr) {
          console.warn(`GViz blocked users fetch error (${sheetName}):`, gErr);
        }
      }
    }

    // 3. Fallback: local cache with reconciliation
    const current = this.getBlockedUsers();
    const reconciled = this.reconcileBlockedUsers(current);
    if (reconciled.length !== current.length) {
      this.setBlockedUsers(reconciled, false);
    }
    return reconciled;
  },

  /**
   * Block a user (stored in 'blocked users' tab of Admin Google Sheet)
   */
  async blockUser(data: {
    userId: string;
    studentName?: string;
    email?: string;
    reason?: string;
    blockedBy?: string;
  }): Promise<{ success: boolean; data?: BlockedUser; error?: string }> {
    const cleanId = (data.userId || '').trim();
    if (!cleanId) {
      return { success: false, error: 'User ID is required.' };
    }
    const cleanKey = normalizeIdentifier(cleanId);

    const newBlocked: BlockedUser = {
      timestamp: new Date().toISOString(),
      userId: cleanId,
      studentName: data.studentName?.trim() || undefined,
      reason: data.reason?.trim() || 'Blocked by administrator',
      blockedBy: data.blockedBy?.trim() || this.getAdminUser()?.email || 'Administrator',
    };

    const recentlyBlocked = this.getRecentlyBlocked();
    recentlyBlocked[cleanKey] = { blockedUser: newBlocked, timestamp: Date.now() };
    this.saveRecentlyBlocked(recentlyBlocked);

    const recentlyUnblocked = this.getRecentlyUnblocked();
    delete recentlyUnblocked[cleanKey];
    if (data.email) {
      delete recentlyUnblocked[normalizeIdentifier(data.email)];
    }
    this.saveRecentlyUnblocked(recentlyUnblocked);

    const current = this.getBlockedUsers();
    const emailKey = data.email ? normalizeIdentifier(data.email) : '';
    const updated = [
      newBlocked,
      ...current.filter((b) => {
        const bKey = normalizeIdentifier(b.userId || '');
        return bKey !== cleanKey && (!emailKey || bKey !== emailKey);
      }),
    ];
    this.setBlockedUsers(updated, true);

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl && import.meta.env.DEV) {
      return { success: true, data: newBlocked };
    }

    const res = await this.postToScript({
      action: 'BLOCK_USER',
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      userId: cleanId,
      email: data.email?.trim() || undefined,
      studentName: newBlocked.studentName,
      reason: newBlocked.reason,
      blockedBy: newBlocked.blockedBy,
      timestamp: newBlocked.timestamp,
    });
    if (!res.success && res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: newBlocked };
  },

  /**
   * Unblock a user (removes matching rows from 'blocked users' tab)
   */
  async unblockUser(userId: string, altIds?: string[]): Promise<{ success: boolean; error?: string }> {
    const cleanId = (userId || '').trim();
    if (!cleanId) return { success: false, error: 'User ID is required' };

    const allIds = [cleanId, ...(altIds || [])].map((id) => (id || '').trim()).filter(Boolean);
    const matchSet = new Set(allIds.map(normalizeIdentifier).filter((k) => !INVALID_IDENTIFIERS.has(k)));

    const recentlyUnblocked = this.getRecentlyUnblocked();
    const recentlyBlocked = this.getRecentlyBlocked();
    const now = Date.now();
    for (const key of matchSet) {
      recentlyUnblocked[key] = now;
      delete recentlyBlocked[key];
    }
    this.saveRecentlyUnblocked(recentlyUnblocked);
    this.saveRecentlyBlocked(recentlyBlocked);

    const current = this.getBlockedUsers();
    const updated = current.filter((b) => !matchSet.has(normalizeIdentifier(b.userId || '')));
    this.setBlockedUsers(updated, true);

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl && import.meta.env.DEV) {
      return { success: true };
    }

    const res = await this.postToScript({
      action: 'UNBLOCK_USER',
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      userId: cleanId,
      altIds: allIds,
    });
    return { success: res.success, error: res.error };
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
   * Complete / Dismiss a Change Request (removes it from the pending list and deletes from Google Sheet)
   */
  async deleteChangeRequest(id: string): Promise<boolean> {
    this._deletedRequestIds.add(id);
    const list = this.getChangeRequests();
    const updated = list.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));

    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'DELETE_REQUEST',
            id,
            spreadsheetId: ADMIN_SPREADSHEET_ID,
          }),
        });
      } catch (err) {
        console.warn('Could not sync request completion to Google Sheet:', err);
      }
    }

    return true;
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
   * Update existing exam date in Google Apps Script Web App
   */
  async updateExamDateInSheet(originalExam: any, updatedExam: any): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = this.getExamDatesScriptUrl();
    if (!scriptUrl) return { success: false, error: 'Google Apps Script Web App URL is not configured' };
    const payload = {
      action: 'UPDATE_EXAM_DATE',
      spreadsheetId: EXAM_DATES_SPREADSHEET_ID,
      originalSemester: originalExam?.semester,
      originalSubjectCode: originalExam?.subjectCode,
      originalExamType: originalExam?.examType,
      originalDate: originalExam?.date,
      exam: updatedExam,
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
        console.warn('Could not update exam date in Google Sheet:', fallbackErr);
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
    // If recently set by admin action, respect the local setting for the cooldown window
    if (this._lastSettingsFetch && this._lastSettingsFetch > now) {
      return cached;
    }
    // Cache for 2 seconds unless forced, ensuring real-time instant status updates
    if (!forceRefresh && this._lastSettingsFetch && now - this._lastSettingsFetch < 2000) {
      return cached;
    }

    const scriptUrl = this.getScriptUrl();
    const adminSheetId = ADMIN_SPREADSHEET_ID;

    // Fast-path 1: Direct Google Sheet GViz CSV fetch (blazing fast, ~200ms)
    if (adminSheetId) {
      try {
        const isDev = import.meta.env.DEV;
        const gvizUrl = isDev
          ? `/api/sheets-proxy/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=Settings&headers=1`
          : `https://docs.google.com/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=Settings&headers=1`;

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1800);
        const gRes = await fetch(gvizUrl, { signal: ctrl.signal });
        clearTimeout(tid);

        if (gRes.ok) {
          const csvText = await gRes.text();
          if (csvText && csvText.includes('is_locked')) {
            const lines = csvText.split(/\r?\n/);
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              const m = trimmed.match(/^"([^"]+)"\s*,\s*"((?:[^"]|"")*)"/) ||
                        trimmed.match(/^"([^"]+)"\s*,\s*([^,]*)/) ||
                        trimmed.match(/^([^,]+)\s*,\s*"((?:[^"]|"")*)"/) ||
                        trimmed.match(/^([^,]+)\s*,\s*([^,]*)/);
              if (m) {
                const k = m[1].trim().toLowerCase();
                const v = m[2].replace(/""/g, '"').trim();
                if (k === 'is_locked') {
                  cached.is_locked = v.toUpperCase() === 'TRUE';
                }
                if (k === 'lock_reason' && v) {
                  cached.lock_reason = v;
                }
              }
            }
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cached));
            this._lastSettingsFetch = now;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('portal_settings_changed', { detail: cached }));
            }
            return cached;
          }
        }
      } catch {
        // Fallback to Apps Script below
      }
    }

    // Fast-path 2: Apps Script Web App
    if (!scriptUrl) return cached;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const settingsUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=SETTINGS`;
      const response = await fetch(settingsUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return cached;
      const json = await response.json();
      const rawSettings = json.settings || (json.data && json.data.settings);
      if (Array.isArray(rawSettings) && rawSettings.length > 0) {
        for (const row of rawSettings) {
          if (!row || !row[0]) continue;
          const key = String(row[0]).trim().toLowerCase();
          const val = row[1];
          if (key === 'is_locked') {
            cached.is_locked = val === true || String(val).toUpperCase() === 'TRUE';
          }
          if (key === 'lock_reason' && val !== undefined && String(val).trim()) {
            cached.lock_reason = String(val).trim();
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
    // Protect local setting from being immediately overwritten by stale Google Sheet data for 8 seconds
    this._lastSettingsFetch = Date.now() + 8000;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portal_settings_changed', { detail: current }));
    }

    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      const lockReason = current.lock_reason || 'System maintenance in progress.';
      // Try GET request with query params (reliable across CORS)
      try {
        const getUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=SET_LOCK&is_locked=${locked}&lock_reason=${encodeURIComponent(lockReason)}&spreadsheetId=${ADMIN_SPREADSHEET_ID}`;
        await fetch(getUrl).catch(() => null);
      } catch (err) {
        console.warn('GET sync to Google Sheet error:', err);
      }

      // Also fire POST request
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SET_LOCK',
            is_locked: locked,
            lock_reason: lockReason,
            locked_at: current.locked_at,
            spreadsheetId: ADMIN_SPREADSHEET_ID,
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
      blocked_users_count: this.getBlockedUsers().length,
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
