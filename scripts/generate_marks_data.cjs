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

const studentsData = [];

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r[0] || !r[1]) continue;

  const usn = r[0];
  const name = r[1];

  const studentMarks = {
    usn,
    name,
    semester: 1,
    subjects: [
      {
        code: 'SDDE',
        name: 'Software Design & Development Engineering',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 40, score: r[2] || '-' },
          { name: 'CAE-2', max: 40, score: r[3] || '-' },
          { name: 'TAE-1', max: 10, score: r[4] || '-' },
          { name: 'TAE-2', max: 5, score: r[5] || '-' },
          { name: 'TAE-3', max: 5, score: r[6] || '-' },
          { name: 'Internals', max: 40, score: r[8] || '-' },
          { name: 'ESE', max: 60, score: r[7] || '-' },
        ],
        total: r[9] || '-',
        maxTotal: 100,
        grade: r[10] || '-',
        gradePoint: r[72] || '-',
        creditPoints: r[83] || '-',
      },
      {
        code: 'AP',
        name: 'Applied Physics',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 20, score: r[11] || '-' },
          { name: 'CAE-2', max: 20, score: r[12] || '-' },
          { name: 'TAE-1', max: 5, score: r[13] || '-' },
          { name: 'TAE-2', max: 2.5, score: r[14] || '-' },
          { name: 'TAE-3', max: 2.5, score: r[15] || '-' },
          { name: 'Internals', max: 20, score: r[17] || '-' },
          { name: 'ESE', max: 30, score: r[16] || '-' },
        ],
        total: r[18] || '-',
        maxTotal: 50,
        grade: r[19] || '-',
        gradePoint: r[73] || '-',
        creditPoints: r[84] || '-',
      },
      {
        code: 'APL',
        name: 'Applied Physics Lab',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[20] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[21] || '-' },
          { name: 'Practical', max: 25, score: r[22] || '-' },
        ],
        total: r[23] || '-',
        maxTotal: 50,
        grade: r[24] || '-',
        gradePoint: r[74] || '-',
        creditPoints: r[85] || '-',
      },
      {
        code: 'EGD',
        name: 'Engineering Graphics & Design',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 40, score: r[25] || '-' },
          { name: 'CAE-2', max: 40, score: r[26] || '-' },
          { name: 'TAE-1', max: 10, score: r[27] || '-' },
          { name: 'TAE-2', max: 5, score: r[28] || '-' },
          { name: 'TAE-3', max: 5, score: r[29] || '-' },
          { name: 'Internals', max: 40, score: r[31] || '-' },
          { name: 'ESE', max: 60, score: r[30] || '-' },
        ],
        total: r[32] || '-',
        maxTotal: 100,
        grade: r[33] || '-',
        gradePoint: r[75] || '-',
        creditPoints: r[86] || '-',
      },
      {
        code: 'EGDL',
        name: 'Engineering Graphics & Design Lab',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[34] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[35] || '-' },
          { name: 'Practical', max: 25, score: r[36] || '-' },
        ],
        total: r[37] || '-',
        maxTotal: 50,
        grade: r[38] || '-',
        gradePoint: r[76] || '-',
        creditPoints: r[87] || '-',
      },
      {
        code: 'HN',
        name: 'Hardware & Networking',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 195, score: r[39] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[40] || '-' },
          { name: 'Practical', max: 25, score: r[41] || '-' },
        ],
        total: r[42] || '-',
        maxTotal: 50,
        grade: r[43] || '-',
        gradePoint: r[77] || '-',
        creditPoints: r[88] || '-',
      },
      {
        code: 'PPS',
        name: 'Programming for Problem Solving',
        type: 'Theory',
        assessments: [
          { name: 'Unit Test 1', max: 30, score: r[44] || '-' },
          { name: 'Unit Test 2', max: 30, score: r[45] || '-' },
          { name: 'Unit Test 3', max: 30, score: r[46] || '-' },
          { name: 'Unit Test 4', max: 30, score: r[47] || '-' },
          { name: 'Unit Test 5', max: 30, score: r[48] || '-' },
          { name: 'Unit Test 6', max: 30, score: r[49] || '-' },
          { name: 'Internals', max: 40, score: r[51] || '-' },
          { name: 'ESE', max: 60, score: r[50] || '-' },
        ],
        total: r[52] || '-',
        maxTotal: 100,
        grade: r[53] || '-',
        gradePoint: r[78] || '-',
        creditPoints: r[89] || '-',
      },
      {
        code: 'PPSL',
        name: 'Programming for Problem Solving Lab',
        type: 'Practical',
        assessments: [
          { name: 'Continuous Assessment', max: 150, score: r[54] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[55] || '-' },
          { name: 'Practical', max: 25, score: r[56] || '-' },
        ],
        total: r[57] || '-',
        maxTotal: 50,
        grade: r[58] || '-',
        gradePoint: r[79] || '-',
        creditPoints: r[90] || '-',
      },
      {
        code: 'IKS',
        name: 'Indian Knowledge Systems',
        type: 'Theory',
        assessments: [
          { name: 'CAE-1', max: 20, score: r[59] || '-' },
          { name: 'CAE-2', max: 20, score: r[60] || '-' },
          { name: 'Internals', max: 20, score: r[62] || '-' },
          { name: 'ESE', max: 30, score: r[61] || '-' },
        ],
        total: r[63] || '-',
        maxTotal: 50,
        grade: r[64] || '-',
        gradePoint: r[80] || '-',
        creditPoints: r[91] || '-',
      },
      {
        code: 'LLC-1',
        name: 'Language & Life Skills Course - 1',
        type: 'Activity',
        assessments: [
          { name: 'Objective Test', max: 20, score: r[65] || '-' },
          { name: 'Report', max: 20, score: r[66] || '-' },
          { name: 'Attendance', max: 10, score: r[67] || '-' },
        ],
        total: r[68] || '-',
        maxTotal: 50,
        grade: r[69] || '-',
        gradePoint: r[81] || '-',
        creditPoints: r[92] || '-',
      },
      {
        code: 'INCENTIVES',
        name: 'Incentives & Extra Credits',
        type: 'Activity',
        assessments: [
          { name: 'Incentives Score', max: 10, score: r[71] || '-' },
        ],
        total: r[71] || '-',
        maxTotal: 10,
        grade: r[70] || '-',
        gradePoint: r[82] || '-',
        creditPoints: r[93] || '-',
      },
    ],
    summary: {
      totalCredits: r[94] || '0',
      sgpa: r[95] || '0.00',
      status: r[96] || 'PENDING',
    }
  };

  studentsData.push(studentMarks);
}

const outContent = `// Auto-generated from Master-Sheet Google Spreadsheet
import { StudentSemesterMarks } from '../types/marks';

export const MASTER_MARKS_DATA: StudentSemesterMarks[] = ${JSON.stringify(studentsData, null, 2)};
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/marksData.ts', outContent, 'utf8');
console.log('Successfully wrote', studentsData.length, 'student records to src/data/marksData.ts');
