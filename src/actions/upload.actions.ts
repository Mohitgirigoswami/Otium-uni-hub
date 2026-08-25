"use server";

import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

// Configure Cloudinary backend SDK
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinarySignatureData {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * 1. CLOUDINARY DIRECT UPLOAD SERVER ACTION
 * Generates cryptographic signature so client can upload directly to Cloudinary
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
      error: error?.message || "Failed to generate upload signature.",
    };
  }
}

export interface SupabaseUploadUrlData {
  signedUrl: string;
  publicUrl: string;
  path: string;
}

/**
 * 2. SUPABASE SIGNED URL SERVER ACTION
 * Generates a signed upload URL using SUPABASE_SERVICE_ROLE_KEY for direct client PDF upload
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        error: "Supabase credentials are not properly configured in .env",
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const bucketName = "documents";

    // Ensure documents bucket exists
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 20 * 1024 * 1024, // 20MB
          allowedMimeTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        });
      }
    } catch (e) {
      // Bucket check error ignored
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
      // Fallback: use direct storage endpoint URL
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
