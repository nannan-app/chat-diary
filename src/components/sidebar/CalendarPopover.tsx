import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import * as ipc from "../../lib/ipc";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CalendarPopover({ visible, onClose }: Props) {
  const [viewDate, setViewDate] = useState(dayjs());
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(new Set());
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);

  useEffect(() => {
    if (visible) {
      ipc
        .getDiaryDates(viewDate.year(), viewDate.month() + 1)
        .then((dates) => setDatesWithEntries(new Set(dates)));
    }
  }, [visible, viewDate]);

  const daysInMonth = viewDate.daysInMonth();
  const firstDayOfWeek = viewDate.startOf("month").day(); // 0=Sun
  const today = dayjs().format("YYYY-MM-DD");

  const prevMonth = () => setViewDate(viewDate.subtract(1, "month"));
  const nextMonth = () => setViewDate(viewDate.add(1, "month"));

  const handleDayClick = (day: number) => {
    const date = viewDate.date(day).format("YYYY-MM-DD");
    setSelectedDate(date);
    onClose();
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <AnimatePresence>
      {visible && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-border p-3 mx-2"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg hover:bg-warm-100 flex items-center justify-center text-text-secondary text-sm"
              >
                ‹
              </button>
              <span className="text-sm font-medium text-text-primary">
                {viewDate.format("YYYY年M月")}
              </span>
              <button
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg hover:bg-warm-100 flex items-center justify-center text-text-secondary text-sm"
              >
                ›
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {weekDays.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-text-hint py-0.5"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells for days before the 1st */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="w-8 h-8" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = viewDate.date(day).format("YYYY-MM-DD");
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === today;
                const hasEntry = datesWithEntries.has(dateStr);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center text-xs
                                transition-colors relative
                      ${isSelected ? "bg-accent text-white" : ""}
                      ${isToday && !isSelected ? "text-accent font-bold" : ""}
                      ${!isSelected && !isToday ? "text-text-primary hover:bg-warm-100" : ""}
                    `}
                  >
                    {day}
                    {hasEntry && !isSelected && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
