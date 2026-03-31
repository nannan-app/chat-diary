import { create } from "zustand";
import * as ipc from "../lib/ipc";
import type { DiaryDay, Message } from "../lib/types";
import dayjs from "dayjs";

interface DiaryState {
  selectedDate: string;
  currentDay: DiaryDay | null;
  messages: Message[];
  diaryDays: DiaryDay[];
  loading: boolean;
  tagVersion: number;

  setSelectedDate: (date: string) => void;
  loadToday: () => Promise<void>;
  loadDay: (date: string) => Promise<void>;
  loadDiaryList: (year: number, month: number) => Promise<void>;
  sendTextMessage: (text: string, quoteRefId?: number) => Promise<void>;
  editMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  sendMoodMessage: (mood: string) => Promise<void>;
  uploadImage: (imageBytes: Uint8Array, compress: boolean) => Promise<void>;
  bumpTagVersion: () => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  selectedDate: dayjs().format("YYYY-MM-DD"),
  currentDay: null,
  messages: [],
  diaryDays: [],
  loading: false,
  tagVersion: 0,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().loadDay(date);
  },

  loadToday: async () => {
    const today = dayjs().format("YYYY-MM-DD");
    set({ selectedDate: today, loading: true });
    try {
      const day = await ipc.getOrCreateToday();
      const messages = await ipc.getMessages(day.id);
      set({ currentDay: day, messages, loading: false });
      // Also load the diary list for current month
      get().loadDiaryList(dayjs().year(), dayjs().month() + 1);
    } catch (e) {
      console.error("[loadToday] Failed:", e);
      set({ currentDay: null, messages: [], loading: false });
    }
  },

  loadDay: async (date: string) => {
    set({ loading: true });
    try {
      const day = await ipc.getDiaryDay(date);
      const messages = await ipc.getMessages(day.id);
      set({ currentDay: day, messages, loading: false });
    } catch {
      // Date has no diary entry yet — show empty state
      set({ currentDay: null, messages: [], loading: false });
    }
  },

  loadDiaryList: async (year: number, month: number) => {
    const days = await ipc.listDiaryDays(year, month);
    set({ diaryDays: days });
  },

  sendTextMessage: async (text: string, quoteRefId?: number) => {
    const { currentDay } = get();
    if (!currentDay) return;

    await ipc.sendMessage({
      diaryDayId: currentDay.id,
      kind: "text",
      content: text,
      quoteRefId,
    });

    // Reload messages to get joined fields (quote_content, etc.)
    const messages = await ipc.getMessages(currentDay.id);
    set({ messages });
  },

  editMessage: async (messageId: number, content: string) => {
    await ipc.editMessage(messageId, content);
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, content } : m
      ),
    }));
  },

  deleteMessage: async (messageId: number) => {
    await ipc.deleteMessage(messageId);
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
  },

  sendMoodMessage: async (mood: string) => {
    const { currentDay } = get();
    if (!currentDay) return;

    const message = await ipc.sendMessage({
      diaryDayId: currentDay.id,
      kind: "mood",
      mood,
    });

    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  uploadImage: async (imageBytes: Uint8Array, compress: boolean) => {
    const { currentDay } = get();
    if (!currentDay) return;

    await ipc.uploadImage(
      currentDay.id,
      Array.from(imageBytes),
      compress
    );

    // Reload messages to get the thumbnail
    const messages = await ipc.getMessages(currentDay.id);
    set({ messages });
  },

  bumpTagVersion: () => set((s) => ({ tagVersion: s.tagVersion + 1 })),
}));
