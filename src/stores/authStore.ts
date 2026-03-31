import { create } from "zustand";
import * as ipc from "../lib/ipc";
import type { SpaceType } from "../lib/types";

interface AuthState {
  isLoggedIn: boolean;
  isFirstTime: boolean | null;
  spaceType: SpaceType | null;
  loading: boolean;

  canSwitchSpace: boolean;
  checkSetup: () => Promise<void>;
  login: (password: string) => Promise<void>;
  setupPassword: (password: string, hint?: string) => Promise<string>;
  logout: () => Promise<void>;
  switchSpace: (target: SpaceType) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  isFirstTime: null,
  spaceType: null,
  canSwitchSpace: false,
  loading: true,

  checkSetup: async () => {
    const isSetup = await ipc.checkSetup();
    set({ isFirstTime: !isSetup, loading: false });
  },

  login: async (password: string) => {
    const result = await ipc.login(password);
    if (result.is_first_time) {
      set({ isFirstTime: true });
    } else {
      set({
        isLoggedIn: true,
        spaceType: result.space as SpaceType,
        isFirstTime: false,
        canSwitchSpace: result.space === "private",
      });
    }
  },

  setupPassword: async (password: string, hint?: string) => {
    const result = await ipc.setupPassword(password, hint);
    // Don't set isLoggedIn/isFirstTime here — keep SetupScreen mounted
    // so the recovery code step can be shown. The user will call login()
    // after confirming they've saved the recovery code.
    return result.recovery_code;
  },

  logout: async () => {
    await ipc.lock();
    set({
      isLoggedIn: false,
      spaceType: null,
      canSwitchSpace: false,
    });
  },

  switchSpace: async (target: SpaceType) => {
    const result = await ipc.switchSpace(target);
    set({ spaceType: result as SpaceType });
  },
}));
