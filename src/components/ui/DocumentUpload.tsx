"use client";

import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  HardDrive,
  FileCheck,
  Loader2,
} from "lucide-react";
import { uploadPrintDocument } from "@/actions/print-upload.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  label = "Upload PDF Document",
  acceptedFileTypes = "application/pdf,.pdf",
  maxSizeBytes = 50 * 1024 * 1024,
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

  useEffect(() => {
    setFileUrl(existingFileUrl || "");
    setFileName(existingFileName || "");
  }, [existingFileUrl, existingFileName]);

  const setUploading = (val: boolean) => {
    setIsUploading(val);
    onUploadingChange?.(val);
  };

  // Client-side quick page count extraction via pdf-lib
  const detectPdfPages = async (file: File): Promise<number | null> => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        setPageCount(count);
        onPageCountDetected?.(count);
        return count;
      } catch (err) {
        console.warn("[PDF Page Parser] Quick preview skipped:", err);
      }
    }
    return null;
  };

  const handleFileProcess = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast.error("Invalid file format. Please upload a valid PDF document.");
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error(
        `File size exceeds ${Math.round(maxSizeBytes / (1024 * 1024))}MB limit.`
      );
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setFileName(file.name);
    setFileSizeBytes(file.size);

    const clientPages = await detectPdfPages(file);
    setUploadProgress(35);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campusId", campusId);
      formData.append("userId", userId);

      setUploadProgress(60);
      const res = await uploadPrintDocument(formData);
      setUploadProgress(100);

      if (!res.success || !res.data?.fileUrl) {
        throw new Error(res.error || "Failed to upload document to cloud storage.");
      }

      setFileUrl(res.data.fileUrl);
      const finalPageCount = res.data.pageCount || clientPages || 1;
      setPageCount(finalPageCount);
      onPageCountDetected?.(finalPageCount);
      onUploadComplete(res.data.fileUrl, res.data.filePath || "", file.name);

      toast.success(
        `Document uploaded: ${finalPageCount} page${finalPageCount > 1 ? "s" : ""} detected.`
      );
    } catch (err: any) {
      console.error("Document upload error:", err);
      toast.error(err.message || "Failed to upload PDF document.");
      setFileUrl("");
      setFileName("");
      setPageCount(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileUrl("");
    setFileName("");
    setPageCount(null);
    setFileSizeBytes(null);
    onUploadComplete("", "", "");
    onPageCountDetected?.(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
          {label}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileProcess(file);
        }}
      />

      {!fileUrl && !isUploading ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all fluid-interactive ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-card/60 hover:border-primary/50 hover:bg-secondary/40"
          }`}
        >
          <div className="w-12 h-12 rounded-lg bg-secondary text-primary mx-auto flex items-center justify-center mb-3 border border-border">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Click to upload or drag & drop PDF
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Exact page count auto-detected. Maximum file size: 50MB.
          </p>
        </div>
      ) : isUploading ? (
        <div className="border border-border rounded-xl p-6 bg-card text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing document & detecting page count...</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{fileName}</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4 bg-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {fileName || "Document Ready"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {pageCount !== null && (
                  <Badge variant="default" size="sm">
                    {pageCount} {pageCount === 1 ? "page" : "pages"}
                  </Badge>
                )}
                {fileSizeBytes && (
                  <span className="text-[11px] text-muted-foreground">
                    {(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Replace
            </Button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
              title="Remove document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
