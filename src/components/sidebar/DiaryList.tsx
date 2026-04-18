import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, X, ChevronLeft, ChevronRight, Trash2, Download, Search } from "lucide-react";
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
    const today = dayjs();
    if (viewYear === today.year() && viewMonth === today.month() + 1) {
      const cur = useDiaryStore.getState().currentDay;
      if (!cur || cur.date !== today.format("YYYY-MM-DD")) {
        loadToday();
      }
    }
  }, [loadDiaryList, loadToday, viewYear, viewMonth]);

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

  useEffect(() => {
    ipc.getWritingStats().then((stats) => {
      if (stats.first_entry_date) {
        const days = dayjs().diff(dayjs(stats.first_entry_date), "day") + 1;
        setCompanionDays(days);
      }
    });
  }, []);

  useEffect(() => {
    ipc.getTags().then(setAllTags).catch(() => {});
  }, [tagVersion]);

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
      await ipc.deleteDiaryDay(dayId);
      const { currentDay } = useDiaryStore.getState();
      if (currentDay && currentDay.id === dayId) {
        useDiaryStore.setState({ currentDay: null, messages: [] });
      }
      const deleted = dayjs(date);
      loadDiaryList(deleted.year(), deleted.month() + 1);
      if (deleted.year() !== viewYear || deleted.month() + 1 !== viewMonth) {
        loadDiaryList(viewYear, viewMonth);
      }
    } catch (e) {
      console.log("Delete diary day failed:", e);
    }
  };

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

    if (!isViewingCurrentMonth || !todayDay) return filteredDays;
    if (filteredDays.some((day) => day.date === todayDay.date)) return filteredDays;

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
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(12); }
    else setViewMonth(viewMonth - 1);
  };

  const goNextMonth = () => {
    if (viewMonth === 12) { setViewYear(viewYear + 1); setViewMonth(1); }
    else setViewMonth(viewMonth + 1);
  };

  const viewDate = dayjs(`${viewYear}-${String(viewMonth).padStart(2, "0")}-01`);
  const monthName = viewDate.format("MMMM");

  const [pickerYear, setPickerYear] = useState(viewYear);

  return (
    <div className="relative h-full flex flex-col bg-paper-50 paper-grain">
      {/* Search + calendar */}
      <div className="relative z-10 px-[14px] pt-[14px] pb-2">
        <div className="flex gap-1.5 relative">
          <div className="flex-1 flex items-center gap-2 bg-paper-0 border border-paper-200 rounded-[10px] px-[10px] py-[6px]">
            <Search className="w-3.5 h-3.5 text-ink-500" strokeWidth={1.6} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowTagFilter(true)}
              placeholder={t("diary.search")}
              className="flex-1 bg-transparent text-[12.5px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => { setShowYearMonthPicker(!showYearMonthPicker); setPickerYear(viewYear); }}
            className="px-2 py-[6px] rounded-[10px] bg-paper-0 border border-paper-200 hover:bg-paper-100 transition-colors text-ink-600"
            data-tooltip={t("diary.calendar")}
          >
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.6} />
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
              <div className="flex flex-wrap gap-1 mt-2">
                {allTags.map((tag) => {
                  const isActive = filterTagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setFilterTagId(isActive ? null : tag.id);
                        setShowTagFilter(false);
                      }}
                      className={`px-2 py-[1.5px] rounded-full text-[10.5px] border transition-colors ${
                        isActive ? "text-white" : "text-ink-600 border-paper-200 bg-paper-0"
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

        {/* Year-month picker */}
        <AnimatePresence>
          {showYearMonthPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowYearMonthPicker(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-[14px] right-[14px] top-full mt-1 z-50 bg-paper-0 rounded-[10px] shadow-lg border border-paper-200 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setPickerYear(pickerYear - 1)}
                    className="w-7 h-7 rounded-lg hover:bg-paper-100 flex items-center justify-center text-ink-600 text-sm"
                  >
                    ‹
                  </button>
                  <span
                    className="text-ink-900"
                    style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14 }}
                  >
                    {pickerYear}
                  </span>
                  <button
                    onClick={() => setPickerYear(pickerYear + 1)}
                    className="w-7 h-7 rounded-lg hover:bg-paper-100 flex items-center justify-center text-ink-600 text-sm"
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
                        className={`py-1.5 rounded-md text-xs transition-colors
                          ${isActive ? "bg-ink-800 text-paper-0" : ""}
                          ${isCurrent && !isActive ? "text-user-ink font-semibold" : ""}
                          ${!isActive && !isCurrent ? "text-ink-700 hover:bg-paper-100" : ""}
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
        <div className="relative z-10 px-[14px] pb-1 flex items-center gap-1">
          <span className="text-xs text-ink-500 italic" style={{ fontFamily: "var(--font-serif)" }}>
            {t("diary.filter")}
          </span>
          <span
            className="text-[10.5px] text-white px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: allTags.find((tg) => tg.id === filterTagId)?.color }}
          >
            {allTags.find((tg) => tg.id === filterTagId)?.name}
          </span>
          <button
            onClick={() => setFilterTagId(null)}
            className="text-ink-400 hover:text-ink-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Month header */}
      <div className="relative z-10 px-[18px] flex items-baseline justify-between">
        <span
          className="text-ink-700"
          style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontStyle: "italic" }}
        >
          {monthName} · {viewYear}
        </span>
        <span
          className="text-ink-400"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}
        >
          {visibleDays.length} {t("diary.entryCount", { defaultValue: "篇" })}
        </span>
      </div>
      <div className="relative z-10 h-px mx-[14px] mt-2 mb-1 bg-paper-200" />

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
        <div className="relative z-10 flex-1 overflow-y-auto px-2 pt-1 pb-2">
          {visibleDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const d = dayjs(day.date);
            const monthDay = d.format("MM / DD");

            return (
              <motion.button
                key={day.id}
                onClick={() => setSelectedDate(day.date)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtxMenu({ x: e.clientX, y: e.clientY, dayId: day.id, date: day.date });
                }}
                whileTap={{ scale: 0.98 }}
                className={`relative w-full text-left px-3 py-2.5 rounded-[10px] mb-0.5 transition-colors
                  ${isSelected ? "bg-paper-100" : "hover:bg-paper-100/70"}`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-ink-800" />
                )}
                <div className="flex items-baseline justify-between">
                  <span
                    className={isSelected ? "text-ink-900" : "text-ink-800"}
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      fontWeight: 500,
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {monthDay}
                  </span>
                  <span className="text-[10.5px] text-ink-500">
                    {d.format("ddd")}
                  </span>
                </div>
                {day.summary && (
                  <p className="text-[11.5px] text-ink-600 mt-0.5 leading-[1.55] line-clamp-2">
                    {day.summary}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-[5px] flex-wrap">
                  {day.word_count > 0 && (
                    <span className="text-[10px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                      {day.word_count}{t("diary.words")}
                    </span>
                  )}
                  {dayTags[day.id]?.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-[9.5px] px-[5px] rounded-full border leading-[14px]"
                      style={{
                        color: tag.color,
                        borderColor: tag.color,
                        borderWidth: 0.5,
                        opacity: 0.85,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </motion.button>
            );
          })}

          {visibleDays.length === 0 && diaryDays.length > 0 && (
            <p className="text-center text-ink-500 text-sm italic mt-8" style={{ fontFamily: "var(--font-serif)" }}>
              {t("diary.noTagResults")}
            </p>
          )}

          {visibleDays.length === 0 && diaryDays.length === 0 && (
            <p className="text-center text-ink-500 text-sm italic mt-8" style={{ fontFamily: "var(--font-serif)" }}>
              {t("diary.noEntries")}
            </p>
          )}
        </div>
      )}

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
              onClick={async () => {
                setCtxMenu(null);
                const path = await save({ defaultPath: `diary_${ctxMenu.date}.md` });
                if (!path) return;
                const content = await ipc.exportDiaryDay(ctxMenu.dayId, "document");
                await writeTextFile(path, content);
              }}
              className="w-full px-3 py-1.5 text-left text-sm text-ink-800 hover:bg-paper-100 transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              {t("diary.export")}
            </button>
            <button
              onClick={() => handleDeleteDay(ctxMenu.dayId, ctxMenu.date)}
              className="w-full px-3 py-1.5 text-left text-sm text-[#a66060] hover:bg-[#c9a0a0]/15 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
              {t("diary.deleteDay")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Companion footer */}
      <div className="relative z-10 px-4 py-2.5 border-t border-paper-200 flex items-center justify-between">
        <button
          onClick={goPrevMonth}
          className="p-1 rounded-lg hover:bg-paper-100 transition-colors text-ink-500"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>
        <p
          className="text-ink-500 text-[10.5px] italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {t("stats.companion", { days: companionDays })}
        </p>
        <button
          onClick={goNextMonth}
          className="p-1 rounded-lg hover:bg-paper-100 transition-colors text-ink-500"
        >
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
