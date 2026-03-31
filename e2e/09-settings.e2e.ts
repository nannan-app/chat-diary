import {
  loginBeforeAll,
  shortWait,
  clickByText,
  getPageHtml,
} from "./helpers";

/**
 * 09 - Settings (UI)
 *
 * All settings changes go through the Settings modal UI.
 * Open settings → navigate sections → change values → verify visually.
 */
describe("09 - Settings (UI)", () => {
  before(async () => {
    await loginBeforeAll("test1234");
    // Open settings modal
    await browser.execute(() => {
      const btn = document.querySelector('button[title="设置"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);
  });

  it("9.1 should show AI settings section", async () => {
    await clickByText("button", "AI");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("AI Provider");
    expect(html).toContain("AI 性格");
  });

  it("9.2 should change AI provider via dropdown", async () => {
    await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.value === "openai") {
            sel.value = "openai";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }
    });
    await shortWait(500);

    // After selecting openai, API Key input should appear
    const hasApiKeyInput = await browser.execute(() => {
      const inputs = document.querySelectorAll('input[type="password"]');
      for (const inp of inputs) {
        if ((inp as HTMLInputElement).placeholder?.includes("sk-")) return true;
      }
      return false;
    });
    expect(hasApiKeyInput).toBe(true);
  });

  it("9.3 should show writing preferences section", async () => {
    await clickByText("button", "写作偏好");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("发送方式");
    expect(html).toContain("图片默认压缩");
  });

  it("9.4 should change send mode via dropdown", async () => {
    await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.value === "ctrl_enter") {
            sel.value = "ctrl_enter";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }
    });
    await shortWait(500);

    // Verify the select now shows ctrl_enter
    const selectedValue = await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.value === "ctrl_enter" && opt.selected) return true;
        }
      }
      return false;
    });
    expect(selectedValue).toBe(true);
  });

  it("9.5 should show display section with font size", async () => {
    await clickByText("button", "显示");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("字体大小");
    expect(html).toContain("时间氛围背景");
    expect(html).toContain("季节粒子动效");
  });

  it("9.6 should change font size via dropdown", async () => {
    await browser.execute(() => {
      const selects = document.querySelectorAll("select");
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.value === "16" && opt.textContent?.includes("大")) {
            sel.value = "16";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }
      }
    });
    await shortWait(500);

    // Verify font size changed on document
    const fontSize = await browser.execute(() => {
      return getComputedStyle(document.documentElement).fontSize;
    });
    expect(fontSize).toBe("16px");
  });

  it("9.7 should show about section with version", async () => {
    await clickByText("button", "关于");
    await shortWait(500);

    const html = await getPageHtml();
    expect(html).toContain("0.1.0");
    expect(html).toContain("喃喃");
  });
});
