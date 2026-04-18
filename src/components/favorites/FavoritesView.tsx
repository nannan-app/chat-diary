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
      const thumbMap: Record<number, string> = {};
      for (const fav of favs) {
        if (fav.message_id && (fav.content_preview === "[图片]" || fav.content_preview === "[Photo]")) {
          try {
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

  const selectedIsImage = useMemo(() => {
    return selected && !!thumbnails[selected.id];
  }, [selected, thumbnails]);

  useEffect(() => {
    if (!selected || !selectedIsImage) {
      setFullImage(null);
      return;
    }
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
      <div className="h-full flex items-center justify-center bg-paper-0 paper-grain relative">
        <div className="text-center relative z-10 text-ink-500">
          <StarIcon className="w-10 h-10 mb-3 mx-auto" strokeWidth={1.4} />
          <p className="italic" style={{ fontFamily: "var(--font-serif)" }}>{t("empty.favorites")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col bg-paper-0 overflow-hidden paper-grain">
      {/* Header */}
      <div className="relative z-10 px-8 pt-5 pb-3.5 border-b border-paper-200">
        <h1
          className="m-0 text-ink-900"
          style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.01em" }}
        >
          {t("nav.favorites")}
        </h1>
        <p
          className="m-0 mt-1 text-ink-500 italic"
          style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
        >
          {t("favorites.subtitle", { defaultValue: "珍视的句子 · 你圈起来的时刻" })}
        </p>
      </div>

      {/* Grid */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-6 pb-10">
        <div className="grid grid-cols-2 gap-4">
          {favorites.map((fav) => {
            const isImage = !!thumbnails[fav.id];
            const typeLabel = fav.article_id
              ? "ARTICLE"
              : isImage
                ? "PHOTO"
                : "NOTE";
            return (
              <motion.div
                key={fav.id}
                whileHover={{ y: -1 }}
                onClick={() => setSelected(fav)}
                className="relative border border-paper-200 rounded-[4px] bg-paper-0 px-5 pt-[18px] pb-4 cursor-pointer hover:border-paper-300 transition-colors"
              >
                <div className="absolute -top-2 right-3.5 bg-paper-0 px-1.5 flex items-center gap-1">
                  {fav.article_id ? (
                    <FileText className="w-3 h-3 text-[#c9ad8a]" strokeWidth={1.8} />
                  ) : isImage ? (
                    <ImageIcon className="w-3 h-3 text-[#c9ad8a]" strokeWidth={1.8} />
                  ) : (
                    <MessageCircle className="w-3 h-3 text-[#c9ad8a]" strokeWidth={1.8} />
                  )}
                  <span
                    className="text-[9.5px] text-ink-500"
                    style={{
                      fontFamily: "var(--font-serif)",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    {typeLabel}
                  </span>
                </div>

                {isImage && thumbnails[fav.id] ? (
                  <img
                    src={thumbnails[fav.id]}
                    alt=""
                    className="w-full h-40 object-cover rounded-[2px]"
                  />
                ) : (
                  <p
                    className="m-0 text-ink-800 leading-[1.75] line-clamp-4"
                    style={{ fontFamily: "var(--font-serif)", fontSize: 14 }}
                  >
                    „ {fav.content_preview}
                  </p>
                )}

                <div className="mt-3.5 pt-2.5 border-t border-dashed border-paper-300 flex items-center justify-between">
                  <span
                    className="text-[10.5px] text-ink-500"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    — {fav.source_date}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJumpToMessage(fav);
                    }}
                    className="text-[10.5px] text-ink-500 italic hover:text-ink-700 transition-colors"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {t("favorites.jumpToDiary")} →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(30,22,15,0.45)] flex items-center justify-center p-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-[600px] max-h-[80vh] bg-paper-0 rounded-[14px] border border-paper-200 overflow-hidden flex flex-col fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-3 border-b border-paper-200 flex items-center justify-between">
              <span
                className="text-[11px] text-ink-500 italic"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("favorites.fromDiary", { date: dayjs(selected.source_date).format(t("diary.dateFormat")) })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleJumpToMessage(selected)}
                  className="text-[11px] text-ink-700 italic hover:text-ink-900 px-2.5 py-1 rounded-full border border-paper-300"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {t("favorites.jumpToDiary")}
                </button>
                <button
                  onClick={() => handleRemove(selected.id)}
                  className="text-[11px] text-[#a66060] hover:text-[#804646] px-2.5 py-1 rounded-full border border-[#c9a0a0]"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {t("favorites.remove")}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedIsImage && fullImage ? (
                <div className="flex items-center justify-center">
                  <img
                    src={fullImage}
                    alt=""
                    className="max-w-full max-h-[60vh] rounded-[4px] border border-paper-200"
                  />
                </div>
              ) : (
                <p
                  className="text-ink-800 leading-[1.85] whitespace-pre-wrap m-0"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 15 }}
                >
                  {selected.content_preview}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
