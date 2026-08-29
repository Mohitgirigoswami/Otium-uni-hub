"use client";

import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  HardDrive,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { uploadPrintDocument } from "@/actions/print-upload.actions";
import { Badge } from "@/components/ui/Badge";

interface DocumentUploadProps {
  onUploadComplete: (fileUrl: string, fileId?: string, fileName?: string) => void;
  onPageCountDetected?: (pageCount: number) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  campusId?: string;
  userId?: string;
  existingFileUrl?: string;
  existingFileName?: string;
  label?: string;
  acceptedFileTypes?: string;
  maxSizeBytes?: number;
  className?: string;
}

export function DocumentUpload({
  onUploadComplete,
  onPageCountDetected,
  onUploadingChange,
  campusId = "global",
  userId = "student",
  existingFileUrl = "",
  existingFileName = "",
  label = "Upload Document (Supabase Storage Direct)",
  acceptedFileTypes = "application/pdf,.pdf",
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  className = "",
}: DocumentUploadProps) {
  const [fileUrl, setFileUrl] = useState<string>(existingFileUrl || "");
  const [fileName, setFileName] = useState<string>(existingFileName || "");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side quick page count preview using pdf-lib
  const calculatePdfPagesClient = async (file: File): Promise<number | null> => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        setPageCount(count);
        onPageCountDetected?.(count);
        return count;
      } catch (err) {
        console.warn("[Client PDF-Lib] Client parse preview skipped:", err);
      }
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(
        `File exceeds the ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit.`
      );
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);
    setIsUploading(true);
    setUploadProgress(20);
    onUploadingChange?.(true);

    // Step 1: Client-side quick page calculation
    await calculatePdfPagesClient(file);

    try {
      setUploadProgress(45);

      // Step 2: Upload to Supabase Storage via server action
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campusId", campusId);
      formData.append("userId", userId);

      setUploadProgress(70);
      const res = await uploadPrintDocument(formData);

      setIsUploading(false);
      onUploadingChange?.(false);

      if (res.success && res.data) {
        setUploadProgress(100);
        setFileUrl(res.data.fileUrl);
        setFileName(res.data.fileName);
        setPageCount(res.data.pageCount);
        onPageCountDetected?.(res.data.pageCount);

        toast.success(
          `Document uploaded successfully! (${res.data.pageCount} page${
            res.data.pageCount === 1 ? "" : "s"
          })`
        );
        onUploadComplete(res.data.fileUrl, res.data.filePath, res.data.fileName);
      } else {
        const errorMsg = res.error || "Failed to upload document.";
        toast.error(errorMsg);
        setFileUrl("");
        setFileName("");
      }
    } catch (err: any) {
      console.error("[Upload error]:", err);
      setIsUploading(false);
      onUploadingChange?.(false);
      toast.error(err?.message || "Document upload failed.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileUrl("");
    setFileName("");
    setPageCount(null);
    setFileSizeBytes(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploadComplete("", "", "");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-teal-500" />
            <span>{label}</span>
          </label>
          {pageCount && (
            <Badge variant="brand" size="sm" className="gap-1">
              <FileCheck className="w-3 h-3 text-teal-400" />
              <span>
                {pageCount} {pageCount === 1 ? "Page" : "Pages"} (Auto-Calculated)
              </span>
            </Badge>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {fileUrl ? (
        /* Uploaded Success Card */
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {fileName || "Document.pdf"}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                {fileSizeBytes && (
                  <span>{(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                )}
                {pageCount && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {pageCount} Page{pageCount === 1 ? "" : "s"}
                    </span>
                  </>
                )}
                <span>•</span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-500 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  <span>Preview PDF</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Remove document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Drag and Drop Zone */
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative overflow-hidden p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-teal-500 bg-teal-500/10 scale-[1.01]"
              : "border-slate-300 dark:border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          {isUploading ? (
            <div className="w-full max-w-xs space-y-3 py-2">
              <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading document ({uploadProgress}%)...</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-electric-500 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Click to select PDF or drag & drop here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct Cloud Storage • Auto-calculates exact page count
                </p>
              </div>
              <Badge variant="neutral" size="sm" className="mt-1">
                PDF up to 50MB
              </Badge>
            </>
          )}
        </div>
      )}
    </div>
  );
}
