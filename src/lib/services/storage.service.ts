import { createClient } from "@supabase/supabase-js";
import { ActionResponse } from "../types";

export interface SupabaseSignedUploadResponse {
  signedUrl: string;
  path: string;
  token: string;
  publicUrl: string;
  maxSizeBytes: number;
}

/**
 * Generate Supabase Signed Upload URL using SUPABASE_SERVICE_ROLE_KEY
 * Allows direct secure upload of PDFs (Max 20MB, application/pdf)
 */
export async function getPdfSignedUploadUrl(
  fileName: string,
  bucketName: string = "documents"
): Promise<ActionResponse<SupabaseSignedUploadResponse>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        error: "Supabase storage credentials are not properly configured.",
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Ensure bucket exists or create it if not present
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 20 * 1024 * 1024, // 20MB limit
          allowedMimeTypes: ["application/pdf"],
        });
      }
    } catch (bErr) {
      // Bucket check error ignored, proceed with upload URL generation
    }

    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniquePath = `uploads/${Date.now()}-${sanitizedName}`;

    // Create signed upload URL
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(uniquePath);

    if (error || !data) {
      // Fallback: If signed upload URLs require RLS or bucket specifics, construct public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(uniquePath);

      return {
        error: error?.message || "Failed to generate signed upload URL.",
        data: {
          signedUrl: `${supabaseUrl}/storage/v1/object/${bucketName}/${uniquePath}`,
          path: uniquePath,
          token: "",
          publicUrl: publicUrlData.publicUrl,
          maxSizeBytes: 20 * 1024 * 1024,
        },
      };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(uniquePath);

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        path: data.path,
        token: data.token,
        publicUrl: publicUrlData.publicUrl,
        maxSizeBytes: 20 * 1024 * 1024, // 20MB
      },
    };
  } catch (error: any) {
    console.error("Error creating signed upload URL:", error);
    return {
      error: error?.message || "Internal error generating PDF upload URL.",
    };
  }
}
