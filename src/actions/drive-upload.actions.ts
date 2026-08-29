"use server";

import { google } from "googleapis";
import { ActionResponse } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

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
 * 1. GOOGLE DRIVE RESUMABLE UPLOAD SESSION INITIATOR
 * Authenticates via Service Account & returns direct Resumable Session URI for client-side PUT
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

    console.log("--------------------------------------------------");
    console.log("[GoogleDrive] Initiating Resumable Upload Session");
    console.log("[GoogleDrive] File Name:", data.fileName);
    console.log("[GoogleDrive] Service Account Email:", creds.client_email);
    console.log("[GoogleDrive] Target Folder ID:", creds.parentFolderId || "(Default Root)");
    console.log("--------------------------------------------------");

    // Check for dummy placeholder mode
    if (
      creds.client_email.includes("placeholder") ||
      creds.private_key.includes("placeholder")
    ) {
      console.info("[GoogleDrive] Running in placeholder demo mode.");
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

    // Initialize JWT client with full drive permissions
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
        error: `Failed to authenticate with Google Drive API for Service Account '${creds.client_email}'. Check private key format.`,
      };
    }

    // Metadata payload for Google Drive v3 file creation
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

    // Step 1: Attempt to create resumable upload session with folder
    let uploadEndpoint = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true";
    let response = await fetch(uploadEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    });

    // Step 2: Handle 404 Folder Not Shared / Not Found error
    if (!response.ok && response.status === 404 && metadata.parents) {
      console.warn(
        `[GoogleDrive] 404 Folder '${creds.parentFolderId}' not accessible by '${creds.client_email}'. Retrying upload to Service Account root drive...`
      );

      // Retry without parent folder (uploads to service account root drive)
      delete metadata.parents;
      response = await fetch(uploadEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(metadata),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GoogleDrive] Resumable Session Error (${response.status}):`, errorText);

      let parsedMessage = errorText.slice(0, 180);
      try {
        const errorJson = JSON.parse(errorText);
        parsedMessage = errorJson?.error?.message || parsedMessage;
      } catch (e) {}

      return {
        success: false,
        error: `Google Drive API (${response.status}): ${parsedMessage}. Ensure target folder '${creds.parentFolderId}' is shared with '${creds.client_email}' as Editor.`,
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
    console.error("[GoogleDrive] Fatal Error in getGoogleDriveResumableUploadUrl:", error);

    return {
      success: false,
      error: `Google Drive upload session error: ${error?.message || "Internal error"}. Ensure Service Account '${creds.client_email}' has Editor access to folder '${creds.parentFolderId}'.`,
    };
  }
}

/**
 * 2. Set Public Read Permissions for Uploaded Google Drive File
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

    // Grant anyone with link reader permission
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
      console.warn("[GoogleDrive] Could not set public permission (may already be shared):", permErr?.message);
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
