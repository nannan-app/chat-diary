import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Quote, Pencil, Star, Tag as TagIcon, Trash2, Download } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../stores/uiStore";
import { useDiaryStore } from "../../stores/diaryStore";
import * as ipc from "../../lib/ipc";
import type { Tag } from "../../lib/types";

export default function ContextMenu() {
  const { t } = useTranslation();
  const { visible, x, y, messageId } = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const setQuoteMessage = useUIStore((s) => s.setQuoteMessage);
  const setEditingMessage = useUIStore((s) => s.setEditingMessage);
  const deleteMessage = useDiaryStore((s) => s.deleteMessage);
  const messages = useDiaryStore((s) => s.messages);
  const ref = useRef<HTMLDivElement>(null);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [messageTags, setMessageTags] = useState<number[]>([]);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible) {
      setShowTagSelector(false);
      return;
    }
    // Adjust position: open to the left of cursor, stay within viewport
    const menuWidth = 140;
    const menuHeight = 220;
    let adjX = x - menuWidth; // Open to the left
    let adjY = y;
    if (adjX < 8) adjX = 8;
    if (adjY + menuHeight > window.innerHeight) adjY = window.innerHeight - menuHeight - 8;
    if (adjY < 8) adjY = 8;
    setAdjustedPos({ x: adjX, y: adjY });

    const handleClick = () => hideContextMenu();
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [visible, x, y, hideContextMenu]);

  const message = messages.find((m) => m.id === messageId);

  const handleEdit = () => {
    if (message?.content) {
      setEditingMessage({ id: message.id, content: message.content });
    }
    hideContextMenu();
  };

  const handleQuote = () => {
    if (message?.content) {
      setQuoteMessage({ id: message.id, content: message.content });
    }
    hideContextMenu();
  };

  const handleDelete = () => {
    if (messageId) deleteMessage(messageId);
    hideContextMenu();
  };

  const handleTagClick = async () => {
    if (!messageId) return;
    try {
      const [tags, msgTags] = await Promise.all([
        ipc.getTags(),
        ipc.getMessageTags(messageId),
      ]);
      setAllTags(tags);
      setMessageTags(msgTags.map((t) => t.id));
      setShowTagSelector(true);
    } catch (e) {
      console.log("Failed to load tags:", e);
    }
  };

  const toggleTag = async (tagId: number) => {
    if (!messageId) return;
    const newTags = messageTags.includes(tagId)
      ? messageTags.filter((id) => id !== tagId)
      : [...messageTags, tagId];
    setMessageTags(newTags);
    await ipc.setMessageTags(messageId, newTags);
  };

  const items = [
    { label: t("menu.quote"), icon: Quote, action: handleQuote },
    { label: t("menu.edit"), icon: Pencil, action: handleEdit },
    {
      label: t("menu.favorite"), icon: Star, action: async () => {
        if (message) {
          const currentDay = useDiaryStore.getState().currentDay;
          await ipc.addFavorite({
            messageId: message.id,
            contentPreview: message.content || message.mood || t("diary.image.photo"),
            sourceDate: currentDay?.date || "",
          });
        }
        hideContextMenu();
      }
    },
    { label: t("menu.tag"), icon: TagIcon, action: handleTagClick, keepOpen: true },
    // Export article as Markdown (only for article messages)
    ...(message?.kind === "article" && message?.article_id ? [{
      label: t("article.export"), icon: Download, action: async () => {
        hideContextMenu();
        const title = message.content || "article";
        const safeName = title.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 50);
        const path = await save({ defaultPath: `${safeName}.md` });
        if (!path) return;
        const content = await ipc.exportArticle(message.article_id!);
        await writeTextFile(path, content);
      }
    }] : []),
    { label: t("menu.delete"), icon: Trash2, action: handleDelete, danger: true },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.12 }}
          style={{ left: adjustedPos.x, top: adjustedPos.y }}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-border py-1 min-w-[120px]"
        >
          {!showTagSelector ? (
            items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  if ((item as any).keepOpen) e.stopPropagation();
                  item.action();
                }}
                className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2
                            hover:bg-warm-100 transition-colors
                            ${item.danger ? "text-red-400" : "text-text-primary"}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))
          ) : (
            <div className="px-2 py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs text-text-hint mb-1 px-1">{t("menu.selectTag")}</div>
              {allTags.length === 0 ? (
                <p className="text-xs text-text-hint px-1 py-1">{t("menu.noTags")}</p>
              ) : (
                allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="w-full px-2 py-1 text-left text-sm flex items-center gap-2 hover:bg-warm-100 rounded transition-colors"
                  >
                    <span className={`w-4 h-4 rounded border text-xs flex items-center justify-center ${messageTags.includes(tag.id) ? "bg-accent border-accent text-white" : "border-border"}`}>
                      {messageTags.includes(tag.id) ? "✓" : ""}
                    </span>
                    {tag.name}
                  </button>
                ))
              )}
              <button
                onClick={() => { setShowTagSelector(false); hideContextMenu(); }}
                className="w-full mt-1 px-2 py-1 text-xs text-accent hover:bg-warm-100 rounded text-center"
              >
                {t("menu.done")}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
