import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import * as ipc from "../../lib/ipc";

export default function Celebration() {
  const [celebration, setCelebration] = useState<{
    emoji: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    checkCelebrations();
  }, []);

  const checkCelebrations = async () => {
    const today = dayjs();
    const shown = sessionStorage.getItem("celebration_shown_today");
    if (shown === today.format("YYYY-MM-DD")) return;

    // Check new year
    if (today.month() === 0 && today.date() === 1) {
      setCelebration({ emoji: "🎆", message: "新年快乐！新的一年，继续记录美好" });
      sessionStorage.setItem("celebration_shown_today", today.format("YYYY-MM-DD"));
      return;
    }

    // Check birthday
    const birthday = await ipc.getSetting("birthday");
    if (birthday) {
      const bd = dayjs(birthday);
      if (bd.month() === today.month() && bd.date() === today.date()) {
        setCelebration({ emoji: "🎂", message: "生日快乐，记录美好的一年！" });
        sessionStorage.setItem("celebration_shown_today", today.format("YYYY-MM-DD"));
        return;
      }
    }

    // Check anniversary
    const stats = await ipc.getWritingStats();
    if (stats.first_entry_date) {
      const firstDay = dayjs(stats.first_entry_date);
      const diff = today.diff(firstDay, "day");
      if (diff > 0 && diff % 365 === 0) {
        const years = diff / 365;
        setCelebration({
          emoji: "🎉",
          message: `你已经和喃喃在一起整整 ${years} 年了！`,
        });
        sessionStorage.setItem("celebration_shown_today", today.format("YYYY-MM-DD"));
      }
    }
  };

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center"
          onClick={() => setCelebration(null)}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl px-10 py-8 text-center shadow-xl"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: 2, duration: 0.5 }}
              className="text-6xl mb-4"
            >
              {celebration.emoji}
            </motion.div>
            <p className="text-text-primary font-medium mb-4">
              {celebration.message}
            </p>
            <button
              onClick={() => setCelebration(null)}
              className="px-6 py-2 rounded-xl bg-accent text-white text-sm
                         hover:bg-accent-hover transition-colors"
            >
              谢谢！
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
