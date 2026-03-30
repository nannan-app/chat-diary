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
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);

  const handleClick = (result: SearchResult) => {
    setSelectedDate(result.diary_date);
    onClose();
  };

  if (results.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-text-hint text-sm">没有找到 "{query}" 的结果</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2">
      <p className="px-2 py-1 text-xs text-text-hint">
        找到 {results.length} 条结果
      </p>
      {results.map((result, i) => (
        <motion.button
          key={`${result.kind}-${result.message_id || result.article_id}-${i}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => handleClick(result)}
          className="w-full text-left px-3 py-2 rounded-lg mb-0.5 hover:bg-warm-100 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs">
              {result.kind === "article" ? "📝" : "💬"}
            </span>
            <span className="text-xs text-text-hint">
              {dayjs(result.diary_date).format("M月D日")}
            </span>
          </div>
          <p className="text-sm text-text-primary mt-0.5 truncate">
            {result.content_preview}
          </p>
        </motion.button>
      ))}
    </div>
  );
}
