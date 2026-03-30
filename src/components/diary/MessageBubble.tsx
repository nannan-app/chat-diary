import { motion } from "framer-motion";
import dayjs from "dayjs";
import type { Message } from "../../lib/types";
import { useUIStore } from "../../stores/uiStore";
import { SOURCE_ICONS } from "../../lib/constants";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const isUser = message.kind !== "ai_reply";
  const time = dayjs(message.created_at).format("HH:mm");
  const sourceIcon = SOURCE_ICONS[message.source] || "";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, message.id);
  };

  // Mood card
  if (message.kind === "mood") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="flex justify-center my-2"
      >
        <div className="bg-warm-100 rounded-2xl px-4 py-2 text-center">
          <span className="text-2xl">{message.mood}</span>
          <p className="text-xs text-text-hint mt-0.5">{time}</p>
        </div>
      </motion.div>
    );
  }

  // Image message
  if (message.kind === "image" && message.thumbnail) {
    const blob = new Blob([new Uint8Array(message.thumbnail)], {
      type: "image/jpeg",
    });
    const url = URL.createObjectURL(blob);

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4`}
        onContextMenu={handleContextMenu}
      >
        <div className="max-w-[200px]">
          <img
            src={url}
            alt=""
            className="rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
          />
          <div className={`flex items-center gap-1 mt-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
            {sourceIcon && <span className="text-xs">{sourceIcon}</span>}
            <span className="text-xs text-text-hint">{time}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Quote reference
  const quoteBlock = message.quote_content ? (
    <div className="bg-warm-100/50 rounded-lg px-2.5 py-1.5 mb-1 border-l-2 border-accent/40">
      <p className="text-xs text-text-secondary truncate">
        {message.quote_content}
      </p>
    </div>
  ) : null;

  // Text message (and default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4`}
      onContextMenu={handleContextMenu}
    >
      <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {quoteBlock}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
            ${
              isUser
                ? "bg-[#95ec69] text-text-primary rounded-tr-md"
                : "bg-white text-text-primary rounded-tl-md shadow-sm"
            }`}
        >
          {message.content}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-xs text-text-hint">{time}</span>
          {sourceIcon && <span className="text-xs">{sourceIcon}</span>}
        </div>
      </div>
    </motion.div>
  );
}
