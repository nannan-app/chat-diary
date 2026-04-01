import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as ipc from "../../lib/ipc";

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hideWindow = async () => {
    try {
      const win = getCurrentWindow();
      console.log("[quick-capture] hideWindow called, window label:", win.label);
      await win.hide();
      console.log("[quick-capture] hide() succeeded");
    } catch (e) {
      console.error("[quick-capture] hide() failed:", e);
    }
  };

  // Debug: log mount and window info
  useEffect(() => {
    const win = getCurrentWindow();
    console.log("[quick-capture] Component mounted, window label:", win.label);
    console.log("[quick-capture] window.location:", window.location.href);
    inputRef.current?.focus();
  }, []);

  // Global Esc key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      console.log("[quick-capture] keydown:", e.key, "code:", e.code);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        console.log("[quick-capture] Esc detected, calling hideWindow");
        hideWindow();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    console.log("[quick-capture] keydown listener registered");
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  // Hide on window blur via Tauri event
  useEffect(() => {
    const win = getCurrentWindow();
    console.log("[quick-capture] Setting up onFocusChanged listener");
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      console.log("[quick-capture] onFocusChanged:", focused);
      if (!focused) {
        console.log("[quick-capture] Lost focus, calling hideWindow");
        hideWindow();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Re-focus input when window regains focus
  useEffect(() => {
    const win = getCurrentWindow();
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
      await ipc.quickCaptureSend(trimmed);
      setText("");
      hideWindow();
    } catch (e) {
      console.log("[quick-capture] submit error:", e);
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
