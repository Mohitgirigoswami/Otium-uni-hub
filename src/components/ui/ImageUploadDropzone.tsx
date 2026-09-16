"use client";

import React, { useState, useRef } from "react";
import { getCloudinarySignature } from "@/actions/upload.actions";
import { UploadCloud, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";

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
  label = "Upload Photograph",
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
      toast.error("Please select an image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be under 10MB");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploading(true);

    try {
      const sigRes = await getCloudinarySignature(folder);
      if (!sigRes.success || !sigRes.data) {
        throw new Error(sigRes.error || "Failed to generate image upload signature.");
      }

      const { timestamp, signature, apiKey, cloudName } = sigRes.data;

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
      toast.success("Image uploaded successfully.");
    } catch (err: any) {
      console.error("Direct image upload error:", err);
      toast.error(err.message || "Failed to upload image.");
      setPreviewUrl(null);
      onImageUploaded("");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onImageUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadFile(file);
        }}
      />

      {previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-card group aspect-video max-h-56">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="w-full h-full object-cover"
          />

          {isUploading ? (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white gap-2 text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading to cloud...</span>
            </div>
          ) : (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </Button>
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg bg-black/70 hover:bg-destructive text-white transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all fluid-interactive ${
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border bg-card/60 hover:border-primary/50 hover:bg-secondary/40"
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-secondary text-primary mx-auto flex items-center justify-center mb-2 border border-border">
            <ImageIcon className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            Click to upload photograph or drag & drop
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            PNG, JPG, WebP up to 10MB
          </p>
        </div>
      )}
    </div>
  );
}
