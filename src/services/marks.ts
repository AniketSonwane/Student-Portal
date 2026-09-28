import { StudentSemesterMarks } from '../types/marks';
import { SEMESTER_SHEETS_CONFIG, SUPPORTED_SEMESTERS } from '../config/sheetsConfig';
import { parseMasterSheetCSV, parseSemDetailsCSV, parseNptelCSV, SemDetailsItem } from './sheetParser';

export interface GlobalCourseSearchResult {
  code: string;
  name: string;
  semester: number;
  type: 'Theory' | 'Practical' | 'Activity';
  total: string;
  maxTotal: number;
  grade: string;
  isCompleted: boolean;
}

// In-memory cache for loaded semester sheets (populated live from Google Sheets)
const semesterCache = new Map<number, StudentSemesterMarks[]>();

export const marksService = {
  /**
   * Fetch all student marks from a semester's Google Sheet Master-Sheet
   */
  async fetchSemesterMarks(
    semester: number
  ): Promise<{ success: boolean; data?: StudentSemesterMarks[]; error?: string }> {
    // 1. Check in-memory cache first
    if (semesterCache.has(semester)) {
      return { success: true, data: semesterCache.get(semester)! };
    }

    const config = SEMESTER_SHEETS_CONFIG[semester];
    if (!config || !config.spreadsheetId) {
      return {
        success: false,
        error: `Semester ${semester} Google Sheet has not been connected yet.`,
      };
    }

    const sheetName = config.sheetName || 'Master-Sheet';
    const spreadsheetId = config.spreadsheetId;

    // Try endpoints in order: Vite Dev Proxy -> Direct -> Netlify Function
    const endpoints = [
      `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheet=${encodeURIComponent(sheetName)}`,
    ];

    let csvText: string | null = null;
    let lastError: string = '';

    for (const url of endpoints) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          if (text && text.length > 50 && !text.includes('<!DOCTYPE html>')) {
            csvText = text;
            break;
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Network request failed';
      }
    }

    if (!csvText) {
      return {
        success: false,
        error: `Unable to fetch Semester ${semester} Master-Sheet from Google Sheets. ${lastError}`.trim(),
      };
    }

    // When semester is 1, 2, or 3, also fetch live details tab for subject names and credits
    let semDetailsMap: Map<string, SemDetailsItem> | undefined = undefined;
    if (semester === 1 || semester === 2 || semester === 3) {
      const detailsSheetCandidates =
        semester === 1
          ? ['SEM1-Details', 'sem1-details', 'Sem1-Details']
          : semester === 2
          ? ['sem2-details', 'SEM2-Details', 'Sem2-Details']
          : ['sem3-details', 'SEM3-Details', 'Sem3-Details', 'Sheet8'];

      for (const dSheetName of detailsSheetCandidates) {
        const detailsEndpoints = [
          `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(dSheetName)}`,
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(dSheetName)}`,
          `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheet=${encodeURIComponent(dSheetName)}`,
        ];
        if (semester === 3) {
          detailsEndpoints.push(
            `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=2700910`,
            `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=2700910`
          );
        }
        let found = false;
        for (const dUrl of detailsEndpoints) {
          try {
            const dRes = await fetch(dUrl);
            if (dRes.ok) {
              const dText = await dRes.text();
              if (dText && dText.length > 30 && !dText.includes('<!DOCTYPE html>')) {
                semDetailsMap = parseSemDetailsCSV(dText);
                found = true;
                break;
              }
            }
          } catch {
            // ignore error; defaults are already provided
          }
        }
        if (found) break;
      }
    }

    // When semester is 3, also fetch live NPTEL tab for dedicated marks & grades
    let nptelMap: Map<string, { marks?: string; grade?: string }> | undefined = undefined;
    if (semester === 3) {
      const nptelEndpoints = [
        `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=NPTEL`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=NPTEL`,
        `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(spreadsheetId)}&sheet=NPTEL`,
        `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1657515727`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=1657515727`,
      ];
      for (const nUrl of nptelEndpoints) {
        try {
          const nRes = await fetch(nUrl);
          if (nRes.ok) {
            const nText = await nRes.text();
            if (nText && nText.length > 30 && !nText.includes('<!DOCTYPE html>')) {
              nptelMap = parseNptelCSV(nText);
              break;
            }
          }
        } catch {
          // ignore error; defaults and Master-Sheet col 126 are already available
        }
      }
    }

    try {
      const parsed = parseMasterSheetCSV(csvText, semester, semDetailsMap, nptelMap);
      if (parsed.length === 0) {
        return {
          success: false,
          error: `No valid student records found in Semester ${semester} Master-Sheet.`,
        };
      }

      semesterCache.set(semester, parsed);
      return { success: true, data: parsed };
    } catch (parseErr: any) {
      return {
        success: false,
        error: `Failed to parse Semester ${semester} Master-Sheet: ${parseErr?.message || 'Invalid format'}`,
      };
    }
  },

  /**
   * Retrieve official semester marks for a student by USN and semester
   */
  async getStudentMarks(
    usn: string,
    semester: number = 1
  ): Promise<{ success: boolean; data?: StudentSemesterMarks; error?: string }> {
    const res = await this.fetchSemesterMarks(semester);
    if (!res.success || !res.data) {
      return {
        success: false,
        error: res.error || `Semester ${semester} marks are not available.`,
      };
    }

    const cleanUsn = usn.trim().toUpperCase();
    const student = res.data.find(
      (m) => m.usn.trim().toUpperCase() === cleanUsn
    );

    if (!student) {
      return {
        success: false,
        error: `No marks record found for USN: ${usn} in Semester ${semester} Master-Sheet.`,
      };
    }

    return {
      success: true,
      data: student,
    };
  },

  /**
   * Get list of semesters where marks exist for a student
   */
  async getAvailableSemestersForStudent(usn: string): Promise<number[]> {
    const cleanUsn = usn.trim().toUpperCase();
    const available: number[] = [];
    for (const sem of [1, 2, 3]) {
      const res = await this.fetchSemesterMarks(sem);
      if (res.success && res.data) {
        const found = res.data.some((m) => m.usn.trim().toUpperCase() === cleanUsn);
        if (found) {
          available.push(sem);
        }
      }
    }
    return available.length > 0 ? available : [1, 2, 3];
  },

  /**
   * Search courses across all connected semester sheets for a student
   */
  async searchAllSemesters(usn: string, query: string): Promise<GlobalCourseSearchResult[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const results: GlobalCourseSearchResult[] = [];

    for (const sem of SUPPORTED_SEMESTERS) {
      const res = await this.getStudentMarks(usn, sem);
      if (res.success && res.data && res.data.subjects) {
        res.data.subjects.forEach((sub) => {
          if (
            sub.code.toLowerCase().includes(trimmed) ||
            sub.name.toLowerCase().includes(trimmed)
          ) {
            results.push({
              code: sub.code,
              name: sub.name,
              semester: sem,
              type: sub.type,
              total: sub.total,
              maxTotal: sub.maxTotal,
              grade: sub.grade,
              isCompleted: sub.grade !== '-' && sub.grade !== 'IP',
            });
          }
        });
      }
    }

    return results;
  },

  /**
   * Get all marks for student selection/inspection
   */
  getAllMarks(semester: number = 1): StudentSemesterMarks[] {
    return semesterCache.get(semester) || [];
  },

  /**
   * Clear cache (useful when user updates Google Sheet links)
   */
  clearCache(semester?: number) {
    if (semester) {
      semesterCache.delete(semester);
    } else {
      semesterCache.clear();
    }
  },
};
