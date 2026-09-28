export const APP_CONFIG = {
  name: 'Student Portal',
  subtitle: 'Academic Records & Performance',
  version: '1.0.0',
  adminEmail: 'anixss.main@gmail.com',
  adminContactUrl: 'mailto:anixss.main@gmail.com',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/167hosqqnr-PlwTZeU2dG3K1XUCBfZgNqD_mwG5oUDdI/edit?usp=sharing',
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  MARKS: '/marks',
  STATEMENT: '/statement',
  ATTENDANCE: '/attendance',
  SETTINGS: '/settings',
  TERMS: '/terms',
  ADMIN: '/admin',
} as const;
