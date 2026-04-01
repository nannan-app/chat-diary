import { motion } from "framer-motion";
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

function NavTooltipButton({
  label,
  className,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  onClick?: React.MouseEventHandler;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={`relative group ${className || ""}`}>
      {children}
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2
                        px-2 py-1 rounded-md bg-text-primary text-white text-xs whitespace-nowrap
                        opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </button>
  );
}

export default function IconNavBar() {
  const { t } = useTranslation();
  const activeNav = useUIStore((s) => s.activeNav);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const { spaceType, logout } = useAuthStore();
  const navItems = navItemDefs.map(n => ({ ...n, label: t(n.labelKey) }));

  return (
    <div className="w-14 bg-nav-bg flex flex-col items-center pt-4 pb-3 border-r border-border">
      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavTooltipButton
            key={item.id}
            label={item.label}
            onClick={() => setActiveNav(item.id)}
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       text-lg hover:bg-warm-200/50 transition-colors"
          >
            {activeNav === item.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-accent/10 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon className="relative z-10 w-5 h-5" />
          </NavTooltipButton>
        ))}

        {/* Random memory dice */}
        <NavTooltipButton
          label={t("nav.random")}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-lg hover:bg-warm-200/50 transition-colors mt-2"
          onClick={async () => {
            try {
              const day = await ipc.getRandomDiaryDay();
              if (day) {
                useDiaryStore.getState().setSelectedDate(day.date);
                setActiveNav("diary");
                // Track for achievement
                await ipc.setSetting("used_random_memory", "true");
              }
            } catch (e) {
              console.log("No random memory available");
            }
          }}
        >
          <Dices className="w-5 h-5" />
        </NavTooltipButton>
      </div>

      {/* Space indicator — click to lock */}
      <NavTooltipButton
        label={spaceType === "private" ? t("space.private") : t("space.public")}
        onClick={logout}
        className="w-10 h-10 rounded-xl flex items-center justify-center
                   hover:bg-warm-200/50 transition-colors mb-1"
      >
        {spaceType === "private"
          ? <Lock className="w-4 h-4 text-accent" />
          : <LockOpen className="w-4 h-4 text-orange-400" />}
      </NavTooltipButton>

      {/* Settings at bottom */}
      <NavTooltipButton
        label={t("nav.settings")}
        onClick={() => useUIStore.getState().setShowSettings(true)}
        className="w-10 h-10 rounded-xl flex items-center justify-center
                   text-lg hover:bg-warm-200/50 transition-colors"
      >
        <Settings className="w-5 h-5" />
      </NavTooltipButton>
    </div>
  );
}
