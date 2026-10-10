import { DayName, DaySchedule, LectureItem, TimetableResponse } from '../types/timetable';
import { TIMETABLE_SPREADSHEET_ID } from '../config/sheetsConfig';
import { parseCSVRows } from './profile';

export { TIMETABLE_SPREADSHEET_ID };


export const DAYS_OF_WEEK: { full: DayName; short: 'Mon' | 'Tue' | 'Wed' | 'Thur' | 'Fri' | 'Sat'; dayIndex: number }[] = [
  { full: 'Monday', short: 'Mon', dayIndex: 1 },
  { full: 'Tuesday', short: 'Tue', dayIndex: 2 },
  { full: 'Wednesday', short: 'Wed', dayIndex: 3 },
  { full: 'Thursday', short: 'Thur', dayIndex: 4 },
  { full: 'Friday', short: 'Fri', dayIndex: 5 },
  { full: 'Saturday', short: 'Sat', dayIndex: 6 },
];

/**
 * Check if the specified day is today (based on local clock)
 */
export const isToday = (dayName: DayName): boolean => {
  const currentDayNum = new Date().getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const dayMap: Record<number, DayName> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return dayMap[currentDayNum] === dayName;
};

/**
 * Get current day name or fallback to Monday if Sunday
 */
export const getInitialSelectedDay = (): DayName => {
  const currentDayNum = new Date().getDay();
  const dayMap: Record<number, DayName> = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return dayMap[currentDayNum] || 'Monday';
};

/**
 * Parse time string like "09:15 AM - 10:15 AM" and test if current local time is within range
 */
export const isLectureLiveNow = (timings: string): boolean => {
  if (!timings || !timings.includes('-')) return false;

  try {
    const [startStr, endStr] = timings.split('-').map((s) => s.trim());
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseToMinutes = (str: string): number | null => {
      const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3].toUpperCase();

      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const startMin = parseToMinutes(startStr);
    const endMin = parseToMinutes(endStr);

    if (startMin === null || endMin === null) return false;
    return currentMinutes >= startMin && currentMinutes < endMin;
  } catch {
    return false;
  }
};

/**
 * Clean empty week schedule with 0 demo lectures
 */
export const createEmptyWeekSchedule = (): DaySchedule[] => {
  return DAYS_OF_WEEK.map((d) => ({
    day: d.full,
    shortDay: d.short,
    lectures: [],
  }));
};

/**
 * Parse Google Sheets CSV into DaySchedule[]
 * Supported columns: Semester, Day, Period, Timings, SubjectCode, SubjectName, Room, Faculty, Type
 */
export const parseTimetableCSV = (csvText: string, targetSem: number): DaySchedule[] => {
  const rows = parseCSVRows(csvText);
  if (!rows || rows.length < 2) return [];

  const headerRow = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  const findCol = (aliases: string[]): number => {
    for (const alias of aliases) {
      const idx = headerRow.findIndex((h) => h.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const semCol = findCol(['semester', 'sem']);
  const dayCol = findCol(['day', 'dayname', 'weekday']);
  const periodCol = findCol(['period', 'lec', 'lecture', 'slot']);
  const timeCol = findCol(['timings', 'time', 'duration']);
  const codeCol = findCol(['subjectcode', 'code']);
  const nameCol = findCol(['subjectname', 'subject', 'course']);
  const roomCol = findCol(['room', 'hall', 'venue', 'lab']);
  const facultyCol = findCol(['faculty', 'teacher', 'instructor', 'prof']);
  const typeCol = findCol(['type', 'category']);

  const dayMap: Record<string, LectureItem[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every((c) => !c.trim())) continue;

    const rowSemRaw = semCol !== -1 ? row[semCol] : '';
    const rowSem = parseInt(rowSemRaw.replace(/\D/g, ''), 10);
    if (!isNaN(rowSem) && rowSem !== targetSem) continue;

    const rawDay = (dayCol !== -1 ? row[dayCol] : '').trim().toLowerCase();
    let normalizedDay: DayName | null = null;
    if (rawDay.startsWith('mon')) normalizedDay = 'Monday';
    else if (rawDay.startsWith('tue')) normalizedDay = 'Tuesday';
    else if (rawDay.startsWith('wed')) normalizedDay = 'Wednesday';
    else if (rawDay.startsWith('thu')) normalizedDay = 'Thursday';
    else if (rawDay.startsWith('fri')) normalizedDay = 'Friday';
    else if (rawDay.startsWith('sat')) normalizedDay = 'Saturday';

    if (!normalizedDay || !dayMap[normalizedDay]) continue;

    const periodNum = parseInt(row[periodCol] || '1', 10) || (dayMap[normalizedDay].length + 1);
    const timings = (timeCol !== -1 ? row[timeCol] : '') || '09:15 AM - 10:15 AM';
    const subjectCode = (codeCol !== -1 ? row[codeCol] : '') || `LEC ${periodNum}`;
    const subjectName = (nameCol !== -1 ? row[nameCol] : '') || subjectCode;
    const room = (roomCol !== -1 ? row[roomCol] : '') || 'Room 304';
    const faculty = facultyCol !== -1 ? row[facultyCol] : undefined;
    const rawType = (typeCol !== -1 ? row[typeCol] : '').trim().toLowerCase();
    const type: 'Theory' | 'Lab' | 'Tutorial' = rawType.includes('lab')
      ? 'Lab'
      : rawType.includes('tut')
      ? 'Tutorial'
      : 'Theory';

    dayMap[normalizedDay].push({
      id: `lec-${normalizedDay}-${periodNum}-${i}`,
      period: periodNum,
      periodLabel: `Lec ${periodNum}`,
      timings: timings.trim(),
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      room: room.trim(),
      faculty: faculty ? faculty.trim() : undefined,
      type,
    });
  }

  const result: DaySchedule[] = DAYS_OF_WEEK.map((d) => {
    const list = dayMap[d.full] || [];
    list.sort((a, b) => a.period - b.period);
    return {
      day: d.full,
      shortDay: d.short,
      lectures: list,
    };
  });

  return result.some((d) => d.lectures.length > 0) ? result : [];
};

export const timetableService = {
  /**
   * Fetch timetable for a specific semester directly from Google Sheets (NO cache, NO localStorage)
   */
  async fetchTimetable(semester: number = 3, _forceRefresh = false): Promise<TimetableResponse> {
    const sheetId = TIMETABLE_SPREADSHEET_ID;
    if (sheetId && sheetId.trim().length > 5) {
      const endpoints = [
        `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sem-${semester}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Semester%20${semester}`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
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
            const csv = await res.text();
            if (csv && csv.length > 50 && !csv.includes('<!DOCTYPE html>')) {
              const parsed = parseTimetableCSV(csv, semester);
              if (parsed.length > 0) {
                return { success: true, data: parsed };
              }
            }
          }
        } catch {}
      }
    }

    // Clean empty schedule when no sheet rows found (Zero demo data)
    const emptySchedule = createEmptyWeekSchedule();
    return {
      success: true,
      data: emptySchedule,
      isFallback: false,
    };
  },

  /**
   * Save / update timetable directly to Google Sheet database (NO local storage)
   */
  async saveTimetable(semester: number, data: DaySchedule[]): Promise<{ success: boolean; sheetSynced?: boolean; error?: string }> {
    try {
      // Sync directly to Google Sheet via admin backend
      const { adminSheetService } = await import('./adminSheetService');
      const syncRes = await adminSheetService.saveTimetableToSheet(semester, data);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('timetable_updated', { detail: { semester, data } }));
      }

      return { success: syncRes.success, sheetSynced: syncRes.success, error: syncRes.error };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save timetable' };
    }
  },

  /**
   * Clear timetable cache from browser storage
   */
  clearCache() {
    if (typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.includes('timetable')) {
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
          if (k && k.includes('timetable')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {}
    }
  },
};

// Immediately purge legacy timetable keys on module load
timetableService.clearCache();


