import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Download } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
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

  const handleExportArticle = async (article: Article) => {
    setCtxMenu(null);
    const safeName = article.title.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 50);
    const path = await save({ defaultPath: `${safeName}.md` });
    if (!path) return;
    const content = await ipc.exportArticle(article.id);
    await writeTextFile(path, content);
  };

  if (articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-paper-0 paper-grain relative">
        <div className="text-center relative z-10">
          <img src={libraryEmptyImg} alt="" className="w-20 h-20 mx-auto mb-3 opacity-80" />
          <p
            className="text-ink-500 italic leading-relaxed"
            style={{ fontFamily: "var(--font-serif)", fontSize: 13 }}
          >
            {t("empty.library")}
          </p>
        </div>
      </div>
    );
  }

  const totalWords = articles.reduce((a, b) => a + b.word_count, 0);

  return (
    <div className="relative h-full flex bg-paper-0 overflow-hidden">
      {/* Article list */}
      <div className="w-[280px] border-r border-paper-200 bg-paper-50 flex flex-col paper-grain">
        <div className="relative z-10 px-5 pt-[18px] pb-3 border-b border-paper-200">
          <h2
            className="m-0 text-ink-900"
            style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400 }}
          >
            {t("nav.library")}
          </h2>
          <p
            className="m-0 mt-0.5 text-ink-500 italic"
            style={{ fontFamily: "var(--font-serif)", fontSize: 11 }}
          >
            {t("library.subtitle", {
              defaultValue: "{{count}} 篇长文 · 约 {{words}} 字",
              count: articles.length,
              words: totalWords.toLocaleString(),
            })}
          </p>
        </div>
        <div className="relative z-10 flex-1 overflow-y-auto px-2.5 py-2">
          {articles.map((article) => {
            const isActive = selected?.id === article.id;
            return (
              <motion.button
                key={article.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(article)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu({ x: e.clientX, y: e.clientY, article });
                }}
                className={`w-full text-left px-3.5 py-3 rounded-[10px] transition-colors mb-0.5
                  ${isActive ? "bg-paper-100" : "hover:bg-paper-100/60"}`}
              >
                <div
                  className="text-ink-900 truncate"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 14.5, fontWeight: 500 }}
                >
                  {article.title}
                </div>
                <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-2 leading-[1.55]">
                  {article.content.replace(/<[^>]*>/g, "").slice(0, 80)}
                </p>
                <div className="mt-1 text-[10px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                  {dayjs(article.date || article.created_at).format("YYYY-MM-DD")} · {article.word_count}{t("diary.words")}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reader */}
      <div className="flex-1 flex flex-col overflow-hidden paper-grain relative">
        {selected ? (
          <>
            <div className="relative z-10 px-7 py-3 border-b border-paper-200 flex items-center justify-between">
              <span className="text-[11px] text-ink-500" style={{ fontFamily: "var(--font-mono)" }}>
                {dayjs(selected.date || selected.created_at).format("YYYY-MM-DD")}
              </span>
              <div className="flex gap-1.5">
                {selected.date && (
                  <button
                    onClick={() => handleJumpToDiary(selected)}
                    className="border border-paper-300 text-ink-700 px-2.5 py-[3px] rounded-full text-[11px] hover:bg-paper-100 transition-colors flex items-center gap-1"
                  >
                    <CalendarDays className="w-3 h-3" strokeWidth={1.6} />
                    {t("library.jumpToDiary")}
                  </button>
                )}
                <button
                  onClick={() => handleExportArticle(selected)}
                  className="border border-paper-300 text-ink-700 px-2.5 py-[3px] rounded-full text-[11px] hover:bg-paper-100 transition-colors flex items-center gap-1"
                >
                  <Download className="w-3 h-3" strokeWidth={1.6} />
                  {t("article.export")}
                </button>
              </div>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto px-[15%] py-10 pb-20 select-text">
              <div
                className="text-[11px] text-ink-500 mb-2"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                }}
              >
                a letter, folded
              </div>
              <h1
                className="m-0 text-ink-900 leading-[1.2]"
                style={{ fontFamily: "var(--font-serif)", fontSize: 34, fontWeight: 500 }}
              >
                {selected.title}
              </h1>
              <div
                className="mt-3 text-[11px] text-ink-500 flex items-center gap-2.5"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {dayjs(selected.date || selected.created_at).format("YYYY-MM-DD")} · {selected.word_count}{t("diary.words")} · {Math.max(1, Math.round(selected.word_count / 300))} min
              </div>
              <div className="h-px bg-paper-300 my-7" />
              <div
                className="editor-content text-ink-800"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 16,
                  lineHeight: 1.9,
                }}
                dangerouslySetInnerHTML={{ __html: selected.content }}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center relative z-10">
            <p
              className="text-ink-500 italic"
              style={{ fontFamily: "var(--font-serif)", fontSize: 13 }}
            >
              {t("library.selectToRead")}
            </p>
          </div>
        )}
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            ref={ctxRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-50 bg-paper-0 rounded-[10px] shadow-lg border border-paper-200 py-1 min-w-[130px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button
              onClick={() => handleJumpToDiary(ctxMenu.article)}
              className="w-full px-3 py-1.5 text-left text-sm text-ink-800 hover:bg-paper-100 transition-colors flex items-center gap-2"
            >
              <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.6} />
              {t("library.jumpToDiary")}
            </button>
            <button
              onClick={() => handleExportArticle(ctxMenu.article)}
              className="w-full px-3 py-1.5 text-left text-sm text-ink-800 hover:bg-paper-100 transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              {t("article.export")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
