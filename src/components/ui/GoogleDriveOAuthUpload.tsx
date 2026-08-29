"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ShieldCheck,
  Sparkles,
  KeyRound,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleDriveOAuthUploadProps {
  onUploadComplete: (fileUrl: string, fileId?: string, fileName?: string) => void;
  onPageCountDetected?: (pageCount: number) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingFileUrl?: string;
  existingFileName?: string;
  label?: string;
  maxSizeBytes?: number;
}

export function GoogleDriveOAuthUpload({
  onUploadComplete,
  onPageCountDetected,
  onUploadingChange,
  existingFileUrl = "",
  existingFileName = "",
  label = "Upload Document (Google Drive Direct)",
  maxSizeBytes = 50 * 1024 * 1024,
}: GoogleDriveOAuthUploadProps) {
  const [fileUrl, setFileUrl] = useState(existingFileUrl);
  const [fileName, setFileName] = useState(existingFileName);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [detectedPages, setDetectedPages] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tokenClientRef = useRef<any>(null);
  const pendingFileRef = useRef<File | null>(null);

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID ||
    "182612765129-k94groidumjmdmb68s32a534sfqtoe10.apps.googleusercontent.com";

  const targetFolderId =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID ||
    "1W39RQLqZO-6v1renYEDIFlGm3e9rxPfa";

  useEffect(() => {
    if (existingFileUrl) setFileUrl(existingFileUrl);
    if (existingFileName) setFileName(existingFileName);
  }, [existingFileUrl, existingFileName]);

  // Load Google Identity Services (GIS) & GAPI
  useEffect(() => {
    const loadGis = () => {
      if (document.getElementById("google-gsi-client")) {
        initTokenClient();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gsi-client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initTokenClient();
      };
      document.body.appendChild(script);
    };

    const initTokenClient = () => {
      if (window.google?.accounts?.oauth2 && clientId) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                toast.error(`Google Drive authorization error: ${tokenResponse.error}`);
                setIsUploading(false);
                onUploadingChange?.(false);
                return;
              }

              const token = tokenResponse.access_token;
              setAccessToken(token);
              setIsAuthorized(true);
              toast.success("Google Drive Authorized!");

              if (pendingFileRef.current) {
                await executeGoogleDriveUpload(pendingFileRef.current, token);
                pendingFileRef.current = null;
              }
            },
          });
        } catch (err) {
          console.warn("Error initializing GIS token client:", err);
        }
      }
    };

    loadGis();
  }, [clientId]);

  const handleAuthorizeClick = () => {
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    } else {
      toast.info("Connecting to Google Services...");
    }
  };

  const calculatePdfPages = async (file: File): Promise<number | null> => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const count = pdfDoc.getPageCount();
        setDetectedPages(count);
        onPageCountDetected?.(count);
        return count;
      } catch (err) {
        console.warn("Could not parse PDF page count with pdf-lib:", err);
      }
    }
    return null;
  };

  /**
   * Upload file directly to Google Drive using user's OAuth access token
   */
  const executeGoogleDriveUpload = async (file: File, token: string) => {
    setIsUploading(true);
    setUploadProgress(25);
    onUploadingChange?.(true);

    try {
      setUploadProgress(45);

      const metadata: Record<string, any> = {
        name: file.name,
        mimeType: file.type || "application/pdf",
      };

      if (targetFolderId && targetFolderId.length > 5) {
        metadata.parents = [targetFolderId];
      }

      const boundary = "-------314159265358979323846";
      const delimiter = "\r\n--" + boundary + "\r\n";
      const closeDelim = "\r\n--" + boundary + "--";

      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = async () => {
        try {
          const fileBytes = new Uint8Array(reader.result as ArrayBuffer);
          const metadataPart =
            delimiter +
            "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
            JSON.stringify(metadata) +
            delimiter +
            `Content-Type: ${file.type || "application/pdf"}\r\n` +
            "Content-Transfer-Encoding: base64\r\n\r\n";

          let binary = "";
          const len = fileBytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(fileBytes[i]);
          }
          const base64Data = btoa(binary);

          const multipartBody = metadataPart + base64Data + closeDelim;

          setUploadProgress(65);

          let res = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
              },
              body: multipartBody,
            }
          );

          // Retry in root drive if target folder is restricted
          if (!res.ok && res.status === 404 && metadata.parents) {
            delete metadata.parents;
            const fallbackMetadataPart =
              delimiter +
              "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
              JSON.stringify(metadata) +
              delimiter +
              `Content-Type: ${file.type || "application/pdf"}\r\n` +
              "Content-Transfer-Encoding: base64\r\n\r\n";

            res = await fetch(
              "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": `multipart/related; boundary=${boundary}`,
                },
                body: fallbackMetadataPart + base64Data + closeDelim,
              }
            );
          }

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData?.error?.message || `Google Drive upload error (${res.status})`);
          }

          const driveData = await res.json();
          const driveFileId = driveData.id;
          setUploadProgress(85);

          // Apply public reader permission so Print Manager can view
          try {
            await fetch(
              `https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions?supportsAllDrives=true`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  role: "reader",
                  type: "anyone",
                }),
              }
            );
          } catch (permErr) {
            console.warn("Could not set public permission:", permErr);
          }

          const finalViewLink =
            driveData.webViewLink ||
            `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;

          setUploadProgress(100);
          setFileUrl(finalViewLink);
          setIsUploading(false);
          onUploadingChange?.(false);
          toast.success("Document uploaded directly to Google Drive!");
          onUploadComplete(finalViewLink, driveFileId, file.name);
        } catch (uploadErr: any) {
          console.error("Direct Google Drive upload error:", uploadErr);
          setIsUploading(false);
          onUploadingChange?.(false);
          toast.error(uploadErr?.message || "Google Drive upload failed.");
        }
      };
    } catch (err: any) {
      console.error("Google Drive Auth error:", err);
      setIsUploading(false);
      onUploadingChange?.(false);
      toast.error(err?.message || "Failed to authenticate with Google Drive.");
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeBytes) {
      toast.error(`File exceeds maximum size of ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`);
      return;
    }

    setFileName(file.name);
    setFileSizeBytes(file.size);
    pendingFileRef.current = file;

    await calculatePdfPages(file);

    if (accessToken) {
      await executeGoogleDriveUpload(file, accessToken);
      return;
    }

    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken({ prompt: "consent" });
    } else {
      toast.info("Initializing Google Drive Authorization...");
      setTimeout(() => {
        if (tokenClientRef.current) {
          tokenClientRef.current.requestAccessToken({ prompt: "consent" });
        }
      }, 800);
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
    setFileSizeBytes(null);
    setDetectedPages(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onUploadComplete("", "", "");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-teal-500" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2">
          {detectedPages && (
            <Badge variant="brand" size="sm">
              {detectedPages} {detectedPages === 1 ? "Page" : "Pages"} (via pdf-lib)
            </Badge>
          )}

          {!isAuthorized && (
            <button
              type="button"
              onClick={handleAuthorizeClick}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-[11px] font-bold hover:bg-teal-500/25 transition-all"
            >
              <KeyRound className="w-3 h-3" />
              <span>Connect Google Drive</span>
            </button>
          )}

          {isAuthorized && (
            <Badge variant="success" size="sm" className="gap-1">
              <Check className="w-3 h-3" />
              <span>Drive Connected</span>
            </Badge>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {fileUrl ? (
        /* Uploaded Success State */
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
                {detectedPages && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {detectedPages} Pages
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
                  <span>Google Drive Link</span>
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
        /* Dropzone / Upload Trigger State */
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all text-center flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? "border-teal-500 bg-teal-500/10"
              : "border-slate-300 dark:border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/40"
          }`}
        >
          {isUploading ? (
            <div className="w-full max-w-xs space-y-3">
              <div className="flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Uploading directly to Google Drive ({uploadProgress}%)...</span>
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
                  Direct Google Drive OAuth Integration • Auto-calculates exact pages
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
