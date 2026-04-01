import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import dayjs from "dayjs";
import { useUIStore } from "../../stores/uiStore";
import { useDiaryStore } from "../../stores/diaryStore";
import IconNavBar from "./IconNavBar";
import DiaryList from "../sidebar/DiaryList";
import ChatView from "../diary/ChatView";
import ContextMenu from "../diary/ContextMenu";
import SettingsPage from "../settings/SettingsPage";
import FavoritesView from "../favorites/FavoritesView";
import GalleryView from "../gallery/GalleryView";
import BadgeWall from "../achievements/BadgeWall";
import LibraryView from "../library/LibraryView";
import Celebration from "../shared/Celebration";
import QuickCapture from "../shared/QuickCapture";
import ArticleViewer from "../editor/ArticleViewer";
import ImageLightbox from "../diary/ImageLightbox";

export default function AppShell() {
  const activeNav = useUIStore((s) => s.activeNav);
  const secondaryPanelVisible = useUIStore((s) => s.secondaryPanelVisible);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const showSettings = useUIStore((s) => s.showSettings);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const loadToday = useDiaryStore((s) => s.loadToday);
  const selectedDate = useDiaryStore((s) => s.selectedDate);
  const setSelectedDate = useDiaryStore((s) => s.setSelectedDate);

  useEffect(() => {
    loadToday();
    // Apply saved quick capture shortcut on login
    import("../../lib/ipc").then(async (ipc) => {
      const pairs = await ipc.getAllSettings();
      const map: Record<string, string> = {};
      for (const [k, v] of pairs) map[k] = v;
      if (map.quick_capture_shortcut) {
        ipc.updateQuickCaptureShortcut(map.quick_capture_shortcut);
      }
    });
  }, [loadToday]);

  // Refresh messages when quick-capture sends a new message
  useEffect(() => {
    const unlisten = listen("quick-capture-sent", () => {
      const { selectedDate, loadDay, loadToday } = useDiaryStore.getState();
      const today = dayjs().format("YYYY-MM-DD");
      if (selectedDate === today) {
        loadToday();
      } else {
        loadDay(selectedDate);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+T: go to today
      if (e.key === "t") {
        e.preventDefault();
        const today = dayjs().format("YYYY-MM-DD");
        setSelectedDate(today);
        setActiveNav("diary");
      }

      // Cmd+Left: previous day
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prev = dayjs(selectedDate).subtract(1, "day").format("YYYY-MM-DD");
        setSelectedDate(prev);
      }

      // Cmd+Right: next day
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const next = dayjs(selectedDate).add(1, "day").format("YYYY-MM-DD");
        setSelectedDate(next);
      }

      // Cmd+= / Cmd+-: zoom
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        document.documentElement.style.fontSize =
          parseFloat(getComputedStyle(document.documentElement).fontSize) + 1 + "px";
      }
      if (e.key === "-") {
        e.preventDefault();
        const current = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (current > 10) {
          document.documentElement.style.fontSize = current - 1 + "px";
        }
      }
    },
    [selectedDate, setSelectedDate, setActiveNav]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Also handle Esc to close context menu
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useUIStore.getState().hideContextMenu();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left icon nav bar */}
      <IconNavBar />

      {/* Secondary panel */}
      <AnimatePresence>
        {secondaryPanelVisible && activeNav === "diary" && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border overflow-hidden flex-shrink-0"
          >
            <DiaryList />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 min-w-0">
        {activeNav === "diary" && <ChatView />}
        {activeNav === "gallery" && <GalleryView />}
        {activeNav === "library" && <LibraryView />}
        {activeNav === "favorites" && <FavoritesView />}
        {activeNav === "achievements" && <BadgeWall />}
      </div>

      {/* Context menu overlay */}
      <ContextMenu />

      {/* Quick capture */}
      <QuickCapture />

      {/* Celebrations */}
      <Celebration />

      {/* Image lightbox */}
      <AnimatePresence>
        <ImageLightbox />
      </AnimatePresence>

      {/* Article viewer */}
      <AnimatePresence>
        <ArticleViewer />
      </AnimatePresence>

      {/* Settings overlay */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPage onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
