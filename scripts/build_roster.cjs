const fs = require('fs');
const path = require('path');

async function build() {
  const url = 'https://docs.google.com/spreadsheets/d/18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k/gviz/tq?tqx=out:csv';
  const res = await fetch(url);
  const text = await res.text();

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
        if (currentRow.some(col => col.length > 0)) {
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
      if (currentRow.some(col => col.length > 0)) {
        rows.push(currentRow);
      }
    }
    return rows;
  }

  const rows = parseCSVRows(text);
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

  console.log(`Parsed ${students.length} students from Google Sheet.`);

  const dir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileContent = `import { Student } from '../types/auth';

/**
 * 68 Authorized Students synced from Google Sheet (ID: 18HdmD-3Ae0gZ_jlVOjBWjQaidlSG9aezDepjggong9k)
 * Only the 68 college email IDs listed here are authorized to log in.
 */
export const AUTHORIZED_STUDENTS_ROSTER: Student[] = ${JSON.stringify(students, null, 2)};

/**
 * Quick set of lowercase authorized college email IDs for O(1) authorization checks
 */
export const AUTHORIZED_COLLEGE_EMAILS: Set<string> = new Set(
  AUTHORIZED_STUDENTS_ROSTER
    .map((s) => (s.college_email || '').trim().toLowerCase())
    .filter((email) => email.length > 0 && email !== 'na')
);
`;

  fs.writeFileSync(path.join(dir, 'studentsRoster.ts'), fileContent, 'utf8');
  console.log('Saved src/data/studentsRoster.ts successfully!');
}

build();
