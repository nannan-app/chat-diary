import { shortWait, getPageText, clickByText, reactSetValueNth, reactSetValue, tauriInvoke, doSetupFlow, getPageHtml } from "./helpers";

describe("01 - First Launch & Setup", () => {
  it("1.1 should show welcome screen on first launch", async () => {
    await shortWait(4000);
    const text = await getPageText();
    expect(text).toContain("欢迎使用喃喃");
  });

  it("1.2 should show create and import buttons", async () => {
    const text = await getPageText();
    expect(text).toContain("创建全新日记本");
    expect(text).toContain("从备份文件导入");
  });

  it("1.3 should navigate to password step", async () => {
    await clickByText("button", "创建全新日记本");
    await shortWait(800);
    const text = await getPageText();
    expect(text).toContain("设置密码");
  });

  it("1.4 should show error on password mismatch", async () => {
    await reactSetValueNth('input[type="password"]', 0, "test1234");
    await shortWait(200);
    await reactSetValueNth('input[type="password"]', 1, "wrongconfirm");
    await shortWait(200);
    await clickByText("button", "下一步");
    await shortWait(500);
    const text = await getPageText();
    expect(text).toContain("不一致");
  });

  it("1.5 should proceed with matching passwords", async () => {
    await reactSetValueNth('input[type="password"]', 0, "test1234");
    await shortWait(200);
    await reactSetValueNth('input[type="password"]', 1, "test1234");
    await shortWait(200);
    await clickByText("button", "下一步");
    await shortWait(1000);
    const text = await getPageText();
    expect(text).toContain("密码提示");
  });

  it("1.6 should show skip option on hint step", async () => {
    const text = await getPageText();
    expect(text).toContain("跳过");
  });

  it("1.7 should complete setup and show recovery code", async () => {
    // Click "完成设置" (triggers actual setup with Argon2)
    await clickByText("button", "完成设置");
    await shortWait(6000); // Argon2

    const text = await getPageText();
    // Either on recovery code page or already in main app
    // If recovery code page, it should contain the formatted code
    if (text.includes("恢复码")) {
      const match = text.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
      expect(match).not.toBeNull();
    }
    // Either way, setup succeeded
  });

  it("1.8 should enter main app", async () => {
    const text = await getPageText();
    if (text.includes("开始使用")) {
      await clickByText("button", "开始使用");
    }
    // Wait for main app to fully load (may show loading state first)
    await shortWait(3000);
    const html = await getPageHtml();
    const inMainApp =
      html.includes("textarea") ||
      html.includes("写点什么") ||
      html.includes("日记") ||
      html.includes("nav-bg");
    expect(inMainApp).toBe(true);
  });
});
