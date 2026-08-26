"use client";

import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { getSupabaseUploadUrl, uploadDocumentDirect } from "@/actions/upload.actions";
import { FileText, UploadCloud, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PdfUploadDropzoneProps {
  onPdfUploaded: (url: string, fileName: string) => void;
  onPageCountDetected?: (pages: number) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingPdfUrl?: string;
  label?: string;
  required?: boolean;
}

export function PdfUploadDropzone({
  onPdfUploaded,
  onPageCountDetected,
  onUploadingChange,
  existingPdfUrl,
  label = "Upload PDF Document",
  required = false,
}: PdfUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
  const [detectedPages, setDetectedPages] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processAndUploadFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF documents (application/pdf) are supported.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Document size must not exceed 50MB limit.");
      return;
    }

    setUploadedFileName(file.name);
    setFileSizeStr(formatBytes(file.size));
    setUploading(true);

    try {
      // 1. Exact PDF Page Calculation via pdf-lib
      const arrayBuffer = await file.arrayBuffer();
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        setDetectedPages(count);
        if (onPageCountDetected) {
          onPageCountDetected(count);
        }
        toast.info(`Detected ${count} pages in "${file.name}"`);
      } catch (pdfErr) {
        console.warn("pdf-lib page count detection note:", pdfErr);
      }

      // 2. Direct Signed Upload to Supabase bucket 'documents'
      let finalPublicUrl = "";
      const signRes = await getSupabaseUploadUrl(file.name, file.type || "application/pdf");

      if (signRes.success && signRes.data?.signedUrl) {
        const { signedUrl, publicUrl } = signRes.data;
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/pdf",
          },
          body: file,
        });

        if (uploadRes.ok) {
          finalPublicUrl = publicUrl;
        }
      }

      // Fallback: If signed PUT failed, upload via direct Server Action to documents bucket
      if (!finalPublicUrl) {
        const formData = new FormData();
        formData.append("file", file);
        const directRes = await uploadDocumentDirect(formData);
        if (directRes.success && directRes.data) {
          finalPublicUrl = directRes.data.publicUrl;
        } else {
          throw new Error(directRes.error || "Failed to upload document to Supabase storage.");
        }
      }

      onPdfUploaded(finalPublicUrl, file.name);
      toast.success(`PDF "${file.name}" uploaded to Supabase documents!`);
    } catch (err: any) {
      console.error("Supabase upload error:", err);
      toast.error(err.message || "Failed to upload document.");
      setUploadedFileName(null);
      setDetectedPages(null);
      onPdfUploaded("", "");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndUploadFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFileName(null);
    setFileSizeStr(null);
    setDetectedPages(null);
    onPdfUploaded("", "");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
          {label} {required && "*"}
        </label>
      )}

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-4 transition-all text-center cursor-pointer overflow-hidden ${
          isDragOver
            ? "border-brand-500 bg-brand-500/10"
            : uploadedFileName
            ? "border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40"
            : "border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-slate-50/50 dark:bg-slate-800/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {uploadedFileName ? (
          <div className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {uploadedFileName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  {fileSizeStr && <span>{fileSizeStr}</span>}
                  {detectedPages !== null && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-brand-500">{detectedPages} Pages Calculated</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Supabase Documents</span>
                  </span>
                </div>
              </div>
            </div>

            {!isUploading ? (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Remove PDF"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-brand-500 shrink-0" />
            )}
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click or drag & drop PDF here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Auto-calculates exact page count via pdf-lib & uploads to Supabase (Max 50MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
