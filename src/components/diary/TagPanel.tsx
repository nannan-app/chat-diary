import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as ipc from "../../lib/ipc";
import type { Tag } from "../../lib/types";
import { useDiaryStore } from "../../stores/diaryStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TagPanel({ visible, onClose }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [dayTagIds, setDayTagIds] = useState<Set<number>>(new Set());
  const [newTagName, setNewTagName] = useState("");
  const currentDay = useDiaryStore((s) => s.currentDay);

  useEffect(() => {
    if (visible) {
      ipc.getTags().then(setTags);
      if (currentDay) {
        ipc.getDayTags(currentDay.id).then((t) =>
          setDayTagIds(new Set(t.map((tag) => tag.id)))
        );
      }
    }
  }, [visible, currentDay]);

  const toggleTag = async (tagId: number) => {
    if (!currentDay) return;
    const newSet = new Set(dayTagIds);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    setDayTagIds(newSet);
    await ipc.setDayTags(currentDay.id, Array.from(newSet));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    const tag = await ipc.createTag(newTagName.trim());
    setTags([...tags, tag]);
    setNewTagName("");
  };

  const handleDeleteTag = async (tagId: number) => {
    await ipc.deleteTag(tagId);
    setTags(tags.filter((t) => t.id !== tagId));
    const newSet = new Set(dayTagIds);
    newSet.delete(tagId);
    setDayTagIds(newSet);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 py-2 border-t border-border/50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-hint">今日标签</span>
            <button onClick={onClose} className="text-xs text-text-hint hover:text-text-secondary">
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <motion.button
                key={tag.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleTag(tag.id)}
                className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all
                  ${dayTagIds.has(tag.id)
                    ? "text-white shadow-sm"
                    : "text-text-secondary bg-warm-100 hover:bg-warm-200"
                  }`}
                style={dayTagIds.has(tag.id) ? { backgroundColor: tag.color } : {}}
              >
                {tag.name}
                {!tag.is_system && dayTagIds.has(tag.id) && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag.id);
                    }}
                    className="ml-0.5 opacity-70 hover:opacity-100"
                  >
                    ×
                  </span>
                )}
              </motion.button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              placeholder="新标签..."
              className="flex-1 px-2 py-1 rounded-lg bg-white border border-border text-xs
                         placeholder:text-text-hint focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="px-2 py-1 rounded-lg bg-accent text-white text-xs
                         disabled:opacity-50 hover:bg-accent-hover transition-colors"
            >
              添加
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
