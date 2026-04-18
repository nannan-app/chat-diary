import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen, Trash2, Download } from "lucide-react";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ImageDropZone from "../shared/ImageDropZone";
import SeasonalParticles from "../shared/SeasonalParticles";

import { getDailyPrompts } from "../../lib/constants";
import chatEmptyImg from "../../assets/illustrations/empty/chat_empty.png";
import * as ipc from "../../lib/ipc";

async function saveDiaryExport(diaryDayId: number, date: string, format: string) {
  const ext = format === "document" ? "md" : "txt";
  const path = await save({ defaultPath: `diary_${date}.${ext}` });
  if (!path) return;
  const content = await ipc.exportDiaryDay(diaryDayId, format);
  await writeTextFile(path, content);
}

function weekdayEpigraph(date: string): string {
  const d = dayjs(date);
  const weekday = d.format("dddd").toLowerCase();
  // English words for day number
  const wordMap: Record<number, string> = {
    1:"one", 2:"two", 3:"three", 4:"four", 5:"five", 6:"six", 7:"seven",
    8:"eight", 9:"nine", 10:"ten", 11:"eleven", 12:"twelve", 13:"thirteen",
    14:"fourteen", 15:"fifteen", 16:"sixteen", 17:"seventeen", 18:"eighteen",
    19:"nineteen", 20:"twenty", 21:"twenty-one", 22:"twenty-two",
    23:"twenty-three", 24:"twenty-four", 25:"twenty-five", 26:"twenty-six",
    27:"twenty-seven", 28:"twenty-eight", 29:"twenty-nine", 30:"thirty", 31:"thirty-one",
  };
  const dayWord = wordMap[d.date()] || String(d.date());
  return `${dayWord} · ${weekday}`;
}

export default function ChatView() {
  const { t } = useTranslation();
  const messages = useDiaryStore((s) => s.messages);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const currentDay = useDiaryStore((s) => s.currentDay);
  const deleteDiaryDay = useDiaryStore((s) => s.deleteDiaryDay);
  const loading = useDiaryStore((s) => s.loading);
  const secondaryPanelVisible = useUIStore((s) => s.secondaryPanelVisible);
  const toggleSecondaryPanel = useUIStore((s) => s.toggleSecondaryPanel);
  const highlightMessageId = useUIStore((s) => s.highlightMessageId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedScroll = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  const prevDate = useRef(selectedDate);
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const dateChanged = prevDate.current !== selectedDate;
      prevDate.current = selectedDate;
      const behavior: ScrollBehavior =
        !hasInitializedScroll.current || dateChanged ? "auto" : "smooth";

      if (highlightMessageId) {
        setTimeout(() => {
          const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        scrollToBottom(behavior);
        requestAnimationFrame(() => scrollToBottom("auto"));
        setTimeout(() => scrollToBottom("auto"), 120);
      }

      hasInitializedScroll.current = true;
    }
  }, [messages.length, selectedDate, loading, highlightMessageId]);

  const prompts = getDailyPrompts();
  const dailyPrompt = prompts[new Date(selectedDate).getDate() % prompts.length];

  const dateObj = dayjs(selectedDate);
  const yyyy = dateObj.year();
  const mm = String(dateObj.month() + 1).padStart(2, "0");
  const dd = String(dateObj.date()).padStart(2, "0");
  const weekday = dateObj.format("ddd");
  const epigraph = weekdayEpigraph(selectedDate);

  return (
    <ImageDropZone>
      <div className="h-full flex flex-col relative bg-paper-0 paper-grain">
        <SeasonalParticles />

        {/* Date header */}
        <div className="relative z-[2] px-5 py-2.5 flex items-center border-b border-paper-200/70 gap-3 flex-shrink-0">
          <button
            onClick={toggleSecondaryPanel}
            className="p-1 rounded-md hover:bg-paper-100 transition-colors text-ink-500"
            data-tooltip={secondaryPanelVisible ? t("panel.collapse", { defaultValue: "收起列表" }) : t("panel.expand", { defaultValue: "展开列表" })}
          >
            {secondaryPanelVisible
              ? <PanelLeftClose className="w-4 h-4" strokeWidth={1.6} />
              : <PanelLeftOpen className="w-4 h-4" strokeWidth={1.6} />}
          </button>

          <div className="flex-1 flex flex-col items-center">
            <span
              className="text-ink-900"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                letterSpacing: "0.02em",
                fontFeatureSettings: '"tnum"',
              }}
            >
              {yyyy} · {mm} · {dd}
            </span>
            <span
              className="text-ink-500 mt-[1px]"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              {weekday} · {dayjs(selectedDate).format("MMM D")}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {currentDay && messages.length > 0 && (
              <>
                <button
                  onClick={() => saveDiaryExport(currentDay.id, selectedDate, "document")}
                  className="p-1 rounded-md hover:bg-paper-100 transition-colors text-ink-500 hover:text-ink-700"
                  data-tooltip={t("diary.export.document")}
                >
                  <Download className="w-[14px] h-[14px]" strokeWidth={1.6} />
                </button>
                <button
                  onClick={async () => {
                    const yes = await ask(t("diary.deleteDay.confirm"), {
                      title: t("diary.deleteDay"),
                      kind: "warning",
                    });
                    if (yes) deleteDiaryDay();
                  }}
                  className="p-1 rounded-md hover:bg-[#c9a0a0]/15 transition-colors text-ink-500 hover:text-[#a66060]"
                  data-tooltip={t("diary.deleteDay")}
                >
                  <Trash2 className="w-[14px] h-[14px]" strokeWidth={1.6} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={scrollContainerRef}
          className="relative z-[2] flex-1 overflow-y-auto overflow-x-hidden py-4 paper-ruled"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-ink-500 text-sm italic" style={{ fontFamily: "var(--font-serif)" }}>
                {t("app.loading")}
              </span>
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 px-10"
            >
              {/* Epigraph */}
              <div className="w-full max-w-[360px]">
                <div className="ink-divider">
                  <span>{epigraph}</span>
                </div>
              </div>
              <img src={chatEmptyImg} alt="" className="w-[120px] h-20 opacity-80" />
              <p
                className="text-ink-500 text-center leading-relaxed"
                style={{ fontFamily: "var(--font-serif)", fontSize: 13, fontStyle: "italic" }}
              >
                『 {dailyPrompt} 』
              </p>
            </motion.div>
          ) : (
            <>
              {/* Day-opening epigraph */}
              <div className="text-center px-10 pb-4 max-w-[520px] mx-auto">
                <div className="ink-divider">
                  <span>{epigraph}</span>
                </div>
                <p
                  className="mt-2.5 text-ink-500"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: 12.5,
                  }}
                >
                  『 {dailyPrompt} 』
                </p>
              </div>

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              <div className="text-center px-10 pt-5 pb-1 max-w-[520px] mx-auto">
                <div className="ink-divider">
                  <span>— {t("diary.dayEnd", { defaultValue: "今日尚未结束" })} —</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Input */}
        <div className="relative z-[2]">
          <MessageInput />
        </div>
      </div>
    </ImageDropZone>
  );
}
