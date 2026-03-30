import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../stores/authStore";
import { getPasswordHint } from "../../lib/ipc";
import { GREETINGS } from "../../lib/constants";

export default function LoginScreen() {
  const [password, setPassword] = useState("");
  const [greeting] = useState(
    () => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
  );
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    getPasswordHint().then(setHint);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await login(password);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-warm-50 to-warm-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo area */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center text-4xl"
        >
          📖
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-light text-text-primary"
        >
          喃喃
        </motion.h1>

        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-text-hint text-sm"
        >
          {greeting}
        </motion.p>

        {/* Password form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-3"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            autoFocus
            className="w-64 px-4 py-2.5 rounded-xl bg-white border border-border
                       text-center text-text-primary placeholder:text-text-hint
                       focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                       transition-all duration-200"
          />

          <button
            type="submit"
            className="w-64 py-2.5 rounded-xl bg-accent text-white font-medium
                       hover:bg-accent-hover active:scale-[0.98]
                       transition-all duration-150"
          >
            进入
          </button>
        </motion.form>

        {/* Hint and forgot password */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center gap-1"
        >
          {hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-text-hint hover:text-text-secondary transition-colors"
            >
              密码提示
            </button>
          )}

          <AnimatePresence>
            {showHint && hint && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-text-secondary bg-warm-100 px-3 py-1.5 rounded-lg"
              >
                {hint}
              </motion.p>
            )}
          </AnimatePresence>

          <button className="text-xs text-text-hint hover:text-accent transition-colors mt-1">
            忘记密码
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
