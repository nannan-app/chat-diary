import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookHeart } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "../../stores/authStore";

type Step = "welcome" | "password" | "hint" | "recovery";

export default function SetupScreen() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("welcome");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hint, setHint] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const setupPassword = useAuthStore((s) => s.setupPassword);

  const handleSetPassword = async () => {
    if (password.length === 0) {
      setError("请输入密码");
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.setup.mismatch"));
      return;
    }
    setError("");
    setStep("hint");
  };

  const handleSetHint = async () => {
    const code = await setupPassword(password, hint || undefined);
    setRecoveryCode(code);
    setStep("recovery");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recoveryCode);
  };

  const handleDownloadCode = () => {
    const blob = new Blob(
      [`Murmur 恢复码 / Recovery Code\n\n${recoveryCode}\n\n请妥善保管此恢复码，用于密码重置。`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "murmur-recovery-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-warm-50 to-warm-100">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 max-w-sm px-6"
      >
        {step === "welcome" && (
          <>
            <div className="w-24 h-24 rounded-2xl bg-accent/20 flex items-center justify-center">
              <BookHeart className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-light text-text-primary">
              {t("auth.setup.title")}
            </h1>
            <p className="text-text-secondary text-sm text-center leading-relaxed whitespace-pre-line">
              {t("auth.setup.subtitle")}
            </p>
            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={() => setStep("password")}
                className="w-full py-2.5 rounded-xl bg-accent text-white font-medium
                           hover:bg-accent-hover active:scale-[0.98] transition-all"
              >
                {t("auth.setup.create")}
              </button>
              <button
                className="w-full py-2.5 rounded-xl bg-white border border-border text-text-primary
                           hover:bg-warm-50 active:scale-[0.98] transition-all"
              >
                {t("auth.setup.import")}
              </button>
            </div>
          </>
        )}

        {step === "password" && (
          <>
            <h2 className="text-xl font-light text-text-primary">{t("auth.setup.password")}</h2>
            <p className="text-text-hint text-sm text-center">
              {t("auth.setup.password.desc")}
            </p>
            <div className="flex flex-col gap-3 w-64">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                autoFocus
                className="px-4 py-2.5 rounded-xl bg-white border border-border
                           text-center text-text-primary placeholder:text-text-hint
                           focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                           transition-all"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("auth.setup.confirm")}
                className="px-4 py-2.5 rounded-xl bg-white border border-border
                           text-center text-text-primary placeholder:text-text-hint
                           focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                           transition-all"
              />
              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}
              <button
                onClick={handleSetPassword}
                className="py-2.5 rounded-xl bg-accent text-white font-medium
                           hover:bg-accent-hover active:scale-[0.98] transition-all"
              >
                下一步
              </button>
            </div>
          </>
        )}

        {step === "hint" && (
          <>
            <h2 className="text-xl font-light text-text-primary">
              {t("auth.setup.hint.title")}
            </h2>
            <p className="text-text-hint text-sm text-center">
              {t("auth.setup.hint.desc")}
            </p>
            <div className="flex flex-col gap-3 w-64">
              <input
                type="text"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="例如：我的生日"
                autoFocus
                className="px-4 py-2.5 rounded-xl bg-white border border-border
                           text-center text-text-primary placeholder:text-text-hint
                           focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                           transition-all"
              />
              <button
                onClick={handleSetHint}
                className="py-2.5 rounded-xl bg-accent text-white font-medium
                           hover:bg-accent-hover active:scale-[0.98] transition-all"
              >
                完成设置
              </button>
              <button
                onClick={handleSetHint}
                className="text-xs text-text-hint hover:text-text-secondary transition-colors"
              >
                跳过
              </button>
            </div>
          </>
        )}

        {step === "recovery" && (
          <>
            <h2 className="text-xl font-light text-text-primary">
              {t("auth.setup.recovery")}
            </h2>
            <p className="text-text-hint text-sm text-center leading-relaxed whitespace-pre-line">
              {t("auth.setup.recovery.desc")}
            </p>
            <div className="bg-white border border-border rounded-xl px-6 py-4 text-center">
              <p className="text-lg font-mono tracking-wider text-text-primary">
                {recoveryCode}
              </p>
            </div>
            <div className="flex gap-2 w-64">
              <button
                onClick={handleCopyCode}
                className="flex-1 py-2 rounded-xl bg-white border border-border text-text-primary text-sm
                           hover:bg-warm-50 active:scale-[0.98] transition-all"
              >
                {t("auth.setup.copy")}
              </button>
              <button
                onClick={handleDownloadCode}
                className="flex-1 py-2 rounded-xl bg-white border border-border text-text-primary text-sm
                           hover:bg-warm-50 active:scale-[0.98] transition-all"
              >
                {t("auth.setup.download")}
              </button>
            </div>
            <button
              onClick={() => useAuthStore.getState().login(password)}
              className="w-64 py-2.5 rounded-xl bg-accent text-white font-medium
                         hover:bg-accent-hover active:scale-[0.98] transition-all"
            >
              {t("auth.setup.start")}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
