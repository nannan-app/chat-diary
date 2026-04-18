import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ImageOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";

interface GalleryImage {
  id: number;
  thumbnail: number[];
  date: string;
}

export default function GalleryView() {
  const { t } = useTranslation();
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
      <div className="h-full flex items-center justify-center text-ink-500 bg-paper-0">
        <p className="italic" style={{ fontFamily: "var(--font-serif)" }}>{t("app.loading")}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-ink-500 bg-paper-0 paper-grain relative">
        <div className="text-center relative z-10">
          <ImageOff className="w-10 h-10 mb-3 mx-auto" strokeWidth={1.4} />
          <p className="italic" style={{ fontFamily: "var(--font-serif)" }}>{t("empty.gallery")}</p>
        </div>
      </div>
    );
  }

  // Group by YYYY-MM
  const groups = new Map<string, GalleryImage[]>();
  for (const img of images) {
    const m = img.date?.slice(0, 7) || "unknown";
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m)!.push(img);
  }

  const totalCount = images.length;
  const dayCount = new Set(images.map((i) => i.date)).size;

  return (
    <div className="relative h-full flex flex-col bg-paper-0 overflow-hidden paper-grain">
      {/* Header */}
      <div className="relative z-10 px-8 pt-5 pb-3.5 border-b border-paper-200 flex items-end justify-between gap-4">
        <div>
          <h1
            className="m-0 text-ink-900"
            style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.01em" }}
          >
            {t("nav.gallery")}
          </h1>
          <p
            className="m-0 mt-1 text-ink-500 italic"
            style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
          >
            {t("gallery.subtitle", {
              defaultValue: "生活的碎片 · {{photos}} 张照片 · 贯穿 {{days}} 天",
              photos: totalCount,
              days: dayCount,
            })}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="text-[11px] text-ink-500" style={{ fontFamily: "var(--font-mono)" }}>
            {new Date().getFullYear()}
          </div>
          <div className="stamp text-ink-600" style={{ borderColor: "var(--color-ink-600)" }}>grid</div>
        </div>
      </div>

      {/* Grouped grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-5 pb-10">
        {Array.from(groups.entries()).map(([ym, list]) => {
          const monthName = dayjs(ym + "-01").format("MMMM");
          return (
            <div key={ym} className="mb-7">
              <div className="flex items-baseline gap-2.5 mb-2.5">
                <span
                  className="text-ink-700 italic"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 18 }}
                >
                  {monthName}
                </span>
                <div className="flex-1 h-px bg-paper-200" />
                <span className="text-[10.5px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                  {list.length} {t("gallery.count", { defaultValue: "张" })}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {list.map((img) => {
                  const blob = new Blob([new Uint8Array(img.thumbnail)], { type: "image/jpeg" });
                  const url = URL.createObjectURL(blob);
                  return (
                    <motion.div
                      key={img.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className="aspect-square bg-paper-0 border border-paper-200 p-[5px] cursor-pointer relative group"
                      onClick={() => openLightbox(img.id)}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div
                        className="absolute bottom-[6px] left-[8px] text-[9.5px] text-ink-600 px-[5px] py-[1px] rounded-[2px]"
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "rgba(251,247,240,0.85)",
                        }}
                      >
                        {img.date?.slice(5)}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
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
            className="fixed inset-0 z-50 bg-[rgba(26,22,19,0.85)] flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightbox.fullData}
              alt=""
              className="max-w-[90%] max-h-[90%] rounded-[4px] shadow-2xl border border-paper-300"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const img = images.find((i) => i.id === lightbox.imageId);
                  if (img) handleJumpToDiary(img.date);
                }}
                className="px-3 py-1.5 bg-paper-0/85 border border-paper-300 rounded-md text-ink-800 text-xs hover:bg-paper-0 transition-colors italic"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("gallery.jumpToDiary")}
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="w-8 h-8 bg-paper-0/85 border border-paper-300 rounded-md text-ink-700 flex items-center justify-center hover:bg-paper-0 transition-colors"
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
