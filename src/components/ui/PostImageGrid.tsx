"use client";

import React, { useState, useEffect } from "react";
import { Maximize2, X } from "lucide-react";

interface PostImageGridProps {
  images: string[];
  className?: string;
}

export function PostImageGrid({ images, className = "" }: PostImageGridProps) {
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeImageModal) {
        setActiveImageModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImageModal]);

  if (!images || images.length === 0) return null;

  const validImages = images
    .map((url, idx) => ({ url, originalIdx: idx }))
    .filter(({ originalIdx }) => !failedIndices[originalIdx]);

  if (validImages.length === 0) return null;

  // Single Image
  if (validImages.length === 1) {
    const item = validImages[0];
    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageModal(item.url);
          }}
          className={`relative max-h-96 w-full overflow-hidden rounded-xl bg-card border border-border flex items-center justify-center cursor-pointer group ${className}`}
        >
          <img
            src={item.url}
            alt="Post attachment"
            onError={() =>
              setFailedIndices((prev) => ({ ...prev, [item.originalIdx]: true }))
            }
            className="max-h-96 w-full object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
          />
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>

        {activeImageModal && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(null);
            }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in-0 duration-150"
          >
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImageModal}
              alt="Enlarged preview"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // 2, 3, or 4 Images
  return (
    <>
      <div
        className={`grid ${
          validImages.length === 2
            ? "grid-cols-2"
            : validImages.length === 3
            ? "grid-cols-3"
            : "grid-cols-2"
        } gap-2 rounded-xl overflow-hidden ${className}`}
      >
        {validImages.slice(0, 4).map((item, idx) => (
          <div
            key={item.originalIdx}
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(item.url);
            }}
            className="relative aspect-video sm:aspect-square rounded-lg overflow-hidden bg-card border border-border cursor-pointer group"
          >
            <img
              src={item.url}
              alt={`Photo ${idx + 1}`}
              onError={() =>
                setFailedIndices((prev) => ({ ...prev, [item.originalIdx]: true }))
              }
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>

      {activeImageModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in-0 duration-150"
        >
          <button
            onClick={() => setActiveImageModal(null)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={activeImageModal}
            alt="Enlarged preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
