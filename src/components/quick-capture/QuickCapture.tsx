import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as ipc from "../../lib/ipc";

const win = getCurrentWindow();

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hideWindow = useCallback(() => {
    win.hide();
  }, []);

  // Global Esc key handler on document (not React) for reliability
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hideWindow();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [hideWindow]);

  // Hide on window blur via Tauri event
  useEffect(() => {
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (!focused) hideWindow();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [hideWindow]);

  // Auto-focus input, and re-focus when window is shown again
  useEffect(() => {
    inputRef.current?.focus();
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const day = await ipc.getOrCreateToday();
      await ipc.sendMessage({ diaryDayId: day.id, kind: "text", content: trimmed, source: "quick_capture" });
      setText("");
      hideWindow();
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
    }
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center"
      style={{ background: "transparent" }}
    >
      <div className="w-full mx-3">
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
          autoFocus
        />
      </div>
    </div>
  );
}
