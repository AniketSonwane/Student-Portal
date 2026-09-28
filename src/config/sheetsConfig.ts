export interface SemesterSheetConfig {
  semester: number;
  spreadsheetId: string;
  sheetName: string;
  label: string;
}

export const SEMESTER_SHEETS_CONFIG: Record<number, SemesterSheetConfig> = {
  1: {
    semester: 1,
    spreadsheetId:
      (import.meta.env.VITE_GOOGLE_SHEETS_SEM1_ID as string) ||
      '167hosqqnr-PlwTZeU2dG3K1XUCBfZgNqD_mwG5oUDdI',
    sheetName: 'Master-Sheet',
    label: 'Semester 1',
  },
  2: {
    semester: 2,
    spreadsheetId:
      (import.meta.env.VITE_GOOGLE_SHEETS_SEM2_ID as string) ||
      '1AD1Fj5OvUujvzkGiB7AhDy49yULTlSRGFGTAhq1lAes',
    sheetName: 'Master-Sheet',
    label: 'Semester 2',
  },
  3: {
    semester: 3,
    spreadsheetId:
      (import.meta.env.VITE_GOOGLE_SHEETS_SEM3_ID as string) ||
      '1rGxLk5dIaMuJNaxRpUjclIfrEqISSFMRrUI3gmujzPA',
    sheetName: 'Master-Sheet',
    label: 'Semester 3',
  },
};

export const SUPPORTED_SEMESTERS = [1, 2, 3] as const;
