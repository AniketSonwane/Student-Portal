import {
  getSemesterDriveFolderId,
  getSemesterDriveFolderUrl,
} from '../config/sheetsConfig';

export type SemesterFileType = 'pdf' | 'image' | 'ppt' | 'excel' | 'doc' | 'other';

export interface SemesterDriveFile {
  id: string;
  name: string;               // Original filename, e.g. "SEM3-DSA-LinkedList.pdf"
  semester: number;           // e.g. 3
  subject: string;            // e.g. "DSA"
  topic: string;              // e.g. "LinkedList"
  extension: string;          // e.g. "pdf"
  fileType: SemesterFileType; // 'pdf' | 'image' | 'ppt' | 'excel' | 'doc' | 'other'
  sizeBytes: number;
  formattedSize: string;      // e.g. "2.4 MB"
  lastUpdated: string;        // ISO string
  viewUrl: string;            // Google Drive web view URL
  previewUrl: string;         // Google Drive embedded preview iframe URL
  downloadUrl: string;        // Direct download URL
  folderName?: string;
}

/**
 * Format raw bytes into human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parses files named according to the convention:
 * SEM-SUB-Topic.extension
 * (e.g. "SEM3-DSA-LinkedList.pdf", "SEM 3 - DBMS - Relational Modeling.pptx", "3-MATH-Fourier_Series.pdf")
 */
export function parseSemesterFileName(
  fileName: string,
  fallbackSemester: number = 3
): {
  semester: number;
  subject: string;
  topic: string;
  extension: string;
  fileType: SemesterFileType;
} {
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot !== -1 ? fileName.slice(lastDot + 1).toLowerCase() : '';
  const baseName = lastDot !== -1 ? fileName.slice(0, lastDot) : fileName;

  // Determine fileType
  let fileType: SemesterFileType = 'other';
  if (ext === 'pdf') {
    fileType = 'pdf';
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    fileType = 'image';
  } else if (['ppt', 'pptx', 'pps', 'odp'].includes(ext)) {
    fileType = 'ppt';
  } else if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    fileType = 'excel';
  } else if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    fileType = 'doc';
  }

  // Split baseName by dash/hyphen
  const parts = baseName.split(/[-–—]/).map((p) => p.trim()).filter(Boolean);

  let semester = fallbackSemester;
  let subject = 'GENERAL';
  let topic = baseName;

  if (parts.length >= 3) {
    // parts[0] is SEM (e.g. "SEM3", "SEM 3", "3", "Semester 3")
    const semDigits = parts[0].replace(/\D/g, '');
    if (semDigits) {
      semester = parseInt(semDigits, 10);
    }
    subject = parts[1].toUpperCase();
    topic = parts.slice(2).join(' - ');
  } else if (parts.length === 2) {
    const semDigits = parts[0].replace(/\D/g, '');
    if (semDigits && /^sem/i.test(parts[0])) {
      semester = parseInt(semDigits, 10);
      topic = parts[1];
    } else {
      subject = parts[0].toUpperCase();
      topic = parts[1];
    }
  }

  // Clean topic: replace underscores with spaces
  topic = topic.replace(/_/g, ' ').trim();

  return {
    semester,
    subject,
    topic,
    extension: ext,
    fileType,
  };
}

export const semesterDataService = {
  _cache: new Map<number, { timestamp: number; files: SemesterDriveFile[] }>(),

  getDriveFolderUrl(semester: number = 3): string {
    return getSemesterDriveFolderUrl(semester);
  },

  getDriveFolderId(semester: number = 3): string {
    return getSemesterDriveFolderId(semester);
  },

  /**
   * Discovers candidate Google Apps Script deployment URLs
   */
  getScriptUrls(): string[] {
    const urls: string[] = [];
    const envDrive = (import.meta.env.VITE_GOOGLE_DRIVE_SEMESTER_API_URL as string) || '';
    const envAdmin = (import.meta.env.VITE_GOOGLE_SHEETS_ADMIN_API_URL as string) || '';
    const envTimetable = (import.meta.env.VITE_GOOGLE_SHEETS_TIMETABLE_API_URL as string) || '';
    const storedAdmin = typeof localStorage !== 'undefined' ? localStorage.getItem('student_portal_admin_sheet_url') || '' : '';
    const storedTimetable = typeof localStorage !== 'undefined' ? localStorage.getItem('student_portal_timetable_sheet_url') || '' : '';

    [
      envDrive,
      'https://script.google.com/macros/s/AKfycbxvk9iAk3N0aTq337_sJIdBJgAWqWXJy8YWzSGGBRCD4hkKidtSRp2pKA6d2Z4Nuwh9KQ/exec',
      envAdmin,
      envTimetable,
      storedAdmin,
      storedTimetable,
    ].forEach((u) => {
      const clean = u.trim();
      if (clean && clean.startsWith('https://script.google.com') && !urls.includes(clean)) {
        urls.push(clean);
      }
    });

    return urls;
  },

  /**
   * Fetch all files from Google Drive folder directly for a given semester
   */
  async fetchSemesterFiles(
    semester: number = 3,
    forceRefresh: boolean = false
  ): Promise<{ success: boolean; files: SemesterDriveFile[]; error?: string; isLive: boolean }> {
    // Check in-memory cache if fresh (< 2 minutes)
    const cached = this._cache.get(semester);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < 120000) {
      return { success: true, files: cached.files, isLive: true };
    }

    const scriptUrls = this.getScriptUrls();
    const folderId = this.getDriveFolderId(semester);

    for (const scriptUrl of scriptUrls) {
      try {
        const url = `${scriptUrl}?action=GET_SEMESTER_FILES&semester=${semester}&folderId=${encodeURIComponent(
          folderId
        )}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.files)) {
            const parsedFiles: SemesterDriveFile[] = json.files.map((raw: any) => {
              const parsed = parseSemesterFileName(raw.name || '', semester);
              return {
                id: raw.id,
                name: raw.name || '',
                semester: raw.semester || parsed.semester,
                subject: parsed.subject,
                topic: parsed.topic,
                extension: parsed.extension,
                fileType: parsed.fileType,
                sizeBytes: raw.size || 0,
                formattedSize: formatFileSize(raw.size || 0),
                lastUpdated: raw.lastUpdated || new Date().toISOString(),
                viewUrl: raw.viewUrl || `https://drive.google.com/file/d/${raw.id}/view`,
                previewUrl: raw.previewUrl || `https://drive.google.com/file/d/${raw.id}/preview`,
                downloadUrl: raw.downloadUrl || `https://drive.google.com/uc?export=download&id=${raw.id}&confirm=t`,
                folderName: raw.folderName,
              };
            });

            this._cache.set(semester, { timestamp: Date.now(), files: parsedFiles });
            return { success: true, files: parsedFiles, isLive: true };
          }
        }
      } catch (err) {
        console.warn(`Attempted fetching semester files from ${scriptUrl}:`, err);
      }
    }

    // No demo fallback: when empty or not yet uploaded, return empty array
    this._cache.set(semester, { timestamp: Date.now(), files: [] });

    return {
      success: true,
      files: [],
      isLive: false,
    };
  },

  /**
   * Upload file(s) into Semester Google Drive folder
   */
  async uploadSemesterFiles(params: {
    semester: number;
    subject?: string;
    files: Array<{ name: string; type: string; base64: string }>;
  }): Promise<{ success: boolean; files?: SemesterDriveFile[]; error?: string }> {
    const scriptUrls = this.getScriptUrls();
    const folderId = this.getDriveFolderId(params.semester);

    for (const scriptUrl of scriptUrls) {
      try {
        const payload = {
          action: 'UPLOAD_SEMESTER_FILES',
          semester: params.semester,
          folderId: folderId,
          subject: params.subject || '',
          files: params.files,
        };

        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            this._cache.delete(params.semester);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('portal_semester_files_changed', { detail: { semester: params.semester } })
              );
            }
            return { success: true, files: json.files };
          }
        }
      } catch (err) {
        console.warn(`Failed upload to ${scriptUrl}:`, err);
      }
    }

    return {
      success: false,
      error: 'Unable to connect to Google Apps Script. Please verify your script deployment.',
    };
  },

  /**
   * Delete / trash a file from Google Drive
   */
  async deleteSemesterFile(
    fileId: string,
    semester: number
  ): Promise<{ success: boolean; error?: string }> {
    const scriptUrls = this.getScriptUrls();

    for (const scriptUrl of scriptUrls) {
      try {
        const payload = {
          action: 'DELETE_SEMESTER_FILE',
          fileId: fileId,
          semester: semester,
        };

        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            this._cache.delete(semester);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('portal_semester_files_changed', { detail: { semester } })
              );
            }
            return { success: true };
          }
        }
      } catch (err) {
        console.warn(`Failed delete to ${scriptUrl}:`, err);
      }
    }

    return { success: false, error: 'Could not delete file from Google Drive.' };
  },

  /**
   * Clear cache
   */
  clearCache() {
    this._cache.clear();
  },
};
