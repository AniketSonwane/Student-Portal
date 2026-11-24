import { StudentAttendanceRecord, SubjectAttendance } from '../types/attendance';
import { parseCSV } from './sheetParser';
import { STUDENT_MDM_ALLOCATIONS, STUDENT_OE_ALLOCATIONS } from '../config/electiveAllocations';

const ATTENDANCE_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_ATTENDANCE_ID as string) || '';

// In-memory cache for attendance records per semester
const attendanceCache = new Map<number, StudentAttendanceRecord[]>();

function getAttendanceStatus(pct: number): 'Safe' | 'Warning' | 'Critical' {
  if (pct >= 75) return 'Safe';
  if (pct >= 65) return 'Warning';
  return 'Critical';
}

function extractTotalFromHeader(headerCell?: string): number | undefined {
  if (!headerCell) return undefined;
  const match = headerCell.match(/\[(\d+)\]/);
  return match ? parseInt(match[1], 10) : undefined;
}

function parseAttendanceRow(
  r: string[],
  semester: number,
  headerRow?: string[]
): StudentAttendanceRecord | null {
  const srn = (r[0] || '').trim();
  const usn = (r[1] || '').trim();
  const name = (r[2] || '').trim();

  if (!usn || !name || usn.toLowerCase().includes('usn')) {
    return null;
  }

  const cleanUsn = usn.toUpperCase();
  const mdmAlloc = STUDENT_MDM_ALLOCATIONS[cleanUsn];
  const oeAlloc = STUDENT_OE_ALLOCATIONS[cleanUsn];

  const isNewLayout = r.length >= 20 || (headerRow && headerRow.length >= 20);
  const subjects: SubjectAttendance[] = [];

  if (isNewLayout) {
    // 1. Common Subjects for all students with (Attended, Percentage) column pairs
    const commonDefs = [
      { code: 'CAO', name: 'Computer Architecture and Organization', attCol: 3, pctCol: 4, fallbackTotal: 36 },
      { code: 'DSA', name: 'Data Structures & Algorithms', attCol: 5, pctCol: 6, fallbackTotal: 31 },
      { code: 'DSAL', name: 'Data Structures & Algorithms Lab', attCol: 7, pctCol: 8, fallbackTotal: 12 },
      { code: 'ED', name: 'Entrepreneurship Development', attCol: 9, pctCol: 10, fallbackTotal: 21 },
      { code: 'DMGT', name: 'Discrete Mathematics & Graph Theory', attCol: 11, pctCol: 12, fallbackTotal: 52 },
      { code: 'ES', name: 'Environmental Studies', attCol: 13, pctCol: 14, fallbackTotal: 21 },
      { code: 'FCC', name: 'Fundamentals of Cloud Computing Lab', attCol: 15, pctCol: 16, fallbackTotal: 10 },
    ];

    for (const def of commonDefs) {
      const rawAtt = r[def.attCol];
      const cleanAtt = rawAtt ? rawAtt.trim() : '';
      const numAtt = parseFloat(cleanAtt);
      const hasAtt = !isNaN(numAtt);

      const rawPct = r[def.pctCol];
      const cleanPct = rawPct ? rawPct.trim().replace('%', '') : '';
      const numPct = parseFloat(cleanPct);
      const hasPct = !isNaN(numPct);

      const total = (headerRow ? extractTotalFromHeader(headerRow[def.attCol]) : undefined) ?? def.fallbackTotal;
      const attended = hasAtt ? Math.round(numAtt) : undefined;
      const pctStr = hasPct ? numPct.toFixed(2) : (cleanPct || '-');
      const finalPct = hasPct ? numPct : (attended !== undefined && total ? (attended / total) * 100 : 0);

      subjects.push({
        code: def.code,
        name: def.name,
        percentage: pctStr,
        numericPercentage: finalPct,
        attendedLectures: attended,
        totalLectures: total,
        attendedDisplay:
          attended !== undefined && total
            ? `${attended} / ${total}`
            : attended !== undefined
            ? `${attended}`
            : undefined,
        isAllotted: true,
        status: getAttendanceStatus(finalPct),
        category: 'Common',
      });
    }

    // 2. Respected MDM Course Name & Theory Attendance (Col 17: Attended, Col 18: Percentage)
    const mdmAttRaw = r[17];
    const mdmPctRaw = r[18];
    const mdmPctClean = mdmPctRaw ? mdmPctRaw.trim().replace('%', '') : '';
    if (mdmPctClean && mdmPctClean !== '-' && !mdmPctClean.includes('#')) {
      const numPct = parseFloat(mdmPctClean);
      const hasPct = !isNaN(numPct);
      const numAtt = parseFloat(mdmAttRaw || '');
      const hasAtt = !isNaN(numAtt);
      const attended = hasAtt ? Math.round(numAtt) : undefined;
      const pctStr = hasPct ? numPct.toFixed(2) : mdmPctClean;
      const finalPct = hasPct ? numPct : 0;

      subjects.push({
        code: mdmAlloc ? mdmAlloc.code : 'MDM',
        name: mdmAlloc ? mdmAlloc.name : 'MDM Theory',
        percentage: pctStr,
        numericPercentage: finalPct,
        attendedLectures: attended,
        totalLectures: undefined,
        attendedDisplay: attended !== undefined ? `${attended}` : undefined,
        isAllotted: true,
        status: getAttendanceStatus(finalPct),
        category: 'MDM',
      });
    }

    // 3. Respected MDM Lab Attendance (Col 19: Attended, Col 20: Percentage)
    const mdmLabAttRaw = r[19];
    const mdmLabPctRaw = r[20];
    const mdmLabPctClean = mdmLabPctRaw ? mdmLabPctRaw.trim().replace('%', '') : '';
    if (mdmLabPctClean && mdmLabPctClean !== '-' && !mdmLabPctClean.includes('#')) {
      const numPct = parseFloat(mdmLabPctClean);
      const hasPct = !isNaN(numPct);
      const numAtt = parseFloat(mdmLabAttRaw || '');
      const hasAtt = !isNaN(numAtt);
      const attended = hasAtt ? Math.round(numAtt) : undefined;
      const pctStr = hasPct ? numPct.toFixed(2) : mdmLabPctClean;
      const finalPct = hasPct ? numPct : 0;

      subjects.push({
        code: mdmAlloc?.labCode ? mdmAlloc.labCode : 'MDML',
        name: mdmAlloc?.labName ? mdmAlloc.labName : 'MDM Lab',
        percentage: pctStr,
        numericPercentage: finalPct,
        attendedLectures: attended,
        totalLectures: undefined,
        attendedDisplay: attended !== undefined ? `${attended}` : undefined,
        isAllotted: true,
        status: getAttendanceStatus(finalPct),
        category: 'MDM',
      });
    }

    // 4. Respected Open Elective Attendance (Col 21: Attended, Col 22: Percentage)
    const oeAttRaw = r[21];
    const oePctRaw = r[22];
    const oePctClean = oePctRaw ? oePctRaw.trim().replace('%', '') : '';
    if (oePctClean && oePctClean !== '-' && !oePctClean.includes('#')) {
      const numPct = parseFloat(oePctClean);
      const hasPct = !isNaN(numPct);
      const numAtt = parseFloat(oeAttRaw || '');
      const hasAtt = !isNaN(numAtt);
      const attended = hasAtt ? Math.round(numAtt) : undefined;
      const pctStr = hasPct ? numPct.toFixed(2) : oePctClean;
      const finalPct = hasPct ? numPct : 0;

      subjects.push({
        code: oeAlloc ? oeAlloc.code : 'OE',
        name: oeAlloc ? oeAlloc.name : 'Open Elective (OE)',
        percentage: pctStr,
        numericPercentage: finalPct,
        attendedLectures: attended,
        totalLectures: undefined,
        attendedDisplay: attended !== undefined ? `${attended}` : undefined,
        isAllotted: true,
        status: getAttendanceStatus(finalPct),
        category: 'OE',
      });
    }

    // Overall Average calculation (Col 23 in new layout)
    const rawAvg = (r[23] || '').trim().replace('%', '');
    const numAvg = parseFloat(rawAvg);
    const isValidAvg = !isNaN(numAvg);

    // Compute student's true average from enrolled subjects
    const enrolledAvg =
      subjects.length > 0
        ? subjects.reduce((acc, s) => acc + s.numericPercentage, 0) / subjects.length
        : 0;

    // In the Google Sheet, the faculty's formula in column 23 divides attended by 261
    // (the sum of all electives including unallotted ones), which falsely deflates enrolled students'
    // averages down to 50-68% (falsely indicating attendance shortage/warning).
    // If the sheet's average is deflated compared to the enrolled courses average,
    // we use the student's true enrolled courses average.
    const finalAvg =
      isValidAvg && Math.abs(numAvg - enrolledAvg) < 5
        ? numAvg
        : enrolledAvg > 0
        ? enrolledAvg
        : isValidAvg
        ? numAvg
        : 0;

    const totalAttended = subjects.reduce((sum, s) => sum + (s.attendedLectures || 0), 0);
    const totalDelivered = subjects.reduce((sum, s) => sum + (s.totalLectures || 0), 0);

    return {
      srn,
      usn,
      name,
      semester,
      subjects,
      totalAverage: finalAvg.toFixed(2),
      numericAverage: finalAvg,
      totalAttendedLectures: totalAttended > 0 ? totalAttended : undefined,
      totalDeliveredLectures: totalDelivered > 0 ? totalDelivered : undefined,
      status: getAttendanceStatus(finalAvg),
    };
  }

  // Fallback: Legacy 14-column layout
  const commonDefs = [
    { code: 'CAO', name: 'Computer Architecture and Organization', col: 3 },
    { code: 'DSA', name: 'Data Structures & Algorithms', col: 4 },
    { code: 'DSAL', name: 'Data Structures & Algorithms Lab', col: 5 },
    { code: 'ED', name: 'Entrepreneurship Development', col: 6 },
    { code: 'DMGT', name: 'Discrete Mathematics & Graph Theory', col: 7 },
    { code: 'ES', name: 'Environmental Studies', col: 8 },
    { code: 'FCC', name: 'Fundamentals of Cloud Computing Lab', col: 9 },
  ];

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

  // Legacy MDM Theory (Col 10)
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

  // Legacy MDM Lab (Col 11)
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

  // Legacy OE (Col 12)
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

  // Legacy Overall Average (Col 13)
  const rawAvg = (r[13] || '').trim().replace('%', '');
  const numAvg = parseFloat(rawAvg);
  const isValidAvg = !isNaN(numAvg);

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

    // 1. Check in-memory cache
    if (attendanceCache.has(semester)) {
      return { success: true, data: attendanceCache.get(semester)! };
    }

    // 2. Check session storage cache
    const sessionKey = `student_portal_attendance_sem_${semester}`;
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(sessionKey) : null;
      if (stored) {
        const parsedStored: StudentAttendanceRecord[] = JSON.parse(stored);
        if (parsedStored && parsedStored.length > 0) {
          attendanceCache.set(semester, parsedStored);
          return { success: true, data: parsedStored };
        }
      }
    } catch {}

    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
      `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(
        ATTENDANCE_SPREADSHEET_ID
      )}&sheet=Sheet1`,
      `https://docs.google.com/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/export?format=csv`,
      `/api/sheets-proxy/spreadsheets/d/${ATTENDANCE_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
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
      const headerRow = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const item = parseAttendanceRow(rows[i], semester, headerRow);
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
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(records));
      } catch {}
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
