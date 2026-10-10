export interface SemesterSheetConfig {
  semester: number;
  spreadsheetId: string;
  sheetName: string;
  label: string;
}

export const SEMESTER_SHEETS_CONFIG: Record<number, SemesterSheetConfig> = {
  1: {
    semester: 1,
    spreadsheetId: (import.meta.env.VITE_GOOGLE_SHEETS_SEM1_ID as string) || '',
    sheetName: 'Master-Sheet',
    label: 'Semester 1',
  },
  2: {
    semester: 2,
    spreadsheetId: (import.meta.env.VITE_GOOGLE_SHEETS_SEM2_ID as string) || '',
    sheetName: 'Master-Sheet',
    label: 'Semester 2',
  },
  3: {
    semester: 3,
    spreadsheetId: (import.meta.env.VITE_GOOGLE_SHEETS_SEM3_ID as string) || '',
    sheetName: 'Master-Sheet',
    label: 'Semester 3',
  },
};

export const SUPPORTED_SEMESTERS = [1, 2, 3] as const;

export const EXAM_DATES_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_EXAM_DATES_ID as string) || '';

export const TIMETABLE_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_TIMETABLE_ID as string) || '';

export const ADMIN_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_ADMIN_ID as string) || '';
