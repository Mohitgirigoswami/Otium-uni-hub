export type ActionResponse<T = any> = {
  success?: boolean;
  error?: string;
  data?: T;
};

export type TaskCategoryType = 
  | 'ASSIGNMENT'
  | 'PROJECT'
  | 'RESEARCH'
  | 'PRESENTATION'
  | 'CODING'
  | 'DESIGN'
  | 'TUTORING'
  | 'OTHER';

export type TaskStatusType = 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export type MarketplaceCategoryType =
  | 'BOOKS_NOTES'
  | 'ELECTRONICS'
  | 'FURNITURE'
  | 'CYCLES_TRANSPORT'
  | 'HOSTEL_ESSENTIALS'
  | 'CLOTHING'
  | 'OTHER';

export type ItemConditionType = 'BRAND_NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';

export type MarketplaceStatusType = 'AVAILABLE' | 'SOLD';

export type PrintTypeEnum = 'BW_SINGLE' | 'BW_DOUBLE' | 'COLOR_SINGLE' | 'COLOR_DOUBLE';

export type LostAndFoundStatusType = 'UNCLAIMED' | 'CLAIMED';

export type RideShareStatusType = 'OPEN' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export interface CourseGradeItem {
  id: string;
  name: string;
  credits: number;
  gradePoint: number; // 0 - 10
  gradeLabel: string; // e.g. "O", "A+", "A", "B+", etc.
}

export interface SemesterData {
  id?: string;
  semesterNumber: number;
  courses: CourseGradeItem[];
  gpa: number;
  totalCredits: number;
}
