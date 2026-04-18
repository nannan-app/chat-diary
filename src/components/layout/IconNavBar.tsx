import { useTranslation } from "react-i18next";
import { CalendarDays, Images, BookOpen, Star, Medal, Dices, Settings, Lock, LockOpen, FolderOpen } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import { useDiaryStore } from "../../stores/diaryStore";
import * as ipc from "../../lib/ipc";
import type { NavSection } from "../../lib/types";

const navItemDefs: { id: NavSection; icon: React.FC<any>; labelKey: string }[] = [
  { id: "diary", icon: CalendarDays, labelKey: "nav.diary" },
  { id: "gallery", icon: Images, labelKey: "nav.gallery" },
  { id: "library", icon: BookOpen, labelKey: "nav.library" },
  { id: "favorites", icon: Star, labelKey: "nav.favorites" },
  { id: "files", icon: FolderOpen, labelKey: "nav.files" },
  { id: "achievements", icon: Medal, labelKey: "nav.achievements" },
];

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick?: React.MouseEventHandler;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-tooltip={label}
      className={`relative w-9 h-9 rounded-[10px] flex items-center justify-center transition-all
        ${active
          ? "bg-paper-200 text-ink-900"
          : "text-ink-500 hover:bg-paper-100 hover:text-ink-700"}`}
    >
      {active && (
        <span className="absolute -left-2 top-2 bottom-2 w-[2px] rounded-full bg-ink-800" />
      )}
      {children}
    </button>
  );
}

export default function IconNavBar() {
  const { t } = useTranslation();
  const activeNav = useUIStore((s) => s.activeNav);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const { spaceType, logout } = useAuthStore();

  return (
    <div className="relative w-[52px] bg-paper-50 border-r border-paper-200 flex flex-col items-center pt-[10px] pb-[10px] flex-shrink-0 paper-grain">
      {/* Vertical wordmark */}
      <div
        className="text-ink-700 mb-[10px] pt-0.5 relative z-10"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 500,
          writingMode: "vertical-rl",
          letterSpacing: "0.3em",
        }}
      >
        {t("app.name")}
      </div>
      <div className="w-5 h-px bg-paper-300 mb-3 relative z-10" />

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 flex-1 items-center relative z-10">
        {navItemDefs.map((item) => {
          const Ico = item.icon;
          return (
            <RailButton
              key={item.id}
              active={activeNav === item.id}
              label={t(item.labelKey)}
              onClick={() => setActiveNav(item.id)}
            >
              <Ico className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </RailButton>
          );
        })}

        {/* Random memory */}
        <div className="mt-1">
          <RailButton
            label={t("nav.random")}
            onClick={async () => {
              try {
                const day = await ipc.getRandomDiaryDay();
                if (day) {
                  useDiaryStore.getState().setSelectedDate(day.date);
                  setActiveNav("diary");
                  await ipc.setSetting("used_random_memory", "true");
                }
              } catch {
                /* empty */
              }
            }}
          >
            <Dices className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </RailButton>
        </div>
      </div>

      {/* Private/public space */}
      <div className="relative z-10 mb-1">
        <button
          onClick={logout}
          data-tooltip={spaceType === "private" ? t("space.private") : t("space.public")}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors hover:bg-paper-100"
        >
          {spaceType === "private" ? (
            <Lock className="w-4 h-4" strokeWidth={1.6} style={{ color: "var(--color-sage-deep)" }} />
          ) : (
            <LockOpen className="w-4 h-4 text-[#c9ad8a]" strokeWidth={1.6} />
          )}
        </button>
      </div>

      {/* Settings */}
      <div className="relative z-10">
        <RailButton
          label={t("nav.settings")}
          onClick={() => useUIStore.getState().setShowSettings(true)}
        >
          <Settings className="w-4 h-4" strokeWidth={1.6} />
        </RailButton>
      </div>
    </div>
  );
}
