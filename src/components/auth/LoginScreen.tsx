import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../stores/authStore";
import { getPasswordHint, resetPasswordWithRecovery } from "../../lib/ipc";
import { getGreetings } from "../../lib/constants";
import loginHero from "../../assets/illustrations/login_hero.png";

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
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          <img src={loginHero} alt="" className="w-40 h-40 object-contain drop-shadow-lg" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-light text-text-primary"
        >
          {t("app.name")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-text-hint text-sm"
        >
          {greeting}
        </motion.p>

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
            placeholder={t("auth.password.placeholder")}
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
            {t("auth.enter")}
          </button>
        </motion.form>

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
              {t("auth.hint")}
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
          <button
            onClick={() => setShowForgot(true)}
            className="text-xs text-text-hint hover:text-accent transition-colors mt-1"
          >
            {t("auth.forgot")}
          </button>
        </motion.div>
      </motion.div>

      {showForgot && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-xl">
            {!resetSuccess ? (
              <>
                <h3 className="text-lg font-medium mb-4">{t("auth.reset.title")}</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder={t("auth.reset.codePlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("auth.reset.newPassword")}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.reset.confirmPassword")}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={newHint}
                    onChange={(e) => setNewHint(e.target.value)}
                    placeholder={t("auth.reset.hintPlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:border-accent"
                  />
                  {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowForgot(false)}
                      className="flex-1 py-2 rounded-lg border border-border text-sm hover:bg-warm-100"
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
                        } catch (e: any) {
                          setResetError(t("auth.reset.failed"));
                        }
                      }}
                      className="flex-1 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
                    >
                      {t("auth.reset.submit")}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-4">{t("auth.reset.success")}</h3>
                <p className="text-sm text-text-secondary mb-3">{t("auth.reset.saveCode")}</p>
                <div className="bg-warm-100 p-3 rounded-lg font-mono text-center text-sm mb-3 select-all">
                  {newRecoveryCode}
                </div>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => navigator.clipboard.writeText(newRecoveryCode)}
                    className="flex-1 py-2 rounded-lg border border-border text-text-primary text-sm hover:bg-warm-50"
                  >
                    {t("auth.setup.copy")}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [t("auth.setup.recoveryFileContent", { code: newRecoveryCode })],
                        { type: "text/plain" }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "murmur-recovery-code.txt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 py-2 rounded-lg border border-border text-text-primary text-sm hover:bg-warm-50"
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
                  className="w-full py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
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
