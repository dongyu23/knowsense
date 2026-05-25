import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface ImagePreviewModalProps {
  pages: { id: string; page_number: number; minio_path: string }[];
  currentIndex: number;
  manualId: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImagePreviewModal({
  pages,
  currentIndex,
  manualId,
  onClose,
  onIndexChange,
}: ImagePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const page = pages[currentIndex];

  const imageUrl = page
    ? `/api/v1/manuals/${manualId}/pages/${page.id}/image?token=${localStorage.getItem('token') || ''}`
    : "";

  const goNext = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      onIndexChange(currentIndex + 1);
      setZoom(1);
    }
  }, [currentIndex, pages.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
      setZoom(1);
    }
  }, [currentIndex, onIndexChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  if (!page) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">
              第 {page.page_number} 页 / 共 {pages.length} 页
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {currentIndex < pages.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image — stop click propagation to prevent closing */}
        <div
          className="max-w-[90vw] max-h-[85vh] flex items-center justify-center select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.img
            key={page.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            src={imageUrl}
            alt={`第 ${page.page_number} 页`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease-out" }}
            draggable={false}
          />
        </div>

        {/* Thumbnail strip */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={(e) => { e.stopPropagation(); onIndexChange(i); setZoom(1); }}
              className={`w-12 h-8 rounded-md overflow-hidden border-2 transition-all ${
                i === currentIndex
                  ? "border-primary shadow-glow"
                  : "border-white/10 opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={`/api/v1/manuals/${manualId}/pages/${p.id}/image?token=${localStorage.getItem('token') || ''}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
