import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, MessageCircle, ImageIcon, Star as StarIcon } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import type { Favorite } from "../../lib/types";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";

export default function FavoritesView() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selected, setSelected] = useState<Favorite | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [fullImage, setFullImage] = useState<string | null>(null);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  useEffect(() => {
    ipc.getFavorites().then(async (favs) => {
      setFavorites(favs);
      // Load thumbnails for image favorites
      const thumbMap: Record<number, string> = {};
      for (const fav of favs) {
        if (fav.message_id && (fav.content_preview === "[图片]" || fav.content_preview === "[Photo]")) {
          try {
            // Get the message to find image_id
            const day = await ipc.getDiaryDay(fav.source_date);
            const msgs = await ipc.getMessages(day.id);
            const msg = msgs.find((m) => m.id === fav.message_id);
            if (msg?.thumbnail) {
              const blob = new Blob([new Uint8Array(msg.thumbnail)], { type: "image/jpeg" });
              thumbMap[fav.id] = URL.createObjectURL(blob);
            }
          } catch { /* ignore */ }
        }
      }
      setThumbnails(thumbMap);
    });
  }, []);

  // Detect if selected is an image favorite
  const selectedIsImage = useMemo(() => {
    return selected && !!thumbnails[selected.id];
  }, [selected, thumbnails]);

  // Load full image when selecting an image favorite
  useEffect(() => {
    if (!selected || !selectedIsImage) {
      setFullImage(null);
      return;
    }
    // Find the image_id from the message
    (async () => {
      try {
        const day = await ipc.getDiaryDay(selected.source_date);
        const msgs = await ipc.getMessages(day.id);
        const msg = msgs.find((m) => m.id === selected.message_id);
        if (msg?.image_id) {
          const data = await ipc.getFullImage(msg.image_id);
          const blob = new Blob([new Uint8Array(data)], { type: "image/jpeg" });
          setFullImage(URL.createObjectURL(blob));
        }
      } catch { /* ignore */ }
    })();
  }, [selected, selectedIsImage]);

  const handleRemove = async (id: number) => {
    await ipc.removeFavorite(id);
    setFavorites(favorites.filter((f) => f.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleJumpToMessage = (fav: Favorite) => {
    setSelectedDate(fav.source_date);
    setActiveNav("diary");
    if (fav.message_id) {
      useUIStore.getState().setHighlightMessageId(fav.message_id);
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <div className="text-center">
          <StarIcon className="w-10 h-10 mb-3" />
          <p>{t("empty.favorites")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-64 border-r border-border bg-sidebar-bg overflow-y-auto">
        {favorites.map((fav) => {
          const isImage = !!thumbnails[fav.id];
          return (
            <motion.button
              key={fav.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(fav)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors
                ${selected?.id === fav.id ? "bg-accent/10" : "hover:bg-warm-100"}`}
            >
              <div className="flex items-center gap-1.5">
                {fav.article_id ? (
                  <FileText className="w-4 h-4" />
                ) : isImage ? (
                  <ImageIcon className="w-4 h-4" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                <span className="text-xs text-text-hint">
                  {dayjs(fav.source_date).format(t("diary.monthDayFormat"))}
                </span>
              </div>
              {isImage ? (
                <div className="mt-1">
                  <img
                    src={thumbnails[fav.id]}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                </div>
              ) : (
                <p className="text-sm text-text-primary mt-0.5 truncate">
                  {fav.content_preview}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-hint">
                {t("favorites.fromDiary", { date: dayjs(selected.source_date).format(t("diary.dateFormat")) })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleJumpToMessage(selected)}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  {t("favorites.jumpToDiary")}
                </button>
                <button
                  onClick={() => handleRemove(selected.id)}
                  className="text-xs text-red-400 hover:text-red-500"
                >
                  {t("favorites.remove")}
                </button>
              </div>
            </div>
            {selectedIsImage && fullImage ? (
              <div className="flex items-center justify-center">
                <img
                  src={fullImage}
                  alt=""
                  className="max-w-full max-h-[60vh] rounded-xl shadow-lg"
                />
              </div>
            ) : (
              <div className="bg-warm-50 rounded-xl p-4">
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                  {selected.content_preview}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-hint text-sm">
            {t("favorites.selectToView")}
          </div>
        )}
      </div>
    </div>
  );
}
