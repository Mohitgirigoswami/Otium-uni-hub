"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  UploadCloud,
} from "lucide-react";
import { getCloudinarySignature } from "@/actions/upload.actions";

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  maxImages?: number;
  label?: string;
  folder?: string;
  className?: string;
}

export function MultiImageUpload({
  images,
  onChange,
  onUploadingChange,
  maxImages = 4,
  label = "Attach Images or Memes (Up to 4)",
  folder = "otium_wall_memes",
  className = "",
}: MultiImageUploadProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfn0jewug";
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "otium_unsigned_preset";

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not a supported image file.`);
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 10MB limit.`);
      return null;
    }

    // Direct client-side unsigned upload
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.secure_url || data.url;
      } else {
        // Fallback: try signed upload action if unsigned preset isn't enabled
        const sigRes = await getCloudinarySignature(folder);
        if (sigRes.success && sigRes.data) {
          const signedFormData = new FormData();
          signedFormData.append("file", file);
          signedFormData.append("api_key", sigRes.data.apiKey);
          signedFormData.append("timestamp", sigRes.data.timestamp.toString());
          signedFormData.append("signature", sigRes.data.signature);
          signedFormData.append("folder", folder);

          const signedRes = await fetch(
            `https://api.cloudinary.com/v1_1/${sigRes.data.cloudName}/image/upload`,
            { method: "POST", body: signedFormData }
          );
          if (signedRes.ok) {
            const signedData = await signedRes.json();
            return signedData.secure_url;
          }
        }

        // Local object URL fallback for offline / mock testing
        return URL.createObjectURL(file);
      }
    } catch (err) {
      console.warn("Direct upload fallback to local URL:", err);
      return URL.createObjectURL(file);
    }
  };

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed per post.`);
      return;
    }

    const filesToUpload = Array.from(selectedFiles).slice(0, availableSlots);
    if (filesToUpload.length === 0) return;

    setUploadingCount((prev) => prev + filesToUpload.length);
    onUploadingChange?.(true);

    try {
      const uploadPromises = filesToUpload.map((file) => uploadSingleFile(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => Boolean(url));

      if (validUrls.length > 0) {
        onChange([...images, ...validUrls]);
      }
    } finally {
      setUploadingCount((prev) => {
        const next = Math.max(0, prev - filesToUpload.length);
        if (next === 0) onUploadingChange?.(false);
        return next;
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <span className="text-[11px] font-semibold text-slate-400">
          {images.length} / {maxImages} images
        </span>
      </div>

      {/* Image Previews Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-square flex items-center justify-center shadow-sm"
            >
              <img
                src={url}
                alt={`Upload preview ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(idx);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-slate-950/80 hover:bg-rose-600 text-white transition-colors shadow-md"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-mono text-white">
                #{idx + 1}
              </div>
            </div>
          ))}

          {/* Add more slot button if under max */}
          {images.length < maxImages && !isUploading && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-500/5 aspect-square flex flex-col items-center justify-center text-slate-400 hover:text-brand-500 transition-all cursor-pointer"
            >
              <Plus className="w-6 h-6 mb-1" />
              <span className="text-[11px] font-bold">Add Photo</span>
            </button>
          )}
        </div>
      )}

      {/* Main Drag-and-drop Area (when no images or for initial pick) */}
      {images.length === 0 && (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files) {
              handleFiles(e.dataTransfer.files);
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl p-5 transition-all text-center cursor-pointer overflow-hidden ${
            isDragOver
              ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
              : "border-slate-300 dark:border-slate-700 hover:border-brand-400 bg-slate-100/60 dark:bg-slate-800/40"
          }`}
        >
          <div className="py-2 space-y-1.5">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to attach photos or drop memes here
              </p>
              <p className="text-[11px] text-slate-400">
                PNG, JPG, WebP, GIF (Attach up to 4 images)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
          }
        }}
      />

      {/* Uploading Progress Indicator */}
      {isUploading && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Uploading {uploadingCount} photo{uploadingCount > 1 ? "s" : ""}...</span>
        </div>
      )}
    </div>
  );
}
