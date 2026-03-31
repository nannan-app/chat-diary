import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookHeart } from "lucide-react";
import { motion } from "framer-motion";
import * as ipc from "../../lib/ipc";
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
  const [importZipPath, setImportZipPath] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const setupPassword = useAuthStore((s) => s.setupPassword);

  const handleSetPassword = async () => {
    if (password.length === 0) {
      setError(t("auth.setup.enterPassword"));
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
      [t("auth.setup.recoveryFileContent", { code: recoveryCode })],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "murmur-recovery-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");

    const path = await open({ filters: [{ name: "ZIP", extensions: ["zip"] }] });
    if (!path || Array.isArray(path)) return;

    setImportZipPath(path);
    setImportPassword("");
    setImportError("");
  };

  const submitImportBackup = async () => {
    if (!importZipPath) return;
    if (!importPassword) {
      setImportError(t("auth.setup.enterPassword"));
      return;
    }

    const { message: showMessage } = await import("@tauri-apps/plugin-dialog");
    setImporting(true);
    setImportError("");

    try {
      await ipc.importDatabase(importZipPath, importPassword);
      await showMessage(t("settings.importSuccess"), { title: t("settings.done") });
      window.location.reload();
    } catch (e: any) {
      const detail = e instanceof Error ? e.message : String(e);
      const message = t("settings.importFailed") + detail;
      setImportError(message);
      await showMessage(message, { title: t("settings.error"), kind: "error" });
    } finally {
      setImporting(false);
    }
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
                onClick={handleImportBackup}
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
                placeholder={t("auth.password.placeholder")}
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
                {t("auth.setup.next")}
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
                placeholder={t("auth.setup.hintPlaceholder")}
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
                {t("auth.setup.finish")}
              </button>
              <button
                onClick={handleSetHint}
                className="text-xs text-text-hint hover:text-text-secondary transition-colors"
              >
                {t("auth.setup.skip")}
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

      {importZipPath && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-border p-6">
            <h2 className="text-xl font-light text-text-primary text-center">
              {t("auth.setup.import")}
            </h2>
            <p className="mt-2 text-sm text-text-hint text-center">
              {t("settings.importPasswordPrompt")}
            </p>
            <p className="mt-3 text-xs text-text-hint break-all bg-warm-50 rounded-lg px-3 py-2">
              {importZipPath}
            </p>
            <input
              type="password"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
              placeholder={t("auth.password.placeholder")}
              autoFocus
              className="mt-4 w-full px-4 py-2.5 rounded-xl bg-white border border-border
                         text-center text-text-primary placeholder:text-text-hint
                         focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
                         transition-all"
            />
            {importError && (
              <p className="mt-3 text-xs text-red-400 text-center whitespace-pre-wrap">
                {importError}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (importing) return;
                  setImportZipPath("");
                  setImportPassword("");
                  setImportError("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-white border border-border text-text-primary
                           hover:bg-warm-50 active:scale-[0.98] transition-all"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={submitImportBackup}
                disabled={importing}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white font-medium
                           hover:bg-accent-hover active:scale-[0.98] transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importing ? t("app.loading") : t("settings.import")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
