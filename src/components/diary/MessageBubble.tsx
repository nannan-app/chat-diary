import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import dayjs from "dayjs";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Brain,
  Sparkles,
  Feather,
  File,
  FileAudio,
  FileVideo,
  Download,
} from "lucide-react";
import type { Message } from "../../lib/types";
import { useUIStore } from "../../stores/uiStore";
import { SOURCE_ICONS } from "../../lib/constants";
import LinkPreview, { extractUrls, renderTextWithLinks } from "./LinkPreview";
import { MOOD_ICONS } from "../../assets/moods";

interface Props {
  message: Message;
}

const serifStyle: React.CSSProperties = { fontFamily: "var(--font-serif)" };
const monoStyle: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function QuoteBlock({ content }: { content: string }) {
  const shown = content.length > 60 ? content.slice(0, 60) + "…" : content;
  return (
    <div
      className="text-[11px] text-ink-500 italic border-l-2 border-paper-300 pl-2 mb-1.5"
      style={serifStyle}
    >
      „ {shown}
    </div>
  );
}

export default function MessageBubble({ message }: Props) {
  const { t } = useTranslation();
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const highlightMessageId = useUIStore((s) => s.highlightMessageId);
  const isUser = message.kind !== "ai_reply";
  const time = dayjs(message.created_at).format("YYYY-MM-DD HH:mm");
  const timeShort = dayjs(message.created_at).format("HH:mm");
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

  const highlightClass = highlighted ? "bg-paper-100/70 rounded-[10px] transition-colors duration-500" : "";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, message.id);
  };

  // ── Mood card ──
  if (message.kind === "mood") {
    const moodSrc = message.mood && MOOD_ICONS[message.mood];
    return (
      <div
        className={`flex justify-end my-1.5 px-6 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="bubble-pop flex items-center gap-2.5 border border-paper-300 rounded-[4px] px-4 py-2.5">
          {moodSrc ? (
            <img src={moodSrc} alt={message.mood || ""} className="w-[26px] h-[26px]" />
          ) : (
            <span className="text-2xl">{message.mood}</span>
          )}
          <div className="flex flex-col gap-[1px]">
            <span
              className="text-[10.5px] text-ink-500"
              style={{ ...serifStyle, letterSpacing: "0.15em", textTransform: "uppercase" }}
            >
              mood{message.mood ? ` · ${message.mood}` : ""}
            </span>
            <span className="text-[10px] text-ink-400" style={monoStyle}>
              {timeShort}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Image ──
  if (message.kind === "image" && message.thumbnail) {
    const blob = new Blob([new Uint8Array(message.thumbnail)], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);

    return (
      <div
        className={`flex justify-end mb-2 px-6 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="bubble-pop max-w-[280px]">
          <div className="border border-user-stroke rounded-[4px] p-1.5 bg-paper-0">
            <img
              src={url}
              alt=""
              className="w-full rounded-[2px] cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => {
                if (message.image_id) {
                  useUIStore.getState().setViewingImageId(message.image_id);
                }
              }}
            />
            {message.content && (
              <div
                className="text-[11px] text-ink-600 italic px-1 pt-1.5"
                style={serifStyle}
              >
                — {message.content}
              </div>
            )}
          </div>
          <div
            className="flex items-center gap-1 justify-end mt-1 pr-0.5 text-[10px] text-ink-400"
            style={monoStyle}
          >
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3 h-3 opacity-70" />}
            <span>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── File ──
  if (message.kind === "file" && message.file_id) {
    const fileName = message.file_name || message.content || t("diary.file.unknown");
    const fileMime = message.file_mime_type || "";
    const fileSize = message.file_size;

    let FileIcon = File;
    if (fileMime.startsWith("audio/")) FileIcon = FileAudio;
    else if (fileMime.startsWith("video/")) FileIcon = FileVideo;
    else if (fileMime.includes("pdf") || fileMime.includes("document") || fileMime.includes("text"))
      FileIcon = FileText;

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    };

    const handleDownload = async () => {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        const { getFileData } = await import("../../lib/ipc");

        const savePath = await save({ defaultPath: fileName });
        if (!savePath) return;

        const data = await getFileData(message.file_id!);
        await writeFile(savePath, new Uint8Array(data));
      } catch (e) {
        console.log("File download error:", e);
      }
    };

    return (
      <div
        className={`flex justify-end mb-2 px-6 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="bubble-pop max-w-[70%]">
          <div
            onClick={handleDownload}
            className="min-w-[220px] flex items-center gap-3 border border-user-stroke rounded-[4px] bg-paper-0 px-3.5 py-3 cursor-pointer hover:bg-paper-50 transition-colors"
          >
            <div
              className="w-8 h-9 border border-paper-300 rounded-[3px] flex items-center justify-center flex-shrink-0 text-ink-600"
              style={monoStyle}
            >
              <FileIcon className="w-4 h-4" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13.5px] text-ink-900 truncate"
                style={serifStyle}
              >
                {fileName}
              </p>
              <p className="text-[10.5px] text-ink-500 mt-0.5" style={monoStyle}>
                {fileSize ? formatSize(fileSize) : ""}
              </p>
            </div>
            <Download className="w-4 h-4 text-ink-500 flex-shrink-0" strokeWidth={1.6} />
          </div>
          <div
            className="flex items-center gap-1 justify-end mt-1 text-[10px] text-ink-400"
            style={monoStyle}
          >
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3 h-3 opacity-70" />}
            <span>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Article ──
  if (message.kind === "article") {
    const plainPreview = message.article_preview
      ? message.article_preview.replace(/<[^>]*>/g, "").trim()
      : "";
    const previewLine = plainPreview.slice(0, 180) + (plainPreview.length > 180 ? "…" : "");
    const wordCount = plainPreview.length;

    const handleArticleClick = () => {
      if (message.article_id) {
        useUIStore.getState().setViewingArticleId(message.article_id);
      }
    };

    return (
      <div
        className={`flex justify-end mb-2 px-6 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="bubble-pop max-w-[440px] w-full">
          <div
            onClick={handleArticleClick}
            className="border border-user-stroke rounded-[4px] bg-paper-0 px-4 py-3.5 cursor-pointer hover:bg-paper-50/70 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Feather className="w-3 h-3 text-user-ink" strokeWidth={1.8} />
              <span
                className="text-[10px] text-user-ink font-semibold"
                style={{ letterSpacing: "0.15em", textTransform: "uppercase" }}
              >
                {t("article.longformLabel", { defaultValue: "长文" })}
              </span>
              <div className="flex-1 h-px bg-paper-200" />
              {wordCount > 0 && (
                <span className="text-[10px] text-ink-400" style={monoStyle}>
                  {wordCount}{t("diary.words")}
                </span>
              )}
            </div>
            <h3
              className="text-[18px] text-ink-900 m-0 mb-1.5"
              style={{ ...serifStyle, fontWeight: 500 }}
            >
              {message.content}
            </h3>
            {previewLine && (
              <p
                className="text-[12.5px] text-ink-700 m-0 leading-[1.75] line-clamp-3"
                style={serifStyle}
              >
                {previewLine}
              </p>
            )}
            <div className="mt-2.5 pt-2 border-t border-dashed border-paper-300 flex items-center justify-between">
              <span className="text-[11px] text-ink-500 italic" style={serifStyle}>
                {t("diary.article.clickToView", { defaultValue: "点击展开全文 →" })}
              </span>
            </div>
          </div>
          <div
            className="flex items-center gap-1 justify-end mt-1 text-[10px] text-ink-400"
            style={monoStyle}
          >
            {sourceIcon && <img src={sourceIcon} alt="" className="w-3 h-3 opacity-70" />}
            <span>{time}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── AI reply with thinking support ──
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

  if (message.kind === "ai_reply") {
    const text = aiContent?.text ?? message.content ?? "";
    const thinking = aiContent?.thinking;
    return (
      <div
        className={`flex justify-start mb-2 px-6 ${highlightClass}`}
        data-message-id={message.id}
        onContextMenu={handleContextMenu}
      >
        <div className="bubble-pop max-w-[75%] flex flex-col items-start">
          <div
            className="text-[10.5px] text-ink-500 italic mb-1"
            style={{ ...serifStyle, letterSpacing: "0.05em" }}
          >
            <Sparkles className="inline-block w-3 h-3 mr-1 align-[-2px]" strokeWidth={1.6} />
            {t("app.name", { defaultValue: "喃喃" })} · AI
          </div>
          {message.quote_content && <QuoteBlock content={message.quote_content} />}
          <div className="border border-ai-stroke rounded-[4px] bg-transparent overflow-hidden text-ai-ink">
            {thinking && (
              <div className="border-b border-paper-200">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700 transition-colors w-full"
                >
                  <Brain className="w-3 h-3" strokeWidth={1.6} />
                  <span style={serifStyle} className="italic">
                    {t("diary.ai.thinking")}
                  </span>
                  {showThinking ? (
                    <ChevronDown className="w-3 h-3 ml-auto" />
                  ) : (
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  )}
                </button>
                <AnimatePresence>
                  {showThinking && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-2 text-[11px] text-ink-500 leading-relaxed whitespace-pre-wrap select-text max-h-40 overflow-y-auto">
                        {thinking}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div
              className="px-3.5 py-2.5 text-[13.5px] leading-[1.75] whitespace-pre-wrap break-words select-text"
            >
              {text}
            </div>
          </div>
          <div
            className="mt-1 text-[10px] text-ink-400"
            style={monoStyle}
          >
            {time}
          </div>
        </div>
      </div>
    );
  }

  // ── Text message (default) ──
  return (
    <div
      className={`flex mb-2 px-6 ${isUser ? "justify-end" : "justify-start"} ${highlightClass}`}
      data-message-id={message.id}
      onContextMenu={handleContextMenu}
    >
      <div className={`bubble-pop max-w-[70%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {message.quote_content && <QuoteBlock content={message.quote_content} />}
        <div
          className={`border rounded-[4px] px-3.5 py-2 text-[13.5px] leading-[1.75] whitespace-pre-wrap break-words select-text
            ${isUser ? "border-user-stroke text-user-ink" : "border-ai-stroke text-ai-ink"}`}
        >
          {message.kind === "text" && message.content
            ? renderTextWithLinks(message.content)
            : message.content}
        </div>
        {message.kind === "text" && message.content &&
          extractUrls(message.content).map((url) => <LinkPreview key={url} url={url} />)}
        <div
          className={`mt-1 flex items-center gap-1 text-[10px] text-ink-400 ${isUser ? "flex-row-reverse" : ""}`}
          style={monoStyle}
        >
          <span>{time}</span>
          {sourceIcon && <img src={sourceIcon} alt="" className="w-3 h-3 opacity-70" />}
        </div>
      </div>
    </div>
  );
}
