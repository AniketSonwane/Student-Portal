/**
 * Utility to purge obsolete, temporary, or unnecessary keys from browser localStorage.
 * Runs on application startup to ensure a clean, minimal storage footprint.
 */
export const cleanupUnnecessaryStorage = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Remove legacy or per-student profile picture cache keys (now stored directly in user object)
      if (key.startsWith('student_portal_profile_image')) {
        keysToRemove.push(key);
      }

      // 2. Remove obsolete demo, test, or scratch keys from development
      if (
        key.startsWith('test_') ||
        key.startsWith('demo_') ||
        key.startsWith('temp_') ||
        key === 'student_portal_demo_data' ||
        key === 'student_portal_mock_logs' ||
        key === 'student_portal_cached_students'
      ) {
        keysToRemove.push(key);
      }
    }

    // Purge matched unnecessary keys
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 3. Purge obsolete or broken Google Apps Script URLs
    const sheetUrl = localStorage.getItem('student_portal_admin_sheet_url');
    if (
      sheetUrl &&
      (sheetUrl.includes('AKfycbxvk') || !sheetUrl.startsWith('https://script.google.com'))
    ) {
      localStorage.removeItem('student_portal_admin_sheet_url');
    }

    // 4. Sanitize admin logs cache: purge mock/seed entries
    const logsRaw = localStorage.getItem('student_portal_admin_logs');
    if (logsRaw) {
      try {
        const parsed = JSON.parse(logsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (l: any) =>
              l &&
              l.id &&
              !String(l.id).startsWith('log-10') &&
              !String(l.id).startsWith('test-') &&
              l.student_name !== 'Unknown User' &&
              !l.reason?.includes('Admin')
          );
          localStorage.setItem('student_portal_admin_logs', JSON.stringify(cleaned));
        }
      } catch {
        localStorage.removeItem('student_portal_admin_logs');
      }
    }

    // 5. Sanitize admin change requests cache: purge mock entries
    const reqsRaw = localStorage.getItem('student_portal_admin_change_requests');
    if (reqsRaw) {
      try {
        const parsed = JSON.parse(reqsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (r: any) => r && r.id && !String(r.id).startsWith('req-0')
          );
          localStorage.setItem('student_portal_admin_change_requests', JSON.stringify(cleaned));
        }
      } catch {
        localStorage.removeItem('student_portal_admin_change_requests');
      }
    }
  } catch (err) {
    console.warn('Storage cleanup non-critical error:', err);
  }
};
