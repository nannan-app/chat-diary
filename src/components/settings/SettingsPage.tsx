import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Bot, PenLine, Palette, Database, Info, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import * as ipc from "../../lib/ipc";
import { useAuthStore } from "../../stores/authStore";

type Section = "account" | "ai" | "writing" | "display" | "data" | "about";

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
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    ipc.getAllSettings().then((pairs) => {
      const map: Record<string, string> = {};
      for (const [k, v] of pairs) map[k] = v;
      setSettings(map);
    });
  }, []);

  const updateSetting = async (key: string, value: string) => {
    await ipc.setSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sections: { id: Section; label: string; icon: React.FC<any> }[] = [
    { id: "account", label: t("settings.account"), icon: ShieldCheck },
    { id: "ai", label: t("settings.ai"), icon: Bot },
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
                <div className="pl-2">
                  <div className="bg-warm-100 p-2 rounded-lg font-mono text-sm text-center select-all">{recoveryCode}</div>
                  <p className="text-xs text-text-hint mt-1">{t("settings.recoverySaveNote")}</p>
                </div>
              )}

              <SettingItem label={t("settings.birthday")}>
                <input type="date" value={settings.birthday || ""} onChange={(e) => updateSetting("birthday", e.target.value)} className="text-sm border border-border rounded-lg px-2 py-1" />
              </SettingItem>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-4">
              <SettingItem label={t("settings.aiProvider")}>
                <select
                  value={settings.ai_provider || "builtin"}
                  onChange={(e) => updateSetting("ai_provider", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="builtin">{t("settings.aiBuiltin")}</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">{t("settings.aiCustom")}</option>
                </select>
              </SettingItem>
              {settings.ai_provider && settings.ai_provider !== "builtin" && (
                <SettingItem label="API Key">
                  <input
                    type="password"
                    value={settings.ai_api_key || ""}
                    onChange={(e) => updateSetting("ai_api_key", e.target.value)}
                    placeholder="sk-..."
                    className="text-sm border border-border rounded-lg px-2 py-1 w-48"
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
                <span className="text-sm text-text-secondary">0.1.0</span>
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
