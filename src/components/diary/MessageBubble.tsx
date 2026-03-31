import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { FileText, ChevronDown, ChevronRight, Brain } from "lucide-react";
import type { Message } from "../../lib/types";
import { useUIStore } from "../../stores/uiStore";
import { SOURCE_ICONS } from "../../lib/constants";
import aiAvatar from "../../assets/icons/badges/ai_first.png";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const { t } = useTranslation();
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const highlightMessageId = useUIStore((s) => s.highlightMessageId);
  const isUser = message.kind !== "ai_reply";
  const time = dayjs(message.created_at).format("YYYY-MM-DD HH:mm");
  const sourceIcon = SOURCE_ICONS[message.source] || "";
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    if (highlightMessageId === message.id) {
      setHighlighted(true);
      const timer = setTimeout(() => {
        setHighlighted(false);
        useUIStore.getState().setHighlightMessageId(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [highlightMessageId, message.id]);

  const highlightClass = highlighted ? "bg-accent/15 rounded-xl transition-colors duration-500" : "";

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
        className={`flex justify-center my-2 ${highlightClass}`}
        data-message-id={message.id}
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
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="max-w-[200px]">
          <img
            src={url}
            alt=""
            className="rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              if (message.image_id) {
                useUIStore.getState().setViewingImageId(message.image_id);
              }
            }}
          />
          <div className={`flex items-center gap-1 mt-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 inline-block" />}
            <span className="text-xs text-text-hint">{time}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Article card
  if (message.kind === "article") {
    // Strip HTML tags for plain text preview
    const plainPreview = message.article_preview
      ? message.article_preview.replace(/<[^>]*>/g, "").trim()
      : "";
    const previewLine = plainPreview.slice(0, 80) + (plainPreview.length > 80 ? "..." : "");

    const handleArticleClick = () => {
      if (message.article_id) {
        useUIStore.getState().setViewingArticleId(message.article_id);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`flex justify-end mb-2 px-4 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="max-w-[70%]">
          <div
            onClick={handleArticleClick}
            className="bg-white rounded-2xl rounded-tr-md shadow-sm border border-border/50 px-4 py-3 cursor-pointer hover:shadow-md transition-shadow min-w-[240px]"
          >
            <div className="flex items-start gap-2.5 mb-2">
              <FileText className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <span className="text-sm font-medium text-text-primary line-clamp-2">{message.content}</span>
            </div>
            {previewLine && (
              <p className="text-xs text-text-secondary leading-relaxed mb-2 line-clamp-2 pl-7">
                {previewLine}
              </p>
            )}
            <div className="flex items-center gap-1 pl-7">
              <div className="w-full h-px bg-border/50" />
            </div>
            <p className="text-xs text-accent mt-1.5 pl-7">{t("diary.article.clickToView")}</p>
          </div>
          <div className="flex items-center gap-1 mt-0.5 justify-end">
            <span className="text-xs text-text-hint">{time}</span>
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 inline-block" />}
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

  // Parse AI reply content (may contain thinking + text as JSON)
  const aiContent = useMemo(() => {
    if (message.kind !== "ai_reply" || !message.content) return null;
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && typeof parsed.text === "string") {
        return { text: parsed.text, thinking: parsed.thinking || null };
      }
    } catch {
      // Legacy plain-text AI reply
    }
    return null;
  }, [message.kind, message.content]);

  const [showThinking, setShowThinking] = useState(false);

  // AI reply with thinking support
  if (aiContent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`flex justify-start mb-2 px-4 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="flex gap-2 max-w-[75%]">
        <img src={aiAvatar} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
        <div className="items-start flex flex-col flex-1 min-w-0">
          {quoteBlock}
          <div className="bg-white text-text-primary rounded-2xl rounded-tl-md shadow-sm overflow-hidden">
            {aiContent.thinking && (
              <div className="border-b border-border/30">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-hint hover:text-text-secondary transition-colors w-full"
                >
                  <Brain className="w-3 h-3" />
                  {t("diary.ai.thinking")}
                  {showThinking ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
                </button>
                <AnimatePresence>
                  {showThinking && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2 text-xs text-text-hint leading-relaxed whitespace-pre-wrap select-text max-h-40 overflow-y-auto">
                        {aiContent.thinking}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
              {aiContent.text}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-text-hint">{time}</span>
          </div>
        </div>
        </div>
      </motion.div>
    );
  }

  // Text message (and default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4 ${highlightClass}`}
      data-message-id={message.id}
      onContextMenu={handleContextMenu}
    >
      <div className={`max-w-[70%] ${isUser ? "items-end" : "items-start"} flex ${!isUser && message.kind === "ai_reply" ? "gap-2" : "flex-col"}`}>
        {!isUser && message.kind === "ai_reply" && (
          <img src={aiAvatar} alt="AI" className="w-7 h-7 rounded-full flex-shrink-0 mt-1" />
        )}
        <div className="flex flex-col">
          {quoteBlock}
          <div
            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words select-text
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
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3.5 h-3.5 inline-block" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
