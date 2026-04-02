import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, X, ChevronLeft, ChevronRight, Trash2, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useDiaryStore } from "../../stores/diaryStore";
import SearchResults from "./SearchResults";
import * as ipc from "../../lib/ipc";
import type { SearchResult, Tag } from "../../lib/types";

export default function DiaryList() {
  const { t } = useTranslation();
  const now = dayjs();
  const [viewYear, setViewYear] = useState(now.year());
  const [viewMonth, setViewMonth] = useState(now.month() + 1);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_searching, setSearching] = useState(false);
  const [dayTags, setDayTags] = useState<Record<number, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [companionDays, setCompanionDays] = useState(0);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dayId: number; date: string } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);
  const diaryDays = useDiaryStore((s) => s.diaryDays);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);
  const loadDiaryList = useDiaryStore((s) => s.loadDiaryList);
  const tagVersion = useDiaryStore((s) => s.tagVersion);

  const loadToday = useDiaryStore((s) => s.loadToday);

  useEffect(() => {
    loadDiaryList(viewYear, viewMonth);
    // When switching back to the current month, restore today's entry
    const today = dayjs();
    if (viewYear === today.year() && viewMonth === today.month() + 1) {
      const cur = useDiaryStore.getState().currentDay;
      if (!cur || cur.date !== today.format("YYYY-MM-DD")) {
        loadToday();
      }
    }
  }, [loadDiaryList, loadToday, viewYear, viewMonth]);

  // Load tags for each diary day
  useEffect(() => {
    if (diaryDays.length === 0) {
      setDayTags({});
      return;
    }
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

  // Load companion days (from first entry to today)
  useEffect(() => {
    ipc.getWritingStats().then((stats) => {
      if (stats.first_entry_date) {
        const days = dayjs().diff(dayjs(stats.first_entry_date), "day") + 1;
        setCompanionDays(days);
      }
    });
  }, []);

  // Load all tags for the filter dropdown
  useEffect(() => {
    ipc.getTags().then(setAllTags).catch(() => {});
  }, [tagVersion]);

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

  const handleDeleteDay = async (dayId: number, date: string) => {
    setCtxMenu(null);
    const yes = await ask(t("diary.deleteDay.confirm"), {
      title: t("diary.deleteDay"),
      kind: "warning",
    });
    if (!yes) return;
    try {
      console.log("Deleting diary day:", dayId, date);
      await ipc.deleteDiaryDay(dayId);
      console.log("Delete succeeded");
      // If we just deleted the currently viewed day, clear it
      const { currentDay } = useDiaryStore.getState();
      if (currentDay && currentDay.id === dayId) {
        useDiaryStore.setState({ currentDay: null, messages: [] });
      }
      // Refresh the month the deleted day belongs to
      const deleted = dayjs(date);
      loadDiaryList(deleted.year(), deleted.month() + 1);
      // Also refresh current view month if different
      if (deleted.year() !== viewYear || deleted.month() + 1 !== viewMonth) {
        loadDiaryList(viewYear, viewMonth);
      }
    } catch (e) {
      console.log("Delete diary day failed:", e);
    }
  };

  // Filter diary days by selected tag
  const filteredDays = useMemo(() => {
    if (!filterTagId) return diaryDays;
    return diaryDays.filter((day) =>
      dayTags[day.id]?.some((tag) => tag.id === filterTagId)
    );
  }, [diaryDays, dayTags, filterTagId]);

  const todayDay = useDiaryStore((s) => s.todayDay);

  const visibleDays = useMemo(() => {
    const today = dayjs();
    const isViewingCurrentMonth =
      viewYear === today.year() && viewMonth === today.month() + 1;

    if (!isViewingCurrentMonth || !todayDay) {
      return filteredDays;
    }

    if (filteredDays.some((day) => day.date === todayDay.date)) {
      return filteredDays;
    }

    return [todayDay, ...filteredDays].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredDays, todayDay, viewYear, viewMonth]);

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

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const viewDate = dayjs(`${viewYear}-${String(viewMonth).padStart(2, "0")}-01`);

  // Year-month picker: show months for the current viewYear
  const [pickerYear, setPickerYear] = useState(viewYear);

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
            onClick={() => { setShowYearMonthPicker(!showYearMonthPicker); setPickerYear(viewYear); }}
            className="px-2 py-1.5 rounded-lg bg-white border border-border hover:bg-warm-100
                       transition-colors text-sm"
            title={t("diary.calendar")}
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Tag filter chips */}
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

        {/* Year-month picker popover */}
        <AnimatePresence>
          {showYearMonthPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowYearMonthPicker(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-border p-3 mx-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setPickerYear(pickerYear - 1)}
                    className="w-7 h-7 rounded-lg hover:bg-warm-100 flex items-center justify-center text-text-secondary text-sm"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-medium text-text-primary">{pickerYear}</span>
                  <button
                    onClick={() => setPickerYear(pickerYear + 1)}
                    className="w-7 h-7 rounded-lg hover:bg-warm-100 flex items-center justify-center text-text-secondary text-sm"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const isActive = pickerYear === viewYear && m === viewMonth;
                    const isCurrent = pickerYear === now.year() && m === now.month() + 1;
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          setViewYear(pickerYear);
                          setViewMonth(m);
                          setShowYearMonthPicker(false);
                        }}
                        className={`py-1.5 rounded-lg text-xs transition-colors
                          ${isActive ? "bg-accent text-white" : ""}
                          ${isCurrent && !isActive ? "text-accent font-bold" : ""}
                          ${!isActive && !isCurrent ? "text-text-primary hover:bg-warm-100" : ""}
                        `}
                      >
                        {m}{t("diary.monthSuffix", { defaultValue: "月" })}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Active filter indicator */}
      {filterTagId && (
        <div className="px-3 pb-1 flex items-center gap-1">
          <span className="text-xs text-text-hint">
            {t("diary.filter")}
          </span>
          <span
            className="text-xs text-white px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: allTags.find((tg) => tg.id === filterTagId)?.color }}
          >
            {allTags.find((tg) => tg.id === filterTagId)?.name}
          </span>
          <button
            onClick={() => setFilterTagId(null)}
            className="text-text-hint hover:text-text-secondary"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Year-month header */}
      <div className="px-3 pb-1">
        <p className="text-xs text-text-hint text-center font-medium">
          {viewDate.format(t("diary.yearMonthFormat"))}
        </p>
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
        {visibleDays.map((day) => {
          const isSelected = day.date === selectedDate;
          const d = dayjs(day.date);

          return (
            <motion.button
              key={day.id}
              onClick={() => setSelectedDate(day.date)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, dayId: day.id, date: day.date });
              }}
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

        {visibleDays.length === 0 && diaryDays.length > 0 && (
          <p className="text-center text-text-hint text-sm mt-8">
            {t("diary.noTagResults")}
          </p>
        )}

        {visibleDays.length === 0 && (
          <p className="text-center text-text-hint text-sm mt-8">
            {t("diary.noEntries")}
          </p>
        )}
      </div>

      )}

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
              onClick={async () => {
                setCtxMenu(null);
                const path = await save({ defaultPath: `diary_${ctxMenu.date}.md` });
                if (!path) return;
                const content = await ipc.exportDiaryDay(ctxMenu.dayId, "document");
                await writeTextFile(path, content);
              }}
              className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-warm-100
                         transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              {t("diary.export")}
            </button>
            <button
              onClick={() => handleDeleteDay(ctxMenu.dayId, ctxMenu.date)}
              className="w-full px-3 py-1.5 text-left text-sm text-red-500 hover:bg-red-50
                         transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("diary.deleteDay")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom: prev/next month + stats */}
      <div className="px-3 py-2 border-t border-border">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrevMonth}
            className="p-1 rounded-lg hover:bg-warm-100 transition-colors text-text-hint"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-text-hint">
            {t("stats.companion", { days: companionDays })}
          </p>
          <button
            onClick={goNextMonth}
            className="p-1 rounded-lg hover:bg-warm-100 transition-colors text-text-hint"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
