import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText, MessageCircle, Star as StarIcon } from "lucide-react";
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
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  useEffect(() => {
    ipc.getFavorites().then(setFavorites);
  }, []);

  const handleRemove = async (id: number) => {
    await ipc.removeFavorite(id);
    setFavorites(favorites.filter((f) => f.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const handleJumpToDate = (date: string) => {
    setSelectedDate(date);
    setActiveNav("diary");
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
        {favorites.map((fav) => (
          <motion.button
            key={fav.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(fav)}
            className={`w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors
              ${selected?.id === fav.id ? "bg-accent/10" : "hover:bg-warm-100"}`}
          >
            <div className="flex items-center gap-1.5">
              {fav.article_id ? <FileText className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              <span className="text-xs text-text-hint">
                {dayjs(fav.source_date).format(t("diary.monthDayFormat"))}
              </span>
            </div>
            <p className="text-sm text-text-primary mt-0.5 truncate">
              {fav.content_preview}
            </p>
          </motion.button>
        ))}
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
                  onClick={() => handleJumpToDate(selected.source_date)}
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
            <div className="bg-warm-50 rounded-xl p-4">
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {selected.content_preview}
              </p>
            </div>
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
