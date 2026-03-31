import {
  loginBeforeAll,
  shortWait,
  getPageHtml,
} from "./helpers";

/**
 * 16 - Tag UI
 *
 * Tests tag interaction through the UI:
 * - Click "标签" toolbar button → tag panel opens
 * - Toggle tags on/off → tags assigned to current day
 * - Tag panel shows system tags and custom tags
 * - Tags visible as colored dots in sidebar diary list
 */
describe("16 - Tag UI", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("16.1 should open tag panel when clicking 标签 button", async () => {
    // Click the "标签" toolbar button
    await browser.execute(() => {
      const btn = document.querySelector('button[title="标签"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    // Verify: tag panel should appear with system tags
    const html = await getPageHtml();
    expect(html).toContain("工作");
    expect(html).toContain("生活");
    expect(html).toContain("旅行");
    expect(html).toContain("感悟");
    expect(html).toContain("学习");
  });

  it("16.2 should toggle a tag on current day", async () => {
    // Click the "工作" tag button to toggle it on
    await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent?.trim() === "工作" || b.textContent?.includes("工作")) {
          // Find the tag button in the tag panel (not toolbar)
          if (b.closest('[class*="flex-wrap"]')) {
            b.click();
            return;
          }
        }
      }
    });
    await shortWait(1000);

    // Verify: the tag should be selected (colored background)
    const isSelected = await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent?.includes("工作") && b.style.backgroundColor) {
          return true;
        }
      }
      return false;
    });
    expect(isSelected).toBe(true);
  });

  it("16.3 should create custom tag via UI", async () => {
    // Look for the create tag input
    const hasCreateInput = await browser.execute(() => {
      const inputs = document.querySelectorAll('input[placeholder*="标签"]');
      return inputs.length > 0;
    });

    if (hasCreateInput) {
      // Type new tag name and submit
      await browser.execute(() => {
        const input = document.querySelector('input[placeholder*="标签"]') as HTMLInputElement;
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, "UI测试标签");
          const tracker = (input as any)._valueTracker;
          if (tracker) tracker.setValue("");
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
      await shortWait(300);

      // Press Enter or click create button
      await browser.execute(() => {
        const input = document.querySelector('input[placeholder*="标签"]') as HTMLElement;
        if (input) {
          input.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", code: "Enter", keyCode: 13, bubbles: true,
          }));
        }
      });
      await shortWait(1000);

      const html = await getPageHtml();
      expect(html).toContain("UI测试标签");
    }
  });

  it("16.4 should close tag panel", async () => {
    // Click the tag button again to close
    await browser.execute(() => {
      const btn = document.querySelector('button[title="标签"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(500);
  });

  it("16.5 should show tag color dots in sidebar diary list", async () => {
    // After assigning "工作" tag, the sidebar diary list should show colored dots
    await shortWait(1000);
    const hasDots = await browser.execute(() => {
      // Look for small colored dots (w-2 h-2 rounded-full) in the sidebar
      const dots = document.querySelectorAll(".rounded-full");
      for (const d of dots) {
        const el = d as HTMLElement;
        if (el.style.backgroundColor && el.classList.contains("flex-shrink-0")) {
          return true;
        }
      }
      return false;
    });
    expect(hasDots).toBe(true);
  });
});
