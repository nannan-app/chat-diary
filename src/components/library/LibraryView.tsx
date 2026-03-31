import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import type { Article } from "../../lib/types";

export default function LibraryView() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);

  useEffect(() => {
    ipc.getAllArticles().then(setArticles);
  }, []);

  if (articles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-hint">
        <div className="text-center">
          <p className="text-4xl mb-3">📚</p>
          <p>{t("empty.library")}</p>
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
            className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors
              ${selected?.id === article.id ? "bg-accent/10" : "hover:bg-warm-100"}`}
          >
            <h3 className="text-sm font-medium text-text-primary truncate">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-hint">
                {dayjs(article.created_at).format(t("diary.monthDayFormat"))}
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
              <span>{dayjs(selected.created_at).format(t("diary.dateFormat"))}</span>
              <span>{selected.word_count} {t("diary.words")}</span>
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
    </div>
  );
}
