import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "../../stores/uiStore";
import { useDiaryStore } from "../../stores/diaryStore";
import * as ipc from "../../lib/ipc";

export default function ContextMenu() {
  const { visible, x, y, messageId } = useUIStore((s) => s.contextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const setQuoteMessage = useUIStore((s) => s.setQuoteMessage);
  const setEditingMessage = useUIStore((s) => s.setEditingMessage);
  const deleteMessage = useDiaryStore((s) => s.deleteMessage);
  const messages = useDiaryStore((s) => s.messages);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
          {items.map((item) => (
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
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
