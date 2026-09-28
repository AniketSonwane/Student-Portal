import { Student } from '../types/auth';

export const PROFILE_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_PROFILE_ID as string) ||
  '18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k';

/**
 * Clean cell values: if empty, whitespace, or invalid -> returns 'NA'
 */
export const cleanProfileValue = (v: string | undefined | null): string => {
  if (!v) return 'NA';
  const t = v.trim();
  if (
    !t ||
    t === '""' ||
    t === "''" ||
    t.toUpperCase() === 'N/A' ||
    t.toUpperCase() === 'NA' ||
    t === '-'
  ) {
    return 'NA';
  }
  return t;
};

/**
 * Universal CSV row parser handling quotes and newlines
 */
export function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += c;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse Profile Google Sheet CSV text into Student records
 */
export function parseProfileCSV(csvText: string): Student[] {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) return [];

  const students: Student[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3 || !r[1]) continue;

    const srNo = cleanProfileValue(r[0]);
    const usn = cleanProfileValue(r[1]);
    const name = cleanProfileValue(r[2]);
    const collegeEmail = cleanProfileValue(r[3]);
    const personalEmail = cleanProfileValue(r[4]);
    const phone = cleanProfileValue(r[5]);
    const gender = cleanProfileValue(r[6]);
    const bloodGroup = cleanProfileValue(r[7]);
    const ageRaw = cleanProfileValue(r[8]);
    const dob = cleanProfileValue(r[9]);
    const pob = cleanProfileValue(r[10]);
    const leetcode = cleanProfileValue(r[11]);
    const linkedin = cleanProfileValue(r[12]);
    const github = cleanProfileValue(r[13]);
    const insta = cleanProfileValue(r[14]);
    const cgpa = cleanProfileValue(r[15]);
    const currentSemRaw = cleanProfileValue(r[16]);
    const currentYearRaw = cleanProfileValue(r[17]);
    const category = cleanProfileValue(r[18]);

    const currentSem =
      currentSemRaw !== 'NA' ? parseInt(currentSemRaw, 10) || 3 : 3;

    let collegeYear = 'NA';
    if (currentYearRaw !== 'NA') {
      if (currentYearRaw === '1') collegeYear = '1st Year';
      else if (currentYearRaw === '2') collegeYear = '2nd Year';
      else if (currentYearRaw === '3') collegeYear = '3rd Year';
      else if (currentYearRaw === '4') collegeYear = '4th Year';
      else collegeYear = `Year ${currentYearRaw}`;
    }

    students.push({
      student_id: usn,
      usn,
      google_email:
        collegeEmail !== 'NA'
          ? collegeEmail
          : `${usn.toLowerCase()}@student.college.edu`,
      name,
      college_email: collegeEmail,
      personal_email: personalEmail,
      phone,
      gender,
      blood_group: bloodGroup,
      age: ageRaw !== 'NA' ? parseInt(ageRaw, 10) || ageRaw : 'NA',
      dob,
      address: pob !== 'NA' ? pob : 'NA',
      pob: pob !== 'NA' ? pob : 'NA',
      category,
      cgpa,
      current_semester: currentSem,
      college_year: collegeYear,
      sr_no: srNo,
      socials: {
        github,
        instagram: insta,
        leetcode,
        linkedin,
      },
    });
  }

  return students;
}

import { AUTHORIZED_STUDENTS_ROSTER } from '../data/studentsRoster';

// In-memory cache for loaded profile directory, initialized with the 68 authorized students
let cachedProfileDirectory: Student[] = [...AUTHORIZED_STUDENTS_ROSTER];

export const profileService = {
  /**
   * Fetch all student profile records from Google Sheet with fallback
   */
  async fetchAllStudents(forceRefresh = false): Promise<{
    success: boolean;
    data: Student[];
    error?: string;
  }> {
    if (!forceRefresh && cachedProfileDirectory && cachedProfileDirectory.length > 0) {
      return { success: true, data: cachedProfileDirectory };
    }

    const spreadsheetId = PROFILE_SPREADSHEET_ID;
    const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : '';
    const endpoints = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${cacheBuster}`,
      `/.netlify/functions/marks?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
      `/api/sheets-proxy/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${cacheBuster}`,
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
      if (cachedProfileDirectory && cachedProfileDirectory.length > 0) {
        return { success: true, data: cachedProfileDirectory };
      }
      return {
        success: false,
        data: [],
        error: `Unable to fetch Profile Google Sheet: ${lastError || 'Empty response'}`,
      };
    }

    try {
      const parsed = parseProfileCSV(csvText);
      if (parsed.length === 0) {
        return {
          success: false,
          data: cachedProfileDirectory || [],
          error: 'No valid student records found in Profile Google Sheet.',
        };
      }

      cachedProfileDirectory = parsed;
      return { success: true, data: parsed };
    } catch (err: any) {
      return {
        success: false,
        data: cachedProfileDirectory || [],
        error: `Failed to parse Profile Google Sheet: ${err?.message || 'Invalid format'}`,
      };
    }
  },

  /**
   * Get student profile by USN directly from Google Sheet
   */
  async getStudentByUsn(usn: string, forceRefresh = false): Promise<Student | null> {
    const cleanUsn = usn.trim().toUpperCase();
    const res = await this.fetchAllStudents(forceRefresh);
    const student = res.data.find(
      (s) => s.usn.trim().toUpperCase() === cleanUsn
    );
    return student || null;
  },

  /**
   * Get student profile by email (college_email or google_email)
   */
  async getStudentByEmail(email: string, forceRefresh = false): Promise<Student | null> {
    const cleanEmail = email.trim().toLowerCase();
    const res = await this.fetchAllStudents(forceRefresh);
    const student = res.data.find(
      (s) =>
        (s.college_email && s.college_email.toLowerCase() === cleanEmail) ||
        (s.google_email && s.google_email.toLowerCase() === cleanEmail)
    );
    return student || null;
  },

  /**
   * Get synchronous in-memory loaded roster
   */
  getAllLocal(): Student[] {
    return cachedProfileDirectory || [];
  },
};
