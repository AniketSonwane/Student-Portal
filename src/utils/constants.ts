const defaultAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string) || '';

export const APP_CONFIG = {
  name: 'Student Portal',
  subtitle: 'Academic Records & Performance',
  version: '1.0.0',
  adminEmail: defaultAdminEmail,
  adminContactUrl: `mailto:${defaultAdminEmail}`,
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  MARKS: '/marks',
  STATEMENT: '/statement',
  ATTENDANCE: '/attendance',
  EXAM_DATES: '/exam-dates',
  TIMETABLE: '/timetable',
  SETTINGS: '/settings',
  TERMS: '/terms',
  ADMIN: '/admin',
} as const;
