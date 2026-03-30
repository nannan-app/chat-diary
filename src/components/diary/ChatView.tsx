import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useDiaryStore } from "../../stores/diaryStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ImageDropZone from "../shared/ImageDropZone";
import SeasonalParticles from "../shared/SeasonalParticles";
import { DAILY_PROMPTS } from "../../lib/constants";

export default function ChatView() {
  const messages = useDiaryStore((s) => s.messages);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const loading = useDiaryStore((s) => s.loading);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isToday = selectedDate === dayjs().format("YYYY-MM-DD");
  const dailyPrompt =
    DAILY_PROMPTS[
      new Date(selectedDate).getDate() % DAILY_PROMPTS.length
    ];

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
      <div className="px-4 py-2 text-center border-b border-border/50">
        <span className="text-xs text-text-hint">
          {dayjs(selectedDate).format("YYYY年M月D日 dddd")}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-text-hint text-sm">加载中...</span>
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
      {isToday && <MessageInput />}
    </div>
    </ImageDropZone>
  );
}
