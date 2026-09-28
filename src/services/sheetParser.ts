import { StudentSemesterMarks, SubjectMarks, AssessmentItem } from '../types/marks';

/**
 * Universal CSV parser for RFC 4180 / Google Sheets exported CSVs
 */
export function parseCSV(text: string): string[][] {
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

// Subject Code to Full Name dictionary (updated from SEM1-Details tab)
export const KNOWN_SUBJECT_NAMES: Record<string, string> = {
  // Semester 1 (synchronized with SEM1-Details)
  SDDE: 'Successive Differentiation and Differential Equation',
  AP: 'Applied Physics',
  APL: 'Applied Physics Lab',
  EGD: 'Engineering Graphics and Design',
  EGDL: 'Engineering Graphics and Design Lab',
  HN: 'Hardware & Networking',
  PPS: 'Programming for Problem Solving',
  PPSL: 'Programming for Problem Solving Lab',
  IKS: 'Indian Knowledge System',
  'LLC-1': 'Liberal Learning Course - 1',
  INC: 'Incentives',
  INCENTIVES: 'Incentives',

  // Semester 2 (synchronized with sem2-details)
  ICLA: 'Integral Calculus and Linear Algebra',
  CFE: 'Chemistry for Engineering',
  ECL: 'Engineering Chemistry Lab',
  EE: 'Electrical Engineering',
  EEL: 'Electrical Engineering Lab',
  WDL: 'Web Designing',
  CE: 'Communicative English',
  CEL: 'Communicative English Lab',
  SMP: 'Structured and Modular Programming',
  SMPL: 'Structured and Modular Programming Lab',
  LLC: 'Liberal Learning Course - 2',
  'LLC-2': 'Liberal Learning Course - 2',

  // Semester 3 (synchronized with sem3-details)
  DMGT: 'Discrete Mathematics & Graph Theory',
  CAO: 'Computer Architecture and Organization',
  DSA: 'Data Structures & Algorithms',
  DSAL: 'Data Structures & Algorithms Lab',
  FCC: 'Fundamentals of Cloud Computing Lab',
  ED: 'Entrepreneurship Development',
  ES: 'Environmental Studies',
  'CEP/FP': 'Community Engagement Project / Field Project',
  WFBFD: 'Web Fundamentals and Basic Frontend Design',
  WFBFDL: 'Web Fundamentals and Basic Frontend Design Lab',
  DEFM: 'Digital Electronics and Fundamentals of Microcontroller',
  DEFML: 'Digital Electronics and Fundamentals of Microcontroller LAB',
  BE: 'Business Economics',
  BA: 'Introduction to Business Analytics',
  DCD: 'Digital Circuit Design',
  EST: 'Energy Systems and Technologies',
  EDP: 'Ethics & Data Privacy',
  SPS: 'Solar Photovoltaic Systems',
  NPTEL: 'NPTEL',
};

export const DEFAULT_SEM1_CREDITS: Record<string, string> = {
  SDDE: '4',
  AP: '2',
  APL: '1',
  EGD: '1',
  EGDL: '2',
  HN: '2',
  PPS: '3',
  PPSL: '2',
  IKS: '2',
  'LLC-1': '2',
  INC: '0',
  INCENTIVES: '0',
};

export const DEFAULT_SEM2_CREDITS: Record<string, string> = {
  ICLA: '4',
  CFE: '2',
  ECL: '1',
  EE: '3',
  EEL: '1',
  WDL: '2',
  CE: '1',
  CEL: '1',
  SMP: '2',
  SMPL: '1',
  LLC: '2',
  'LLC-2': '2',
  INC: '0',
  INCENTIVES: '0',
};

export const DEFAULT_SEM3_CREDITS: Record<string, string> = {
  DMGT: '4',
  CAO: '3',
  DSA: '3',
  DSAL: '1',
  FCC: '1',
  ED: '2',
  ES: '2',
  'CEP/FP': '2',
  WFBFD: '2',
  WFBFDL: '1',
  DEFM: '2',
  DEFML: '1',
  BE: '3',
  BA: '3',
  DCD: '3',
  EST: '3',
  EDP: '3',
  SPS: '3',
  NPTEL: '3',
  INC: '0',
  INCENTIVES: '0',
};

export interface SemDetailsItem {
  srNo: string;
  code: string;
  name: string;
  totalCredits: string;
  maxMarks: number;
}

/**
 * Parse SEM details tab CSV (SEM1-Details, sem2-details, sem3-details) to extract course titles, credits, and max marks
 */
export function parseSemDetailsCSV(csvText: string): Map<string, SemDetailsItem> {
  const rows = parseCSV(csvText);
  const map = new Map<string, SemDetailsItem>();
  if (rows.length < 2) return map;

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const codeIdx = header.findIndex((h) => h.includes('code'));
  const nameIdx = header.findIndex((h) => h.includes('subject name') || h.includes('name'));
  const creditsIdx = header.findIndex((h) => h.includes('total credits') || h.includes('credit'));
  const maxIdx = header.findIndex((h) => h.includes('max'));

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 2) continue;
    let rawCode = (codeIdx !== -1 ? r[codeIdx] : r[1] || '').trim();
    if (
      (!rawCode || rawCode.toUpperCase() === 'MDM' || rawCode.toUpperCase() === 'OE') &&
      r[codeIdx !== -1 ? codeIdx + 1 : 2]
    ) {
      const subCode = r[codeIdx !== -1 ? codeIdx + 1 : 2].trim();
      if (subCode) rawCode = subCode;
    }
    if (!rawCode) continue;

    const rawName = (nameIdx !== -1 ? r[nameIdx] : r[2] || '').trim();
    const rawCredits = (creditsIdx !== -1 ? r[creditsIdx] : r[3] || '').trim();
    const rawMax = (maxIdx !== -1 ? r[maxIdx] : r[4] || '').trim();

    const item: SemDetailsItem = {
      srNo: r[0] || String(i),
      code: rawCode,
      name: rawName || rawCode,
      totalCredits: rawCredits || '0',
      maxMarks: parseFloat(rawMax) || 0,
    };

    map.set(rawCode.toUpperCase(), item);
    if (rawCode.toUpperCase() === 'INC') {
      map.set('INCENTIVES', item);
    }
  }

  return map;
}

function cleanCell(val: string | undefined, fallback: string = '-'): string {
  if (!val) return fallback;
  const s = val.trim();
  if (
    s === '#REF!' ||
    s === '#NUM!' ||
    s === '#VALUE!' ||
    s === '#N/A' ||
    s === ''
  ) {
    return fallback;
  }
  return s;
}

/**
 * Parse dedicated NPTEL tab CSV into a Map of USN -> { marks, grade }
 */
export function parseNptelCSV(csvText: string): Map<string, { marks?: string; grade?: string }> {
  const map = new Map<string, { marks?: string; grade?: string }>();
  const rows = parseCSV(csvText);
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = (r[0] || '').trim().toUpperCase();
    if (!usn || usn.includes('USN')) continue;
    const marks = (r[2] || '').trim();
    const grade = (r[3] || '').trim();
    map.set(usn, { marks, grade });
  }
  return map;
}

/**
 * Universal Master-Sheet parser: converts any college Master-Sheet CSV into StudentSemesterMarks[]
 */
export function parseMasterSheetCSV(
  csvText: string,
  semester: number,
  detailsMap?: Map<string, SemDetailsItem>,
  nptelMap?: Map<string, { marks?: string; grade?: string }>
): StudentSemesterMarks[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  // Check if Semester 3 layout (DMGT at col 2 or header length >= 150)
  if (semester === 3 || (rows[0][2] && rows[0][2].toUpperCase().includes('DMGT'))) {
    return parseSemester3Layout(rows, 3, detailsMap, nptelMap);
  }

  // Check if Semester 2 layout (ICLA at col 2 or header length >= 105)
  if (semester === 2 || (rows[0][2] && rows[0][2].toUpperCase().includes('ICLA'))) {
    return parseSemester2Layout(rows, 2, detailsMap);
  }

  // Check if Semester 1 standard 97-column layout (SDDE at col 2)
  if (semester === 1 || (rows[0][2] && rows[0][2].toUpperCase().includes('SDDE'))) {
    return parseSemester1Layout(rows, 1, detailsMap);
  }

  // Dynamic layout fallback for variable columns in any other formats
  return parseDynamicLayout(rows, semester);
}

function parseSemester1Layout(
  rows: string[][],
  semester: number,
  detailsMap?: Map<string, SemDetailsItem>
): StudentSemesterMarks[] {
  const students: StudentSemesterMarks[] = [];

  const getSubInfo = (code: string) => {
    const d = detailsMap?.get(code.toUpperCase()) || (code === 'INCENTIVES' ? detailsMap?.get('INC') : undefined);
    return {
      name: d?.name || KNOWN_SUBJECT_NAMES[code] || code,
      credits: d ? String(d.totalCredits) : (DEFAULT_SEM1_CREDITS[code] || '0'),
      maxMarks: d?.maxMarks && d.maxMarks > 0 ? d.maxMarks : undefined,
    };
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    if (!usn || !name || usn.toLowerCase().includes('usn')) continue;

    const subjects: SubjectMarks[] = [
      {
        code: 'SDDE',
        name: getSubInfo('SDDE').name,
        type: 'Theory',
        credits: getSubInfo('SDDE').credits,
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
        maxTotal: getSubInfo('SDDE').maxMarks || 100,
        grade: r[10] || '-',
        gradePoint: r[72] || '-',
        creditPoints: r[83] || '-',
      },
      {
        code: 'AP',
        name: getSubInfo('AP').name,
        type: 'Theory',
        credits: getSubInfo('AP').credits,
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
        maxTotal: getSubInfo('AP').maxMarks || 50,
        grade: r[19] || '-',
        gradePoint: r[73] || '-',
        creditPoints: r[84] || '-',
      },
      {
        code: 'APL',
        name: getSubInfo('APL').name,
        type: 'Practical',
        credits: getSubInfo('APL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[20] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[21] || '-' },
          { name: 'Practical', max: 25, score: r[22] || '-' },
        ],
        total: r[23] || '-',
        maxTotal: getSubInfo('APL').maxMarks || 50,
        grade: r[24] || '-',
        gradePoint: r[74] || '-',
        creditPoints: r[85] || '-',
      },
      {
        code: 'EGD',
        name: getSubInfo('EGD').name,
        type: 'Theory',
        credits: getSubInfo('EGD').credits,
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
        maxTotal: getSubInfo('EGD').maxMarks || 100,
        grade: r[33] || '-',
        gradePoint: r[75] || '-',
        creditPoints: r[86] || '-',
      },
      {
        code: 'EGDL',
        name: getSubInfo('EGDL').name,
        type: 'Practical',
        credits: getSubInfo('EGDL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[34] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[35] || '-' },
          { name: 'Practical', max: 25, score: r[36] || '-' },
        ],
        total: r[37] || '-',
        maxTotal: getSubInfo('EGDL').maxMarks || 50,
        grade: r[38] || '-',
        gradePoint: r[76] || '-',
        creditPoints: r[87] || '-',
      },
      {
        code: 'HN',
        name: getSubInfo('HN').name,
        type: 'Practical',
        credits: getSubInfo('HN').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 195, score: r[39] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[40] || '-' },
          { name: 'Practical', max: 25, score: r[41] || '-' },
        ],
        total: r[42] || '-',
        maxTotal: getSubInfo('HN').maxMarks || 50,
        grade: r[43] || '-',
        gradePoint: r[77] || '-',
        creditPoints: r[88] || '-',
      },
      {
        code: 'PPS',
        name: getSubInfo('PPS').name,
        type: 'Theory',
        credits: getSubInfo('PPS').credits,
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
        maxTotal: getSubInfo('PPS').maxMarks || 100,
        grade: r[53] || '-',
        gradePoint: r[78] || '-',
        creditPoints: r[89] || '-',
      },
      {
        code: 'PPSL',
        name: getSubInfo('PPSL').name,
        type: 'Practical',
        credits: getSubInfo('PPSL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 150, score: r[54] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[55] || '-' },
          { name: 'Practical', max: 25, score: r[56] || '-' },
        ],
        total: r[57] || '-',
        maxTotal: getSubInfo('PPSL').maxMarks || 50,
        grade: r[58] || '-',
        gradePoint: r[79] || '-',
        creditPoints: r[90] || '-',
      },
      {
        code: 'IKS',
        name: getSubInfo('IKS').name,
        type: 'Theory',
        credits: getSubInfo('IKS').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: r[59] || '-' },
          { name: 'CAE-2', max: 20, score: r[60] || '-' },
          { name: 'Internals', max: 20, score: r[62] || '-' },
          { name: 'ESE', max: 30, score: r[61] || '-' },
        ],
        total: r[63] || '-',
        maxTotal: getSubInfo('IKS').maxMarks || 50,
        grade: r[64] || '-',
        gradePoint: r[80] || '-',
        creditPoints: r[91] || '-',
      },
      {
        code: 'LLC-1',
        name: getSubInfo('LLC-1').name,
        type: 'Activity',
        credits: getSubInfo('LLC-1').credits,
        assessments: [
          { name: 'Objective Test', max: 20, score: r[65] || '-' },
          { name: 'Report', max: 20, score: r[66] || '-' },
          { name: 'Attendance', max: 10, score: r[67] || '-' },
        ],
        total: r[68] || '-',
        maxTotal: getSubInfo('LLC-1').maxMarks || 50,
        grade: r[69] || '-',
        gradePoint: r[81] || '-',
        creditPoints: r[92] || '-',
      },
      {
        code: 'INCENTIVES',
        name: getSubInfo('INCENTIVES').name,
        type: 'Activity',
        credits: getSubInfo('INCENTIVES').credits,
        assessments: [{ name: 'Incentives Score', max: 10, score: r[71] || '-' }],
        total: r[71] || '-',
        maxTotal: 10,
        grade: (r[70] && r[70] !== '-' && r[70] !== '0' && r[70] !== 'F') ? r[70] : 'PASS',
        gradePoint: r[82] || '-',
        creditPoints: r[93] || '-',
      },
    ];

    // Calculate total course credits from SEM1-Details (academic courses sum to 21)
    const academicCredits = subjects
      .filter((sub) => sub.code !== 'INC' && sub.code !== 'INCENTIVES')
      .reduce((acc, sub) => acc + (parseFloat(sub.credits || '0') || 0), 0);
    const totalCredits = String(academicCredits || 21);
    const totalGradePoints = (r[94] || '').trim();

    students.push({
      usn,
      name,
      semester,
      subjects,
      summary: {
        totalCredits,
        totalGradePoints,
        sgpa: (r[95] || '0.00').trim(),
        status: (r[96] || 'PENDING').trim(),
      },
    });
  }

  return students;
}

function parseSemester2Layout(
  rows: string[][],
  _semester: number,
  detailsMap?: Map<string, SemDetailsItem>
): StudentSemesterMarks[] {
  const students: StudentSemesterMarks[] = [];

  const getSubInfo = (code: string) => {
    const upper = code.trim().toUpperCase();
    const d =
      detailsMap?.get(upper) ||
      (upper === 'LLC' ? detailsMap?.get('LLC-2') : undefined) ||
      (upper === 'INCENTIVES' ? detailsMap?.get('INC') : undefined);
    return {
      name: d ? d.name : (KNOWN_SUBJECT_NAMES[code] || code),
      credits: d ? String(d.totalCredits) : (DEFAULT_SEM2_CREDITS[code] || '0'),
    };
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    if (!usn || !name || usn.toLowerCase().includes('usn')) continue;

    const subjects: SubjectMarks[] = [
      {
        code: 'ICLA',
        name: getSubInfo('ICLA').name,
        type: 'Theory',
        credits: getSubInfo('ICLA').credits,
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
        gradePoint: r[78] || '-',
        creditPoints: r[90] || '-',
      },
      {
        code: 'CFE',
        name: getSubInfo('CFE').name,
        type: 'Theory',
        credits: getSubInfo('CFE').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: r[11] || '-' },
          { name: 'CAE-2', max: 20, score: r[12] || '-' },
          { name: 'TAE-1', max: 5, score: r[13] || '-' },
          { name: 'TAE-2', max: 2.5, score: r[14] || '-' },
          { name: 'TAE-3', max: 2.5, score: r[15] || '-' },
          { name: 'Internals', max: 20, score: r[16] || '-' },
          { name: 'ESE', max: 30, score: r[17] || '-' },
        ],
        total: r[18] || '-',
        maxTotal: 50,
        grade: r[19] || '-',
        gradePoint: r[79] || '-',
        creditPoints: r[91] || '-',
      },
      {
        code: 'ECL',
        name: getSubInfo('ECL').name,
        type: 'Practical',
        credits: getSubInfo('ECL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 90, score: r[20] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[21] || '-' },
          { name: 'Practical', max: 25, score: r[22] || '-' },
        ],
        total: r[23] || '-',
        maxTotal: 50,
        grade: r[24] || '-',
        gradePoint: r[80] || '-',
        creditPoints: r[92] || '-',
      },
      {
        code: 'EE',
        name: getSubInfo('EE').name,
        type: 'Theory',
        credits: getSubInfo('EE').credits,
        assessments: [
          { name: 'CAE-1', max: 40, score: r[25] || '-' },
          { name: 'CAE-2', max: 40, score: r[26] || '-' },
          { name: 'TAE-1', max: 10, score: r[27] || '-' },
          { name: 'TAE-2', max: 5, score: r[28] || '-' },
          { name: 'TAE-3', max: 5, score: r[29] || '-' },
          { name: 'Internals', max: 40, score: r[30] || '-' },
          { name: 'ESE', max: 60, score: r[31] || '-' },
        ],
        total: r[32] || '-',
        maxTotal: 100,
        grade: r[33] || '-',
        gradePoint: r[81] || '-',
        creditPoints: r[93] || '-',
      },
      {
        code: 'EEL',
        name: getSubInfo('EEL').name,
        type: 'Practical',
        credits: getSubInfo('EEL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[34] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[35] || '-' },
          { name: 'Practical', max: 25, score: r[36] || '-' },
        ],
        total: r[37] || '-',
        maxTotal: 50,
        grade: r[38] || '-',
        gradePoint: r[82] || '-',
        creditPoints: r[94] || '-',
      },
      {
        code: 'WDL',
        name: getSubInfo('WDL').name,
        type: 'Practical',
        credits: getSubInfo('WDL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 195, score: r[39] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[40] || '-' },
          { name: 'Practical', max: 25, score: r[41] || '-' },
        ],
        total: r[42] || '-',
        maxTotal: 50,
        grade: r[43] || '-',
        gradePoint: r[83] || '-',
        creditPoints: r[95] || '-',
      },
      {
        code: 'CE',
        name: getSubInfo('CE').name,
        type: 'Theory',
        credits: getSubInfo('CE').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: r[44] || '-' },
          { name: 'CAE-2', max: 20, score: r[45] || '-' },
          { name: 'TAE-1', max: 5, score: r[46] || '-' },
          { name: 'TAE-2', max: 2.5, score: r[47] || '-' },
          { name: 'TAE-3', max: 2.5, score: r[48] || '-' },
          { name: 'Internals', max: 20, score: r[49] || '-' },
          { name: 'ESE', max: 30, score: r[50] || '-' },
        ],
        total: r[51] || '-',
        maxTotal: 50,
        grade: r[52] || '-',
        gradePoint: r[84] || '-',
        creditPoints: r[96] || '-',
      },
      {
        code: 'CEL',
        name: getSubInfo('CEL').name,
        type: 'Practical',
        credits: getSubInfo('CEL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[53] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[54] || '-' },
          { name: 'Practical', max: 25, score: r[55] || '-' },
        ],
        total: r[56] || '-',
        maxTotal: 50,
        grade: r[57] || '-',
        gradePoint: r[85] || '-',
        creditPoints: r[97] || '-',
      },
      {
        code: 'SMP',
        name: getSubInfo('SMP').name,
        type: 'Theory',
        credits: getSubInfo('SMP').credits,
        assessments: [
          { name: 'Unit Test 1', max: 30, score: r[58] || '-' },
          { name: 'Unit Test 2', max: 30, score: r[59] || '-' },
          { name: 'Unit Test 3', max: 30, score: r[60] || '-' },
          { name: 'Unit Test 4', max: 30, score: r[61] || '-' },
          { name: 'Internals', max: 20, score: r[62] || '-' },
          { name: 'ESE', max: 30, score: r[63] || '-' },
        ],
        total: r[64] || '-',
        maxTotal: 50,
        grade: r[65] || '-',
        gradePoint: r[86] || '-',
        creditPoints: r[98] || '-',
      },
      {
        code: 'SMPL',
        name: getSubInfo('SMPL').name,
        type: 'Practical',
        credits: getSubInfo('SMPL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: r[66] || '-' },
          { name: 'Experiential Learning', max: 10, score: r[67] || '-' },
          { name: 'Practical', max: 25, score: r[68] || '-' },
        ],
        total: r[69] || '-',
        maxTotal: 50,
        grade: r[70] || '-',
        gradePoint: r[87] || '-',
        creditPoints: r[99] || '-',
      },
      {
        code: 'LLC',
        name: getSubInfo('LLC').name,
        type: 'Activity',
        credits: getSubInfo('LLC').credits,
        assessments: [
          { name: 'Objective Test', max: 20, score: r[71] || '-' },
          { name: 'Report', max: 20, score: r[72] || '-' },
          { name: 'Attendance', max: 10, score: r[73] || '-' },
        ],
        total: r[74] || '-',
        maxTotal: 50,
        grade: r[75] || '-',
        gradePoint: r[88] || '-',
        creditPoints: r[100] || '-',
      },
      {
        code: 'INCENTIVES',
        name: getSubInfo('INCENTIVES').name,
        type: 'Activity',
        credits: getSubInfo('INCENTIVES').credits,
        assessments: [{ name: 'Incentives Score', max: 10, score: r[77] || '-' }],
        total: r[77] || '-',
        maxTotal: 10,
        grade: (r[76] && r[76] !== '-' && r[76] !== '0' && r[76] !== 'F') ? r[76] : 'PASS',
        gradePoint: r[89] || '-',
        creditPoints: r[101] || '-',
      },
    ];

    const academicCredits = subjects
      .filter((sub) => sub.code !== 'INC' && sub.code !== 'INCENTIVES')
      .reduce((acc, sub) => acc + (parseFloat(sub.credits || '0') || 0), 0);
    const totalCredits = String(academicCredits || 20);
    const totalGradePoints = (r[102] || '0').trim();

    students.push({
      usn,
      name,
      semester: 2,
      subjects,
      summary: {
        totalCredits,
        totalGradePoints,
        sgpa: (r[103] || '0.00').trim(),
        status: (r[104] || 'PENDING').trim(),
      },
    });
  }

  return students;
}

function isSubjectAllotted(r: string[], cols: number[], totalCol?: number): boolean {
  for (const c of cols) {
    const val = r[c];
    if (val !== undefined && val !== null) {
      const s = val.trim();
      if (s !== '' && s !== '-' && !s.includes('#')) {
        return true;
      }
    }
  }
  if (totalCol !== undefined && r[totalCol]) {
    const totalVal = parseFloat(r[totalCol].trim());
    if (!isNaN(totalVal) && totalVal > 0) {
      return true;
    }
  }
  return false;
}

function parseSemester3Layout(
  rows: string[][],
  _semester: number,
  detailsMap?: Map<string, SemDetailsItem>,
  nptelMap?: Map<string, { marks?: string; grade?: string }>
): StudentSemesterMarks[] {
  const students: StudentSemesterMarks[] = [];

  const getSubInfo = (code: string) => {
    const upper = code.trim().toUpperCase();
    const d =
      detailsMap?.get(upper) ||
      (upper === 'INCENTIVES' ? detailsMap?.get('INC') : undefined);
    return {
      name: d ? d.name : (KNOWN_SUBJECT_NAMES[upper] || code),
      credits: d ? String(d.totalCredits) : (DEFAULT_SEM3_CREDITS[upper] || '0'),
      maxMarks: d?.maxMarks && d.maxMarks > 0 ? d.maxMarks : undefined,
    };
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const usn = (r[0] || '').trim();
    const name = (r[1] || '').trim();
    if (!usn || !name || usn.toLowerCase().includes('usn')) continue;

    // 1. Common Subjects for all students (DMGT, CAO, DSA, DSAL, FCC, ED, ES, CEP/FP, INC)
    const subjects: SubjectMarks[] = [
      {
        code: 'DMGT',
        name: getSubInfo('DMGT').name,
        type: 'Theory',
        credits: getSubInfo('DMGT').credits,
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
        maxTotal: getSubInfo('DMGT').maxMarks || 100,
        grade: cleanCell(r[10], 'IP'),
        gradePoint: cleanCell(r[130]),
        creditPoints: cleanCell(r[143]),
      },
      {
        code: 'CAO',
        name: getSubInfo('CAO').name,
        type: 'Theory',
        credits: getSubInfo('CAO').credits,
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
        maxTotal: getSubInfo('CAO').maxMarks || 50,
        grade: cleanCell(r[19], 'IP'),
        gradePoint: cleanCell(r[131]),
        creditPoints: cleanCell(r[144]),
      },
      {
        code: 'DSA',
        name: getSubInfo('DSA').name,
        type: 'Theory',
        credits: getSubInfo('DSA').credits,
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
        maxTotal: getSubInfo('DSA').maxMarks || 100,
        grade: cleanCell(r[29], 'IP'),
        gradePoint: cleanCell(r[132]),
        creditPoints: cleanCell(r[145]),
      },
      {
        code: 'DSAL',
        name: getSubInfo('DSAL').name,
        type: 'Practical',
        credits: getSubInfo('DSAL').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 80, score: cleanCell(r[30]) },
          { name: 'Experiential Learning', max: 10, score: cleanCell(r[31]) },
          { name: 'Practical', max: 25, score: cleanCell(r[32]) },
        ],
        total: cleanCell(r[33]),
        maxTotal: getSubInfo('DSAL').maxMarks || 100,
        grade: cleanCell(r[34], 'IP'),
        gradePoint: cleanCell(r[133]),
        creditPoints: cleanCell(r[146]),
      },
      {
        code: 'FCC',
        name: getSubInfo('FCC').name,
        type: 'Practical',
        credits: getSubInfo('FCC').credits,
        assessments: [
          { name: 'Continuous Assessment', max: 195, score: cleanCell(r[35]) },
          { name: 'Experiential Learning', max: 10, score: cleanCell(r[36]) },
          { name: 'Practical', max: 25, score: cleanCell(r[37]) },
        ],
        total: cleanCell(r[38]),
        maxTotal: getSubInfo('FCC').maxMarks || 50,
        grade: cleanCell(r[39], 'IP'),
        gradePoint: cleanCell(r[134]),
        creditPoints: cleanCell(r[147]),
      },
      {
        code: 'ED',
        name: getSubInfo('ED').name,
        type: 'Theory',
        credits: getSubInfo('ED').credits,
        assessments: [
          { name: 'CAE-2', max: 40, score: cleanCell(r[40]) },
          { name: 'TAE-1', max: 10, score: cleanCell(r[41]) },
          { name: 'TAE-2', max: 5, score: cleanCell(r[42]) },
          { name: 'TAE-3', max: 5, score: cleanCell(r[43]) },
        ],
        total: cleanCell(r[44]),
        maxTotal: getSubInfo('ED').maxMarks || 50,
        grade: cleanCell(r[45], 'IP'),
        gradePoint: cleanCell(r[135]),
        creditPoints: cleanCell(r[148]),
      },
      {
        code: 'ES',
        name: getSubInfo('ES').name,
        type: 'Activity',
        credits: getSubInfo('ES').credits,
        assessments: [
          { name: 'Objective Test', max: 20, score: cleanCell(r[46]) },
          { name: 'Report', max: 20, score: cleanCell(r[47]) },
          { name: 'Attendance', max: 10, score: cleanCell(r[48]) },
        ],
        total: cleanCell(r[49]),
        maxTotal: getSubInfo('ES').maxMarks || 100,
        grade: cleanCell(r[50], 'IP'),
        gradePoint: cleanCell(r[136]),
        creditPoints: cleanCell(r[149]),
      },
      {
        code: 'CEP/FP',
        name: getSubInfo('CEP/FP').name,
        type: 'Activity',
        credits: getSubInfo('CEP/FP').credits,
        assessments: [
          { name: 'Objective Test', max: 20, score: cleanCell(r[121]) },
          { name: 'Report', max: 20, score: cleanCell(r[122]) },
          { name: 'Attendance', max: 10, score: cleanCell(r[123]) },
        ],
        total: cleanCell(r[124]),
        maxTotal: getSubInfo('CEP/FP').maxMarks || 50,
        grade: cleanCell(r[125], 'IP'),
        gradePoint: cleanCell(r[140]),
        creditPoints: cleanCell(r[153]),
      },
    ];

    // 2. MDM Subjects (4 options, 2 with practical labs; each student takes 1 MDM option)
    // Option A: WFBFD + WFBFDL
    if (
      isSubjectAllotted(r, [51, 52, 53, 54, 55, 56], 58) ||
      isSubjectAllotted(r, [60, 61, 62], 63)
    ) {
      subjects.push(
        {
          code: 'WFBFD',
          name: getSubInfo('WFBFD').name,
          type: 'Theory',
          credits: getSubInfo('WFBFD').credits,
          assessments: [
            { name: 'CAE-1', max: 20, score: cleanCell(r[51]) },
            { name: 'CAE-2', max: 20, score: cleanCell(r[52]) },
            { name: 'TAE-1', max: 5, score: cleanCell(r[53]) },
            { name: 'TAE-2', max: 2.5, score: cleanCell(r[54]) },
            { name: 'TAE-3', max: 2.5, score: cleanCell(r[55]) },
            { name: 'Internals', max: 20, score: cleanCell(r[57]) },
            { name: 'ESE', max: 30, score: cleanCell(r[56]) },
          ],
          total: cleanCell(r[58]),
          maxTotal: getSubInfo('WFBFD').maxMarks || 50,
          grade: cleanCell(r[59], 'IP'),
          gradePoint: cleanCell(r[137]),
          creditPoints: cleanCell(r[150]),
        },
        {
          code: 'WFBFDL',
          name: getSubInfo('WFBFDL').name,
          type: 'Practical',
          credits: getSubInfo('WFBFDL').credits,
          assessments: [
            { name: 'Continuous Assessment', max: 195, score: cleanCell(r[60]) },
            { name: 'Experiential Learning', max: 10, score: cleanCell(r[61]) },
            { name: 'Practical', max: 25, score: cleanCell(r[62]) },
          ],
          total: cleanCell(r[63]),
          maxTotal: getSubInfo('WFBFDL').maxMarks || 50,
          grade: cleanCell(r[64], 'IP'),
          gradePoint: cleanCell(r[138]),
          creditPoints: cleanCell(r[151]),
        }
      );
    }

    // Option B: DEFM + DEFML
    if (
      isSubjectAllotted(r, [65, 66, 67, 68, 69, 70], 72) ||
      isSubjectAllotted(r, [74, 75, 76], 77)
    ) {
      subjects.push(
        {
          code: 'DEFM',
          name: getSubInfo('DEFM').name,
          type: 'Theory',
          credits: getSubInfo('DEFM').credits,
          assessments: [
            { name: 'CAE-1', max: 20, score: cleanCell(r[65]) },
            { name: 'CAE-2', max: 20, score: cleanCell(r[66]) },
            { name: 'TAE-1', max: 5, score: cleanCell(r[67]) },
            { name: 'TAE-2', max: 2.5, score: cleanCell(r[68]) },
            { name: 'TAE-3', max: 2.5, score: cleanCell(r[69]) },
            { name: 'Internals', max: 20, score: cleanCell(r[71]) },
            { name: 'ESE', max: 30, score: cleanCell(r[70]) },
          ],
          total: cleanCell(r[72]),
          maxTotal: getSubInfo('DEFM').maxMarks || 50,
          grade: cleanCell(r[73], 'IP'),
          gradePoint: cleanCell(r[137]),
          creditPoints: cleanCell(r[150]),
        },
        {
          code: 'DEFML',
          name: getSubInfo('DEFML').name,
          type: 'Practical',
          credits: getSubInfo('DEFML').credits,
          assessments: [
            { name: 'Continuous Assessment', max: 195, score: cleanCell(r[74]) },
            { name: 'Experiential Learning', max: 10, score: cleanCell(r[75]) },
            { name: 'Practical', max: 25, score: cleanCell(r[76]) },
          ],
          total: cleanCell(r[77]),
          maxTotal: getSubInfo('DEFML').maxMarks || 50,
          grade: cleanCell(r[78], 'IP'),
          gradePoint: cleanCell(r[138]),
          creditPoints: cleanCell(r[151]),
        }
      );
    }

    // Option C: BE (Business Economics)
    if (isSubjectAllotted(r, [79, 80, 81, 82, 83, 84], 86)) {
      subjects.push({
        code: 'BE',
        name: getSubInfo('BE').name,
        type: 'Theory',
        credits: getSubInfo('BE').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[79]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[80]) },
          { name: 'TAE-1', max: 5, score: cleanCell(r[81]) },
          { name: 'TAE-2', max: 2.5, score: cleanCell(r[82]) },
          { name: 'TAE-3', max: 2.5, score: cleanCell(r[83]) },
          { name: 'Internals', max: 20, score: cleanCell(r[85]) },
          { name: 'ESE', max: 30, score: cleanCell(r[84]) },
        ],
        total: cleanCell(r[86]),
        maxTotal: getSubInfo('BE').maxMarks || 50,
        grade: cleanCell(r[87], 'IP'),
        gradePoint: cleanCell(r[137]),
        creditPoints: cleanCell(r[150]),
      });
    }

    // Option D: BA (Introduction to Business Analytics)
    if (isSubjectAllotted(r, [88, 89, 90, 91, 92, 93], 95)) {
      subjects.push({
        code: 'BA',
        name: getSubInfo('BA').name,
        type: 'Theory',
        credits: getSubInfo('BA').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[88]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[89]) },
          { name: 'TAE-1', max: 5, score: cleanCell(r[90]) },
          { name: 'TAE-2', max: 2.5, score: cleanCell(r[91]) },
          { name: 'TAE-3', max: 2.5, score: cleanCell(r[92]) },
          { name: 'Internals', max: 20, score: cleanCell(r[94]) },
          { name: 'ESE', max: 30, score: cleanCell(r[93]) },
        ],
        total: cleanCell(r[95]),
        maxTotal: getSubInfo('BA').maxMarks || 50,
        grade: cleanCell(r[96], 'IP'),
        gradePoint: cleanCell(r[137]),
        creditPoints: cleanCell(r[150]),
      });
    }

    // 3. OE Subjects (Open Electives taken by select students)
    const hasDcd = isSubjectAllotted(r, [97, 98, 99], 101);
    const hasEst = isSubjectAllotted(r, [103, 104, 105], 107);
    const hasEdp = isSubjectAllotted(r, [109, 110, 111], 113);
    const hasSps = isSubjectAllotted(r, [115, 116, 117], 119);

    if (hasDcd) {
      subjects.push({
        code: 'DCD',
        name: getSubInfo('DCD').name,
        type: 'Theory',
        credits: getSubInfo('DCD').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[97]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[98]) },
          { name: 'Internals', max: 20, score: cleanCell(r[100]) },
          { name: 'ESE', max: 30, score: cleanCell(r[99]) },
        ],
        total: cleanCell(r[101]),
        maxTotal: getSubInfo('DCD').maxMarks || 50,
        grade: cleanCell(r[102], 'IP'),
        gradePoint: cleanCell(r[139]),
        creditPoints: cleanCell(r[152]),
      });
    }

    if (hasEst) {
      subjects.push({
        code: 'EST',
        name: getSubInfo('EST').name,
        type: 'Theory',
        credits: getSubInfo('EST').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[103]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[104]) },
          { name: 'Internals', max: 20, score: cleanCell(r[106]) },
          { name: 'ESE', max: 30, score: cleanCell(r[105]) },
        ],
        total: cleanCell(r[107]),
        maxTotal: getSubInfo('EST').maxMarks || 50,
        grade: cleanCell(r[108], 'IP'),
        gradePoint: cleanCell(r[139]),
        creditPoints: cleanCell(r[152]),
      });
    }

    if (hasEdp) {
      subjects.push({
        code: 'EDP',
        name: getSubInfo('EDP').name,
        type: 'Theory',
        credits: getSubInfo('EDP').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[109]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[110]) },
          { name: 'Internals', max: 20, score: cleanCell(r[112]) },
          { name: 'ESE', max: 30, score: cleanCell(r[111]) },
        ],
        total: cleanCell(r[113]),
        maxTotal: getSubInfo('EDP').maxMarks || 50,
        grade: cleanCell(r[114], 'IP'),
        gradePoint: cleanCell(r[139]),
        creditPoints: cleanCell(r[152]),
      });
    }

    if (hasSps) {
      subjects.push({
        code: 'SPS',
        name: getSubInfo('SPS').name,
        type: 'Theory',
        credits: getSubInfo('SPS').credits,
        assessments: [
          { name: 'CAE-1', max: 20, score: cleanCell(r[115]) },
          { name: 'CAE-2', max: 20, score: cleanCell(r[116]) },
          { name: 'Internals', max: 20, score: cleanCell(r[118]) },
          { name: 'ESE', max: 30, score: cleanCell(r[117]) },
        ],
        total: cleanCell(r[119]),
        maxTotal: getSubInfo('SPS').maxMarks || 50,
        grade: cleanCell(r[120], 'IP'),
        gradePoint: cleanCell(r[139]),
        creditPoints: cleanCell(r[152]),
      });
    }

    // 4. NPTEL Subject (for all students NOT taking an Open Elective course)
    // "in sem 3 marks nptel is also a subject but only the student who doesnt doing open elective course is passed in nptel"
    const hasAnyOe = hasDcd || hasEst || hasEdp || hasSps;
    if (!hasAnyOe) {
      const liveNptel = nptelMap?.get(usn.toUpperCase());
      const nptelScoreRaw = (liveNptel?.marks && liveNptel.marks !== '-' ? liveNptel.marks : cleanCell(r[126]));
      const hasNptelScore = nptelScoreRaw !== '-' && nptelScoreRaw !== '' && nptelScoreRaw !== '0';
      const nptelGradeRaw = (liveNptel?.grade && liveNptel.grade !== '-' ? liveNptel.grade : cleanCell(r[127]));
      const nptelGrade = (nptelGradeRaw && nptelGradeRaw !== '-' && nptelGradeRaw !== 'IP') ? nptelGradeRaw : 'PASS';

      subjects.push({
        code: 'NPTEL',
        name: getSubInfo('NPTEL').name,
        type: 'Theory',
        credits: getSubInfo('NPTEL').credits,
        assessments: [
          {
            name: 'NPTEL Score',
            max: 100,
            score: hasNptelScore ? nptelScoreRaw : 'PASS',
          },
        ],
        total: hasNptelScore ? nptelScoreRaw : '-',
        maxTotal: 100,
        grade: nptelGrade,
        gradePoint: cleanCell(r[141]),
        creditPoints: cleanCell(r[154]),
      });
    }

    // 5. INC (Incentives - 12th in required order: DMGT, CAO, DSA, DSAL, FCC, ED, ES, CEP/FP, MDM, OE, NPTEL, INC)
    // By default, everyone is PASS in INC
    const rawIncGrade = cleanCell(r[144] || r[128]);
    const incGrade = (rawIncGrade && rawIncGrade !== '-' && rawIncGrade !== '0' && rawIncGrade !== 'F') ? rawIncGrade : 'PASS';
    const rawIncScore = cleanCell(r[145] || r[129]);

    subjects.push({
      code: 'INC',
      name: getSubInfo('INC').name,
      type: 'Activity',
      credits: getSubInfo('INC').credits,
      assessments: [{ name: 'Incentives Score', max: 10, score: rawIncScore !== '-' ? rawIncScore : 'PASS' }],
      total: rawIncScore !== '-' ? rawIncScore : '-',
      maxTotal: 10,
      grade: incGrade,
      gradePoint: cleanCell(r[156] || r[142]),
      creditPoints: cleanCell(r[167] || r[155]),
    });

    // Explicitly guarantee required syllabus order:
    // DMGT -> CAO -> DSA -> DSAL -> FCC -> ED -> ES -> CEP/FP -> MDM -> OE -> NPTEL -> INC
    const SEM3_SUBJECT_ORDER: Record<string, number> = {
      DMGT: 1,
      CAO: 2,
      DSA: 3,
      DSAL: 4,
      FCC: 5,
      ED: 6,
      ES: 7,
      'CEP/FP': 8,
      WFBFD: 9,
      WFBFDL: 10,
      DEFM: 9,
      DEFML: 10,
      BE: 9,
      BA: 9,
      DCD: 11,
      EST: 11,
      EDP: 11,
      SPS: 11,
      NPTEL: 12,
      INC: 13,
      INCENTIVES: 13,
    };
    subjects.sort((a, b) => (SEM3_SUBJECT_ORDER[a.code] || 99) - (SEM3_SUBJECT_ORDER[b.code] || 99));

    // 6. Summaries & Totals
    const academicCredits = subjects
      .filter((sub) => sub.code !== 'INC' && sub.code !== 'INCENTIVES')
      .reduce((acc, sub) => acc + (parseFloat(sub.credits || '0') || 0), 0);
    const totalCredits = String(academicCredits >= 24 ? academicCredits : (academicCredits >= 21 ? academicCredits : 24));

    const rawGradePoints = cleanCell(r[156]);
    const rawSgpa = cleanCell(r[157]);
    const rawStatus = cleanCell(r[158]);

    const totalGradePoints = rawGradePoints !== '-' ? rawGradePoints : '-';
    const sgpa = rawSgpa !== '-' ? rawSgpa : 'In Progress';
    const status = rawStatus === 'PASS' ? 'Enrolled' : (rawStatus !== '-' ? rawStatus : 'In Progress');

    students.push({
      usn,
      name,
      semester: 3,
      subjects,
      summary: {
        totalCredits,
        totalGradePoints,
        sgpa,
        status,
      },
    });
  }

  return students;
}

function parseDynamicLayout(rows: string[][], semester: number): StudentSemesterMarks[] {
  const headers = rows[0];
  const students: StudentSemesterMarks[] = [];

  const totalCreditsIdx = headers.findIndex((h) => /total\s*credits/i.test(h));
  const sgpaIdx = headers.findIndex((h) => /^sgpa/i.test(h));
  const resultIdx = headers.findIndex((h) => /pass\s*(or|\/)\s*fail|result|status/i.test(h));

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const usn = (row[0] || '').trim();
    const name = (row[1] || '').trim();
    if (!usn || !name || usn.toLowerCase().includes('usn')) continue;

    // Collect unique subject prefixes
    const subjectPrefixes = new Set<string>();

    for (let c = 2; c < headers.length; c++) {
      const h = headers[c];
      if (/grade\s*points|credits?\s*points|total\s*credits|sgpa|result/i.test(h)) continue;
      const parts = h.trim().split(/[\s\n_]+/);
      if (parts[0] && parts[0].length >= 2 && parts[0].length <= 12) {
        subjectPrefixes.add(parts[0].toUpperCase());
      }
    }

    const subjects: SubjectMarks[] = [];

    subjectPrefixes.forEach((code) => {
      const isLab = code.endsWith('L') || code.includes('LAB');
      const isActivity = code.includes('LLC') || code.includes('INC');
      const type = isActivity ? 'Activity' : isLab ? 'Practical' : 'Theory';

      const assessments: AssessmentItem[] = [];
      let total = '-';
      let maxTotal = 100;
      let grade = '-';

      headers.forEach((h, colIdx) => {
        if (!h.toUpperCase().includes(code)) return;
        const val = row[colIdx] || '-';
        if (h.toLowerCase().includes('total')) {
          total = val;
          const maxMatch = h.match(/\[([0-9]+)\]/);
          if (maxMatch) maxTotal = parseInt(maxMatch[1], 10);
        } else if (h.toLowerCase().includes('grade') && !h.toLowerCase().includes('point')) {
          grade = val;
        } else if (!h.toLowerCase().includes('credit') && !h.toLowerCase().includes('point')) {
          const assessName = h.replace(new RegExp(code, 'i'), '').replace(/\[.*?\]/g, '').trim();
          assessments.push({
            name: assessName || `Assessment ${assessments.length + 1}`,
            max: 50,
            score: val,
          });
        }
      });

      let finalGrade = grade;
      if (code === 'INC' || code === 'INCENTIVES') {
        if (!finalGrade || finalGrade === '-' || finalGrade === '0' || finalGrade === 'F') {
          finalGrade = 'PASS';
        }
      }

      if (total !== '-' || finalGrade !== '-' || assessments.length > 0) {
        subjects.push({
          code,
          name: KNOWN_SUBJECT_NAMES[code] || `${code} Course`,
          type,
          assessments,
          total,
          maxTotal,
          grade: finalGrade,
          gradePoint: '-',
          creditPoints: '-',
        });
      }
    });

    students.push({
      usn,
      name,
      semester,
      subjects,
      summary: {
        totalCredits: totalCreditsIdx !== -1 ? (row[totalCreditsIdx] || '0').trim() : '0',
        sgpa: sgpaIdx !== -1 ? (row[sgpaIdx] || '0.00').trim() : '0.00',
        status: resultIdx !== -1 ? (row[resultIdx] || 'Enrolled').trim() : 'Enrolled',
      },
    });
  }

  return students;
}
