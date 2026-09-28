import { StudentAttendanceRecord, SubjectAttendance } from '../types/attendance';
import { parseCSV } from './sheetParser';
import { STUDENT_MDM_ALLOCATIONS, STUDENT_OE_ALLOCATIONS } from '../config/electiveAllocations';

const ATTENDANCE_SPREADSHEET_ID = '1M550WSsFjWpiYFxqIIDP0GQJk4G8XGzjyuHIng0rryg';

// In-memory cache for attendance records per semester
const attendanceCache = new Map<number, StudentAttendanceRecord[]>();

function getAttendanceStatus(pct: number): 'Safe' | 'Warning' | 'Critical' {
  if (pct >= 75) return 'Safe';
  if (pct >= 65) return 'Warning';
  return 'Critical';
}

function parseAttendanceRow(r: string[], semester: number): StudentAttendanceRecord | null {
  const srn = (r[0] || '').trim();
  const usn = (r[1] || '').trim();
  const name = (r[2] || '').trim();

  if (!usn || !name || usn.toLowerCase().includes('usn')) {
    return null;
  }

  const cleanUsn = usn.toUpperCase();
  const mdmAlloc = STUDENT_MDM_ALLOCATIONS[cleanUsn];
  const oeAlloc = STUDENT_OE_ALLOCATIONS[cleanUsn];

  // 1. Common Subjects for all students
  const commonDefs = [
    { code: 'CAO', name: 'Computer Architecture and Organization', col: 3 },
    { code: 'DSA', name: 'Data Structures & Algorithms', col: 4 },
    { code: 'DSAL', name: 'Data Structures & Algorithms Lab', col: 5 },
    { code: 'ED', name: 'Entrepreneurship Development', col: 6 },
    { code: 'DMGT', name: 'Discrete Mathematics & Graph Theory', col: 7 },
    { code: 'ES', name: 'Environmental Studies', col: 8 },
    { code: 'FCC', name: 'Fundamentals of Cloud Computing Lab', col: 9 },
  ];

  const subjects: SubjectAttendance[] = [];

  for (const def of commonDefs) {
    const rawVal = r[def.col];
    const clean = rawVal ? rawVal.trim().replace('%', '') : '';
    const num = parseFloat(clean);
    const isValid = !isNaN(num);
    const pctStr = isValid ? num.toFixed(2) : (clean || '-');
    const numPct = isValid ? num : 0;

    subjects.push({
      code: def.code,
      name: def.name,
      percentage: pctStr,
      numericPercentage: numPct,
      isAllotted: true,
      status: getAttendanceStatus(numPct),
      category: 'Common',
    });
  }

  // 2. Respected MDM Course Name & Theory Attendance (Col 10)
  const mdmRaw = r[10];
  const mdmClean = mdmRaw ? mdmRaw.trim().replace('%', '') : '';
  if (mdmClean && mdmClean !== '-' && !mdmClean.includes('#')) {
    const num = parseFloat(mdmClean);
    const isValid = !isNaN(num);
    const pctStr = isValid ? num.toFixed(2) : mdmClean;
    const numPct = isValid ? num : 0;

    subjects.push({
      code: mdmAlloc ? mdmAlloc.code : 'MDM',
      name: mdmAlloc ? mdmAlloc.name : 'MDM Theory',
      percentage: pctStr,
      numericPercentage: numPct,
      isAllotted: true,
      status: getAttendanceStatus(numPct),
      category: 'MDM',
    });
  }

  // 3. Respected MDM Lab Attendance (Col 11) - included only for students with lab
  const mdmLabRaw = r[11];
  const mdmLabClean = mdmLabRaw ? mdmLabRaw.trim().replace('%', '') : '';
  if (mdmLabClean && mdmLabClean !== '-' && !mdmLabClean.includes('#')) {
    const num = parseFloat(mdmLabClean);
    const isValid = !isNaN(num);
    const pctStr = isValid ? num.toFixed(2) : mdmLabClean;
    const numPct = isValid ? num : 0;

    subjects.push({
      code: mdmAlloc?.labCode ? mdmAlloc.labCode : 'MDML',
      name: mdmAlloc?.labName ? mdmAlloc.labName : 'MDM Lab',
      percentage: pctStr,
      numericPercentage: numPct,
      isAllotted: true,
      status: getAttendanceStatus(numPct),
      category: 'MDM',
    });
  }

  // 4. Respected Open Elective Attendance (Col 12) - included only for students with OE
  const oeRaw = r[12];
  const oeClean = oeRaw ? oeRaw.trim().replace('%', '') : '';
  if (oeClean && oeClean !== '-' && !oeClean.includes('#')) {
    const num = parseFloat(oeClean);
    const isValid = !isNaN(num);
    const pctStr = isValid ? num.toFixed(2) : oeClean;
    const numPct = isValid ? num : 0;

    subjects.push({
      code: oeAlloc ? oeAlloc.code : 'OE',
      name: oeAlloc ? oeAlloc.name : 'Open Elective (OE)',
      percentage: pctStr,
      numericPercentage: numPct,
      isAllotted: true,
      status: getAttendanceStatus(numPct),
      category: 'OE',
    });
  }

  // Overall Average
  const rawAvg = (r[13] || '').trim().replace('%', '');
  const numAvg = parseFloat(rawAvg);
  const isValidAvg = !isNaN(numAvg);

  // If Average is not directly computed in sheet, calculate from subject numbers
  const finalAvg = isValidAvg
    ? numAvg
    : subjects.length > 0
    ? subjects.reduce((acc, s) => acc + s.numericPercentage, 0) / subjects.length
    : 0;

  return {
    srn,
    usn,
    name,
    semester,
    subjects,
    totalAverage: finalAvg.toFixed(2),
    numericAverage: finalAvg,
    status: getAttendanceStatus(finalAvg),
  };
}

export const attendanceService = {
  /**
   * Fetch all student attendance records for a semester
   */
  async fetchSemesterAttendance(
    semester: number
  ): Promise<{
    success: boolean;
    data?: StudentAttendanceRecord[];
    isUnavailable?: boolean;
    error?: string;
  }> {
    // Only Semester 3 is currently available in the attendance sheet
    if (semester !== 3) {
      return {
        success: false,
        isUnavailable: true,
        error: `Attendance records for Semester ${semester} are not available yet.`,
      };
    }

    // Check cache
    if (attendanceCache.has(semester)) {
      return { success: true, data: attendanceCache.get(semester)! };
    }

    const endpoints = [
      `/api/sheets-proxy/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
      `https://docs.google.com/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
      `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(
        ATTENDANCE_SPREADSHEET_ID
      )}&sheet=Sheet1`,
      `https://docs.google.com/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/export?format=csv`,
    ];

    let csvText: string | null = null;
    let lastError = '';

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
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
        error: `Unable to fetch Semester ${semester} Attendance Sheet. ${lastError}`.trim(),
      };
    }

    try {
      const rows = parseCSV(csvText);
      const records: StudentAttendanceRecord[] = [];

      for (let i = 1; i < rows.length; i++) {
        const item = parseAttendanceRow(rows[i], semester);
        if (item) {
          records.push(item);
        }
      }

      if (records.length === 0) {
        return {
          success: false,
          error: `No valid student records found in Semester ${semester} Attendance Sheet.`,
        };
      }

      attendanceCache.set(semester, records);
      return { success: true, data: records };
    } catch (parseErr: any) {
      return {
        success: false,
        error: `Failed to parse Attendance Sheet: ${parseErr?.message || 'Invalid format'}`,
      };
    }
  },

  /**
   * Retrieve attendance record for a specific student USN and semester
   */
  async getStudentAttendance(
    usn: string,
    semester: number = 3
  ): Promise<{
    success: boolean;
    data?: StudentAttendanceRecord;
    isUnavailable?: boolean;
    error?: string;
  }> {
    if (semester !== 3) {
      return {
        success: false,
        isUnavailable: true,
        error: `Attendance records for Semester ${semester} are not available.`,
      };
    }

    const res = await this.fetchSemesterAttendance(semester);
    if (!res.success || !res.data) {
      return {
        success: false,
        isUnavailable: res.isUnavailable,
        error: res.error || `Semester ${semester} attendance is not available.`,
      };
    }

    const cleanUsn = usn.trim().toUpperCase();
    const student = res.data.find((s) => s.usn.trim().toUpperCase() === cleanUsn);

    if (!student) {
      return {
        success: false,
        error: `No attendance record found for USN: ${usn} in Semester ${semester}.`,
      };
    }

    return { success: true, data: student };
  },
};
