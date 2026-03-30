import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import * as ipc from "../../lib/ipc";
import { useAuthStore } from "../../stores/authStore";

type Section = "account" | "ai" | "writing" | "display" | "data" | "about";

export default function SettingsPage({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [settings, setSettings] = useState<Record<string, string>>({});
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

  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "account", label: "账户与安全", icon: "🔐" },
    { id: "ai", label: "AI 设置", icon: "🤖" },
    { id: "writing", label: "写作偏好", icon: "✏️" },
    { id: "display", label: "显示", icon: "🎨" },
    { id: "data", label: "数据管理", icon: "💾" },
    { id: "about", label: "关于", icon: "ℹ️" },
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
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400
                       hover:bg-red-50 transition-colors"
          >
            🚪 锁定并退出
          </button>
        </div>

        {/* Right content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-lg font-medium text-text-primary mb-4">
            {sections.find((s) => s.id === activeSection)?.label}
          </h2>

          {activeSection === "account" && (
            <div className="space-y-4">
              <SettingItem label="修改密码">
                <button className="text-sm text-accent hover:text-accent-hover">
                  修改
                </button>
              </SettingItem>
              <SettingItem label="密码提示语">
                <button className="text-sm text-accent hover:text-accent-hover">
                  修改
                </button>
              </SettingItem>
              <SettingItem label="恢复码">
                <button className="text-sm text-accent hover:text-accent-hover">
                  查看
                </button>
              </SettingItem>
              <SettingItem label="生日">
                <input
                  type="date"
                  value={settings.birthday || ""}
                  onChange={(e) => updateSetting("birthday", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                />
              </SettingItem>
            </div>
          )}

          {activeSection === "ai" && (
            <div className="space-y-4">
              <SettingItem label="AI Provider">
                <select
                  value={settings.ai_provider || "builtin"}
                  onChange={(e) => updateSetting("ai_provider", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="builtin">内置 (MiniMax)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">自定义</option>
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
              <SettingItem label="AI 性格">
                <textarea
                  value={settings.ai_personality || "你是一个温暖的朋友，善于倾听和给出温暖的反馈。"}
                  onChange={(e) => updateSetting("ai_personality", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1 w-64 h-20 resize-none"
                />
              </SettingItem>
            </div>
          )}

          {activeSection === "writing" && (
            <div className="space-y-4">
              <SettingItem label="发送方式">
                <select
                  value={settings.send_mode || "enter"}
                  onChange={(e) => updateSetting("send_mode", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="enter">Enter 发送</option>
                  <option value="ctrl_enter">Ctrl+Enter 发送</option>
                </select>
              </SettingItem>
              <SettingItem label="每日写作引导">
                <ToggleSwitch
                  checked={settings.daily_prompt !== "false"}
                  onChange={(v) => updateSetting("daily_prompt", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label="图片默认压缩">
                <ToggleSwitch
                  checked={settings.image_compress !== "false"}
                  onChange={(v) => updateSetting("image_compress", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label="定时提醒">
                <ToggleSwitch
                  checked={settings.reminder_enabled === "true"}
                  onChange={(v) => updateSetting("reminder_enabled", v ? "true" : "false")}
                />
              </SettingItem>
              {settings.reminder_enabled === "true" && (
                <SettingItem label="提醒时间">
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
              <SettingItem label="字体大小">
                <select
                  value={settings.font_size || "14"}
                  onChange={(e) => {
                    updateSetting("font_size", e.target.value);
                    document.documentElement.style.fontSize = e.target.value + "px";
                  }}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="12">小</option>
                  <option value="14">默认</option>
                  <option value="16">大</option>
                  <option value="18">超大</option>
                </select>
              </SettingItem>
              <SettingItem label="时间氛围背景">
                <ToggleSwitch
                  checked={settings.ambient_bg !== "false"}
                  onChange={(v) => updateSetting("ambient_bg", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label="季节粒子动效">
                <ToggleSwitch
                  checked={settings.seasonal_particles !== "false"}
                  onChange={(v) => updateSetting("seasonal_particles", v ? "true" : "false")}
                />
              </SettingItem>
              <SettingItem label="语言">
                <select
                  value={settings.language || "auto"}
                  onChange={(e) => updateSetting("language", e.target.value)}
                  className="text-sm border border-border rounded-lg px-2 py-1"
                >
                  <option value="auto">跟随系统</option>
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </SettingItem>
            </div>
          )}

          {activeSection === "data" && (
            <div className="space-y-4">
              <SettingItem label="导出数据库">
                <button className="text-sm text-accent hover:text-accent-hover">
                  导出
                </button>
              </SettingItem>
              <SettingItem label="导入数据库">
                <button className="text-sm text-accent hover:text-accent-hover">
                  全新导入
                </button>
                <button className="text-sm text-accent hover:text-accent-hover ml-2">
                  合并导入
                </button>
              </SettingItem>
              <SettingItem label="删除所有数据">
                <button className="text-sm text-red-400 hover:text-red-500">
                  删除
                </button>
              </SettingItem>
            </div>
          )}

          {activeSection === "about" && (
            <div className="space-y-4">
              <SettingItem label="版本">
                <span className="text-sm text-text-secondary">0.1.0</span>
              </SettingItem>
              <SettingItem label="检查更新">
                <button className="text-sm text-accent hover:text-accent-hover">
                  检查
                </button>
              </SettingItem>
              <div className="mt-6 text-center text-text-hint text-xs">
                <p>喃喃 · Murmur</p>
                <p className="mt-1">用聊天的方式，记录每一天</p>
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
