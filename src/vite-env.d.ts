/// <reference types="vite/client" />

interface Window {
  google?: any;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM1_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM2_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM3_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM3_DETAILS_GID?: string;
  readonly VITE_GOOGLE_SHEETS_SEM3_NPTEL_GID?: string;
  readonly VITE_GOOGLE_SHEETS_PROFILE_ID: string;
  readonly VITE_GOOGLE_SHEETS_ATTENDANCE_ID?: string;
  readonly VITE_GOOGLE_SHEETS_EXAM_DATES_ID?: string;
  readonly VITE_GOOGLE_SHEETS_TIMETABLE_ID?: string;
  readonly VITE_GOOGLE_SHEETS_ADMIN_ID?: string;
  readonly VITE_GOOGLE_SHEETS_ADMIN_API_URL?: string;
  readonly VITE_GOOGLE_SHEETS_TIMETABLE_API_URL?: string;
  readonly VITE_GOOGLE_SHEETS_EXAM_DATES_API_URL?: string;
  readonly VITE_ADMIN_SHEET_URL?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_ADMIN_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
