const fs = require('fs');

function parseCSV(text) {
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

const text = fs.readFileSync('master_sheet.csv', 'utf8');
const rows = parseCSV(text);

const roster = [];

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[0] || !r[1]) continue;

  const usn = r[0];
  const rawName = r[1];
  // Title case name
  const name = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const emailPart = rawName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
  const google_email = `${emailPart}@student.college.edu`;

  roster.push({
    student_id: `STU-${usn}`,
    usn,
    google_email,
    name,
    current_semester: 1,
    college_year: '1st Year',
    college_email: `${emailPart}@college.edu`,
    personal_email: google_email,
    phone: '+91 98765 00000',
    blood_group: 'O+',
  });
}

const content = `import { Student } from '../types/auth';

export const ALL_STUDENTS_ROSTER: Student[] = ${JSON.stringify(roster, null, 2)};
`;

fs.writeFileSync('src/data/studentsRoster.ts', content, 'utf8');
console.log('Successfully wrote', roster.length, 'students to src/data/studentsRoster.ts');
