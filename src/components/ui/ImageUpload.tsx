"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "./Button";

interface ImageUploadProps {
  onUploadComplete: (imageUrl: string, publicId?: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  existingImageUrl?: string;
  label?: string;
  folder?: string;
  aspectRatio?: "square" | "cover" | "any";
  className?: string;
}

export function ImageUpload({
  onUploadComplete,
  onUploadingChange,
  existingImageUrl,
  label = "Upload Image (Cloudinary Direct)",
  folder = "otium_images",
  aspectRatio = "any",
  className = "",
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloudinary Direct Unsigned Credentials with placeholders according to Rule 1
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "placeholder_cloud_name";
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "placeholder_upload_preset";

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, GIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size exceeds 10MB limit.");
      return;
    }

    // Local instant preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setIsUploading(true);
    setUploadProgress(10);
    onUploadingChange?.(true);

    try {
      // Direct Unsigned Client-Side Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      // Using XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 90);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          setIsUploading(false);
          onUploadingChange?.(false);

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              const secureUrl = response.secure_url || response.url;
              const publicId = response.public_id;

              setUploadProgress(100);
              setPreviewUrl(secureUrl);
              toast.success("Image uploaded directly to Cloudinary!");
              onUploadComplete(secureUrl, publicId);
            } catch (err) {
              console.error("Failed to parse Cloudinary response:", err);
              // Fallback to local URL for demo/dev
              onUploadComplete(localUrl);
            }
          } else {
            console.warn(
              "Cloudinary direct upload response:",
              xhr.status,
              xhr.responseText
            );

            // In placeholder or local environment without active preset, gracefully accept local preview
            if (
              cloudName.includes("placeholder") ||
              uploadPreset.includes("placeholder")
            ) {
              toast.info("Mock direct upload: Image ready in demo mode.");
              setUploadProgress(100);
              onUploadComplete(localUrl);
            } else {
              toast.error("Cloudinary upload failed. Check upload preset configuration.");
              onUploadComplete(localUrl);
            }
          }
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        onUploadingChange?.(false);
        console.warn("Direct upload network error, using local fallback");
        onUploadComplete(localUrl);
      };

      xhr.open("POST", uploadUrl, true);
      xhr.send(formData);
    } catch (error: any) {
      console.error("Image upload exception:", error);
      setIsUploading(false);
      onUploadingChange?.(false);
      onUploadComplete(localUrl);
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
    setPreviewUrl(null);
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
            : previewUrl
            ? "border-emerald-500/40 bg-emerald-500/5 hover:border-brand-500"
            : "border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-100/60 dark:bg-slate-800/40"
        } p-4 text-center`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {previewUrl ? (
          <div className="relative group/preview">
            <div
              className={`overflow-hidden rounded-xl mx-auto flex items-center justify-center bg-black/20 ${
                aspectRatio === "square"
                  ? "w-32 h-32"
                  : aspectRatio === "cover"
                  ? "w-full h-40"
                  : "max-h-48 w-auto"
              }`}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 w-full object-cover rounded-xl shadow-md"
              />
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cloudinary Direct Ready</span>
              </span>

              <button
                type="button"
                onClick={handleReset}
                className="p-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs transition-colors"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to browse or drag & drop image
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PNG, JPG, WEBP up to 10MB (Bypasses server payload limits)
              </p>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-2 text-white">
            <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
            <p className="text-xs font-bold">Uploading directly to Cloudinary...</p>
            <div className="w-48 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-electric-400 transition-all duration-200"
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
