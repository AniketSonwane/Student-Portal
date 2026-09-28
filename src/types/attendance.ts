export interface SubjectAttendance {
  code: string;
  name: string;
  percentage: string;
  numericPercentage: number;
  isAllotted: boolean;
  status: 'Safe' | 'Warning' | 'Critical';
  category?: 'Common' | 'MDM' | 'OE';
}

export interface StudentAttendanceRecord {
  srn: string;
  usn: string;
  name: string;
  semester: number;
  subjects: SubjectAttendance[];
  totalAverage: string;
  numericAverage: number;
  status: 'Safe' | 'Warning' | 'Critical';
}
