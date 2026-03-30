import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import type { Favorite } from "../../lib/types";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";

export default function FavoritesView() {
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
          <p className="text-4xl mb-3">⭐</p>
          <p>收藏你珍视的每一段文字</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* List */}
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
              <span className="text-xs">
                {fav.article_id ? "📝" : "💬"}
              </span>
              <span className="text-xs text-text-hint">
                {dayjs(fav.source_date).format("M月D日")}
              </span>
            </div>
            <p className="text-sm text-text-primary mt-0.5 truncate">
              {fav.content_preview}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-text-hint">
                来自 {dayjs(selected.source_date).format("YYYY年M月D日")} 的日记
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleJumpToDate(selected.source_date)}
                  className="text-xs text-accent hover:text-accent-hover"
                >
                  跳转到日记
                </button>
                <button
                  onClick={() => handleRemove(selected.id)}
                  className="text-xs text-red-400 hover:text-red-500"
                >
                  取消收藏
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
            选择一条收藏查看详情
          </div>
        )}
      </div>
    </div>
  );
}
