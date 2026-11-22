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

export const NOTICES_SPREADSHEET_ID =
  (import.meta.env.VITE_GOOGLE_SHEETS_NOTICES_ID as string) ||
  '1P98kvGpLJcFAVBU6lHyw5Q89uvo0DkJwFZeXDxg8L6w';

export const NOTICES_ROOT_DRIVE_FOLDER_ID =
  (import.meta.env.VITE_GOOGLE_DRIVE_NOTICES_FOLDER_ID as string) ||
  '17jq8UKlFV5g3Uopm4z7s395NhuDwwrPk';
export const NOTICES_ROOT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${NOTICES_ROOT_DRIVE_FOLDER_ID}`;

export const SEMESTER_DRIVE_FOLDERS: Record<number, { id: string; url: string }> = {
  1: {
    id:
      (import.meta.env.VITE_GOOGLE_DRIVE_SEM1_FOLDER_ID as string) ||
      '1JL4ftUrmq5Pynrc_EQoCTRhID0yBcZ8m',
    url: 'https://drive.google.com/drive/folders/1JL4ftUrmq5Pynrc_EQoCTRhID0yBcZ8m',
  },
  2: {
    id:
      (import.meta.env.VITE_GOOGLE_DRIVE_SEM2_FOLDER_ID as string) ||
      '1NzgznyPWmK4gxX7cYjhqfdyVf93aIy9S',
    url: 'https://drive.google.com/drive/folders/1NzgznyPWmK4gxX7cYjhqfdyVf93aIy9S',
  },
  3: {
    id:
      (import.meta.env.VITE_GOOGLE_DRIVE_SEM3_FOLDER_ID as string) ||
      '1UNcXEgLnjy-eIlsEwnxz9gZ20-Lvlhlu',
    url: 'https://drive.google.com/drive/folders/1UNcXEgLnjy-eIlsEwnxz9gZ20-Lvlhlu',
  },
};

export const getSemesterDriveFolderId = (sem: number = 3): string => {
  return SEMESTER_DRIVE_FOLDERS[sem]?.id || SEMESTER_DRIVE_FOLDERS[3].id;
};

export const getSemesterDriveFolderUrl = (sem: number = 3): string => {
  return SEMESTER_DRIVE_FOLDERS[sem]?.url || SEMESTER_DRIVE_FOLDERS[3].url;
};

export const SEMESTER_DATA_DRIVE_FOLDER_ID = SEMESTER_DRIVE_FOLDERS[3].id;
export const SEMESTER_DATA_DRIVE_FOLDER_URL = SEMESTER_DRIVE_FOLDERS[3].url;
