"use client";

import React, { useState, useRef } from "react";
import { getCloudinarySignature } from "@/actions/upload.actions";
import { UploadCloud, Image as ImageIcon, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadDropzoneProps {
  onImageUploaded: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingImageUrl?: string;
  folder?: string;
  label?: string;
  required?: boolean;
}

export function ImageUploadDropzone({
  onImageUploaded,
  onUploadingChange,
  existingImageUrl,
  folder = "otium_marketplace",
  label = "Upload Item Photograph",
  required = false,
}: ImageUploadDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setUploading = (uploading: boolean) => {
    setIsUploading(uploading);
    onUploadingChange?.(uploading);
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be under 10MB");
      return;
    }

    // Local instant preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      // 1. Fetch cryptographic signature from Next.js Server Action
      const sigRes = await getCloudinarySignature(folder);
      if (!sigRes.success || !sigRes.data) {
        throw new Error(sigRes.error || "Failed to generate Cloudinary signature.");
      }

      const { timestamp, signature, apiKey, cloudName } = sigRes.data;

      // 2. Direct-to-Cloud Upload: Client executes direct multipart POST to Cloudinary API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("folder", folder);

      const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const uploadResponse = await fetch(cloudinaryUploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Direct upload to Cloudinary failed.");
      }

      const uploadResult = await uploadResponse.json();
      const secureUrl = uploadResult.secure_url;

      setPreviewUrl(secureUrl);
      onImageUploaded(secureUrl);
      toast.success("Image uploaded directly to cloud!");
    } catch (err: any) {
      console.error("Direct Cloudinary upload error:", err);
      toast.error(err.message || "Failed to upload image.");
      setPreviewUrl(null);
      onImageUploaded("");
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
    setPreviewUrl(null);
    onImageUploaded("");
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
            : previewUrl
            ? "border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40"
            : "border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-slate-50/50 dark:bg-slate-800/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {previewUrl ? (
          <div className="relative group">
            <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Direct Upload Status Badge */}
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-600/90 text-white text-[11px] font-bold flex items-center gap-1 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Direct-to-Cloud Uploaded</span>
            </div>

            {/* Remove Button */}
            {!isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-600 text-white transition-colors shadow-md"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-white space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                <p className="text-xs font-bold">Uploading directly to Cloudinary...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click or drag & drop image here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Direct Cloudinary upload (JPG, PNG, WebP up to 10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
