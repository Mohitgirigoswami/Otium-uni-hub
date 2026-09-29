export interface SubjectData {
  id: string;
  name: string;
  code?: string | null;
  totalClasses: number;
  attendedClasses: number;
  periodWeight?: number;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  records?: AttendanceRecordData[];
}

export interface AttendanceRecordData {
  id: string;
  subjectId: string;
  status: "PRESENT" | "ABSENT";
  date: Date;
}

export interface CreateSubjectParams {
  userId: string;
  name: string;
  code?: string;
  totalClasses: number;
  attendedClasses: number;
  periodWeight?: number;
}

export interface UpdateSubjectCountsParams {
  name: string;
  code?: string;
  totalClasses: number;
  attendedClasses: number;
  periodWeight?: number;
}

export interface OfflineSubjectItem {
  id: string;
  name: string;
  code?: string;
  attended: number;
  total: number;
  periodWeight?: number;
}
