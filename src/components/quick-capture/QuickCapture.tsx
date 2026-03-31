import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as ipc from "../../lib/ipc";

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Global Esc listener for the whole window
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        getCurrentWindow().hide();
      }
    };
    const onBlur = () => getCurrentWindow().hide();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const day = await ipc.getOrCreateToday();
      await ipc.sendMessage({ diaryDayId: day.id, kind: "text", content: trimmed, source: "quick_capture" });
      setText("");
      getCurrentWindow().hide();
    } catch (e) {
      console.log("Quick capture error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      getCurrentWindow().hide();
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent"
         data-tauri-drag-region>
      <div className="w-full mx-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记录一个想法... (Enter 保存, Esc 关闭)"
          className="w-full px-4 py-3 rounded-xl bg-white/95 backdrop-blur-xl border border-border
                     shadow-2xl text-sm text-text-primary placeholder:text-text-hint
                     focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>
    </div>
  );
}
