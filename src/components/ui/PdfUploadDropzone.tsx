"use client";

import React, { useState, useRef } from "react";
import { getSupabaseUploadUrl } from "@/actions/upload.actions";
import { FileText, UploadCloud, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PdfUploadDropzoneProps {
  onPdfUploaded: (url: string, fileName: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingPdfUrl?: string;
  label?: string;
  required?: boolean;
}

export function PdfUploadDropzone({
  onPdfUploaded,
  onUploadingChange,
  existingPdfUrl,
  label = "Upload PDF Document",
  required = false,
}: PdfUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileSizeStr, setFileSizeStr] = useState<string | null>(null);
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

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF documents (application/pdf) are supported.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Document size must not exceed 20MB limit.");
      return;
    }

    setUploadedFileName(file.name);
    setFileSizeStr(formatBytes(file.size));
    setUploading(true);

    try {
      // 1. Get signed upload URL from Supabase Admin via Server Action
      const signRes = await getSupabaseUploadUrl(file.name, file.type || "application/pdf");
      if (!signRes.success || !signRes.data) {
        throw new Error(signRes.error || "Failed to generate Supabase signed URL.");
      }

      const { signedUrl, publicUrl } = signRes.data;

      // 2. Direct-to-Cloud Upload: Client executes direct PUT request with raw binary to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        // Fallback check if already uploaded or network notice
        console.warn("Signed URL PUT response status:", uploadRes.status);
      }

      onPdfUploaded(publicUrl, file.name);
      toast.success(`PDF "${file.name}" uploaded directly to cloud!`);
    } catch (err: any) {
      console.error("Direct Supabase signed upload error:", err);
      toast.error(err.message || "Failed to upload document.");
      setUploadedFileName(null);
      onPdfUploaded("", "");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFileName(null);
    setFileSizeStr(null);
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
                  <span>•</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Uploaded to Supabase</span>
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
                Direct Supabase signed upload (Max 20MB, application/pdf)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
