import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Feather } from "lucide-react";
import { useDiaryStore } from "../../stores/diaryStore";

export default function QuickCapture() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    if (e.key === "Enter" && !e.shiftKey) {
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
          className="fixed inset-0 z-[70] bg-[rgba(30,22,15,0.4)] flex items-start justify-center pt-[120px]"
          onClick={() => { setVisible(false); setText(""); }}
        >
          <motion.div
            initial={{ scale: 0.95, y: -12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[520px] bg-paper-0 rounded-[14px] border border-paper-200 shadow-2xl overflow-hidden paper-grain relative"
          >
            <div className="relative z-10 px-4 py-3 border-b border-paper-200 flex items-center gap-2.5">
              <Feather className="w-[14px] h-[14px] text-ink-600" strokeWidth={1.6} />
              <span
                className="text-ink-600 italic"
                style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
              >
                {t("quickCapture.title", { defaultValue: "快速记录 · 写入今天" })}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                ⌘⇧M
              </span>
            </div>
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("quickCapture.placeholder")}
              className="relative z-10 w-full border-none outline-none bg-transparent px-5 py-4 text-ink-900 resize-none"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 15,
                lineHeight: 1.75,
                minHeight: 90,
              }}
              rows={3}
            />
            <div className="relative z-10 px-5 pb-3 flex items-center justify-between">
              <p
                className="m-0 text-[11px] text-ink-400 italic"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("quickCapture.hint")}
              </p>
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className={`text-xs px-3 py-1 rounded-full transition-colors
                  ${text.trim() ? "bg-ink-800 text-paper-0" : "bg-paper-200 text-ink-400 cursor-not-allowed"}`}
              >
                {t("quickCapture.send")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
