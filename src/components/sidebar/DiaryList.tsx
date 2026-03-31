import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import CalendarPopover from "./CalendarPopover";
import SearchResults from "./SearchResults";
import * as ipc from "../../lib/ipc";
import type { SearchResult, Tag } from "../../lib/types";

export default function DiaryList() {
  const { t } = useTranslation();
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searching, setSearching] = useState(false);
  const [dayTags, setDayTags] = useState<Record<number, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const diaryDays = useDiaryStore((s) => s.diaryDays);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const loadDiaryList = useDiaryStore((s) => s.loadDiaryList);
  const tagVersion = useDiaryStore((s) => s.tagVersion);

  useEffect(() => {
    const now = dayjs();
    loadDiaryList(now.year(), now.month() + 1);
  }, [loadDiaryList]);

  // Load tags for each diary day + all tags for filter
  useEffect(() => {
    if (diaryDays.length === 0) return;
    const loadTags = async () => {
      const tagMap: Record<number, Tag[]> = {};
      await Promise.all(
        diaryDays.map(async (day) => {
          try {
            const tags = await ipc.getDayTags(day.id);
            if (tags.length > 0) tagMap[day.id] = tags;
          } catch { /* ignore */ }
        })
      );
      setDayTags(tagMap);
    };
    loadTags();
  }, [diaryDays, tagVersion]);

  // Load all tags for the filter dropdown
  useEffect(() => {
    ipc.getTags().then(setAllTags).catch(() => {});
  }, [tagVersion]);

  // Filter diary days by selected tag
  const filteredDays = useMemo(() => {
    if (!filterTagId) return diaryDays;
    return diaryDays.filter((day) =>
      dayTags[day.id]?.some((tag) => tag.id === filterTagId)
    );
  }, [diaryDays, dayTags, filterTagId]);

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
            onFocus={() => setShowTagFilter(true)}
            placeholder={t("diary.search")}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-border text-sm
                       placeholder:text-text-hint focus:outline-none focus:border-accent
                       transition-colors"
          />
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-2 py-1.5 rounded-lg bg-white border border-border hover:bg-warm-100
                       transition-colors text-sm"
            title={t("diary.calendar")}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Tag filter chips — show when search focused or tag filter active */}
        <AnimatePresence>
          {(showTagFilter || filterTagId) && allTags.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1 mt-1.5">
                {allTags.map((tag) => {
                  const isActive = filterTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setFilterTagId(isActive ? null : tag.id);
                        setShowTagFilter(false);
                      }}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors border ${
                        isActive
                          ? "text-white border-transparent"
                          : "text-text-secondary border-border hover:border-text-hint bg-white"
                      }`}
                      style={isActive ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <CalendarPopover
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
        />
      </div>

      {/* Active filter indicator */}
      {filterTagId && (
        <div className="px-3 pb-1 flex items-center gap-1">
          <span className="text-xs text-text-hint">
            {t("diary.filter")}
          </span>
          <span
            className="text-xs text-white px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: allTags.find((t) => t.id === filterTagId)?.color }}
          >
            {allTags.find((t) => t.id === filterTagId)?.name}
          </span>
          <button
            onClick={() => setFilterTagId(null)}
            className="text-text-hint hover:text-text-secondary"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

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
        {filteredDays.map((day) => {
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
                  {d.format(t("diary.monthDayFormat"))}
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
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {day.word_count > 0 && (
                  <span className="text-xs text-text-hint">
                    {day.word_count} {t("diary.words")}
                  </span>
                )}
                {dayTags[day.id]?.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-1.5 rounded-full text-white leading-4"
                    style={{ backgroundColor: tag.color, fontSize: "10px" }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </motion.button>
          );
        })}

        {filteredDays.length === 0 && diaryDays.length > 0 && (
          <p className="text-center text-text-hint text-sm mt-8">
            {t("diary.noTagResults")}
          </p>
        )}

        {diaryDays.length === 0 && (
          <p className="text-center text-text-hint text-sm mt-8">
            {t("diary.noEntries")}
          </p>
        )}
      </div>

      )}

      {/* Writing stats */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-xs text-text-hint text-center">
          {t("stats.companion", { days: diaryDays.length })}
        </p>
      </div>
    </div>
  );
}
