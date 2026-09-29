export interface UserPreferences {
  theme?: string;
  attendanceTarget?: number;
}

export interface UpdateUserProfileParams {
  userId: string;
  name?: string;
  username?: string | null;
  bio?: string;
  phone?: string;
  department?: string;
  year?: number;
  collegeId?: string;
}

export interface UpdateIncognitoProfileParams {
  userId: string;
  handle: string;
}
