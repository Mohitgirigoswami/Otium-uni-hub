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
 * SERVER ACTION: UPLOAD PRINT DOCUMENT TO SUPABASE STORAGE
 * - Auto-calculates PDF page count server-side via pdf-lib
 * - Uploads buffer to 'print-documents' bucket in Supabase Storage
 * - Returns raw public Supabase Storage fileUrl & detected pageCount (Zero Cloudinary wrappers)
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

    // Step 2: Generate unique file path in Supabase Storage
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

    // Step 3: Upload raw PDF to Supabase Storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    // Step 4: Construct clean raw public Supabase Storage URL (No Cloudinary wrappers)
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const rawPublicUrl =
      publicUrlData?.publicUrl ||
      `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;

    if (uploadError) {
      console.error("[Supabase Storage Upload Error]:", uploadError.message);
      return {
        success: false,
        error: `Supabase Storage rejected upload (${uploadError.message}). Please verify that SUPABASE_SERVICE_ROLE_KEY in .env matches your Supabase Dashboard API settings.`,
      };
    }

    return {
      success: true,
      data: {
        fileUrl: rawPublicUrl,
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

/**
 * SERVER ACTION: DELETE PRINT DOCUMENT FROM SUPABASE STORAGE
 * Purges an uploaded or unsubmitted print PDF from 'print-documents' bucket
 */
export async function deletePrintDocument(
  filePathOrUrl: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    if (!filePathOrUrl) return { success: true, data: { success: true } };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjrpscknjjkhwfssxxwa.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bucketName = "print-documents";
    let relativePath = filePathOrUrl;

    if (relativePath.includes("/print-documents/")) {
      relativePath = relativePath.split("/print-documents/")[1];
    } else if (relativePath.includes("/documents/")) {
      relativePath = relativePath.split("/documents/")[1];
    }
    relativePath = relativePath.split("?")[0];

    const { error: removeError } = await supabase.storage
      .from(bucketName)
      .remove([relativePath]);

    if (removeError) {
      console.warn("[deletePrintDocument Warning]:", removeError.message);
      // Fallback bucket
      await supabase.storage.from("documents").remove([relativePath]);
    }

    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.warn("[deletePrintDocument Error]:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete document from storage.",
    };
  }
}
