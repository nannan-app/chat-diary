import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("09 - Settings", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("9.1 should set and get a setting", async () => {
    await tauriInvoke("set_setting", { key: "test_key", value: "test_value" });
    const r = await tauriInvoke("get_setting", { key: "test_key" }) as any;
    expect(r.ok).toBe("test_value");
  });

  it("9.2 should get all settings", async () => {
    const r = await tauriInvoke("get_all_settings") as any;
    expect(r.ok).toBeDefined();
    expect(Array.isArray(r.ok)).toBe(true);
    const found = r.ok.find((pair: any) => pair[0] === "test_key");
    expect(found).toBeDefined();
    expect(found[1]).toBe("test_value");
  });

  it("9.3 should persist AI provider setting", async () => {
    await tauriInvoke("set_setting", { key: "ai_provider", value: "openai" });
    const r = await tauriInvoke("get_setting", { key: "ai_provider" }) as any;
    expect(r.ok).toBe("openai");
  });

  it("9.4 should persist send mode setting", async () => {
    await tauriInvoke("set_setting", { key: "send_mode", value: "ctrl_enter" });
    const r = await tauriInvoke("get_setting", { key: "send_mode" }) as any;
    expect(r.ok).toBe("ctrl_enter");
  });

  it("9.5 should persist language setting", async () => {
    await tauriInvoke("set_setting", { key: "language", value: "en" });
    const r = await tauriInvoke("get_setting", { key: "language" }) as any;
    expect(r.ok).toBe("en");
    // Reset to auto
    await tauriInvoke("set_setting", { key: "language", value: "auto" });
  });

  it("9.6 should persist birthday setting", async () => {
    await tauriInvoke("set_setting", { key: "birthday", value: "1990-06-15" });
    const r = await tauriInvoke("get_setting", { key: "birthday" }) as any;
    expect(r.ok).toBe("1990-06-15");
  });

  it("9.7 should persist display settings", async () => {
    await tauriInvoke("set_setting", { key: "font_size", value: "16" });
    await tauriInvoke("set_setting", { key: "ambient_bg", value: "false" });
    await tauriInvoke("set_setting", { key: "seasonal_particles", value: "false" });

    const fontSize = ((await tauriInvoke("get_setting", { key: "font_size" })) as any).ok;
    const ambientBg = ((await tauriInvoke("get_setting", { key: "ambient_bg" })) as any).ok;
    const particles = ((await tauriInvoke("get_setting", { key: "seasonal_particles" })) as any).ok;

    expect(fontSize).toBe("16");
    expect(ambientBg).toBe("false");
    expect(particles).toBe("false");
  });
});
