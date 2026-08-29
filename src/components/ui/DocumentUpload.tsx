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
  FileCode,
  HardDrive,
} from "lucide-react";
import {
  getGoogleDriveResumableUploadUrl,
  makeDriveFilePublicAction,
  uploadPdfDirectToGoogleDriveAction,
} from "@/actions/drive-upload.actions";

interface DocumentUploadProps {
  onUploadComplete: (fileUrl: string, fileId?: string, fileName?: string) => void;
  onPageCountDetected?: (pageCount: number) => void;
  onUploadingChange?: (isUploading: boolean) => void;
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
  existingFileUrl,
  existingFileName,
  label = "Upload Document (Direct Google Drive Resumable Stream)",
  acceptedFileTypes = ".pdf,.doc,.docx,.zip,.txt",
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  className = "",
}: DocumentUploadProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(existingFileUrl || null);
  const [fileName, setFileName] = useState<string | null>(existingFileName || null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculatePdfPages = async (file: File): Promise<number | null> => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        setPageCount(count);
        onPageCountDetected?.(count);
        return count;
      } catch (err) {
        console.warn("Could not parse PDF page count with pdf-lib:", err);
      }
    }
    return null;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(`File exceeds maximum size limit of ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);
    setIsUploading(true);
    setUploadProgress(10);
    onUploadingChange?.(true);

    // Step 1: Calculate PDF page count in parallel
    await calculatePdfPages(file);

    try {
      // Step 2: Upload PDF directly to Google Drive via server action stream
      setUploadProgress(35);
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadPdfDirectToGoogleDriveAction(formData);
      setIsUploading(false);
      onUploadingChange?.(false);

      if (res?.success && res.data) {
        setUploadProgress(100);
        setFileUrl(res.data.webViewLink);
        toast.success("Document saved to Google Drive!");
        onUploadComplete(res.data.webViewLink, res.data.driveFileId, file.name);
      } else {
        const errorMsg =
          res?.error || "Google Drive upload failed. Please check folder permissions.";
        toast.error(errorMsg, { duration: 10000 });
        setFileUrl("");
        setFileName("");
      }
    } catch (error: any) {
      console.error("[GoogleDrive] Upload error:", error);
      setIsUploading(false);
      onUploadingChange?.(false);
      toast.error(error?.message || "Google Drive upload failed.", { duration: 8000 });
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
    setFileUrl(null);
    setFileName(null);
    setPageCount(null);
    setFileSizeBytes(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploadComplete("");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer group ${
          isDragging
            ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
            : fileUrl
            ? "border-teal-500/40 bg-teal-500/5 hover:border-brand-500"
            : "border-slate-300 dark:border-slate-700 hover:border-teal-400 bg-slate-100/60 dark:bg-slate-800/40"
        } p-4 text-center`}
      >
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
          <div className="p-2 space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-teal-500/20 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                    {fileName || "Uploaded Document"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {pageCount !== null && (
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        {pageCount} Page{pageCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {fileSizeBytes && (
                      <span>{(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    )}
                    <span className="text-slate-400 font-mono">Google Drive Direct</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 text-xs transition-colors inline-flex items-center gap-1"
                  title="View on Google Drive"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs transition-colors"
                  title="Remove document"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-teal-600 dark:text-teal-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Resumable Upload Complete • Ready in Database</span>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drag & drop PDF / Assignment
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PDF, DOCX, ZIP up to 50MB (Bypasses Vercel 4.5MB Payload Limit)
              </p>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-2 text-white">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
            <p className="text-xs font-bold">Streaming directly to Google Drive Session URI...</p>
            <div className="w-48 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-electric-400 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-300">{uploadProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
