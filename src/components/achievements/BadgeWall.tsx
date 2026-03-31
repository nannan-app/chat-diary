import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import type { Achievement, WritingStats } from "../../lib/types";

import badgeFirstEntry from "../../assets/icons/badges/first_entry.png";
import badgeSevenDays from "../../assets/icons/badges/seven_days.png";
import badgeThirtyDays from "../../assets/icons/badges/thirty_days.png";
import badgeOneYear from "../../assets/icons/badges/one_year.png";
import badgeThousandWords from "../../assets/icons/badges/thousand_words.png";
import badgeTenThousandWords from "../../assets/icons/badges/ten_thousand_words.png";
import badgeHundredThousandWords from "../../assets/icons/badges/hundred_thousand_words.png";
import badgeSunnyWeek from "../../assets/icons/badges/sunny_week.png";
import badgeMoodPainter from "../../assets/icons/badges/mood_painter.png";
import badgeFirstPhoto from "../../assets/icons/badges/first_photo.png";
import badgeHundredPhotos from "../../assets/icons/badges/hundred_photos.png";
import badgeAiFirst from "../../assets/icons/badges/ai_first.png";
import badgeRemoteDelivery from "../../assets/icons/badges/remote_delivery.png";
import badgeTimeTraveler from "../../assets/icons/badges/time_traveler.png";
import badgeNightOwl from "../../assets/icons/badges/night_owl.png";

const BADGE_ICONS: Record<string, string> = {
  first_entry: badgeFirstEntry, seven_days: badgeSevenDays, thirty_days: badgeThirtyDays, one_year: badgeOneYear,
  thousand_words: badgeThousandWords, ten_thousand_words: badgeTenThousandWords, hundred_thousand_words: badgeHundredThousandWords,
  sunny_week: badgeSunnyWeek, mood_painter: badgeMoodPainter, first_photo: badgeFirstPhoto, hundred_photos: badgeHundredPhotos,
  ai_first: badgeAiFirst, remote_delivery: badgeRemoteDelivery, time_traveler: badgeTimeTraveler, night_owl: badgeNightOwl,
};

const BADGE_CATEGORIES: Record<string, string> = {
  first_entry: "persistence", seven_days: "persistence", thirty_days: "persistence", one_year: "persistence",
  thousand_words: "output", ten_thousand_words: "output", hundred_thousand_words: "output",
  sunny_week: "mood", mood_painter: "mood",
  first_photo: "photo", hundred_photos: "photo",
  ai_first: "explore", remote_delivery: "explore", time_traveler: "explore",
  night_owl: "easter",
};

import treeSeedling from "../../assets/illustrations/tree/seedling.png";
import treeHerb from "../../assets/illustrations/tree/herb.png";
import treePine from "../../assets/illustrations/tree/pine.png";
import treeTree from "../../assets/illustrations/tree/tree.png";
import treePalm from "../../assets/illustrations/tree/palm.png";

function getTreeImage(days: number): string {
  if (days < 7) return treeSeedling;
  if (days < 30) return treeHerb;
  if (days < 90) return treePine;
  if (days < 365) return treeTree;
  return treePalm;
}

export default function BadgeWall() {
  const { t } = useTranslation();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<WritingStats | null>(null);

  useEffect(() => {
    ipc.getAchievements().then(setAchievements);
    ipc.getWritingStats().then(setStats);
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;
  const totalDays = stats
    ? dayjs().diff(dayjs(stats.first_entry_date || undefined), "day") + 1
    : 0;

  const categoryKeys = ["persistence", "output", "mood", "photo", "explore", "easter"];

  return (
    <div className="h-full overflow-y-auto">
      {/* Growth tree header */}
      <div className="text-center py-8 bg-gradient-to-b from-warm-100 to-main-bg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="mb-3"
        >
          <img src={getTreeImage(totalDays)} alt="growth tree" className="w-16 h-16 mx-auto" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-text-secondary text-sm"
        >
          {t("stats.tree.age", { days: totalDays })}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-text-hint text-xs mt-1"
        >
          {t("stats.badgeCount", { unlocked: unlockedCount, total: achievements.length })}
        </motion.p>
      </div>

      {/* Badge grid by category */}
      <div className="px-6 pb-6">
        {categoryKeys.map((catKey) => {
          const catBadges = achievements.filter(
            (a) => BADGE_CATEGORIES[a.key] === catKey
          );
          if (catBadges.length === 0) return null;

          return (
            <div key={catKey} className="mb-6">
              <h3 className="text-xs text-text-hint mb-2 uppercase tracking-wider">
                {t(`badge.cat.${catKey}`)}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {catBadges.map((a, i) => {
                  const unlocked = !!a.unlocked_at;
                  return (
                    <motion.div
                      key={a.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`text-center p-3 rounded-xl border transition-colors
                        ${unlocked
                          ? "bg-warm-50 border-accent/20"
                          : "bg-warm-50/50 border-border opacity-50"
                        }`}
                    >
                      <div className={`mb-1 ${unlocked ? "" : "grayscale"}`}>
                        <img src={BADGE_ICONS[a.key]} alt={a.key} className="w-8 h-8 mx-auto" />
                      </div>
                      <p className="text-xs font-medium text-text-primary">
                        {t(`badge.${a.key}`)}
                      </p>
                      <p className="text-xs text-text-hint mt-0.5">
                        {t(`badge.desc.${a.key}`)}
                      </p>
                      {unlocked && a.unlocked_at && (
                        <p className="text-xs text-accent mt-1">
                          {dayjs(a.unlocked_at).format(t("diary.monthDayFormat"))}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
