import { create } from "zustand";
import type { NavSection } from "../lib/types";

interface UIState {
  activeNav: NavSection;
  secondaryPanelVisible: boolean;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    messageId: number | null;
  };
  quoteMessage: { id: number; content: string } | null;
  editingMessage: { id: number; content: string } | null;
  showSettings: boolean;
  viewingArticleId: number | null;
  viewingImageId: number | null;

  setActiveNav: (nav: NavSection) => void;
  toggleSecondaryPanel: () => void;
  showContextMenu: (x: number, y: number, messageId: number) => void;
  hideContextMenu: () => void;
  setQuoteMessage: (msg: { id: number; content: string } | null) => void;
  setEditingMessage: (msg: { id: number; content: string } | null) => void;
  setShowSettings: (show: boolean) => void;
  setViewingArticleId: (id: number | null) => void;
  setViewingImageId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeNav: "diary",
  secondaryPanelVisible: true,
  contextMenu: { visible: false, x: 0, y: 0, messageId: null },
  quoteMessage: null,
  editingMessage: null,
  showSettings: false,
  viewingArticleId: null,
  viewingImageId: null,

  setActiveNav: (nav) => set({ activeNav: nav }),
  toggleSecondaryPanel: () =>
    set((state) => ({ secondaryPanelVisible: !state.secondaryPanelVisible })),
  showContextMenu: (x, y, messageId) =>
    set({ contextMenu: { visible: true, x, y, messageId } }),
  hideContextMenu: () =>
    set({ contextMenu: { visible: false, x: 0, y: 0, messageId: null } }),
  setQuoteMessage: (msg) => set({ quoteMessage: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),
  setShowSettings: (show) => set({ showSettings: show }),
  setViewingArticleId: (id) => set({ viewingArticleId: id }),
  setViewingImageId: (id) => set({ viewingImageId: id }),
}));
