import { ExamDateItem, ExamDatesResponse, ExamType } from '../types/exam';
import { EXAM_DATES_SPREADSHEET_ID } from '../config/sheetsConfig';
import { parseCSVRows } from './profile';


/**
 * Default / Fallback Exam Timetable Data (Empty by default)
 */
export const DEFAULT_EXAM_SCHEDULE: ExamDateItem[] = [];

/**
 * Format a Date object into 'YYYY-MM-DD'
 */
const formatDateToISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Standardize various date formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD-MM-YY, etc.)
 */
export const normalizeDateString = (
  raw: string
): { isoDate: string; formattedDate: string; dayOfWeek: string; dateObj: Date | null } => {
  if (!raw || !raw.trim()) {
    const today = new Date();
    return {
      isoDate: formatDateToISO(today),
      formattedDate: today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'short' }),
      dateObj: today,
    };
  }

  const clean = raw.trim().replace(/^['"]+|['"]+$/g, '');
  let dateObj: Date | null = null;

  // 1. Pattern: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  if (/^\d{4}[/.-]\d{1,2}[/.-]\d{1,2}$/.test(clean)) {
    const sep = clean.includes('/') ? '/' : clean.includes('.') ? '.' : '-';
    const [y, m, d] = clean.split(sep).map(Number);
    dateObj = new Date(y, m - 1, d);
  }
  // 2. Pattern: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD-MM-YY, DD.MM.YY (Handles 2-digit years like 26-10-26)
  else if (/^\d{1,2}[/.-]\d{1,2}[/.-](\d{4}|\d{2})$/.test(clean)) {
    const sep = clean.includes('/') ? '/' : clean.includes('.') ? '.' : '-';
    const parts = clean.split(sep).map(Number);
    const d = parts[0];
    const m = parts[1];
    let y = parts[2];
    if (y < 100) {
      y += 2000;
    }
    dateObj = new Date(y, m - 1, d);
  }
  // 3. Serial 5-digit number from spreadsheet (e.g. 46321)
  else if (/^\d{5}$/.test(clean)) {
    const serial = parseInt(clean, 10);
    dateObj = new Date(Math.round((serial - 25569) * 86400 * 1000));
  }
  // 4. General Date parse fallback
  else {
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const isoDate = formatDateToISO(dateObj);
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  return { isoDate, formattedDate, dayOfWeek, dateObj };
};

/**
 * Compare an ISO date with today's date
 */
export const calculateExamStatus = (
  isoDate: string,
  explicitStatus?: string
): { status: 'Upcoming' | 'Today' | 'Completed'; isCompleted: boolean } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = isoDate.split('-').map(Number);
  const examDate = new Date(y, m - 1, d);
  examDate.setHours(0, 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // If date is in the past, it's completed regardless of stale sheet text
  if (diffDays < 0) {
    return { status: 'Completed', isCompleted: true };
  }

  if (explicitStatus) {
    const norm = explicitStatus.trim().toLowerCase();
    if (norm === 'completed' || norm === 'done' || norm === 'finished') {
      return { status: 'Completed', isCompleted: true };
    }
    if (norm === 'today' || norm === 'ongoing') {
      return { status: 'Today', isCompleted: false };
    }
    if (norm === 'upcoming' || norm === 'scheduled') {
      return { status: 'Upcoming', isCompleted: false };
    }
  }

  if (diffDays === 0) {
    return { status: 'Today', isCompleted: false };
  } else {
    return { status: 'Upcoming', isCompleted: false };
  }
};

/**
 * Sort helper: Active/Upcoming exams chronologically first, completed exams pushed down to the end
 */
export const sortExamsByDateAndCompletion = (exams: ExamDateItem[]): ExamDateItem[] => {
  const upcoming: ExamDateItem[] = [];
  const completed: ExamDateItem[] = [];

  for (const item of exams) {
    if (item.isCompleted) {
      completed.push(item);
    } else {
      upcoming.push(item);
    }
  }

  // Upcoming: Earliest upcoming first (soonest on top)
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  // Completed: Most recently completed first
  completed.sort((a, b) => b.date.localeCompare(a.date));

  return [...upcoming, ...completed];
};

/**
 * Parse Google Sheets CSV text into ExamDateItem[]
 * Supported headers: Semester, ExamType, Date, SubjectName, SubjectCode, Timings, Venue, Status
 */
export const parseExamDatesCSV = (csvText: string): ExamDateItem[] => {
  const rows = parseCSVRows(csvText);
  if (!rows || rows.length < 2) return [];

  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));

  // Column index detector with fuzzy matching
  const findCol = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headerRow.findIndex((h) => h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const semCol = findCol(['semester', 'sem']);
  const typeCol = findCol(['examtype', 'type', 'category', 'exam']);
  const dateCol = findCol(['date', 'examdate', 'day']);
  const nameCol = findCol(['subjectname', 'subject', 'name', 'course']);
  const codeCol = findCol(['subjectcode', 'code', 'coursecode']);
  const timeCol = findCol(['timings', 'timing', 'time', 'duration', 'shift']);
  const venueCol = findCol(['venue', 'room', 'hall', 'location']);
  const statusCol = findCol(['status']);

  const items: ExamDateItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    // Extract using detected columns or positional fallbacks:
    // [0] Semester, [1] ExamType, [2] Date, [3] SubjectName, [4] SubjectCode, [5] Timings, [6] Venue, [7] Status
    const semRaw = (semCol !== -1 ? row[semCol] : row[0]) || '3';
    const semester = parseInt(semRaw.replace(/\D/g, ''), 10) || 3;

    const rawType = (typeCol !== -1 ? row[typeCol] : row[1]) || 'CAE-1';
    let examType = rawType.trim();
    const upperType = examType.toUpperCase();
    if (upperType.includes('UNIT') || upperType.startsWith('UT')) {
      examType = 'Unit Test';
    } else if (upperType.includes('CAE-1') || upperType.includes('CAE 1') || upperType === 'CAE1') {
      examType = 'CAE-1';
    } else if (upperType.includes('CAE-2') || upperType.includes('CAE 2') || upperType === 'CAE2') {
      examType = 'CAE-2';
    } else if (upperType.includes('ESE') || upperType.includes('END SEM')) {
      examType = 'ESE';
    }

    const rawDate = (dateCol !== -1 ? row[dateCol] : row[2]) || '';
    if (!rawDate) continue;

    const { isoDate, formattedDate, dayOfWeek } = normalizeDateString(rawDate);

    const subjectName = (nameCol !== -1 ? row[nameCol] : row[3]) || 'Course Examination';
    const subjectCode = (codeCol !== -1 ? row[codeCol] : row[4]) || examType;
    const timings = (timeCol !== -1 ? row[timeCol] : row[5]) || '10:00 AM - 01:00 PM';
    const venue = (venueCol !== -1 ? row[venueCol] : row[6]) || '';
    const rawStatus = (statusCol !== -1 ? row[statusCol] : row[7]) || '';

    const { status, isCompleted } = calculateExamStatus(isoDate, rawStatus);

    items.push({
      id: `exam-${semester}-${examType}-${subjectCode}-${i}`,
      semester,
      examType,
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      date: isoDate,
      formattedDate,
      dayOfWeek,
      timings: timings.trim(),
      venue: venue.trim() || undefined,
      status,
      isCompleted,
    });
  }

  return sortExamsByDateAndCompletion(items);
};

export const examDatesService = {
  /**
   * Fetch all exam dates directly from Google Sheets (NO cache, NO localStorage).
   */
  async fetchExamDates(semester?: number, _forceRefresh?: boolean): Promise<ExamDatesResponse> {
    const sheetId = EXAM_DATES_SPREADSHEET_ID;
    if (sheetId && sheetId.trim().length > 5) {
      const endpoints = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Exam-Dates`,
        `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(sheetId)}&sheet=Sheet1`,
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            headers: {
              Accept: 'text/csv',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
          });
          if (res.ok) {
            const csvText = await res.text();
            if (csvText && csvText.length > 50 && !csvText.includes('<!DOCTYPE html>')) {
              const parsed = parseExamDatesCSV(csvText);
              const data = semester ? parsed.filter((e) => e.semester === semester) : parsed;
              return {
                success: true,
                data,
              };
            }
          }
        } catch (fetchErr) {
          console.warn(`Failed fetching exam dates from ${url}:`, fetchErr);
        }
      }
    }

    return {
      success: true,
      data: [],
    };
  },

  /**
   * Add a new exam date directly to Google Sheet database (NO local storage persistence)
   */
  async addExamDate(exam: {
    semester: number;
    examType: ExamType;
    subjectCode: string;
    subjectName: string;
    date: string;
    timings: string;
    venue?: string;
    status?: 'Upcoming' | 'Today' | 'Completed';
  }): Promise<{ success: boolean; data?: ExamDateItem; sheetSynced?: boolean; error?: string }> {
    try {
      const { isoDate, formattedDate, dayOfWeek } = normalizeDateString(exam.date);
      const { status, isCompleted } = calculateExamStatus(isoDate, exam.status);
      const newItem: ExamDateItem = {
        id: `exam-${exam.semester}-${exam.examType}-${exam.subjectCode.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`,
        semester: exam.semester,
        examType: exam.examType,
        subjectCode: exam.subjectCode.trim(),
        subjectName: exam.subjectName.trim(),
        date: isoDate,
        formattedDate,
        dayOfWeek,
        timings: exam.timings.trim(),
        venue: exam.venue?.trim() || undefined,
        status,
        isCompleted,
      };

      // Direct sync to Google Sheet via Apps Script backend
      const { adminSheetService } = await import('./adminSheetService');
      const syncRes = await adminSheetService.addExamDateToSheet(newItem);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('exam_dates_updated', { detail: newItem }));
      }

      return { success: syncRes.success, data: newItem, sheetSynced: syncRes.success, error: syncRes.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to add exam date' };
    }
  },

  /**
   * Delete an exam date directly from Google Sheet (NO local storage)
   */
  async deleteExamDate(id: string, examItem?: ExamDateItem): Promise<boolean> {
    try {
      const { adminSheetService } = await import('./adminSheetService');
      const syncRes = await adminSheetService.deleteExamDateFromSheet(id, examItem);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('exam_dates_updated', { detail: { deletedId: id } }));
      }

      return syncRes.success;
    } catch {
      return false;
    }
  },

  /**
   * Clear any legacy exam caches from browser storage
   */
  clearCache() {
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.includes('custom_exam') || k.includes('exam_date'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
    if (typeof sessionStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && (k.includes('custom_exam') || k.includes('exam_date'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
  },
};

// Immediately purge legacy cached entries on module load
examDatesService.clearCache();

