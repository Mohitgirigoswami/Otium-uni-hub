export interface CourseGradeItem {
  name: string;
  credits: number;
  gradePoint: number;
  gradeLabel: string;
}

export interface SaveSemesterRecordParams {
  userId: string;
  semester: number;
  courses?: CourseGradeItem[];
  gpa: number;
  totalCredits: number;
}

export interface SemesterCGPARecord {
  id: string;
  userId: string;
  semester: number;
  gpa: number;
  totalCredits: number;
  courses: CourseGradeItem[];
  createdAt: Date;
  updatedAt: Date;
}
