"use client";

import React, { useState } from "react";
import { Modal } from "./Modal";
import { Maximize2, X } from "lucide-react";

interface PostImageGridProps {
  images: string[];
  className?: string;
}

export function PostImageGrid({ images, className = "" }: PostImageGridProps) {
  const [activeImageModal, setActiveImageModal] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  // Single Image: Dynamic height, object-contain, clean rounded preview
  if (images.length === 1) {
    return (
      <>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageModal(images[0]);
          }}
          className={`relative rounded-2xl overflow-hidden bg-black/40 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center cursor-pointer group ${className}`}
        >
          <img
            src={images[0]}
            alt="Post attachment"
            className="max-h-[480px] w-auto max-w-full object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-200"
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

  // Two Images: 2 Column Grid
  if (images.length === 2) {
    return (
      <>
        <div className={`grid grid-cols-2 gap-2 rounded-2xl overflow-hidden ${className}`}>
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageModal(img);
              }}
              className="relative aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden bg-black/30 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
            >
              <img
                src={img}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
        </div>

        {activeImageModal && (
          <div
            onClick={() => setActiveImageModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
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
  if (images.length === 3) {
    return (
      <>
        <div className={`grid grid-cols-3 gap-2 rounded-2xl overflow-hidden ${className}`}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(images[0]);
            }}
            className="col-span-2 aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden bg-black/30 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
          >
            <img
              src={images[0]}
              alt="Photo 1"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          <div className="col-span-1 flex flex-col gap-2">
            {images.slice(1).map((img, idx) => (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageModal(img);
                }}
                className="relative flex-1 rounded-xl overflow-hidden bg-black/30 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
              >
                <img
                  src={img}
                  alt={`Photo ${idx + 2}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            ))}
          </div>
        </div>

        {activeImageModal && (
          <div
            onClick={() => setActiveImageModal(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
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

  // Four Images: 2x2 Clean Grid
  return (
    <>
      <div className={`grid grid-cols-2 gap-2 rounded-2xl overflow-hidden ${className}`}>
        {images.slice(0, 4).map((img, idx) => (
          <div
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageModal(img);
            }}
            className="relative aspect-square rounded-xl overflow-hidden bg-black/30 border border-slate-200/50 dark:border-slate-800 cursor-pointer group"
          >
            <img
              src={img}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        ))}
      </div>

      {activeImageModal && (
        <div
          onClick={() => setActiveImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
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
