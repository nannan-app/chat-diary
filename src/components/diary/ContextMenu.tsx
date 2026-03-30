import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../stores/uiStore";
import { useDiaryStore } from "../../stores/diaryStore";
import * as ipc from "../../lib/ipc";
import type { Tag } from "../../lib/types";

export default function ContextMenu() {
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

  useEffect(() => {
    if (!visible) {
      setShowTagSelector(false);
    }
    const handleClick = () => hideContextMenu();
    if (visible) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [visible, hideContextMenu]);

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
    { label: "引用", icon: "💬", action: handleQuote },
    { label: "编辑", icon: "✏️", action: handleEdit },
    {
      label: "收藏", icon: "⭐", action: async () => {
        if (message) {
          const currentDay = useDiaryStore.getState().currentDay;
          await ipc.addFavorite({
            message_id: message.id,
            content_preview: message.content || message.mood || "[图片]",
            source_date: currentDay?.date || "",
          });
        }
        hideContextMenu();
      }
    },
    { label: "标签", icon: "🏷️", action: handleTagClick },
    { label: "删除", icon: "🗑️", action: handleDelete, danger: true },
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
          style={{ left: x, top: y }}
          className="fixed z-50 bg-white rounded-xl shadow-lg border border-border py-1 min-w-[120px]"
        >
          {!showTagSelector ? (
            items.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2
                            hover:bg-warm-100 transition-colors
                            ${item.danger ? "text-red-400" : "text-text-primary"}`}
              >
                <span className="text-xs">{item.icon}</span>
                {item.label}
              </button>
            ))
          ) : (
            <div className="px-2 py-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs text-text-hint mb-1 px-1">选择标签</div>
              {allTags.length === 0 ? (
                <p className="text-xs text-text-hint px-1 py-1">暂无标签，请先在日记页创建</p>
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
                完成
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
