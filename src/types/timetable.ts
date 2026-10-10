export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface LectureItem {
  id: string;
  period: number;
  periodLabel: string; // e.g. "Lec 1", "Lec 2", "Lab 1"
  timings: string; // e.g. "09:15 AM - 10:15 AM"
  subjectCode: string; // e.g. "CAO"
  subjectName: string; // e.g. "Computer Architecture & Organization"
  room: string; // e.g. "Hall 304"
  faculty?: string; // e.g. "Prof. Sharma"
  type: 'Theory' | 'Lab' | 'Tutorial';
}

export interface DaySchedule {
  day: DayName;
  shortDay: 'Mon' | 'Tue' | 'Wed' | 'Thur' | 'Fri' | 'Sat';
  lectures: LectureItem[];
}

export interface TimetableResponse {
  success: boolean;
  data: DaySchedule[];
  error?: string;
  isFallback?: boolean;
}
