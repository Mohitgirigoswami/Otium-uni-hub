export interface CloudinarySignatureData {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export type CloudinarySignatureResponse = CloudinarySignatureData;

export interface SupabaseUploadUrlData {
  signedUrl: string;
  publicUrl: string;
  path: string;
}

export interface SupabaseSignedUploadResponse {
  signedUrl: string;
  path: string;
  token: string;
  publicUrl: string;
  maxSizeBytes: number;
}

export interface DriveResumableSessionData {
  uploadUrl: string;
  fileName: string;
  mimeType: string;
  serviceAccountEmail?: string;
  folderId?: string;
  note?: string;
}
