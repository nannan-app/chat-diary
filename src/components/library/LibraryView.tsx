import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, PenLine } from "lucide-react";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";
import type { Article } from "../../lib/types";
import libraryEmptyImg from "../../assets/illustrations/empty/library_empty.png";

export default function LibraryView() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; article: Article } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const setActiveNav = useUIStore((s) => s.setActiveNav);

  useEffect(() => {
    ipc.getAllArticles().then(setArticles);
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const handleJumpToDiary = (article: Article) => {
    setCtxMenu(null);
    if (article.date) {
      setSelectedDate(article.date);
      setActiveNav("diary");
    }
  };

  if (articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <div className="text-center">
          <img src={libraryEmptyImg} alt="" className="w-20 h-20 mx-auto mb-3" />
          <p className="text-sm leading-relaxed">{t("empty.library")}</p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-text-hint">
            <PenLine className="w-3.5 h-3.5" />
            <span>{t("toolbar.article")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-72 border-r border-border bg-sidebar-bg overflow-y-auto">
        {articles.map((article) => (
          <motion.button
            key={article.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(article)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu({ x: e.clientX, y: e.clientY, article });
            }}
            className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors
              ${selected?.id === article.id ? "bg-accent/10" : "hover:bg-warm-100"}`}
          >
            <h3 className="text-sm font-medium text-text-primary truncate">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-hint">
                {dayjs(article.date || article.created_at).format(t("diary.monthDayFormat"))}
              </span>
              <span className="text-xs text-text-hint">
                {article.word_count} {t("diary.words")}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {article.content.replace(/<[^>]*>/g, "").slice(0, 80)}
            </p>
          </motion.button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <div className="max-w-2xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-medium text-text-primary mb-2">
              {selected.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-text-hint mb-6">
              <span>{dayjs(selected.date || selected.created_at).format(t("diary.dateFormat"))}</span>
              <span>{selected.word_count} {t("diary.words")}</span>
              {selected.date && (
                <button
                  onClick={() => handleJumpToDiary(selected)}
                  className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                >
                  <CalendarDays className="w-3 h-3" />
                  {t("library.jumpToDiary")}
                </button>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none text-text-primary"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-text-hint text-sm">
            {t("library.selectToRead")}
          </div>
        )}
      </div>

      {/* Right-click context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[120px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => handleJumpToDiary(ctxMenu.article)}
              className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-warm-100
                         transition-colors flex items-center gap-2"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              {t("library.jumpToDiary")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
