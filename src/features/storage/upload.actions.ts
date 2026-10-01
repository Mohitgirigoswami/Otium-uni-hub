"use server";

import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { CloudinarySignatureData, SupabaseUploadUrlData } from "./storage.types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth/auth.config";

// Configure Cloudinary backend SDK
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * 1. CLOUDINARY DIRECT UPLOAD SERVER ACTION
 */
export async function getCloudinarySignature(
  folder: string = "otium_campus"
): Promise<ActionResponse<CloudinarySignatureData>> {
  try {
    const rateCheck = await checkRateLimit("cloudinary-signature");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        error: "Cloudinary credentials are not properly configured in .env",
      };
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = { folder, timestamp };
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
      error: error?.message || "Failed to generate upload signature.",
    };
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjrpscknjjkhwfssxxwa.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * 2. SUPABASE SIGNED UPLOAD URL (Strictly using bucket 'documents')
 */
export async function getSupabaseUploadUrl(
  fileName: string,
  contentType: string = "application/pdf"
): Promise<ActionResponse<SupabaseUploadUrlData>> {
  try {
    const rateCheck = await checkRateLimit("supabase-signed-url");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjrpscknjjkhwfssxxwa.supabase.co";
    const supabaseAdmin = getSupabaseAdmin();
    const bucketName = "documents";

    // Ensure documents bucket exists with public access
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
        });
      }
    } catch (e) {
      // Ignored if bucket exists
    }

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniquePath = `uploads/${Date.now()}_${sanitizedName}`;

    // Create signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(uniquePath);

    const { data: publicData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uniquePath);

    if (error || !data) {
      return {
        success: true,
        data: {
          signedUrl: `${supabaseUrl}/storage/v1/object/${bucketName}/${uniquePath}`,
          publicUrl: publicData.publicUrl,
          path: uniquePath,
        },
      };
    }

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        publicUrl: publicData.publicUrl,
        path: data.path,
      },
    };
  } catch (error: any) {
    console.error("Error creating Supabase signed upload URL:", error);
    return {
      error: error?.message || "Failed to generate signed document upload URL.",
    };
  }
}

/**
 * 3. DIRECT SERVER-SIDE SUPABASE UPLOAD (Bucket 'documents')
 */
export async function uploadDocumentDirect(
  formData: FormData
): Promise<ActionResponse<{ publicUrl: string; fileName: string }>> {
  try {
    const file = formData.get("file") as File;
    if (!file) return { error: "No file provided." };

    const supabaseAdmin = getSupabaseAdmin();
    const bucketName = "documents";

    // Ensure bucket exists
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, { public: true });
      }
    } catch (e) {}

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniquePath = `uploads/${Date.now()}_${sanitizedName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(uniquePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase direct upload error:", uploadError);
      return { error: uploadError.message };
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uniquePath);

    return {
      success: true,
      data: {
        publicUrl: publicData.publicUrl,
        fileName: file.name,
      },
    };
  } catch (error: any) {
    console.error("Error in uploadDocumentDirect:", error);
    return { error: error?.message || "Direct upload to Supabase documents failed." };
  }
}

/**
 * Helper to extract Cloudinary Public ID from a secure URL
 */
function extractCloudinaryPublicId(url: string): string | null {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    let pathWithVersion = parts[1];
    // Remove version prefix e.g. v1725252525/
    if (pathWithVersion.startsWith("v") && pathWithVersion.indexOf("/") > 0) {
      pathWithVersion = pathWithVersion.substring(pathWithVersion.indexOf("/") + 1);
    }
    // Remove file extension e.g. .jpg, .webp, .png
    const lastDotIndex = pathWithVersion.lastIndexOf(".");
    if (lastDotIndex > 0) {
      pathWithVersion = pathWithVersion.substring(0, lastDotIndex);
    }
    return pathWithVersion;
  } catch (e) {
    return null;
  }
}

/**
 * 4. DELETE CLOUDINARY IMAGE ASSET
 */
export async function deleteCloudinaryAsset(
  publicIdOrUrl: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Active session required." };
    }

    if (!publicIdOrUrl) return { success: true, data: { success: true } };

    const publicId = publicIdOrUrl.includes("http")
      ? extractCloudinaryPublicId(publicIdOrUrl)
      : publicIdOrUrl;

    if (!publicId) {
      return { success: true, data: { success: true } };
    }

    const res = await cloudinary.uploader.destroy(publicId);
    return {
      success: true,
      data: { success: res?.result === "ok" || res?.result === "not found" },
    };
  } catch (error: any) {
    console.warn("[Cloudinary Delete Warning]:", error?.message);
    return {
      success: false,
      error: error?.message || "Failed to delete image from Cloudinary.",
    };
  }
}

/**
 * 5. DELETE SUPABASE STORAGE FILE
 */
export async function deleteSupabaseStorageFile(
  bucketName: string,
  filePathOrUrl: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized: Super Admin access required." };
    }

    if (!filePathOrUrl) return { success: true, data: { success: true } };

    const supabaseAdmin = getSupabaseAdmin();
    let relativePath = filePathOrUrl;

    if (relativePath.includes(`/${bucketName}/`)) {
      relativePath = relativePath.split(`/${bucketName}/`)[1];
    }
    relativePath = relativePath.split("?")[0];

    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([relativePath]);

    if (error) {
      console.warn(`[Supabase Storage Delete Warning (${bucketName})]:`, error.message);
    }

    return {
      success: true,
      data: { success: !error },
    };
  } catch (error: any) {
    console.warn("[Supabase Storage Delete Exception]:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete storage file.",
    };
  }
}
