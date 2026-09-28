const fs = require('fs');

function cleanCell(val, fallback = '-') {
  if (!val) return fallback;
  const s = val.trim();
  if (s === '#REF!' || s === '#NUM!' || s === '#VALUE!' || s === '#N/A' || s === '') {
    return fallback;
  }
  return s;
}

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

function parseSemester3Layout(rows, semester) {
  const students = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    if (!usn || !name || usn.toLowerCase().includes('usn')) continue;

    const rawCredits = cleanCell(r[168], 'In Progress');
    const rawSgpa = cleanCell(r[169], 'In Progress');
    const rawStatus = cleanCell(r[170], 'In Progress');

    const subjects = [
      {
        code: 'DMGT',
        name: 'Discrete Mathematics & Graph Theory',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 40, score: cleanCell(r[2]) },
          { name: 'CAE-2', max: 40, score: cleanCell(r[3]) },
          { name: 'TAE-1', max: 10, score: cleanCell(r[4]) },
          { name: 'TAE-2', max: 5, score: cleanCell(r[5]) },
          { name: 'TAE-3', max: 5, score: cleanCell(r[6]) },
          { name: 'Internals', max: 40, score: cleanCell(r[8]) },
          { name: 'ESE', max: 60, score: cleanCell(r[7]) },
        ],
        total: cleanCell(r[9]),
        maxTotal: 100,
        grade: cleanCell(r[10], 'IP'),
        gradePoint: cleanCell(r[146]),
        creditPoints: cleanCell(r[157]),
      },
      {
        code: 'CAO',
        name: 'Computer Architecture & Organization',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[11]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[12]) },
          { name: 'TAE-1', max: 5, score: cleanCell(r[13]) },
          { name: 'TAE-2', max: 2.5, score: cleanCell(r[14]) },
          { name: 'TAE-3', max: 2.5, score: cleanCell(r[15]) },
          { name: 'Internals', max: 20, score: cleanCell(r[17]) },
          { name: 'ESE', max: 30, score: cleanCell(r[16]) },
        ],
        total: cleanCell(r[18]),
        maxTotal: 50,
        grade: cleanCell(r[19], 'IP'),
        gradePoint: cleanCell(r[147]),
        creditPoints: cleanCell(r[158]),
      },
      {
        code: 'DSA',
        name: 'Data Structures and Algorithms',
        type: 'Theory',
        assessments: [
          { name: 'Unit Test 1', max: 30, score: cleanCell(r[20]) },
          { name: 'Unit Test 2', max: 30, score: cleanCell(r[21]) },
          { name: 'Unit Test 3', max: 30, score: cleanCell(r[22]) },
          { name: 'Unit Test 4', max: 30, score: cleanCell(r[23]) },
          { name: 'Unit Test 5', max: 30, score: cleanCell(r[24]) },
          { name: 'Unit Test 6', max: 30, score: cleanCell(r[25]) },
          { name: 'Internals', max: 40, score: cleanCell(r[27]) },
          { name: 'ESE', max: 30, score: cleanCell(r[26]) },
        ],
        total: cleanCell(r[28]),
        maxTotal: 100,
        grade: cleanCell(r[29], 'IP'),
        gradePoint: cleanCell(r[30]),
        creditPoints: cleanCell(r[31]),
      },
      {
        code: 'DSAL',
        name: 'Data Structures and Algorithms Lab',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: cleanCell(r[32]) },
          { name: 'Experiential Learning', max: 10, score: cleanCell(r[33]) },
          { name: 'Practical', max: 25, score: cleanCell(r[34]) },
        ],
        total: cleanCell(r[35]),
        maxTotal: 50,
        grade: cleanCell(r[36], 'IP'),
        gradePoint: cleanCell(r[37]),
        creditPoints: cleanCell(r[38]),
      },
      {
        code: 'FCC',
        name: 'Fundamentals of Cloud Computing',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 195, score: cleanCell(r[39]) },
          { name: 'Experiential Learning', max: 10, score: cleanCell(r[40]) },
          { name: 'Practical', max: 25, score: cleanCell(r[41]) },
        ],
        total: cleanCell(r[42]),
        maxTotal: 50,
        grade: cleanCell(r[43], 'IP'),
        gradePoint: cleanCell(r[44]),
        creditPoints: cleanCell(r[45]),
      },
      {
        code: 'ED',
        name: 'Electronics & Hardware Design',
        type: 'Theory',
        assessments: [
          { name: 'CAE-2', max: 40, score: cleanCell(r[46]) },
          { name: 'TAE-1', max: 10, score: cleanCell(r[47]) },
          { name: 'TAE-2', max: 5, score: cleanCell(r[48]) },
          { name: 'TAE-3', max: 5, score: cleanCell(r[49]) },
        ],
        total: cleanCell(r[50]),
        maxTotal: 50,
        grade: cleanCell(r[51], 'IP'),
        gradePoint: cleanCell(r[52]),
        creditPoints: cleanCell(r[53]),
      },
      {
        code: 'ES',
        name: 'Environmental Studies',
        type: 'Activity',
        assessments: [
          { name: 'Objective Test', max: 20, score: cleanCell(r[54]) },
          { name: 'Report', max: 20, score: cleanCell(r[55]) },
          { name: 'Attendance', max: 10, score: cleanCell(r[56]) },
        ],
        total: cleanCell(r[57]),
        maxTotal: 50,
        grade: cleanCell(r[58], 'IP'),
        gradePoint: cleanCell(r[59]),
        creditPoints: cleanCell(r[60]),
      },
      {
        code: 'CEP/FP',
        name: 'Community Engagement & Field Project',
        type: 'Activity',
        assessments: [
          { name: 'Objective Test', max: 20, score: cleanCell(r[137]) },
          { name: 'Report', max: 20, score: cleanCell(r[138]) },
          { name: 'Attendance', max: 10, score: cleanCell(r[139]) },
        ],
        total: cleanCell(r[140]),
        maxTotal: 50,
        grade: cleanCell(r[141], 'IP'),
        gradePoint: cleanCell(r[142]),
        creditPoints: cleanCell(r[143]),
      },
    ];

    students.push({
      usn,
      name,
      semester: 3,
      subjects,
      summary: {
        totalCredits: rawCredits === 'In Progress' ? '22' : rawCredits,
        sgpa: rawSgpa === 'In Progress' ? 'In Progress' : rawSgpa,
        status: rawStatus === 'PASS' ? 'Enrolled' : rawStatus,
      },
    });
  }

  return students;
}

const csv = fs.readFileSync('scripts/sem3_master_sheet.csv', 'utf8');
const rows = parseCSV(csv);
const students = parseSemester3Layout(rows, 3);

const output = `// Auto-generated synchronized dataset from Semester 3 Master-Sheet Google Spreadsheet
import { StudentSemesterMarks } from '../types/marks';

export const SEM3_MARKS_DATA: StudentSemesterMarks[] = ${JSON.stringify(students, null, 2)};
`;

fs.writeFileSync('src/data/sem3MarksData.ts', output, 'utf8');
console.log('Successfully written', students.length, 'records to src/data/sem3MarksData.ts');
