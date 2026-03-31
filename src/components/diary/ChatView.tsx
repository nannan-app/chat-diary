import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ImageDropZone from "../shared/ImageDropZone";
import SeasonalParticles from "../shared/SeasonalParticles";
import { getDailyPrompts } from "../../lib/constants";

export default function ChatView() {
  const { t } = useTranslation();
  const messages = useDiaryStore((s) => s.messages);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const loading = useDiaryStore((s) => s.loading);
  const secondaryPanelVisible = useUIStore((s) => s.secondaryPanelVisible);
  const toggleSecondaryPanel = useUIStore((s) => s.toggleSecondaryPanel);
  const highlightMessageId = useUIStore((s) => s.highlightMessageId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages or date change
  const prevDate = useRef(selectedDate);
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const dateChanged = prevDate.current !== selectedDate;
      prevDate.current = selectedDate;
      // If jumping to a specific message, scroll to it instead of bottom
      if (highlightMessageId) {
        setTimeout(() => {
          const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      } else {
        bottomRef.current?.scrollIntoView({ behavior: dateChanged ? "instant" : "smooth" });
      }
    }
  }, [messages.length, selectedDate, loading, highlightMessageId]);

  const prompts = getDailyPrompts();
  const dailyPrompt = prompts[new Date(selectedDate).getDate() % prompts.length];

  // Get time-of-day ambient class
  const hour = new Date().getHours();
  let ambientClass = "bg-main-bg"; // default
  if (hour >= 6 && hour < 11) ambientClass = "bg-gradient-to-b from-[#fffbf0] to-main-bg";
  else if (hour >= 11 && hour < 17) ambientClass = "bg-main-bg";
  else if (hour >= 17 && hour < 20) ambientClass = "bg-gradient-to-b from-[#fff5ee] to-main-bg";
  else ambientClass = "bg-gradient-to-b from-[#f0f0f8] to-main-bg";

  return (
    <ImageDropZone>
    <div className={`h-full flex flex-col ${ambientClass} relative`}>
      <SeasonalParticles />
      {/* Date header */}
      <div className="px-4 py-2 flex items-center border-b border-border/50">
        <button
          onClick={toggleSecondaryPanel}
          className="p-1 rounded-lg hover:bg-warm-100 transition-colors text-text-hint"
        >
          {secondaryPanelVisible
            ? <PanelLeftClose className="w-4 h-4" />
            : <PanelLeftOpen className="w-4 h-4" />}
        </button>
        <span className="flex-1 text-center text-xs text-text-hint">
          {dayjs(selectedDate).format(t("diary.dateFormat"))}
        </span>
        <div className="w-6" />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-hint text-sm">{t("app.loading")}</span>
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4 px-8"
          >
            <div className="text-6xl">🐱</div>
            <p className="text-text-hint text-sm text-center leading-relaxed">
              {dailyPrompt}
            </p>
          </motion.div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput />
    </div>
    </ImageDropZone>
  );
}
