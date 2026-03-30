import { useState, useRef, useCallback } from "react";
import { Camera, SmilePlus, Bot, Tag, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { useDiaryStore } from "../../stores/diaryStore";
import { useUIStore } from "../../stores/uiStore";
import { MOODS } from "../../lib/constants";
import TagPanel from "./TagPanel";
import MarkdownEditor from "../editor/MarkdownEditor";
import * as ipc from "../../lib/ipc";

export default function MessageInput() {
  const [text, setText] = useState("");
  const [showMoodPanel, setShowMoodPanel] = useState(false);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [useOriginal, _setUseOriginal] = useState(false);
  const sendTextMessage = useDiaryStore((s) => s.sendTextMessage);
  const sendMoodMessage = useDiaryStore((s) => s.sendMoodMessage);
  const uploadImageFn = useDiaryStore((s) => s.uploadImage);
  const quoteMessage = useUIStore((s) => s.quoteMessage);
  const setQuoteMessage = useUIStore((s) => s.setQuoteMessage);
  const editingMessage = useUIStore((s) => s.editingMessage);
  const setEditingMessage = useUIStore((s) => s.setEditingMessage);
  const editMessage = useDiaryStore((s) => s.editMessage);

  const wordCount = useDiaryStore((s) =>
    s.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0)
  );

  const handleTyping = useCallback(() => {
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 2000);
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      await editMessage(editingMessage.id, trimmed);
      setEditingMessage(null);
    } else {
      await sendTextMessage(trimmed);
    }

    setText("");
    setQuoteMessage(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMood = (emoji: string) => {
    sendMoodMessage(emoji);
    setShowMoodPanel(false);
  };

  const handleAiSummarize = async () => {
    const currentDay = useDiaryStore.getState().currentDay;
    if (!currentDay) return;
    try {
      const settings = await ipc.getAllSettings();
      const settingsMap: Record<string, string> = {};
      for (const [k, v] of settings) settingsMap[k] = v;

      const provider = settingsMap.ai_provider || "builtin";
      const apiKey = settingsMap.ai_api_key || "";
      const personality = settingsMap.ai_personality || "你是一个温暖的朋友，善于倾听和给出温暖的反馈";

      const message = await ipc.aiSummarize({
        diary_day_id: currentDay.id,
        api_provider: provider,
        api_key: apiKey,
        personality,
      });

      useDiaryStore.setState((state) => ({
        messages: [...state.messages, message],
      }));
    } catch (e) {
      console.log("AI summarize error:", e);
    }
  };

  const handleImageUpload = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });
    if (!selected) return;
    const bytes = await readFile(selected);
    await uploadImageFn(bytes, !useOriginal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // TODO: handle image drop from desktop
  };

  return (
    <div
      className="border-t border-border bg-input-bg"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Quote preview */}
      <AnimatePresence>
        {quoteMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-2"
          >
            <div className="flex items-center gap-2 bg-warm-100 rounded-lg px-3 py-1.5">
              <div className="flex-1 text-xs text-text-secondary truncate border-l-2 border-accent/40 pl-2">
                {quoteMessage.content}
              </div>
              <button
                onClick={() => setQuoteMessage(null)}
                className="text-text-hint hover:text-text-secondary text-sm"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editing indicator */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-2"
          >
            <div className="flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-1.5">
              <span className="text-xs text-accent">正在编辑</span>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setText("");
                }}
                className="text-text-hint hover:text-text-secondary text-sm ml-auto"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 pt-2">
        <button
          onClick={handleImageUpload}
          className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
          title="插入图片"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowMoodPanel(!showMoodPanel)}
          className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
          title="心情"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
        <button
          onClick={handleAiSummarize}
          className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
          title="AI 总结与反馈"
        >
          <Bot className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setShowTagPanel(!showTagPanel); setShowMoodPanel(false); }}
          className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
          title="标签"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowEditor(true)}
          className="p-1.5 rounded-lg hover:bg-warm-100 transition-colors text-sm"
          title="长文"
        >
          <PenLine className="w-4 h-4" />
        </button>

        <div className="flex-1" />
        <span className="text-xs text-text-hint">{wordCount} 字</span>
      </div>

      {/* Mood panel */}
      <AnimatePresence>
        {showMoodPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2"
          >
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <motion.button
                  key={m.emoji}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMood(m.emoji)}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-warm-100 transition-colors"
                >
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-xs text-text-hint">{m.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag panel */}
      <TagPanel visible={showTagPanel} onClose={() => setShowTagPanel(false)} />

      {/* Input area */}
      <div className="px-3 pb-3 pt-1">
        <div
          className={`flex items-end gap-2 bg-white rounded-xl border border-border px-3 py-2
                      transition-all duration-300 ${isTyping ? "input-breathing" : ""}`}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="写点什么..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-text-primary
                       placeholder:text-text-hint focus:outline-none leading-relaxed
                       max-h-32 overflow-y-auto"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="text-accent disabled:text-text-hint transition-colors text-sm
                       hover:text-accent-hover"
          >
            发送
          </button>
        </div>
      </div>

      {/* Markdown editor modal */}
      {showEditor && (
        <MarkdownEditor
          onSave={async (title, content) => {
            const currentDay = useDiaryStore.getState().currentDay;
            if (currentDay) {
              const msg = await ipc.createArticle(currentDay.id, title, content);
              useDiaryStore.setState((s) => ({ messages: [...s.messages, msg] }));
            }
            setShowEditor(false);
          }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
