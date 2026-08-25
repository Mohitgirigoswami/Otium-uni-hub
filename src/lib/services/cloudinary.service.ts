import { v2 as cloudinary } from "cloudinary";
import { ActionResponse } from "../types";

// Configure Cloudinary backend SDK
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinarySignatureResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Generates cryptographic signature for secure direct client-side upload to Cloudinary
 * @param folder Subfolder name within Cloudinary bucket
 */
export async function getCloudinaryUploadSignature(
  folder: string = "otium_uploads"
): Promise<ActionResponse<CloudinarySignatureResponse>> {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        error: "Cloudinary credentials are not configured on the server.",
      };
    }

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Parameters to sign
    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      success: true,
      data: {
        timestamp,
        signature,
        apiKey,
        cloudName,
        folder,
      },
    };
  } catch (error: any) {
    console.error("Error generating Cloudinary signature:", error);
    return {
      error: error?.message || "Failed to generate Cloudinary signature.",
    };
  }
}
