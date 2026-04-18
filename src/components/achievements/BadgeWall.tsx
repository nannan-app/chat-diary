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

function TreeViz({ days }: { days: number }) {
  const stage = days < 14 ? 1 : days < 60 ? 2 : days < 180 ? 3 : 4;
  return (
    <svg width="96" height="64" viewBox="0 0 96 64" style={{ color: "var(--color-sage-deep)" }}>
      <line x1="6" y1="58" x2="90" y2="58" stroke="var(--color-paper-300)" strokeWidth="1" strokeDasharray="2 3" />
      <path
        d={stage >= 2 ? "M48 58 Q 48 48, 48 38" : "M48 58 L 48 52"}
        stroke="var(--color-ink-700)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {stage >= 3 && <path d="M48 50 Q 42 44, 36 40" stroke="var(--color-ink-700)" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
      {stage >= 3 && <path d="M48 46 Q 54 40, 60 36" stroke="var(--color-ink-700)" strokeWidth="1.2" fill="none" strokeLinecap="round" />}
      {stage >= 2 && <circle cx="48" cy="36" r="8" fill="currentColor" opacity="0.6" />}
      {stage >= 3 && <circle cx="36" cy="38" r="5" fill="currentColor" opacity="0.5" />}
      {stage >= 3 && <circle cx="60" cy="34" r="5" fill="currentColor" opacity="0.5" />}
      {stage >= 4 && <circle cx="30" cy="44" r="4" fill="currentColor" opacity="0.4" />}
      {stage === 1 && <path d="M45 54 Q 48 50, 51 54" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
    </svg>
  );
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
    <div className="relative h-full flex flex-col bg-paper-0 overflow-hidden paper-grain">
      {/* Header */}
      <div className="relative z-10 px-8 pt-5 pb-3.5 border-b border-paper-200 flex items-end justify-between gap-4">
        <div>
          <h1
            className="m-0 text-ink-900"
            style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, letterSpacing: "0.01em" }}
          >
            {t("nav.achievements")}
          </h1>
          <p
            className="m-0 mt-1 text-ink-500 italic"
            style={{ fontFamily: "var(--font-serif)", fontSize: 12 }}
          >
            {t("achievements.subtitle", {
              defaultValue: "{{unlocked}} / {{total}} 枚 · 这本日记本已经陪伴你 {{days}} 天",
              unlocked: unlockedCount,
              total: achievements.length,
              days: totalDays,
            })}
          </p>
        </div>
        <TreeViz days={totalDays} />
      </div>

      {/* Badge grid by category */}
      <div className="relative z-10 flex-1 overflow-y-auto px-8 py-5 pb-10">
        {categoryKeys.map((catKey) => {
          const catBadges = achievements.filter((a) => BADGE_CATEGORIES[a.key] === catKey);
          if (catBadges.length === 0) return null;
          const earned = catBadges.filter((a) => a.unlocked_at).length;

          return (
            <div key={catKey} className="mb-7">
              <div className="flex items-baseline gap-2.5 mb-3">
                <span
                  className="text-ink-700 italic"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 15 }}
                >
                  {t(`badge.cat.${catKey}`)}
                </span>
                <div className="flex-1 h-px bg-paper-200" />
                <span className="text-[10.5px] text-ink-400" style={{ fontFamily: "var(--font-mono)" }}>
                  {earned}/{catBadges.length}
                </span>
              </div>
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))" }}
              >
                {catBadges.map((a, i) => {
                  const unlocked = !!a.unlocked_at;
                  return (
                    <motion.div
                      key={a.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative border rounded-[4px] p-4 bg-paper-0 flex flex-col items-center gap-2"
                      style={{
                        borderColor: unlocked ? "var(--color-paper-300)" : "var(--color-paper-200)",
                        opacity: unlocked ? 1 : 0.55,
                      }}
                    >
                      {unlocked && (
                        <div
                          className="stamp absolute top-2 right-2"
                          style={{
                            color: "var(--color-sage-deep)",
                            borderColor: "var(--color-sage-deep)",
                            fontSize: 8,
                          }}
                        >
                          earned
                        </div>
                      )}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          border: unlocked
                            ? "1.5px solid var(--color-ink-800)"
                            : "1.5px solid var(--color-ink-400)",
                          background: unlocked ? "var(--color-paper-100)" : "transparent",
                        }}
                      >
                        {unlocked && BADGE_ICONS[a.key] ? (
                          <img src={BADGE_ICONS[a.key]} alt={a.key} className="w-7 h-7" />
                        ) : (
                          <span className="text-ink-400 text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>?</span>
                        )}
                      </div>
                      <div
                        className="text-ink-900 text-center"
                        style={{ fontFamily: "var(--font-serif)", fontSize: 13.5, fontWeight: 500 }}
                      >
                        {unlocked ? t(`badge.${a.key}`) : "???"}
                      </div>
                      <div className="text-[10.5px] text-ink-500 text-center leading-[1.5]">
                        {unlocked ? t(`badge.desc.${a.key}`) : t("badge.locked")}
                      </div>
                      {unlocked && a.unlocked_at && (
                        <div
                          className="text-[9.5px] text-ink-400"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {dayjs(a.unlocked_at).format("YYYY-MM-DD")}
                        </div>
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
