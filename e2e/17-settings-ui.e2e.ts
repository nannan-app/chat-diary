import {
  loginBeforeAll,
  shortWait,
  getPageHtml,
  clickByText,
} from "./helpers";

/**
 * 17 - Settings UI
 *
 * Tests settings interaction through the UI:
 * - Open settings modal → navigate sections
 * - Language switch: after switching to English, settings section labels
 *   MUST change to English text (e.g. "Account & Security", "Display")
 * - Delete all data button (verify dialog appears)
 * - Settings modal close
 */
describe("17 - Settings UI", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("17.1 should open settings modal via nav bar", async () => {
    await browser.execute(() => {
      const btn = document.querySelector('button[title="设置"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    const html = await getPageHtml();
    expect(html).toContain("账户与安全");
    expect(html).toContain("AI 设置");
    expect(html).toContain("显示");
    expect(html).toContain("数据管理");
    expect(html).toContain("关于");
  });

  it("17.2 should navigate to display section and see language option", async () => {
    await clickByText("button", "显示");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("语言");
    expect(html).toContain("字体大小");
  });

  it("17.3 should change language to English and see English labels", async () => {
    // Find the language <select> (the one containing "en" option) and change it
    await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        const options = sel.querySelectorAll("option");
        for (const opt of options) {
          if (opt.value === "en") {
            sel.value = "en";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }
    });
    await shortWait(1500);

    // After switching to English, the settings section BUTTONS (not option text)
    // must show English labels. These are the navigation buttons on the left side.
    // We specifically check for button text, not <option> text.
    const buttonTexts = await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      const texts: string[] = [];
      for (const b of buttons) {
        const t = b.textContent?.trim();
        if (t) texts.push(t);
      }
      return texts;
    });

    // At least one settings nav button should now be in English
    const hasAccountSecurity = buttonTexts.some(t => t.includes("Account") || t.includes("Security"));
    const hasDisplay = buttonTexts.some(t => t === "Display");
    const hasAbout = buttonTexts.some(t => t === "About");

    // This assertion will FAIL if i18n is not wired up to components
    expect(hasAccountSecurity || hasDisplay || hasAbout).toBe(true);
  });

  it("17.4 should change language back to Chinese and see Chinese labels", async () => {
    await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        const options = sel.querySelectorAll("option");
        for (const opt of options) {
          if (opt.value === "zh") {
            sel.value = "zh";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }
    });
    await shortWait(1500);

    // Verify Chinese labels are back
    const buttonTexts = await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      const texts: string[] = [];
      for (const b of buttons) {
        const t = b.textContent?.trim();
        if (t) texts.push(t);
      }
      return texts;
    });
    const hasChinese = buttonTexts.some(t => t.includes("账户与安全") || t.includes("显示") || t.includes("关于"));
    expect(hasChinese).toBe(true);
  });

  it("17.5 should navigate to data section and show delete button", async () => {
    await clickByText("button", "数据管理");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("删除所有数据");
    expect(html).toContain("导出数据库");
    expect(html).toContain("导入数据库");

    const hasDeleteBtn = await browser.execute(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("删除") && b.classList.contains("text-red-400")) {
          return true;
        }
      }
      return false;
    });
    expect(hasDeleteBtn).toBe(true);
  });

  it("17.6 should close settings by clicking outside", async () => {
    await browser.execute(() => {
      const backdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
      backdrop?.click();
    });
    await shortWait(500);

    const hasTextarea = await browser.execute(() => {
      return !!document.querySelector("textarea");
    });
    expect(hasTextarea).toBe(true);
  });
});
