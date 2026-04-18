import * as ipc from "./ipc";

export type ThemeMode = "paper" | "dusk" | "auto";

const THEME_KEY = "theme_mode";

function prefersDark(): boolean {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function applyTheme(mode: ThemeMode) {
  const dusk = mode === "dusk" || (mode === "auto" && prefersDark());
  document.documentElement.classList.toggle("theme-dusk", dusk);
}

export async function loadInitialTheme(): Promise<ThemeMode> {
  try {
    const pairs = await ipc.getAllSettings();
    const map: Record<string, string> = {};
    for (const [k, v] of pairs) map[k] = v;
    const stored = map[THEME_KEY] as ThemeMode | undefined;
    if (stored === "dusk" || stored === "auto" || stored === "paper") return stored;
  } catch {
    /* empty */
  }
  return "paper";
}

export async function setTheme(mode: ThemeMode) {
  applyTheme(mode);
  try {
    await ipc.setSetting(THEME_KEY, mode);
  } catch {
    /* empty */
  }
}

export function watchSystemTheme(): () => void {
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  if (!mq) return () => {};
  const handler = async () => {
    const mode = await loadInitialTheme();
    if (mode === "auto") applyTheme(mode);
  };
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}
