import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../stores/authStore";
import { getPasswordHint, resetPasswordWithRecovery } from "../../lib/ipc";
import { getGreetings } from "../../lib/constants";

export default function LoginScreen() {
  const { t } = useTranslation();
  const greetings = getGreetings();
  const [password, setPassword] = useState("");
  const [greeting] = useState(
    () => greetings[Math.floor(Math.random() * greetings.length)]
  );
  const [hint, setHint] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newHint, setNewHint] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const login = useAuthStore((s) => s.login);
  const loginDenied = useAuthStore((s) => s.loginDenied);

  useEffect(() => {
    getPasswordHint().then(setHint);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    await login(password);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-paper-50 overflow-hidden">
      {/* Paper grain — dedicated full-viewport layer */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.5,
          mixBlendMode: "multiply",
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(120, 90, 60, 0.04) 0, transparent 2%)," +
            "radial-gradient(circle at 70% 80%, rgba(120, 90, 60, 0.03) 0, transparent 3%)," +
            "radial-gradient(circle at 40% 60%, rgba(120, 90, 60, 0.03) 0, transparent 2%)," +
            "radial-gradient(circle at 85% 15%, rgba(120, 90, 60, 0.04) 0, transparent 2%)",
          backgroundSize: "180px 180px, 220px 220px, 160px 160px, 200px 200px",
        }}
      />
      {/* Dappled sunlight glows — full-viewport layer so gradients fade smoothly without edges */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "radial-gradient(520px 520px at 95% 5%, rgba(232,181,100,0.28) 0%, rgba(232,181,100,0.08) 30%, transparent 60%)",
            "radial-gradient(460px 460px at 3% 100%, rgba(156,184,156,0.22) 0%, rgba(156,184,156,0.06) 35%, transparent 70%)",
          ].join(","),
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-[2] flex flex-col items-center gap-5 max-w-[320px] w-full px-6"
      >
        {/* Stamp logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="w-[88px] h-[88px] rounded-full bg-paper-0 border border-paper-300 flex items-center justify-center shadow-[0_8px_30px_rgba(90,60,30,0.08)]"
        >
          <span
            className="text-ink-900"
            style={{ fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 500, letterSpacing: "-0.05em" }}
          >
            {t("app.name")}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="m-0 text-ink-500 italic text-center"
          style={{ fontFamily: "var(--font-serif)", fontSize: 12.5, letterSpacing: "0.05em" }}
        >
          {greeting}
        </motion.p>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-2.5 w-full"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password.placeholder")}
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-[10px] bg-paper-0 border border-paper-300 text-center text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-user-stroke transition-colors"
          />
          {loginDenied && (
            <p className="text-xs text-[#a66060] text-center m-0">{t("auth.wrongPassword")}</p>
          )}
          <button
            type="submit"
            className="w-full py-2.5 rounded-[10px] bg-ink-800 text-paper-0 font-medium hover:bg-ink-900 active:scale-[0.98] transition-all duration-150"
          >
            {t("auth.enter")}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="flex items-center gap-3.5 text-[11px] text-ink-500"
        >
          {hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="italic hover:text-ink-700 transition-colors"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("auth.hint")}
            </button>
          )}
          {hint && <span className="text-paper-300">·</span>}
          <button
            onClick={() => setShowForgot(true)}
            className="italic hover:text-ink-700 transition-colors"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {t("auth.forgot")}
          </button>
        </motion.div>

        <AnimatePresence>
          {showHint && hint && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-ink-600 bg-paper-100 px-3 py-1.5 rounded-md m-0 italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {showForgot && (
        <div className="fixed inset-0 z-50 bg-[rgba(30,22,15,0.45)] flex items-center justify-center">
          <div
            className="bg-paper-0 rounded-[14px] border border-paper-200 p-6 w-96 shadow-xl fade-in"
          >
            {!resetSuccess ? (
              <>
                <h3
                  className="text-ink-900 m-0 mb-4"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}
                >
                  {t("auth.reset.title")}
                </h3>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder={t("auth.reset.codePlaceholder")}
                    className="w-full px-3 py-2 rounded-md border border-paper-300 bg-paper-0 text-sm focus:outline-none focus:border-user-stroke"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("auth.reset.newPassword")}
                    className="w-full px-3 py-2 rounded-md border border-paper-300 bg-paper-0 text-sm focus:outline-none focus:border-user-stroke"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.reset.confirmPassword")}
                    className="w-full px-3 py-2 rounded-md border border-paper-300 bg-paper-0 text-sm focus:outline-none focus:border-user-stroke"
                  />
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder={t("auth.reset.hintPlaceholder")}
                    className="w-full px-3 py-2 rounded-md border border-paper-300 bg-paper-0 text-sm focus:outline-none focus:border-user-stroke"
                  />
                  {resetError && <p className="text-[#a66060] text-xs m-0">{resetError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-2 rounded-md border border-paper-300 text-sm text-ink-700 hover:bg-paper-100"
                    >
                      {t("auth.reset.cancel")}
                    </button>
                    <button
                      onClick={async () => {
                        if (newPassword !== confirmPassword) {
                          setResetError(t("auth.reset.mismatch"));
                          return;
                        }
                        if (!recoveryCode.trim() || !newPassword.trim()) {
                          setResetError(t("auth.reset.fillRequired"));
                          return;
                        }
                        try {
                          const resp = await resetPasswordWithRecovery(
                            recoveryCode.trim(), newPassword, newHint || undefined
                          );
                          setNewRecoveryCode(resp.recovery_code);
                          setResetSuccess(true);
                        } catch {
                          setResetError(t("auth.reset.failed"));
                        }
                      }}
                      className="flex-1 py-2 rounded-md bg-ink-800 text-paper-0 text-sm hover:bg-ink-900"
                    >
                      {t("auth.reset.submit")}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3
                  className="text-ink-900 m-0 mb-4"
                  style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}
                >
                  {t("auth.reset.success")}
                </h3>
                <p className="text-sm text-ink-600 mb-3 italic m-0" style={{ fontFamily: "var(--font-serif)" }}>
                  {t("auth.reset.saveCode")}
                </p>
                <div
                  className="bg-paper-100 p-3 rounded-md text-center text-sm mb-3 select-all"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {newRecoveryCode}
                </div>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(newRecoveryCode)}
                    className="flex-1 py-2 rounded-md border border-paper-300 text-ink-700 text-sm hover:bg-paper-100"
                  >
                    {t("auth.setup.copy")}
                  </button>
                  <button
                    onClick={async () => {
                      const { save } = await import("@tauri-apps/plugin-dialog");
                      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
                      const path = await save({ defaultPath: "murmur-recovery-code.txt" });
                      if (!path) return;
                      await writeTextFile(path, t("auth.setup.recoveryFileContent", { code: newRecoveryCode }));
                    }}
                    className="flex-1 py-2 rounded-md border border-paper-300 text-ink-700 text-sm hover:bg-paper-100"
                  >
                    {t("auth.setup.download")}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowForgot(false);
                    setResetSuccess(false);
                    window.location.reload();
                  }}
                  className="w-full py-2 rounded-md bg-ink-800 text-paper-0 text-sm hover:bg-ink-900"
                >
                  {t("auth.reset.goLogin")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
