"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Plus,
  X,
  Loader2,
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
  label = "Attach Images (Up to 4)",
  folder = "otium_wall_memes",
  className = "",
}: MultiImageUploadProps) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfn0jewug";
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "otium_unsigned_preset";

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not an image file.`);
      return null;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} exceeds 10MB limit.`);
      return null;
    }

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
      }

      // Fallback: server action signed upload
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

      return URL.createObjectURL(file);
    } catch (err) {
      console.warn("Direct upload fallback to local URL:", err);
      return URL.createObjectURL(file);
    }
  };

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    const filesArray = Array.from(selectedFiles);
    const availableSlots = maxImages - images.length;

    if (filesArray.length > availableSlots) {
      toast.error(`You can only add up to ${maxImages} images total.`);
    }

    const filesToUpload = filesArray.slice(0, availableSlots);
    if (filesToUpload.length === 0) return;

    setUploadingCount((prev) => prev + filesToUpload.length);
    onUploadingChange?.(true);

    try {
      const uploadPromises = filesToUpload.map((f) => uploadSingleFile(f));
      const results = await Promise.all(uploadPromises);
      const successfulUrls = results.filter((url): url is string => Boolean(url));

      if (successfulUrls.length > 0) {
        onChange([...images, ...successfulUrls]);
        toast.success(
          `Added ${successfulUrls.length} image${successfulUrls.length > 1 ? "s" : ""}.`
        );
      }
    } finally {
      setUploadingCount(0);
      onUploadingChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[11px] text-muted-foreground">
            {images.length}/{maxImages} attached
          </span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
          }
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {images.map((url, idx) => (
          <div
            key={url + idx}
            className="relative aspect-square rounded-xl overflow-hidden border border-border bg-card group"
          >
            <img
              src={url}
              alt={`Attachment ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(idx)}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/75 text-white hover:bg-destructive transition-colors opacity-90 group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {uploadingCount > 0 &&
          Array.from({ length: uploadingCount }).map((_, i) => (
            <div
              key={`uploading-${i}`}
              className="aspect-square rounded-xl border border-border bg-secondary/40 flex flex-col items-center justify-center text-muted-foreground gap-1.5 text-xs animate-pulse"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-[10px]">Uploading...</span>
            </div>
          ))}

        {images.length + uploadingCount < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-card/60 hover:bg-secondary/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-all fluid-interactive"
          >
            <Plus className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium">Add Photo</span>
          </button>
        )}
      </div>
    </div>
  );
}
