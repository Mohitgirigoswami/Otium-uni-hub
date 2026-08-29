"use client";

import React, { useState } from "react";
import { Maximize2, X } from "lucide-react";

interface PostImageGridProps {
  images: string[];
  className?: string;
}

export function PostImageGrid({ images, className = "" }: PostImageGridProps) {
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});

  if (!images || images.length === 0) return null;

  // Filter out any images that failed to load (Graceful Error Collapse)
  const validImages = images
    .map((url, idx) => ({ url, originalIdx: idx }))
    .filter(({ originalIdx }) => !failedIndices[originalIdx]);

  if (validImages.length === 0) return null;

  // Single Image: Clamped to max-h-[350px], w-full, object-contain, bg-neutral-900
  if (validImages.length === 1) {
    const item = validImages[0];
    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageModal(item.url);
          }}
          className={`relative max-h-[350px] w-full overflow-hidden rounded-xl bg-neutral-900 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center cursor-pointer group ${className}`}
        >
          <img
            src={item.url}
            alt="Feed attachment"
            onError={() =>
              setFailedIndices((prev) => ({ ...prev, [item.originalIdx]: true }))
            }
            className="max-h-[350px] w-full object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
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
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageModal}
              alt="Enlarged view"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Two Images: 2-Column Grid
  if (validImages.length === 2) {
    return (
      <>
        <div className={`grid grid-cols-2 gap-2 max-h-[350px] overflow-hidden rounded-xl ${className}`}>
          {validImages.map((item, idx) => (
            <div
              key={item.originalIdx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageModal(item.url);
              }}
              className="relative max-h-[350px] h-full aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden bg-neutral-900 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
            >
              <img
                src={item.url}
                alt={`Photo ${idx + 1}`}
                onError={() =>
                  setFailedIndices((prev) => ({ ...prev, [item.originalIdx]: true }))
                }
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>

        {activeImageModal && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(null);
            }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageModal}
              alt="Enlarged view"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Three Images: 1 Large on Left + 2 Stacked on Right
  if (validImages.length === 3) {
    return (
      <>
        <div className={`grid grid-cols-3 gap-2 max-h-[350px] overflow-hidden rounded-xl ${className}`}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(validImages[0].url);
            }}
            className="col-span-2 max-h-[350px] rounded-xl overflow-hidden bg-neutral-900 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
          >
            <img
              src={validImages[0].url}
              alt="Photo 1"
              onError={() =>
                setFailedIndices((prev) => ({
                  ...prev,
                  [validImages[0].originalIdx]: true,
                }))
              }
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          <div className="col-span-1 flex flex-col gap-2 max-h-[350px]">
            {validImages.slice(1).map((item, idx) => (
              <div
                key={item.originalIdx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageModal(item.url);
                }}
                className="relative flex-1 rounded-xl overflow-hidden bg-neutral-900 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
              >
                <img
                  src={item.url}
                  alt={`Photo ${idx + 2}`}
                  onError={() =>
                    setFailedIndices((prev) => ({
                      ...prev,
                      [item.originalIdx]: true,
                    }))
                  }
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        </div>

        {activeImageModal && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(null);
            }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageModal}
              alt="Enlarged view"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  // Four Images: 2x2 Grid with max-h-[350px]
  return (
    <>
      <div className={`grid grid-cols-2 gap-2 max-h-[350px] overflow-hidden rounded-xl ${className}`}>
        {validImages.slice(0, 4).map((item, idx) => (
          <div
            key={item.originalIdx}
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(item.url);
            }}
            className="relative aspect-square max-h-[170px] rounded-xl overflow-hidden bg-neutral-900 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
          >
            <img
              src={item.url}
              alt={`Photo ${idx + 1}`}
              onError={() =>
                setFailedIndices((prev) => ({
                  ...prev,
                  [item.originalIdx]: true,
                }))
              }
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        ))}
      </div>

      {activeImageModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setActiveImageModal(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImageModal}
            alt="Enlarged view"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
