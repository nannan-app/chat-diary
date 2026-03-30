import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDiaryStore } from "../../stores/diaryStore";

export default function QuickCapture() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sendTextMessage = useDiaryStore((s) => s.sendTextMessage);
  const loadToday = useDiaryStore((s) => s.loadToday);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "m") {
        e.preventDefault();
        setVisible(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;
    await loadToday();
    await sendTextMessage(text.trim());
    setText("");
    setVisible(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setVisible(false);
      setText("");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/20 flex items-start justify-center pt-[20%]"
          onClick={() => { setVisible(false); setText(""); }}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-lg">⚡</span>
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="快速记录..."
                className="flex-1 text-sm text-text-primary placeholder:text-text-hint
                           focus:outline-none bg-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="text-accent text-sm disabled:text-text-hint"
              >
                记录
              </button>
            </div>
            <div className="px-4 pb-2">
              <p className="text-xs text-text-hint">
                按 Enter 记录到今天的日记，Esc 关闭
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
