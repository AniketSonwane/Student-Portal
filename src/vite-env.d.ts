/// <reference types="vite/client" />

interface Window {
  google?: any;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM1_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM2_ID: string;
  readonly VITE_GOOGLE_SHEETS_SEM3_ID: string;
  readonly VITE_GOOGLE_SHEETS_PROFILE_ID: string;
  readonly VITE_GOOGLE_SHEETS_ADMIN_API_URL: string;
  readonly VITE_ADMIN_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
