"use server";

import { google } from "googleapis";
import { ActionResponse } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { Readable } from "stream";

export interface DriveResumableSessionData {
  uploadUrl: string;
  fileName: string;
  mimeType: string;
  serviceAccountEmail?: string;
  folderId?: string;
  note?: string;
}

/**
 * Helper to safely parse Google Service Account Credentials from environment variables
 */
function parseGoogleCredentials() {
  let client_email =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    "";
  let private_key =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    "";
  const parentFolderId =
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ||
    "";

  // Check if credentials are provided via JSON string
  const jsonCreds =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (jsonCreds && jsonCreds.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(jsonCreds.trim());
      if (parsed.client_email) client_email = parsed.client_email;
      if (parsed.private_key) private_key = parsed.private_key;
    } catch (err) {
      console.warn("[GoogleDrive] Could not JSON parse credentials string:", err);
    }
  }

  // Normalize private key formatting and replace escaped line breaks
  if (private_key) {
    private_key = private_key.replace(/\\n/g, "\n");
    if (!private_key.includes("-----BEGIN PRIVATE KEY-----")) {
      private_key = `-----BEGIN PRIVATE KEY-----\n${private_key}\n-----END PRIVATE KEY-----\n`;
    }
  }

  return {
    client_email: client_email || "placeholder_service_account@project.iam.gserviceaccount.com",
    private_key:
      private_key ||
      "-----BEGIN PRIVATE KEY-----\nplaceholder_private_key\n-----END PRIVATE KEY-----\n",
    parentFolderId: parentFolderId ? parentFolderId.trim() : "",
  };
}

/**
 * 1. DIRECT SERVER-SIDE STREAM UPLOAD TO GOOGLE DRIVE (Recommended for 100% Reliability)
 */
export async function uploadPdfDirectToGoogleDriveAction(formData: FormData): Promise<
  ActionResponse<{
    driveFileId: string;
    webViewLink: string;
    fileName: string;
    downloadUrl: string;
  }>
> {
  const creds = parseGoogleCredentials();

  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No document file provided for upload." };
    }

    console.log("--------------------------------------------------");
    console.log("[GoogleDrive Direct] Uploading PDF:", file.name, `(${file.size} bytes)`);
    console.log("[GoogleDrive Direct] Service Account Email:", creds.client_email);
    console.log("[GoogleDrive Direct] Target Folder ID:", creds.parentFolderId || "(Root)");
    console.log("--------------------------------------------------");

    // Check placeholder demo mode
    if (
      creds.client_email.includes("placeholder") ||
      creds.private_key.includes("placeholder")
    ) {
      const mockId = `gdrive_${Date.now()}`;
      return {
        success: true,
        data: {
          driveFileId: mockId,
          webViewLink: `https://drive.google.com/file/d/${mockId}/view?usp=sharing`,
          fileName: file.name,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${mockId}`,
        },
      };
    }

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const drive = google.drive({ version: "v3", auth });
    const buffer = Buffer.from(await file.arrayBuffer());

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const requestBody: Record<string, any> = {
      name: file.name,
      mimeType: file.type || "application/pdf",
    };

    if (creds.parentFolderId && !creds.parentFolderId.includes("placeholder")) {
      requestBody.parents = [creds.parentFolderId];
    }

    const fileRes = await drive.files.create({
      supportsAllDrives: true,
      requestBody,
      media: {
        mimeType: file.type || "application/pdf",
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink",
    });

    const driveFileId = fileRes.data.id!;
    console.log("[GoogleDrive Direct] File successfully saved in Google Drive! ID:", driveFileId);

    // Apply public reader permissions
    try {
      await drive.permissions.create({
        fileId: driveFileId,
        supportsAllDrives: true,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
      console.log(`[GoogleDrive Direct] Set public reader permission on file: ${driveFileId}`);
    } catch (permErr: any) {
      console.warn("[GoogleDrive Direct] Permission notice:", permErr?.message);
    }

    const webViewLink =
      fileRes.data.webViewLink ||
      `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
    const downloadUrl =
      fileRes.data.webContentLink ||
      `https://drive.google.com/uc?export=download&id=${driveFileId}`;

    return {
      success: true,
      data: {
        driveFileId,
        webViewLink,
        fileName: file.name,
        downloadUrl,
      },
    };
  } catch (error: any) {
    console.error("[GoogleDrive Direct] Error:", error);

    const errMsg = error?.message || "";
    if (errMsg.includes("File not found") || error?.code === 404) {
      return {
        success: false,
        error: `Google Drive Folder '${creds.parentFolderId}' is NOT shared with '${creds.client_email}'. Open Google Drive, click Share on this folder, and add '${creds.client_email}' with Editor access.`,
      };
    }

    if (errMsg.includes("storage quota") || error?.code === 403) {
      return {
        success: false,
        error: `Google Drive Service Accounts have 0MB root storage quota. Please share folder '${creds.parentFolderId}' with '${creds.client_email}' as Editor.`,
      };
    }

    return {
      success: false,
      error: error?.message || "Failed to upload PDF to Google Drive.",
    };
  }
}

/**
 * 2. GOOGLE DRIVE RESUMABLE UPLOAD SESSION INITIATOR
 */
export async function getGoogleDriveResumableUploadUrl(data: {
  fileName: string;
  mimeType: string;
  fileSize?: number;
  userId?: string;
}): Promise<ActionResponse<DriveResumableSessionData>> {
  try {
    const rateCheck = await checkRateLimit(data.userId || "gdrive-upload");
    if (!rateCheck.success) return { success: false, error: rateCheck.error };

    const creds = parseGoogleCredentials();

    // Check for dummy placeholder mode
    if (
      creds.client_email.includes("placeholder") ||
      creds.private_key.includes("placeholder")
    ) {
      return {
        success: true,
        data: {
          uploadUrl: `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&dummy_session=true&file=${encodeURIComponent(
            data.fileName
          )}`,
          fileName: data.fileName,
          mimeType: data.mimeType || "application/pdf",
          serviceAccountEmail: creds.client_email,
          folderId: creds.parentFolderId,
        },
      };
    }

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });

    const accessTokenResponse = await auth.getAccessToken();
    const accessToken = accessTokenResponse.token;

    if (!accessToken) {
      return {
        success: false,
        error: `Failed to authenticate with Google Drive API for Service Account '${creds.client_email}'. Check private key.`,
      };
    }

    const metadata: Record<string, any> = {
      name: data.fileName,
      mimeType: data.mimeType || "application/pdf",
    };

    if (creds.parentFolderId && !creds.parentFolderId.includes("placeholder")) {
      metadata.parents = [creds.parentFolderId];
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": data.mimeType || "application/pdf",
    };

    if (data.fileSize) {
      headers["X-Upload-Content-Length"] = String(data.fileSize);
    }

    const uploadEndpoint = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true";
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMessage = errorText.slice(0, 180);
      try {
        const errorJson = JSON.parse(errorText);
        parsedMessage = errorJson?.error?.message || parsedMessage;
      } catch (e) {}

      return {
        success: false,
        error: `Google Drive (${response.status}): ${parsedMessage}. Ensure folder '${creds.parentFolderId}' is shared with '${creds.client_email}' as Editor.`,
      };
    }

    const resumableUploadUrl = response.headers.get("Location");

    if (!resumableUploadUrl) {
      return {
        success: false,
        error: "Google Drive did not return a resumable Location header.",
      };
    }

    return {
      success: true,
      data: {
        uploadUrl: resumableUploadUrl,
        fileName: data.fileName,
        mimeType: data.mimeType || "application/pdf",
        serviceAccountEmail: creds.client_email,
        folderId: creds.parentFolderId,
      },
    };
  } catch (error: any) {
    const creds = parseGoogleCredentials();
    return {
      success: false,
      error: `Google Drive upload session error: ${error?.message || "Internal error"}. Ensure Service Account '${creds.client_email}' has Editor access to folder '${creds.parentFolderId}'.`,
    };
  }
}

/**
 * 3. Set Public Read Permissions for Uploaded Google Drive File
 */
export async function makeDriveFilePublicAction(fileId: string): Promise<
  ActionResponse<{ webViewLink: string; downloadUrl: string }>
> {
  const creds = parseGoogleCredentials();

  try {
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    try {
      await drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
      console.log(`[GoogleDrive] Set public reader permission on fileId: ${fileId}`);
    } catch (permErr: any) {
      console.warn("[GoogleDrive] Permission notice:", permErr?.message);
    }

    const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return {
      success: true,
      data: {
        webViewLink,
        downloadUrl,
      },
    };
  } catch (error: any) {
    console.error("[GoogleDrive] Error in makeDriveFilePublicAction:", error);
    return {
      success: true,
      data: {
        webViewLink: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
      },
    };
  }
}
