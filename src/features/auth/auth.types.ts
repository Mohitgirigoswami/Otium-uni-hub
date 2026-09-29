export interface JwtUserPayload {
  userId: string;
  email?: string;
  role?: string;
  name?: string;
}

export interface VerifyAuthResult {
  authenticated: boolean;
  user: any | null;
  error?: string;
}
