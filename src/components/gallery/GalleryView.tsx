import { useState, useEffect, useCallback } from "react";
import { ImageOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as ipc from "../../lib/ipc";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";

interface GalleryImage {
  id: number;
  thumbnail: number[];
  date: string;
}

export default function GalleryView() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [lightbox, setLightbox] = useState<{ imageId: number; fullData: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      const result = await ipc.listAllImagesWithThumbnails();
      setImages(result);
    } catch (e) {
      console.log("Failed to load gallery images:", e);
    }
    setLoading(false);
  };

  const openLightbox = useCallback(async (imageId: number) => {
    const data = await ipc.getFullImage(imageId);
    const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    setLightbox({ imageId, fullData: url });
  }, []);

  const handleJumpToDiary = (date: string) => {
    setSelectedDate(date);
    setActiveNav("diary");
    setLightbox(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <p>加载中...</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <div className="text-center">
          <ImageOff className="w-10 h-10 mb-3" />
          <p>还没有图片呢，记录生活的美好瞬间吧</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((img) => {
          const blob = new Blob([new Uint8Array(img.thumbnail)], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          return (
            <motion.div
              key={img.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer"
              onClick={() => openLightbox(img.id)}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightbox.fullData}
              alt=""
              className="max-w-[90%] max-h-[90%] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Find image date and jump
                  const img = images.find((i) => i.id === lightbox.imageId);
                  if (img) handleJumpToDiary(img.date);
                }}
                className="px-3 py-1.5 bg-white/20 rounded-lg text-white text-sm
                           hover:bg-white/30 backdrop-blur-sm transition-colors"
              >
                跳转到日记
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="w-8 h-8 bg-white/20 rounded-lg text-white flex items-center justify-center
                           hover:bg-white/30 backdrop-blur-sm transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
