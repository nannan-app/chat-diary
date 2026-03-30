import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";
import type { Achievement, WritingStats } from "../../lib/types";

const BADGE_INFO: Record<string, { name: string; icon: string; description: string; category: string }> = {
  first_entry: { name: "初次提笔", icon: "✏️", description: "写下第一篇日记", category: "坚持" },
  seven_days: { name: "七日之约", icon: "📅", description: "累计写满 7 天", category: "坚持" },
  thirty_days: { name: "月光收集者", icon: "🌙", description: "累计写满 30 天", category: "坚持" },
  one_year: { name: "年轮", icon: "🌳", description: "累计写满 365 天", category: "坚持" },
  thousand_words: { name: "千字文", icon: "📝", description: "单日超过 1000 字", category: "产量" },
  ten_thousand_words: { name: "万字书", icon: "📖", description: "累计超过 10000 字", category: "产量" },
  hundred_thousand_words: { name: "十万个心事", icon: "💭", description: "累计超过 100000 字", category: "产量" },
  sunny_week: { name: "阳光满溢", icon: "☀️", description: "连续 7 天标记开心心情", category: "心情" },
  mood_painter: { name: "情绪画家", icon: "🎨", description: "使用过所有心情标签", category: "心情" },
  first_photo: { name: "第一帧", icon: "📷", description: "上传第一张图片", category: "图片" },
  hundred_photos: { name: "生活记录者", icon: "🖼️", description: "累计上传 100 张图片", category: "图片" },
  ai_first: { name: "AI 初见", icon: "🤖", description: "第一次使用 AI 总结", category: "探索" },
  remote_delivery: { name: "远程投递", icon: "📨", description: "通过 Telegram 写日记", category: "探索" },
  time_traveler: { name: "时光旅人", icon: "🎲", description: "使用随机回忆功能", category: "探索" },
  night_owl: { name: "夜猫子", icon: "🦉", description: "凌晨 3 点写日记", category: "彩蛋" },
};

// Growth tree stages based on days of use
function getTreeEmoji(days: number): string {
  if (days < 7) return "🌱";
  if (days < 30) return "🌿";
  if (days < 90) return "🌲";
  if (days < 365) return "🌳";
  return "🌴";
}

export default function BadgeWall() {
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

  const categories = ["坚持", "产量", "心情", "图片", "探索", "彩蛋"];

  return (
    <div className="h-full overflow-y-auto">
      {/* Growth tree header */}
      <div className="text-center py-8 bg-gradient-to-b from-warm-100 to-main-bg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="text-6xl mb-3"
        >
          {getTreeEmoji(totalDays)}
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-text-secondary text-sm"
        >
          这本日记本已经 <span className="text-accent font-medium">{totalDays}</span> 天了
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-text-hint text-xs mt-1"
        >
          已解锁 {unlockedCount} / {achievements.length} 枚勋章
        </motion.p>
      </div>

      {/* Badge grid by category */}
      <div className="px-6 pb-6">
        {categories.map((cat) => {
          const catBadges = achievements.filter(
            (a) => BADGE_INFO[a.key]?.category === cat
          );
          if (catBadges.length === 0) return null;

          return (
            <div key={cat} className="mb-6">
              <h3 className="text-xs text-text-hint mb-2 uppercase tracking-wider">
                {cat}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {catBadges.map((a, i) => {
                  const info = BADGE_INFO[a.key];
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
                      <div className={`text-2xl mb-1 ${unlocked ? "" : "grayscale"}`}>
                        {info?.icon || "❓"}
                      </div>
                      <p className="text-xs font-medium text-text-primary">
                        {info?.name || a.key}
                      </p>
                      <p className="text-xs text-text-hint mt-0.5">
                        {info?.description}
                      </p>
                      {unlocked && a.unlocked_at && (
                        <p className="text-xs text-accent mt-1">
                          {dayjs(a.unlocked_at).format("M月D日")}
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
