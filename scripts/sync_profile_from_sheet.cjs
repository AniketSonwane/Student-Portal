const fs = require('fs');

const SHEET_URL = 'http://localhost:3000/api/sheets-proxy/spreadsheets/d/18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k/gviz/tq?tqx=out:csv';

function cleanVal(v) {
  if (!v) return 'NA';
  const t = v.trim();
  if (!t || t === '""' || t === "''" || t.toUpperCase() === 'N/A' || t.toUpperCase() === 'NA' || t === '-') {
    return 'NA';
  }
  return t;
}

function parseCSVRows(text) {
  const rows = [];
  let currentRow = [];
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

async function run() {
  console.log('Fetching live profile Google Sheet...');
  let csvText = '';
  try {
    const res = await fetch(SHEET_URL);
    csvText = await res.text();
  } catch (err) {
    console.error('Fetch error:', err);
    process.exit(1);
  }

  const rows = parseCSVRows(csvText);
  console.log('Found rows:', rows.length);
  if (rows.length < 2) {
    console.error('Not enough rows in sheet');
    process.exit(1);
  }

  const students = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 3 || !r[1]) continue;

    const srNo = cleanVal(r[0]);
    const usn = cleanVal(r[1]);
    const name = cleanVal(r[2]);
    const collegeEmail = cleanVal(r[3]);
    const personalEmail = cleanVal(r[4]);
    const phone = cleanVal(r[5]);
    const gender = cleanVal(r[6]);
    const bloodGroup = cleanVal(r[7]);
    const ageRaw = cleanVal(r[8]);
    const dob = cleanVal(r[9]);
    const pob = cleanVal(r[10]);
    const leetcode = cleanVal(r[11]);
    const linkedin = cleanVal(r[12]);
    const github = cleanVal(r[13]);
    const insta = cleanVal(r[14]);
    const cgpa = cleanVal(r[15]);
    const currentSemRaw = cleanVal(r[16]);
    const currentYearRaw = cleanVal(r[17]);
    const category = cleanVal(r[18]);

    const currentSem = currentSemRaw !== 'NA' ? parseInt(currentSemRaw, 10) || 3 : 3;
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
      google_email: collegeEmail !== 'NA' ? collegeEmail : `${usn.toLowerCase()}@student.college.edu`,
      name,
      college_email: collegeEmail,
      personal_email: personalEmail,
      phone,
      gender,
      blood_group: bloodGroup,
      age: ageRaw !== 'NA' ? parseInt(ageRaw, 10) || ageRaw : 'NA',
      dob,
      address: pob,
      pob,
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

  console.log('Parsed students count:', students.length);
  const aniket = students.find((s) => s.usn === 'CS25131');
  console.log('Aniket in parsed sheet:', JSON.stringify(aniket, null, 2));

  // Write src/data/studentsRoster.ts
  const rosterTs = `// Synchronized student directory dataset from Google Spreadsheet
// Spreadsheet ID: 18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k
import { Student } from '../types/auth';

export const ALL_STUDENTS_ROSTER: Student[] = ${JSON.stringify(students, null, 2)};
`;

  fs.writeFileSync('src/data/studentsRoster.ts', rosterTs, 'utf8');
  console.log('Updated src/data/studentsRoster.ts successfully');

  // Update netlify/lib/studentRepository.ts
  const repoTs = `// In-memory / spreadsheet-synced roster for student authorization verification
export interface AuthorizedStudentRecord {
  student_id: string;
  usn: string;
  google_email: string;
  name: string;
  profile_image?: string;
  current_semester: number;
  college_year: string;
  college_email?: string;
  personal_email?: string;
  phone?: string;
  dob?: string;
  pob?: string;
  address?: string;
  category?: string;
  blood_group?: string;
  gender?: string;
  cgpa?: string | number;
  sr_no?: string;
  socials?: {
    github?: string;
    instagram?: string;
    leetcode?: string;
    linkedin?: string;
  };
}

export const INITIAL_STUDENT_ROSTER: AuthorizedStudentRecord[] = ${JSON.stringify(students, null, 2)};

export async function findStudentByGoogleEmail(email: string): Promise<AuthorizedStudentRecord | null> {
  const normalized = email.trim().toLowerCase();
  const match = INITIAL_STUDENT_ROSTER.find(
    (student) =>
      student.google_email.toLowerCase() === normalized ||
      (student.college_email && student.college_email.toLowerCase() === normalized) ||
      (student.personal_email && student.personal_email.toLowerCase() === normalized) ||
      student.usn.toLowerCase() === normalized
  );
  return match || null;
}

export async function findStudentByUsn(usn: string): Promise<AuthorizedStudentRecord | null> {
  const normalized = usn.trim().toUpperCase();
  const match = INITIAL_STUDENT_ROSTER.find(
    (student) => student.usn.toUpperCase() === normalized
  );
  return match || null;
}
`;

  fs.writeFileSync('netlify/lib/studentRepository.ts', repoTs, 'utf8');
  console.log('Updated netlify/lib/studentRepository.ts successfully');
}

run();
