import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CalendarDays, Images, BookOpen, Star, Medal, Dices, Settings, Lock, LockOpen } from "lucide-react";
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
  { id: "achievements", icon: Medal, labelKey: "nav.achievements" },
];

export default function IconNavBar() {
  const { t } = useTranslation();
  const activeNav = useUIStore((s) => s.activeNav);
  const setActiveNav = useUIStore((s) => s.setActiveNav);
  const { spaceType, canSwitchSpace, switchSpace } = useAuthStore();
  const navItems = navItemDefs.map(n => ({ ...n, label: t(n.labelKey) }));
  const loadToday = useDiaryStore((s) => s.loadToday);

  const handleSwitchSpace = async () => {
    if (!canSwitchSpace) return;
    const target = spaceType === "private" ? "public" : "private";
    await switchSpace(target);
    await loadToday();
  };

  return (
    <div className="w-14 bg-nav-bg flex flex-col items-center pt-4 pb-3 border-r border-border">
      {/* Nav items */}
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center
                       text-lg hover:bg-warm-200/50 transition-colors group"
            title={item.label}
          >
            {activeNav === item.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute inset-0 bg-accent/10 rounded-xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon className="relative z-10 w-5 h-5" />
          </button>
        ))}

        {/* Random memory dice */}
        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-lg hover:bg-warm-200/50 transition-colors mt-2"
          title={t("nav.random")}
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
        </button>
      </div>

      {/* Space indicator + switch */}
      {canSwitchSpace && (
        <button
          onClick={handleSwitchSpace}
          className="w-10 h-10 rounded-xl flex items-center justify-center
                     text-xs hover:bg-warm-200/50 transition-colors mb-1"
          title={spaceType === "private" ? "切换到公开空间" : "切换到私密空间"}
        >
          {spaceType === "private" ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
        </button>
      )}

      {/* Settings at bottom */}
      <button
        onClick={() => useUIStore.getState().setShowSettings(true)}
        className="w-10 h-10 rounded-xl flex items-center justify-center
                   text-lg hover:bg-warm-200/50 transition-colors"
        title={t("nav.settings")}
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
