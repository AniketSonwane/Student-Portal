export interface AssessmentItem {
  name: string;
  max: number;
  score: string;
}

export interface SubjectMarks {
  code: string;
  name: string;
  type: 'Theory' | 'Practical' | 'Activity';
  assessments: AssessmentItem[];
  total: string;
  maxTotal: number;
  grade: string;
  gradePoint: string;
  creditPoints: string;
  credits?: string;
}

export interface SemesterSummary {
  totalCredits: string;
  totalGradePoints?: string;
  sgpa: string;
  status: string;
}

export interface StudentSemesterMarks {
  usn: string;
  name: string;
  semester: number;
  subjects: SubjectMarks[];
  summary: SemesterSummary;
}

export interface MarksApiResponse {
  success: boolean;
  data?: StudentSemesterMarks;
  error?: {
    code: string;
    message: string;
  };
}
