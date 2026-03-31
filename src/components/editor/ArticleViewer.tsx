import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import * as ipc from "../../lib/ipc";
import type { Article } from "../../lib/types";

export default function ArticleViewer() {
  const { t } = useTranslation();
  const articleId = useUIStore((s) => s.viewingArticleId);
  const setViewingArticleId = useUIStore((s) => s.setViewingArticleId);
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      return;
    }
    ipc.getArticle(articleId).then(setArticle).catch(() => setArticle(null));
  }, [articleId]);

  if (!articleId || !article) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center"
      onClick={() => setViewingArticleId(null)}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[720px] max-h-[80vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-medium text-text-primary">{article.title}</h2>
          <button
            onClick={() => setViewingArticleId(null)}
            className="p-1 rounded-lg hover:bg-warm-100 transition-colors"
          >
            <X className="w-5 h-5 text-text-hint" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div
            className="prose prose-sm max-w-none text-text-primary select-text"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-text-hint">{article.word_count} {t("diary.words")}</span>
          <span className="text-xs text-text-hint">{article.created_at}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
