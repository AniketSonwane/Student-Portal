import { LoginLog, ChangeRequest, PortalSettings, AdminStats, BlockedUser } from '../types/admin';
import { profileService } from './profile';
import { cleanupUnnecessaryStorage } from '../utils/cleanStorage';
import { TIMETABLE_SPREADSHEET_ID, EXAM_DATES_SPREADSHEET_ID, ADMIN_SPREADSHEET_ID } from '../config/sheetsConfig';
import { parseCSV } from './sheetParser';

const STORAGE_KEYS = {
  LOGS: 'student_portal_admin_logs',
  REQUESTS: 'student_portal_admin_change_requests',
  SETTINGS: 'student_portal_admin_settings',
  BLOCKED_USERS: 'student_portal_admin_blocked_users',
  RECENTLY_BLOCKED: 'student_portal_admin_recently_blocked',
  RECENTLY_UNBLOCKED: 'student_portal_admin_recently_unblocked',
  ADMIN_AUTH: 'student_portal_admin_authenticated',
  SHEET_URL: 'student_portal_admin_sheet_url',
};

const RECONCILIATION_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL to outlive Google GViz CDN cache lag


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
  _cachedBlockedUsers: null as BlockedUser[] | null,
  _lastBlockedUsersFetch: 0,
  _deletedRequestIds: new Set<string>(),

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

      const [logRes, reqRes, setRes, blockRes] = await Promise.all([
        fetch(getGvizUrl('Logins')).catch(() => null),
        fetch(getGvizUrl('ChangeRequests')).catch(() => null),
        fetch(getGvizUrl('Settings')).catch(() => null),
        fetch(getGvizUrl('BlockedUsers')).catch(() => null),
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

      // Parse blocked users
      if (blockRes && blockRes.ok) {
        try {
          const blockText = await blockRes.text();
          const blockRows = parseCSV(blockText);
          const parsedBlocked: BlockedUser[] = [];
          if (blockRows.length > 1) {
            for (let i = 1; i < blockRows.length; i++) {
              const row = blockRows[i];
              if (!row || !row[1]) continue;
              parsedBlocked.push({
                timestamp: row[0] ? new Date(row[0]).toISOString() : new Date().toISOString(),
                userId: String(row[1]).trim(),
                studentName: row[2] ? String(row[2]).trim() : undefined,
                reason: row[3] ? String(row[3]).trim() : undefined,
                blockedBy: row[4] ? String(row[4]).trim() : undefined,
              });
            }
            parsedBlocked.reverse();
            const reconciled = this.reconcileBlockedUsers(parsedBlocked);
            this.setBlockedUsers(reconciled);
          }
        } catch (bErr) {
          console.warn('Could not parse BlockedUsers from GViz:', bErr);
        }
      }

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

      // 4. Parse Blocked Users directly from sheet (with local reconciliation)
      if (Array.isArray(rawData.blocked) && rawData.blocked.length > 1) {
        const parsedBlocked: BlockedUser[] = [];
        for (let i = 1; i < rawData.blocked.length; i++) {
          const row = rawData.blocked[i];
          if (!row || !row[1]) continue;
          parsedBlocked.push({
            timestamp: row[0] ? new Date(row[0]).toISOString() : new Date().toISOString(),
            userId: String(row[1]).trim(),
            studentName: row[2] ? String(row[2]).trim() : undefined,
            reason: row[3] ? String(row[3]).trim() : undefined,
            blockedBy: row[4] ? String(row[4]).trim() : undefined,
          });
        }
        parsedBlocked.reverse();
        const reconciled = this.reconcileBlockedUsers(parsedBlocked);
        this.setBlockedUsers(reconciled);
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
   * Universal robust helper to POST payloads to Google Apps Script Web App.
   * Handles Google 302 redirects and cross-origin security restrictions on Netlify.
   */
  async postToScript(payload: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
    const scriptUrl = this.getScriptUrl();
    const bodyObj = {
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      ...payload,
    };
    const bodyStr = JSON.stringify(bodyObj);

    // 1. In production on Netlify, try the serverless proxy endpoint first (/api/admin-proxy)
    // Server-to-server HTTP POST seamlessly handles Google Apps Script 302 redirects without browser CORS blocks
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
          } catch {}
          return { success: true };
        }
      } catch (proxyErr) {
        console.warn('Netlify proxy call failed, falling back to direct script URL:', proxyErr);
      }
    }

    if (!scriptUrl) {
      return { success: false, error: 'No Google Apps Script URL configured.' };
    }

    // 2. Direct browser fetch to Google Apps Script
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
      // 3. Fallback: Browser blocked CORS on the redirect.
      // Try GET parameter query fallback (GET is never blocked by cross-origin redirect policies on browsers)
      if (payload.action === 'BLOCK_USER' || payload.action === 'UNBLOCK_USER' || payload.action === 'ADD_LOG') {
        try {
          const params = new URLSearchParams();
          params.set('action', payload.action);
          params.set('spreadsheetId', ADMIN_SPREADSHEET_ID);
          if (payload.action === 'BLOCK_USER' || payload.action === 'UNBLOCK_USER') {
            if (payload.userId) params.set('userId', payload.userId);
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
          const getUrl = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}${params.toString()}`;
          await fetch(getUrl, { mode: 'no-cors' });
          return { success: true };
        } catch (getErr) {
          console.warn('GET fallback failed:', getErr);
        }
      }

      // 4. Fallback: send via fire-and-forget no-cors POST
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: bodyStr,
        });
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
   * Load recently blocked users with timestamp to prevent CDN cache overwrites
   */
  getRecentlyBlocked(): Record<string, { blockedUser: BlockedUser; timestamp: number }> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_BLOCKED);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  },

  /**
   * Save recently blocked users buffer
   */
  saveRecentlyBlocked(data: Record<string, { blockedUser: BlockedUser; timestamp: number }>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENTLY_BLOCKED, JSON.stringify(data));
    } catch {}
  },

  /**
   * Load recently unblocked user IDs with timestamp to prevent CDN cache resurrection
   */
  getRecentlyUnblocked(): Record<string, number> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECENTLY_UNBLOCKED);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  },

  /**
   * Save recently unblocked user IDs buffer
   */
  saveRecentlyUnblocked(data: Record<string, number>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENTLY_UNBLOCKED, JSON.stringify(data));
    } catch {}
  },

  /**
   * Reconcile remote blocked users list with recent local admin actions.
   * This completely prevents CDN caching lag from unblocking users or resurrecting unblocked users.
   */
  reconcileBlockedUsers(remoteList: BlockedUser[]): BlockedUser[] {
    const now = Date.now();
    const recentlyBlocked = this.getRecentlyBlocked();
    const recentlyUnblocked = this.getRecentlyUnblocked();

    // 1. Purge expired entries (> 5 minutes)
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

    // 2. Build index from remote list
    const workingMap = new Map<string, BlockedUser>();
    for (const item of remoteList) {
      const cleanKey = (item.userId || '').trim().toLowerCase();
      if (!cleanKey) continue;
      // If user was recently unblocked, ignore stale remote row
      if (recentlyUnblocked[cleanKey]) {
        continue;
      }
      workingMap.set(cleanKey, item);
    }

    // 3. For any user in recentlyBlocked, ensure they exist in workingMap
    for (const [cleanKey, record] of Object.entries(recentlyBlocked)) {
      if (!workingMap.has(cleanKey)) {
        // Remote hasn't caught up yet; inject local block
        workingMap.set(cleanKey, record.blockedUser);
      }
    }

    // Persist cleaned up buffers
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
        this._cachedBlockedUsers = JSON.parse(stored);
        return this._cachedBlockedUsers || [];
      }
    } catch (e) {
      console.warn('Error reading blocked users from localStorage:', e);
    }
    return [];
  },

  /**
   * Save Blocked Users to cache and localStorage
   */
  setBlockedUsers(list: BlockedUser[]): void {
    this._cachedBlockedUsers = list;
    this._lastBlockedUsersFetch = Date.now();
    try {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_USERS, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving blocked users to localStorage:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portal_blocked_users_changed', { detail: list }));
    }
  },

  /**
   * Check if a specific identifier matches any blocked user
   */
  isUserBlocked(identifier: string): boolean {
    if (!identifier) return false;
    const clean = identifier.trim().toLowerCase();
    const cleanPrefix = clean.includes('@') ? clean.split('@')[0].trim() : '';
    const blockedList = this.getBlockedUsers();
    return blockedList.some((b) => {
      const bId = (b.userId || '').trim().toLowerCase();
      if (!bId) return false;
      if (bId === clean) return true;
      if (cleanPrefix && bId === cleanPrefix) return true;
      if (bId.includes('@') && bId.split('@')[0].trim() === clean) return true;
      return false;
    });
  },

  /**
   * Check if student identifiers (student_id, usn, email, etc.) match any blocked user
   */
  checkIfStudentIsBlocked(identifiers: (string | undefined | null)[]): BlockedUser | null {
    const cleanList = identifiers
      .filter((id): id is string => Boolean(id && typeof id === 'string'))
      .map((id) => id.trim().toLowerCase());
    if (cleanList.length === 0) return null;

    const searchSet = new Set<string>();
    for (const id of cleanList) {
      searchSet.add(id);
      if (id.includes('@')) {
        const prefix = id.split('@')[0].trim();
        if (prefix) searchSet.add(prefix);
      }
    }

    const blockedList = this.getBlockedUsers();
    for (const b of blockedList) {
      const bId = (b.userId || '').trim().toLowerCase();
      if (!bId) continue;
      if (searchSet.has(bId)) {
        return b;
      }
      if (bId.includes('@')) {
        const bPrefix = bId.split('@')[0].trim();
        if (bPrefix && searchSet.has(bPrefix)) {
          return b;
        }
      }
    }
    return null;
  },

  /**
   * Fetch live blocked users list with Apps Script direct query, GViz fast-path & local reconciliation
   */
  async fetchBlockedUsers(force = false): Promise<BlockedUser[]> {
    const now = Date.now();
    if (!force && this._cachedBlockedUsers && now - this._lastBlockedUsersFetch < 5000) {
      return this._cachedBlockedUsers;
    }

    const adminSheetId = ADMIN_SPREADSHEET_ID;
    const scriptUrl = this.getScriptUrl();

    // 1. When forced, try Apps Script Web App directly first (reads Spreadsheet database with 0s CDN cache)
    if (force && scriptUrl) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=GET_BLOCKED_USERS&spreadsheetId=${adminSheetId}`;
        const response = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);

        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.blocked)) {
            const rawRows = json.blocked;
            const parsed: BlockedUser[] = [];
            const startIndex = rawRows.length > 0 && String(rawRows[0][1]).toLowerCase().includes('user') ? 1 : 0;
            for (let i = startIndex; i < rawRows.length; i++) {
              const r = rawRows[i];
              if (!r || !r[1]) continue;
              parsed.push({
                timestamp: r[0] ? new Date(r[0]).toISOString() : new Date().toISOString(),
                userId: String(r[1]).trim(),
                studentName: r[2] ? String(r[2]).trim() : undefined,
                reason: r[3] ? String(r[3]).trim() : undefined,
                blockedBy: r[4] ? String(r[4]).trim() : undefined,
              });
            }
            parsed.reverse();
            const reconciled = this.reconcileBlockedUsers(parsed);
            this.setBlockedUsers(reconciled);
            return reconciled;
          }
        }
      } catch (err) {
        // Fail over to GViz
      }
    }

    // 2. Direct GViz CSV fetch for 'BlockedUsers' tab (~150ms fast-path)
    if (adminSheetId) {
      try {
        const isDev = import.meta.env.DEV;
        const cacheBuster = `&_cb=${Date.now()}`;
        const gvizUrl = isDev
          ? `/api/sheets-proxy/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('BlockedUsers')}&headers=1${cacheBuster}`
          : `https://docs.google.com/spreadsheets/d/${adminSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('BlockedUsers')}&headers=1${cacheBuster}`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(gvizUrl, { signal: ctrl.signal });
        clearTimeout(tid);

        if (res.ok) {
          const text = await res.text();
          if (text) {
            const rows = parseCSV(text);
            const parsed: BlockedUser[] = [];
            const startIndex = rows.length > 0 && (rows[0][1]?.toLowerCase().includes('user') || rows[0][0]?.toLowerCase().includes('time')) ? 1 : 0;
            for (let i = startIndex; i < rows.length; i++) {
              const r = rows[i];
              if (!r || !r[1]) continue;
              parsed.push({
                timestamp: r[0] ? new Date(r[0]).toISOString() : new Date().toISOString(),
                userId: String(r[1]).trim(),
                studentName: r[2] ? String(r[2]).trim() : undefined,
                reason: r[3] ? String(r[3]).trim() : undefined,
                blockedBy: r[4] ? String(r[4]).trim() : undefined,
              });
            }
            parsed.reverse();
            const reconciled = this.reconcileBlockedUsers(parsed);
            this.setBlockedUsers(reconciled);
            return reconciled;
          }
        }
      } catch (gErr) {
        console.warn('GViz blocked users fetch error:', gErr);
      }
    }

    // 3. Fallback: Local state with reconciliation
    const current = this.getBlockedUsers();
    const reconciled = this.reconcileBlockedUsers(current);
    if (reconciled.length !== current.length) {
      this.setBlockedUsers(reconciled);
    }
    return reconciled;
  },

  /**
   * Block a User ID (stored in 'BlockedUsers' tab of Admin Google Sheet)
   */
  async blockUser(data: {
    userId: string;
    studentName?: string;
    reason?: string;
    blockedBy?: string;
  }): Promise<{ success: boolean; data?: BlockedUser; error?: string }> {
    const cleanId = (data.userId || '').trim();
    if (!cleanId) {
      return { success: false, error: 'User ID is required.' };
    }
    const cleanKey = cleanId.toLowerCase();

    const newBlocked: BlockedUser = {
      timestamp: new Date().toISOString(),
      userId: cleanId,
      studentName: data.studentName?.trim() || undefined,
      reason: data.reason?.trim() || 'Blocked by administrator',
      blockedBy: data.blockedBy?.trim() || this.getAdminUser()?.name || 'Administrator',
    };

    // Update reconciliation buffers
    const recentlyBlocked = this.getRecentlyBlocked();
    recentlyBlocked[cleanKey] = { blockedUser: newBlocked, timestamp: Date.now() };
    this.saveRecentlyBlocked(recentlyBlocked);

    const recentlyUnblocked = this.getRecentlyUnblocked();
    delete recentlyUnblocked[cleanKey];
    this.saveRecentlyUnblocked(recentlyUnblocked);

    // Optimistically update local state immediately
    const current = this.getBlockedUsers();
    const updated = [newBlocked, ...current.filter((b) => (b.userId || '').trim().toLowerCase() !== cleanKey)];
    this.setBlockedUsers(updated);

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      return { success: true, data: newBlocked };
    }

    const payload = {
      action: 'BLOCK_USER',
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      userId: cleanId,
      studentName: newBlocked.studentName,
      reason: newBlocked.reason,
      blockedBy: newBlocked.blockedBy,
      timestamp: newBlocked.timestamp,
    };

    const res = await this.postToScript(payload);
    if (!res.success && res.error) {
      return { success: false, error: res.error };
    }
    return { success: true, data: newBlocked };
  },

  /**
   * Unblock a User ID (removes row from 'BlockedUsers' tab)
   */
  async unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const cleanId = (userId || '').trim();
    if (!cleanId) return { success: false, error: 'User ID is required' };
    const cleanKey = cleanId.toLowerCase();

    // Update reconciliation buffers
    const recentlyUnblocked = this.getRecentlyUnblocked();
    recentlyUnblocked[cleanKey] = Date.now();
    this.saveRecentlyUnblocked(recentlyUnblocked);

    const recentlyBlocked = this.getRecentlyBlocked();
    delete recentlyBlocked[cleanKey];
    this.saveRecentlyBlocked(recentlyBlocked);

    // Optimistically update local state immediately
    const current = this.getBlockedUsers();
    const updated = current.filter((b) => (b.userId || '').trim().toLowerCase() !== cleanKey);
    this.setBlockedUsers(updated);

    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) return { success: true };

    const payload = {
      action: 'UNBLOCK_USER',
      spreadsheetId: ADMIN_SPREADSHEET_ID,
      userId: cleanId,
    };

    const res = await this.postToScript(payload);
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
