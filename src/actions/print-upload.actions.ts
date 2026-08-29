"use server";

import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { ActionResponse } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

export interface PrintUploadResult {
  fileUrl: string;
  fileName: string;
  pageCount: number;
  fileSizeBytes: number;
  filePath: string;
}

/**
 * 1. SERVER ACTION: UPLOAD PRINT DOCUMENT TO SUPABASE STORAGE
 * - Auto-calculates PDF page count server-side via pdf-lib
 * - Uploads buffer to 'print-documents' bucket in Supabase Storage
 * - Returns public fileUrl & detected pageCount
 */
export async function uploadPrintDocument(
  formData: FormData
): Promise<ActionResponse<PrintUploadResult>> {
  try {
    const file = formData.get("file") as File | null;
    const campusId = (formData.get("campusId") as string) || "global";
    const userId = (formData.get("userId") as string) || "student";

    if (!file) {
      return { success: false, error: "No PDF file provided for upload." };
    }

    if (file.size > 50 * 1024 * 1024) {
      return {
        success: false,
        error: "File exceeds the 50MB maximum document limit.",
      };
    }

    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) return { success: false, error: rateCheck.error };

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 1: Extract exact page count server-side via pdf-lib
    let pageCount = 1;
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount() || 1;
    } catch (pdfErr) {
      console.warn("[PDF-Lib] Could not parse page count, defaulting to 1:", pdfErr);
      pageCount = 1;
    }

    // Step 2: Generate unique file path
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${userId}_${Date.now()}_${sanitizedFileName}`;
    const filePath = `${campusId}/${uniqueFileName}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjrpscknjjkhwfssxxwa.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bucketName = "print-documents";

    // Step 3: Attempt direct upload to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[Supabase Storage] Notice:", uploadError.message);

      // If Supabase key needs bucket creation or RLS bypass fallback:
      // Try Cloudinary raw upload stream so the user's print order NEVER fails
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfn0jewug";
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "otium_unsigned_preset";

      const cloudFormData = new FormData();
      const blob = new Blob([buffer], { type: "application/pdf" });
      cloudFormData.append("file", blob, sanitizedFileName);
      cloudFormData.append("upload_preset", uploadPreset);

      try {
        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
          { method: "POST", body: cloudFormData }
        );
        const cloudData = await cloudRes.json();

        if (cloudData.secure_url) {
          return {
            success: true,
            data: {
              fileUrl: cloudData.secure_url,
              fileName: file.name,
              pageCount,
              fileSizeBytes: file.size,
              filePath,
            },
          };
        }
      } catch (cloudErr) {
        console.error("[Cloudinary Fallback Error]:", cloudErr);
      }

      return {
        success: false,
        error: `Supabase Storage upload failed: ${uploadError.message}. Please ensure the '${bucketName}' bucket exists.`,
      };
    }

    // Step 4: Get Public URL from Supabase
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      data: {
        fileUrl: publicUrlData.publicUrl,
        fileName: file.name,
        pageCount,
        fileSizeBytes: file.size,
        filePath,
      },
    };
  } catch (error: any) {
    console.error("[uploadPrintDocument] Fatal Error:", error);
    return {
      success: false,
      error: error?.message || "Failed to process and upload print document.",
    };
  }
}
