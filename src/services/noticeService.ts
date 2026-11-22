import { NOTICES_SPREADSHEET_ID, NOTICES_ROOT_DRIVE_FOLDER_ID, ADMIN_SPREADSHEET_ID } from '../config/sheetsConfig';
import { adminSheetService } from './adminSheetService';
import { NoticeItem, CreateNoticeInput, UpdateNoticeInput, NoticeDocument } from '../types/notice';
import { parseCSV } from './sheetParser';

const STORAGE_KEY_NOTICES = 'student_portal_notices';
const CACHE_TTL_MS = 8000; // 8 seconds

const targetSpreadsheetId = NOTICES_SPREADSHEET_ID || ADMIN_SPREADSHEET_ID;

/**
 * Validates that a string represents a valid date or timestamp
 * and is not a corrupted multiline text fragment or sentence.
 */
function isValidNoticeDate(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (s.length > 60 || s.includes('\n') || s.includes('"')) return false;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return true;
  // Support DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(s)) return true;
  return false;
}

/**
 * Validates that an object is a well-formed notice item and not a fragment
 * produced by accidental line splitting.
 */
function isValidNotice(n: any): boolean {
  if (!n || typeof n !== 'object') return false;
  if (typeof n.id !== 'string' || !n.id.trim() || n.id.includes('\n') || n.id.includes('"')) return false;
  if (n.id.toLowerCase().includes('notice id')) return false;
  if (typeof n.timestamp !== 'string' || !isValidNoticeDate(n.timestamp)) return false;
  return true;
}

function parseNoticeDocuments(rawNames = '', rawUrls = ''): NoticeDocument[] {
  if (!rawUrls.trim()) return [];
  const parsedUrls = rawUrls.split(/\r?\n|\|\|/).map((s) => s.trim()).filter(Boolean);
  const parsedNames = rawNames.split(/\r?\n|\|\|/).map((s) => s.trim()).filter(Boolean);

  const finalUrls =
    parsedUrls.length > 0
      ? parsedUrls
      : rawUrls.includes(',')
      ? rawUrls.split(',').map((s) => s.trim()).filter(Boolean)
      : [rawUrls.trim()];

  const finalNames =
    parsedNames.length > 0
      ? parsedNames
      : rawNames.includes(',')
      ? rawNames.split(',').map((s) => s.trim()).filter(Boolean)
      : [rawNames.trim()];

  return finalUrls.map((url, idx) => ({
    name: finalNames[idx] || `Document ${idx + 1}`,
    url,
  }));
}

function parseNoticeLinks(rawLinks = ''): string[] {
  if (!rawLinks.trim()) return [];
  return rawLinks
    .split(/[\r\n,]+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

class NoticeService {
  private _cachedNotices: NoticeItem[] | null = null;
  private _lastFetchTime = 0;

  /**
   * Get cached notices from memory or localStorage, filtering out any corrupt entries
   */
  getLocalNotices(): NoticeItem[] {
    if (this._cachedNotices) {
      const valid = this._cachedNotices.filter((n) => isValidNotice(n));
      this._cachedNotices = valid;
      return valid;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTICES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((n) => isValidNotice(n));
          this._cachedNotices = valid;
          return valid;
        }
      }
    } catch (e) {
      console.warn('Error reading notices from localStorage:', e);
    }
    return [];
  }

  /**
   * Save notices to localStorage and memory
   */
  setLocalNotices(notices: NoticeItem[]): void {
    const valid = notices.filter((n) => isValidNotice(n));
    this._cachedNotices = valid;
    this._lastFetchTime = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(valid));
    } catch (e) {
      console.warn('Error saving notices to localStorage:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portal_notices_changed', { detail: valid }));
    }
  }

  /**
   * Fetch all notices with Fast-Path GViz CSV + Apps Script failover
   */
  async fetchNotices(forceRefresh = false): Promise<{ success: boolean; data: NoticeItem[]; error?: string }> {
    const now = Date.now();
    if (!forceRefresh && this._cachedNotices && now - this._lastFetchTime < CACHE_TTL_MS) {
      return { success: true, data: this._cachedNotices };
    }

    const noticesSheetId = targetSpreadsheetId;
    const isDev = import.meta.env.DEV;

    // Fast-path 1: Direct Google Sheet GViz CSV fetch (~150ms)
    if (noticesSheetId) {
      try {
        let gvizUrl = isDev
          ? `/api/sheets-proxy/spreadsheets/d/${noticesSheetId}/gviz/tq?tqx=out:csv&sheet=Notices&headers=1`
          : `https://docs.google.com/spreadsheets/d/${noticesSheetId}/gviz/tq?tqx=out:csv&sheet=Notices&headers=1`;

        let ctrl = new AbortController();
        let tid = setTimeout(() => ctrl.abort(), 2500);
        let res = await fetch(gvizUrl, { signal: ctrl.signal });
        clearTimeout(tid);

        // If sheet tab 'Notices' is not created yet (e.g. blank sheet), try querying the first sheet
        if (!res.ok) {
          const fallbackGvizUrl = isDev
            ? `/api/sheets-proxy/spreadsheets/d/${noticesSheetId}/gviz/tq?tqx=out:csv&headers=1`
            : `https://docs.google.com/spreadsheets/d/${noticesSheetId}/gviz/tq?tqx=out:csv&headers=1`;
          ctrl = new AbortController();
          tid = setTimeout(() => ctrl.abort(), 2500);
          res = await fetch(fallbackGvizUrl, { signal: ctrl.signal });
          clearTimeout(tid);
        }

        if (res.ok) {
          const csvText = await res.text();
          if (csvText && (csvText.includes('Notice ID') || csvText.includes('Timestamp') || csvText.includes('NTC-'))) {
            // Use full RFC 4180 CSV parser that respects newlines inside quoted descriptions and documents
            const rows = parseCSV(csvText);
            const parsed: NoticeItem[] = [];

            // If header row is present, start from row 1
            const startIndex =
              rows.length > 0 &&
              (String(rows[0][0] || '').toLowerCase().includes('timestamp') ||
                String(rows[0][1] || '').toLowerCase().includes('notice') ||
                String(rows[0][1] || '').toLowerCase().includes('id'))
                ? 1
                : 0;

            for (let i = startIndex; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length < 2) continue;

              const id = (row[1] || '').trim();
              if (!id || id.toLowerCase().includes('notice id') || id.includes('\n') || id.includes('"')) continue;

              const rawTimestamp = (row[0] || '').trim();
              const timestamp = isValidNoticeDate(rawTimestamp)
                ? rawTimestamp
                : (id.startsWith('NTC-') ? new Date().toISOString() : '');

              if (!timestamp) continue;

              const rawSem = (row[2] || '').trim().toUpperCase();
              const semester: number | 'ALL' = rawSem === 'ALL' || rawSem === '' ? 'ALL' : parseInt(rawSem, 10) || 'ALL';
              const title = (row[3] || '').trim() || 'Notice';
              const content = row[4] || '';
              const links = parseNoticeLinks(row[5]);
              const documents = parseNoticeDocuments(row[6], row[7]);
              const documentName = documents[0]?.name || row[6] || undefined;
              const documentUrl = documents[0]?.url || row[7] || undefined;
              const folderId = row[8] || undefined;
              const folderUrl = row[9] || undefined;

              parsed.push({
                id,
                timestamp,
                semester,
                title,
                content,
                links,
                documents,
                documentName,
                documentUrl,
                folderId,
                folderUrl,
              });
            }

            // Sort newest first
            parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.setLocalNotices(parsed);
            return { success: true, data: parsed };
          }
        }
      } catch (gErr) {
        console.warn('GViz notices fetch error, falling back to Apps Script Web App:', gErr);
      }
    }

    // Fast-path 2: Apps Script Web App
    const scriptUrl = adminSheetService.getScriptUrl();
    if (!scriptUrl) {
      const fallback = this.getLocalNotices();
      return { success: true, data: fallback };
    }

    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const url = `${scriptUrl}${scriptUrl.includes('?') ? '&' : '?'}action=GET_NOTICES&spreadsheetId=${noticesSheetId}`;
      const response = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);

      if (response.ok) {
        const json = await response.json();
        if (json.success && Array.isArray(json.notices)) {
          const rawRows = json.notices;
          const parsed: NoticeItem[] = [];
          const startIndex =
            rawRows.length > 0 &&
            (String(rawRows[0][0] || '').toLowerCase().includes('timestamp') ||
              String(rawRows[0][1] || '').toLowerCase().includes('notice') ||
              String(rawRows[0][1] || '').toLowerCase().includes('id'))
              ? 1
              : 0;

          for (let i = startIndex; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || !row[1]) continue;

            const id = String(row[1] || '').trim();
            if (!id || id.toLowerCase().includes('notice id') || id.includes('\n') || id.includes('"')) continue;

            const rawTimestamp = String(row[0] || '').trim();
            const timestamp = isValidNoticeDate(rawTimestamp)
              ? rawTimestamp
              : (id.startsWith('NTC-') ? new Date().toISOString() : '');

            if (!timestamp) continue;

            const rawSem = String(row[2] || '').trim().toUpperCase();
            const semester: number | 'ALL' = rawSem === 'ALL' || rawSem === '' ? 'ALL' : parseInt(rawSem, 10) || 'ALL';
            const title = String(row[3] || '').trim() || 'Notice';
            const content = String(row[4] || '');
            const links = parseNoticeLinks(String(row[5] || ''));
            const documents = parseNoticeDocuments(row[6] ? String(row[6]) : '', row[7] ? String(row[7]) : '');
            const documentName = documents[0]?.name || (row[6] ? String(row[6]) : undefined);
            const documentUrl = documents[0]?.url || (row[7] ? String(row[7]) : undefined);
            const folderId = row[8] ? String(row[8]) : undefined;
            const folderUrl = row[9] ? String(row[9]) : undefined;

            parsed.push({
              id,
              timestamp,
              semester,
              title,
              content,
              links,
              documents,
              documentName,
              documentUrl,
              folderId,
              folderUrl,
            });
          }

          parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.setLocalNotices(parsed);
          return { success: true, data: parsed };
        }
      }
    } catch (apiErr: any) {
      console.warn('Apps Script notices fetch error:', apiErr);
    }

    const fallback = this.getLocalNotices();
    return { success: true, data: fallback };
  }

  /**
   * Publish a new Notice (uploads document to Google Drive folder and records in Google Sheet)
   */
  async createNotice(input: CreateNoticeInput): Promise<{ success: boolean; data?: NoticeItem; error?: string }> {
    const scriptUrl = adminSheetService.getScriptUrl();
    if (!scriptUrl) {
      return { success: false, error: 'Google Apps Script Web App URL is not configured in Admin Settings.' };
    }

    const noticeId = input.id || `NTC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = input.timestamp || new Date().toISOString();

    const noticeFiles = input.files || (input.file ? [input.file] : []);

    const payload = {
      action: 'ADD_NOTICE',
      spreadsheetId: targetSpreadsheetId,
      rootFolderId: NOTICES_ROOT_DRIVE_FOLDER_ID,
      notice: {
        id: noticeId,
        timestamp,
        semester: input.semester || 'ALL',
        title: input.title,
        content: input.content,
        links: input.links || [],
        file: input.file,
        files: noticeFiles,
      },
    };

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.notice) {
          const n = json.notice;
          const documents = n.documents || parseNoticeDocuments(n.documentName, n.documentUrl);
          const formattedNotice: NoticeItem = {
            ...n,
            documents,
            documentName: documents[0]?.name || n.documentName,
            documentUrl: documents[0]?.url || n.documentUrl,
          };
          const current = this.getLocalNotices();
          const updated = [formattedNotice, ...current.filter((item) => item.id !== noticeId)];
          this.setLocalNotices(updated);
          return { success: true, data: formattedNotice };
        }
        return { success: false, error: json.error || 'Server returned an error' };
      }

      // If CORS blocks reading JSON, fire fallback
      return { success: true };
    } catch (err: any) {
      // Fire no-cors fallback if needed
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
        return { success: true };
      } catch (fallbackErr: any) {
        return { success: false, error: fallbackErr.message || String(err) };
      }
    }
  }

  /**
   * Update an existing Notice (updates row in Google Sheet and content in Google Drive)
   */
  async updateNotice(id: string, input: UpdateNoticeInput): Promise<{ success: boolean; data?: NoticeItem; error?: string }> {
    const scriptUrl = adminSheetService.getScriptUrl();
    if (!scriptUrl) {
      return { success: false, error: 'Google Apps Script Web App URL is not configured in Admin Settings.' };
    }

    const payload = {
      action: 'UPDATE_NOTICE',
      id,
      spreadsheetId: targetSpreadsheetId,
      rootFolderId: NOTICES_ROOT_DRIVE_FOLDER_ID,
      notice: {
        id,
        semester: input.semester !== undefined ? input.semester : 'ALL',
        title: input.title,
        content: input.content,
        links: input.links || [],
        documents: input.documents,
        deletedDocuments: input.deletedDocuments || [],
        deletedDocumentUrls: (input.deletedDocuments || []).map((d) => d.url),
        file: input.file,
        files: input.files || (input.file ? [input.file] : []),
      },
    };

    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.notice) {
          const n = json.notice;
          const documents = n.documents || parseNoticeDocuments(n.documentName, n.documentUrl);
          const formattedNotice: NoticeItem = {
            ...n,
            documents,
            documentName: documents[0]?.name || n.documentName,
            documentUrl: documents[0]?.url || n.documentUrl,
          };
          const current = this.getLocalNotices();
          const updated = current.map((item) => (item.id === id ? formattedNotice : item));
          this.setLocalNotices(updated);
          return { success: true, data: formattedNotice };
        }
        return { success: false, error: json.error || 'Failed to update notice' };
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
        return { success: false, error: fallbackErr.message || String(err) };
      }
    }
  }

  /**
   * Delete a Notice (removes row from Sheet and deletes folder from Google Drive)
   */
  async deleteNotice(id: string): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = adminSheetService.getScriptUrl();
    if (!scriptUrl) {
      return { success: false, error: 'Google Apps Script URL is not configured.' };
    }

    const payload = {
      action: 'DELETE_NOTICE',
      id,
      spreadsheetId: targetSpreadsheetId,
    };

    try {
      // Instantly remove from local state
      const current = this.getLocalNotices();
      const updated = current.filter((n) => n.id !== id);
      this.setLocalNotices(updated);

      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

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
      } catch (fbErr: any) {
        return { success: false, error: fbErr.message };
      }
    }
  }
}

export const noticeService = new NoticeService();
