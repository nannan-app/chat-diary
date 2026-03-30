import { useEffect, useState, useCallback } from "react";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import CalendarPopover from "./CalendarPopover";
import SearchResults from "./SearchResults";
import * as ipc from "../../lib/ipc";
import type { SearchResult } from "../../lib/types";

export default function DiaryList() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searching, setSearching] = useState(false);
  const diaryDays = useDiaryStore((s) => s.diaryDays);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const loadDiaryList = useDiaryStore((s) => s.loadDiaryList);

  useEffect(() => {
    const now = dayjs();
    loadDiaryList(now.year(), now.month() + 1);
  }, [loadDiaryList]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await ipc.searchDiary(query.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  return (
    <div className="h-full flex flex-col bg-sidebar-bg">
      {/* Search + Calendar */}
      <div className="px-3 pt-3 pb-2 relative">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="搜索日记..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-border text-sm
                       placeholder:text-text-hint focus:outline-none focus:border-accent
                       transition-colors"
          />
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-2 py-1.5 rounded-lg bg-white border border-border hover:bg-warm-100
                       transition-colors text-sm"
            title="日历"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        <CalendarPopover
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
        />
      </div>

      {/* Search results or day list */}
      {searchResults !== null ? (
        <SearchResults
          results={searchResults}
          query={searchQuery}
          onClose={() => {
            setSearchQuery("");
            setSearchResults(null);
          }}
        />
      ) : (
      <div className="flex-1 overflow-y-auto px-2">
        {diaryDays.map((day) => {
          const isSelected = day.date === selectedDate;
          const d = dayjs(day.date);

          return (
            <motion.button
              key={day.id}
              onClick={() => setSelectedDate(day.date)}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors
                ${isSelected ? "bg-accent/10" : "hover:bg-warm-100"}`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-sm font-medium ${isSelected ? "text-accent" : "text-text-primary"}`}
                >
                  {d.format("M月D日")}
                </span>
                <span className="text-xs text-text-hint">
                  {d.format("ddd")}
                </span>
              </div>
              {day.summary && (
                <p className="text-xs text-text-secondary mt-0.5 truncate">
                  {day.summary}
                </p>
              )}
              {day.word_count > 0 && (
                <span className="text-xs text-text-hint">
                  {day.word_count} 字
                </span>
              )}
            </motion.button>
          );
        })}

        {diaryDays.length === 0 && (
          <p className="text-center text-text-hint text-sm mt-8">
            这个月还没有日记
          </p>
        )}
      </div>

      )}

      {/* Writing stats */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-xs text-text-hint text-center">
          已陪伴你 {diaryDays.length} 天
        </p>
      </div>
    </div>
  );
}
