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
  (import.meta.env.VITE_GOOGLE_SHEETS_NOTICES_ID as string) || '';

export const NOTICES_ROOT_DRIVE_FOLDER_ID =
  (import.meta.env.VITE_GOOGLE_DRIVE_NOTICES_FOLDER_ID as string) || '';

export const NOTICES_ROOT_DRIVE_FOLDER_URL = NOTICES_ROOT_DRIVE_FOLDER_ID
  ? `https://drive.google.com/drive/folders/${NOTICES_ROOT_DRIVE_FOLDER_ID}`
  : '';

const sem1DriveFolderId = (import.meta.env.VITE_GOOGLE_DRIVE_SEM1_FOLDER_ID as string) || '';
const sem2DriveFolderId = (import.meta.env.VITE_GOOGLE_DRIVE_SEM2_FOLDER_ID as string) || '';
const sem3DriveFolderId = (import.meta.env.VITE_GOOGLE_DRIVE_SEM3_FOLDER_ID as string) || '';

export const SEMESTER_DRIVE_FOLDERS: Record<number, { id: string; url: string }> = {
  1: {
    id: sem1DriveFolderId,
    url: sem1DriveFolderId ? `https://drive.google.com/drive/folders/${sem1DriveFolderId}` : '',
  },
  2: {
    id: sem2DriveFolderId,
    url: sem2DriveFolderId ? `https://drive.google.com/drive/folders/${sem2DriveFolderId}` : '',
  },
  3: {
    id: sem3DriveFolderId,
    url: sem3DriveFolderId ? `https://drive.google.com/drive/folders/${sem3DriveFolderId}` : '',
  },
};

export const getSemesterDriveFolderId = (sem: number = 3): string => {
  return SEMESTER_DRIVE_FOLDERS[sem]?.id || SEMESTER_DRIVE_FOLDERS[3]?.id || '';
};

export const getSemesterDriveFolderUrl = (sem: number = 3): string => {
  return SEMESTER_DRIVE_FOLDERS[sem]?.url || SEMESTER_DRIVE_FOLDERS[3]?.url || '';
};

export const SEMESTER_DATA_DRIVE_FOLDER_ID = SEMESTER_DRIVE_FOLDERS[3]?.id || '';
export const SEMESTER_DATA_DRIVE_FOLDER_URL = SEMESTER_DRIVE_FOLDERS[3]?.url || '';
