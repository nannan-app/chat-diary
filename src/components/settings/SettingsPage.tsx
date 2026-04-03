import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Bot, PenLine, Palette, Database, Info, LogOut, Send, Copy, Download, Check } from "lucide-react";
import { motion } from "framer-motion";
import { getVersion } from "@tauri-apps/api/app";
import * as ipc from "../../lib/ipc";
import { useAuthStore } from "../../stores/authStore";

type Section = "account" | "ai" | "telegram" | "writing" | "display" | "data" | "about";

export default function SettingsPage({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeHint, setShowChangeHint] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [hintText, setHintText] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [wrongPwAction, setWrongPwAction] = useState("public");
  const [tgToken, setTgToken] = useState("");
  const [tgRunning, setTgRunning] = useState(false);
  const [tgUsername, setTgUsername] = useState<string | null>(null);
  const [tgError, setTgError] = useState("");
  const [tgLoading, setTgLoading] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    getVersion().then(setAppVersion);
    ipc.getAllSettings().then(async (pairs) => {
      const map: Record<string, string> = {};
      for (const [k, v] of pairs) map[k] = v;
      // Migrate legacy shared ai_api_key → per-provider key
      if (map.ai_api_key) {
        const provider = map.ai_provider || "openai";
        const perProviderKey = `ai_api_key_${provider}`;
        if (!map[perProviderKey]) {
          await ipc.setSetting(perProviderKey, map.ai_api_key);
          map[perProviderKey] = map.ai_api_key;
        }
        await ipc.deleteSetting("ai_api_key");
        delete map.ai_api_key;
      }
      setSettings(map);
    });
    ipc.getWrongPasswordAction().then(setWrongPwAction);
    ipc.getTelegramStatus().then((s) => {
      setTgRunning(s.running);
      setTgUsername(s.bot_username);
    });
  }, []);

  const updateSetting = async (key: string, value: string) => {
    await ipc.setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sections: { id: Section; label: string; icon: React.FC<any> }[] = [
    { id: "account", label: t("settings.account"), icon: ShieldCheck },
    { id: "ai", label: t("settings.ai"), icon: Bot },
    { id: "telegram", label: "Telegram", icon: Send },
    { id: "writing", label: t("settings.writing"), icon: PenLine },
    { id: "display", label: t("settings.display"), icon: Palette },
    { id: "data", label: t("settings.data"), icon: Database },
    { id: "about", label: t("settings.about"), icon: Info },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[680px] h-[480px] bg-white rounded-2xl shadow-xl flex overflow-hidden"
      >
        {/* Left nav */}
        <div className="w-48 bg-sidebar-bg border-r border-border py-4 px-2 flex flex-col">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-0.5
                          transition-colors ${
                            activeSection === s.id
                              ? "bg-accent/10 text-accent"
                              : "text-text-primary hover:bg-warm-100"
                          }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400
                       hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 inline mr-1" /> {t("settings.lock")}
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-lg font-medium text-text-primary mb-4">
            {sections.find((s) => s.id === activeSection)?.label}
          </h2>

          {activeSection === "account" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.changePassword")}>
                <button onClick={() => { setShowChangePassword(!showChangePassword); setAccountError(""); setAccountSuccess(""); }} className="text-sm text-accent hover:text-accent-hover">
                  {showChangePassword ? t("settings.cancel") : t("settings.modify")}
                </button>
              </SettingItem>
              {showChangePassword && (
                <div className="space-y-2 pl-2">
                  <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder={t("settings.oldPassword")} className="w-full text-sm border border-border rounded-lg px-2 py-1.5" />
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t("settings.newPassword")} className="w-full text-sm border border-border rounded-lg px-2 py-1.5" />
                  <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder={t("settings.confirmPassword")} className="w-full text-sm border border-border rounded-lg px-2 py-1.5" />
                  {accountError && <p className="text-xs text-red-400">{accountError}</p>}
                  {accountSuccess && <p className="text-xs text-green-500">{accountSuccess}</p>}
                  <button onClick={async () => {
                    if (newPw !== confirmPw) { setAccountError(t("settings.passwordMismatch")); return; }
                    try {
                      await ipc.changePassword(oldPw, newPw);
                      setAccountSuccess(t("settings.passwordChanged"));
                      setOldPw(""); setNewPw(""); setConfirmPw("");
                      setTimeout(() => setShowChangePassword(false), 1500);
                    } catch { setAccountError(t("settings.passwordFailed")); }
                  }} className="text-sm bg-accent text-white px-3 py-1 rounded-lg hover:bg-accent-hover">{t("settings.confirmChange")}</button>
                </div>
              )}

              <SettingItem label={t("settings.passwordHint")}>
                <button onClick={() => { setShowChangeHint(!showChangeHint); setAccountError(""); setAccountSuccess(""); }} className="text-sm text-accent hover:text-accent-hover">
                  {showChangeHint ? t("settings.cancel") : t("settings.modify")}
                </button>
              </SettingItem>
              {showChangeHint && (
                <div className="space-y-2 pl-2">
                  <input type="text" value={hintText} onChange={e => setHintText(e.target.value)} placeholder={t("settings.newHintPlaceholder")} className="w-full text-sm border border-border rounded-lg px-2 py-1.5" />
                  {accountSuccess && <p className="text-xs text-green-500">{accountSuccess}</p>}
                  <button onClick={async () => {
                    await ipc.updatePasswordHint(hintText || undefined);
                    setAccountSuccess(t("settings.hintUpdated"));
                    setTimeout(() => setShowChangeHint(false), 1500);
                  }} className="text-sm bg-accent text-white px-3 py-1 rounded-lg hover:bg-accent-hover">{t("settings.save")}</button>
                </div>
              )}

              <SettingItem label={t("settings.recoveryCode")}>
                <button onClick={async () => {
                  if (!showRecoveryCode) {
                    try {
                      const code = await ipc.regenerateRecoveryCode();
                      setRecoveryCode(code);
                      setShowRecoveryCode(true);
                    } catch { setAccountError(t("settings.recoveryFailed")); }
                  } else {
                    setShowRecoveryCode(false);
                  }
                }} className="text-sm text-accent hover:text-accent-hover">
                  {showRecoveryCode ? t("settings.hide") : t("settings.regenerate")}
                </button>
              </SettingItem>
              {showRecoveryCode && (
                <div className="pl-2 space-y-2">
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
                    {t("settings.recoveryNewGenerated")}
                  </div>
                  <div className="bg-warm-100 p-2 rounded-lg font-mono text-sm text-center select-all">{recoveryCode}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryCode);
                        setRecoveryCopied(true);
                        setTimeout(() => setRecoveryCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover px-2 py-1 rounded-lg border border-border hover:bg-warm-100 transition-colors"
                    >
                      {recoveryCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {recoveryCopied ? t("settings.copied") : t("settings.copy")}
                    </button>
                    <button
                      onClick={() => {
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
                      }}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover px-2 py-1 rounded-lg border border-border hover:bg-warm-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t("settings.download")}
                    </button>
                  </div>
                  <p className="text-xs text-text-hint">{t("settings.recoverySaveNote")}</p>
                </div>
              )}

              <SettingItem label={t("settings.birthday")}>
                <input type="date" value={settings.birthday || ""} onChange={(e) => updateSetting("birthday", e.target.value)} className="text-sm border border-border rounded-lg px-2 py-1" />
              </SettingItem>

              <SettingItem label={t("settings.wrongPasswordAction")}>
                <select
                  value={wrongPwAction}
                  onChange={async (e) => {
                    const val = e.target.value;
                    await ipc.setWrongPasswordAction(val);
                    setWrongPwAction(val);
                  }}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="public">{t("settings.wrongPwPublic")}</option>
                  <option value="deny">{t("settings.wrongPwDeny")}</option>
                </select>
              </SettingItem>
              <p className="text-xs text-text-hint pl-1 -mt-2">
                {wrongPwAction === "public" ? t("settings.wrongPwPublicDesc") : t("settings.wrongPwDenyDesc")}
              </p>
            </div>
          )}

          {activeSection === "ai" && (() => {
            const AI_DEFAULTS: Record<string, { model: string; url: string }> = {
              openai: { model: "gpt-4o-mini", url: "https://api.openai.com/v1/chat/completions" },
              anthropic: { model: "claude-sonnet-4-20250514", url: "" },
              google: { model: "gemini-2.0-flash", url: "" },
              minimax: { model: "MiniMax-M2.7", url: "https://api.minimaxi.com/anthropic/v1/messages" },
              minimax_global: { model: "MiniMax-M2.7", url: "https://api.minimax.io/anthropic/v1/messages" },
              deepseek: { model: "deepseek-chat", url: "https://api.deepseek.com/v1/chat/completions" },
              ollama: { model: "llama3.2", url: "http://localhost:11434/v1/chat/completions" },
              custom: { model: "", url: "" },
            };
            const apiKeyFor = (provider: string) =>
              settings[`ai_api_key_${provider}`] || "";
            const setApiKeyFor = (provider: string, value: string) =>
              updateSetting(`ai_api_key_${provider}`, value);
            const currentProvider = settings.ai_provider || "openai";
            const switchProvider = async (provider: string) => {
              const defaults = AI_DEFAULTS[provider] || AI_DEFAULTS.openai;
              await updateSetting("ai_provider", provider);
              await updateSetting("ai_model", defaults.model);
              await updateSetting("ai_base_url", defaults.url);
            };
            return (
            <div className="space-y-4">
              <SettingItem label={t("settings.aiProvider")}>
                <select
                  value={settings.ai_provider || "openai"}
                  onChange={(e) => switchProvider(e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google Gemini</option>
                  <option value="minimax">MiniMax ({t("settings.aiCN")})</option>
                  <option value="minimax_global">MiniMax (Global)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama ({t("settings.aiLocal")})</option>
                  <option value="custom">{t("settings.aiCustom")}</option>
                </select>
              </SettingItem>
              {settings.ai_provider !== "ollama" && (
                <SettingItem label="API Key">
                  <input
                    type="password"
                    value={apiKeyFor(currentProvider)}
                    onChange={(e) => setApiKeyFor(currentProvider, e.target.value)}
                    placeholder="sk-..."
                    className="text-sm border border-border rounded-lg px-2 py-1 w-48"
                  />
                </SettingItem>
              )}
              <SettingItem label={t("settings.aiModel")}>
                <input
                  type="text"
                  value={settings.ai_model || ""}
                  onChange={(e) => updateSetting("ai_model", e.target.value)}
                  placeholder={{
                    anthropic: "claude-sonnet-4-20250514",
                    google: "gemini-2.0-flash",
                    minimax: "MiniMax-M2.7",
                    minimax_global: "MiniMax-M2.7",
                    deepseek: "deepseek-chat",
                    ollama: "llama3.2",
                    openai: "gpt-4o-mini",
                    custom: "model-name",
                  }[settings.ai_provider || "openai"] || "gpt-4o-mini"}
                  className="text-sm border border-border rounded-lg px-2 py-1 w-48"
                />
              </SettingItem>
              {["custom", "openai", "minimax", "minimax_global", "deepseek", "ollama"].includes(settings.ai_provider || "openai") && (
                <SettingItem label="Base URL">
                  <input
                    type="text"
                    value={settings.ai_base_url || ""}
                    onChange={(e) => updateSetting("ai_base_url", e.target.value)}
                    placeholder={{
                      ollama: "http://localhost:11434/v1/chat/completions",
                      deepseek: "https://api.deepseek.com/v1/chat/completions",
                      minimax: "https://api.minimaxi.com/anthropic/v1/messages",
                      minimax_global: "https://api.minimax.io/anthropic/v1/messages",
                    }[settings.ai_provider || ""] || "https://api.openai.com/v1/chat/completions"}
                    className="text-sm border border-border rounded-lg px-2 py-1 w-64"
                  />
                </SettingItem>
              )}
              <SettingItem label={t("settings.aiPersonality")}>
                <textarea
                  value={settings.ai_personality || t("settings.aiDefaultPersonality")}
                  onChange={(e) => updateSetting("ai_personality", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1 w-64 h-20 resize-none"
                />
              </SettingItem>
            </div>
          );})()}

          {activeSection === "telegram" && (
            <div className="space-y-4">
              <p className="text-xs text-text-hint mb-2">{t("settings.tgDesc")}</p>
              <SettingItem label={t("settings.tgStatus")}>
                <span className={`text-sm ${tgRunning ? "text-green-500" : "text-text-hint"}`}>
                  {tgRunning ? `✅ @${tgUsername}` : t("settings.tgStopped")}
                </span>
              </SettingItem>
              <SettingItem label="Bot Token">
                <input
                  type="password"
                  value={tgToken || settings.telegram_bot_token || ""}
                  onChange={(e) => setTgToken(e.target.value)}
                  placeholder="123456:ABC-DEF..."
                  className="text-sm border border-border rounded-lg px-2 py-1 w-64"
                />
              </SettingItem>
              {tgError && <p className="text-xs text-red-400">{tgError}</p>}
              <div className="flex gap-2">
                {!tgRunning ? (
                  <button
                    onClick={async () => {
                      const token = tgToken || settings.telegram_bot_token || "";
                      if (!token.trim()) { setTgError(t("settings.tgTokenRequired")); return; }
                      setTgLoading(true); setTgError("");
                      try {
                        const result = await ipc.startTelegramBot(token.trim());
                        setTgRunning(result.running);
                        setTgUsername(result.bot_username);
                        setSettings((prev) => ({ ...prev, telegram_bot_token: token.trim() }));
                      } catch (e: any) {
                        setTgError(String(e));
                      } finally { setTgLoading(false); }
                    }}
                    disabled={tgLoading}
                    className="text-sm bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent-hover disabled:opacity-50"
                  >
                    {tgLoading ? t("settings.tgConnecting") : t("settings.tgStart")}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await ipc.stopTelegramBot();
                      setTgRunning(false);
                      setTgUsername(null);
                    }}
                    className="text-sm bg-red-400 text-white px-4 py-1.5 rounded-lg hover:bg-red-500"
                  >
                    {t("settings.tgStop")}
                  </button>
                )}
              </div>
              <div className="mt-4 p-3 bg-warm-50 rounded-lg text-xs text-text-secondary space-y-1">
                <p className="font-medium">{t("settings.tgHowTo")}</p>
                <p>1. {t("settings.tgStep1")}</p>
                <p>2. {t("settings.tgStep2")}</p>
                <p>3. {t("settings.tgStep3")}</p>
              </div>
            </div>
          )}

          {activeSection === "writing" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.sendMode")}>
                <select
                  value={settings.send_mode || "enter"}
                  onChange={(e) => updateSetting("send_mode", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="enter">{t("settings.sendEnter")}</option>
                  <option value="ctrl_enter">{t("settings.sendCtrlEnter")}</option>
                </select>
              </SettingItem>
              <SettingItem label={t("settings.dailyPrompt")}>
                <ToggleSwitch
                  checked={settings.daily_prompt !== "false"}
                  onChange={(v) => updateSetting("daily_prompt", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label={t("settings.imageCompress")}>
                <ToggleSwitch
                  checked={settings.image_compress !== "false"}
                  onChange={(v) => updateSetting("image_compress", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label={t("settings.reminder")}>
                <ToggleSwitch
                  checked={settings.reminder_enabled === "true"}
                  onChange={(v) => updateSetting("reminder_enabled", v ? "true" : "false")}
                />
              </SettingItem>
              {settings.reminder_enabled === "true" && (
                <SettingItem label={t("settings.reminderTime")}>
                  <input
                    type="time"
                    value={settings.reminder_time || "21:00"}
                    onChange={(e) => updateSetting("reminder_time", e.target.value)}
                    className="text-sm border border-border rounded-lg px-2 py-1"
                  />
                </SettingItem>
              )}
              <SettingItem label={t("settings.quickCaptureShortcut")}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.quick_capture_shortcut || "CmdOrCtrl+Shift+M"}
                    onChange={(e) => updateSetting("quick_capture_shortcut", e.target.value)}
                    className="text-sm border border-border rounded-lg px-2 py-1 w-48 font-mono"
                  />
                  <button
                    onClick={async () => {
                      const shortcut = settings.quick_capture_shortcut || "CmdOrCtrl+Shift+M";
                      try {
                        await ipc.updateQuickCaptureShortcut(shortcut);
                        setAccountSuccess(t("settings.shortcutApplied"));
                        setTimeout(() => setAccountSuccess(""), 2000);
                      } catch (e: any) {
                        setAccountError(String(e));
                        setTimeout(() => setAccountError(""), 4000);
                      }
                    }}
                    className="text-sm bg-accent text-white px-3 py-1 rounded-lg hover:bg-accent-hover"
                  >
                    {t("settings.apply")}
                  </button>
                </div>
              </SettingItem>
              <SettingItem label={t("settings.toggleWindowShortcut")}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.toggle_window_shortcut || "CmdOrCtrl+Shift+O"}
                    onChange={(e) => updateSetting("toggle_window_shortcut", e.target.value)}
                    className="text-sm border border-border rounded-lg px-2 py-1 w-48 font-mono"
                  />
                  <button
                    onClick={async () => {
                      const shortcut = settings.toggle_window_shortcut || "CmdOrCtrl+Shift+O";
                      try {
                        await ipc.updateToggleWindowShortcut(shortcut);
                        setAccountSuccess(t("settings.shortcutApplied"));
                        setTimeout(() => setAccountSuccess(""), 2000);
                      } catch (e: any) {
                        setAccountError(String(e));
                        setTimeout(() => setAccountError(""), 4000);
                      }
                    }}
                    className="text-sm bg-accent text-white px-3 py-1 rounded-lg hover:bg-accent-hover"
                  >
                    {t("settings.apply")}
                  </button>
                </div>
              </SettingItem>
              <p className="text-xs text-text-hint pl-1 -mt-2">
                {t("settings.shortcutHint")}
              </p>
            </div>
          )}

          {activeSection === "display" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.fontSize")}>
                <select
                  value={settings.font_size || "14"}
                  onChange={(e) => {
                    updateSetting("font_size", e.target.value);
                    document.documentElement.style.fontSize = e.target.value + "px";
                  }}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="12">{t("settings.fontSmall")}</option>
                  <option value="14">{t("settings.fontDefault")}</option>
                  <option value="16">{t("settings.fontLarge")}</option>
                  <option value="18">{t("settings.fontXLarge")}</option>
                </select>
              </SettingItem>
              <SettingItem label={t("settings.ambientBg")}>
                <ToggleSwitch
                  checked={settings.ambient_bg !== "false"}
                  onChange={(v) => updateSetting("ambient_bg", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label={t("settings.seasonalParticles")}>
                <ToggleSwitch
                  checked={settings.seasonal_particles !== "false"}
                  onChange={(v) => updateSetting("seasonal_particles", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label={t("settings.language")}>
                <select
                  value={settings.language || "auto"}
                  onChange={async (e) => {
                    const val = e.target.value;
                    await updateSetting("language", val);
                    const { default: i18n } = await import("../../lib/i18n");
                    if (val === "auto") {
                      const lang = navigator.language.startsWith("zh") ? "zh" : "en";
                      i18n.changeLanguage(lang);
                    } else {
                      i18n.changeLanguage(val);
                    }
                  }}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="auto">{t("settings.langAuto")}</option>
                  <option value="zh">{t("settings.langChinese")}</option>
                  <option value="en">English</option>
                </select>
              </SettingItem>
            </div>
          )}

          {activeSection === "data" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.exportDb")}>
                <button onClick={async () => {
                  const { save, message: showMessage } = await import("@tauri-apps/plugin-dialog");
                  const path = await save({ defaultPath: "murmur-backup.zip", filters: [{ name: "ZIP", extensions: ["zip"] }] });
                  if (path) {
                    try {
                      await ipc.exportDatabase(path);
                      await showMessage(t("settings.exportSuccess"), { title: t("settings.done") });
                    } catch (e: any) {
                      await showMessage(t("settings.exportFailed") + e, { title: t("settings.error"), kind: "error" });
                    }
                  }
                }} className="text-sm text-accent hover:text-accent-hover">
                  {t("settings.export")}
                </button>
              </SettingItem>
              <SettingItem label={t("settings.importDb")}>
                <button onClick={async () => {
                  const { open, message: showMessage } = await import("@tauri-apps/plugin-dialog");
                  const path = await open({ filters: [{ name: "ZIP", extensions: ["zip"] }] });
                  if (path) {
                    const password = window.prompt(t("settings.importPasswordPrompt"));
                    if (password) {
                      try {
                        await ipc.importDatabase(path as string, password);
                        await showMessage(t("settings.importSuccess"), { title: t("settings.done") });
                        window.location.reload();
                      } catch (e: any) {
                        await showMessage(t("settings.importFailed") + e, { title: t("settings.error"), kind: "error" });
                      }
                    }
                  }
                }} className="text-sm text-accent hover:text-accent-hover">
                  {t("settings.import")}
                </button>
              </SettingItem>
              <SettingItem label={t("settings.deleteAll")}>
                <button onClick={async () => {
                  const { ask, message: showMessage } = await import("@tauri-apps/plugin-dialog");
                  const confirmed = await ask(t("settings.deleteConfirm"), { title: t("settings.deleteConfirmTitle"), kind: "warning" });
                  if (confirmed) {
                    const doubleConfirm = await ask(t("settings.deleteFinal"), { title: t("settings.deleteFinalTitle"), kind: "warning" });
                    if (doubleConfirm) {
                      try {
                        await ipc.deleteAllData();
                        await showMessage(t("settings.deleteSuccess"), { title: t("settings.done") });
                        window.location.reload();
                      } catch (e: any) {
                        await showMessage(t("settings.deleteFailed") + e, { title: t("settings.error"), kind: "error" });
                      }
                    }
                  }
                }} className="text-sm text-red-400 hover:text-red-500">
                  {t("settings.delete")}
                </button>
              </SettingItem>
            </div>
          )}

          {activeSection === "about" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.version")}>
                <span className="text-sm text-text-secondary">v{appVersion}</span>
              </SettingItem>
              <SettingItem label={t("settings.checkUpdate")}>
                <button className="text-sm text-accent hover:text-accent-hover">
                  {t("settings.check")}
                </button>
              </SettingItem>
              <div className="mt-6 text-center text-text-hint text-xs">
                <p>{t("settings.appName")}</p>
                <p className="mt-1">{t("settings.tagline")}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-sm text-text-primary">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors relative
        ${checked ? "bg-accent" : "bg-border"}`}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}
