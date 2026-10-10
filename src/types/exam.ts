export type ExamType = 'CAE-1' | 'CAE-2' | 'Unit Test' | 'ESE' | string;

export interface ExamDateItem {
  id: string;
  semester: number;
  examType: ExamType; // 'CAE-1' | 'CAE-2' | 'Unit Test' | 'ESE'
  subjectCode: string; // e.g. 'DSA', 'CAO', 'DMGT'
  subjectName: string; // e.g. 'Data Structures & Algorithms'
  date: string; // Format 'YYYY-MM-DD'
  formattedDate: string; // e.g. '15 Oct 2026'
  dayOfWeek: string; // e.g. 'Thursday'
  timings: string; // e.g. '10:00 AM - 01:00 PM'
  venue?: string; // e.g. 'Examination Hall A' or 'Room 204'
  shift?: string; // e.g. 'Morning' or 'Afternoon'
  status: 'Upcoming' | 'Today' | 'Completed';
  isCompleted: boolean;
  notes?: string;
}

export interface ExamCategoryFilter {
  id: string;
  label: string;
  count: number;
}

export interface ExamDatesResponse {
  success: boolean;
  data?: ExamDateItem[];
  error?: string;
  isUnavailable?: boolean;
  isFallback?: boolean;
}
