const fs = require('fs');

const rosterContent = fs.readFileSync('src/data/studentsRoster.ts', 'utf8');

const output = `// In-memory / spreadsheet-synced roster for student authorization verification
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
  category?: string;
  blood_group?: string;
}

// Synced student roster matching Master-Sheet
${rosterContent.replace("import { Student } from '../types/auth';", "").replace("export const ALL_STUDENTS_ROSTER: Student[] =", "export const INITIAL_STUDENT_ROSTER: AuthorizedStudentRecord[] =")}

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

fs.writeFileSync('netlify/lib/studentRepository.ts', output, 'utf8');
console.log('Successfully updated netlify/lib/studentRepository.ts');
