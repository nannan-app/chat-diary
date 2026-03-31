import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import type { SearchResult } from "../../lib/types";
import { useDiaryStore } from "../../stores/diaryStore";

interface Props {
  results: SearchResult[];
  query: string;
  onClose: () => void;
}

export default function SearchResults({ results, query, onClose }: Props) {
  const { t } = useTranslation();
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);

  const handleClick = (result: SearchResult) => {
    setSelectedDate(result.diary_date);
    onClose();
  };

  // Group results by year-month
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const key = dayjs(r.diary_date).format("YYYY-MM");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // Sort groups descending (newest month first)
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-text-hint text-sm">{t("search.noResults", { query })}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2">
      <p className="px-2 py-1 text-xs text-text-hint">
        {t("search.resultCount", { count: results.length })}
      </p>
      {grouped.map(([yearMonth, items]) => (
        <div key={yearMonth}>
          <div className="px-2 pt-2 pb-1 sticky top-0 bg-sidebar-bg">
            <span className="text-xs font-medium text-text-secondary">
              {dayjs(yearMonth + "-01").format(t("diary.yearMonthFormat"))}
            </span>
          </div>
          {items.map((result, i) => (
            <motion.button
              key={`${result.kind}-${result.message_id || result.article_id}-${i}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleClick(result)}
              className="w-full text-left px-3 py-2 rounded-lg mb-0.5 hover:bg-warm-100 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {result.kind === "article" ? <FileText className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                <span className="text-xs text-text-hint">
                  {dayjs(result.diary_date).format(t("diary.monthDayFormat"))}
                </span>
              </div>
              <p className="text-sm text-text-primary mt-0.5 truncate">
                {result.content_preview}
              </p>
            </motion.button>
          ))}
        </div>
      ))}
    </div>
  );
}
