import {
  loginBeforeAll,
  shortWait,
  getPageHtml,
  reactSetValue,
} from "./helpers";

/**
 * 06 - Tag System (UI)
 *
 * All tag operations go through the UI tag panel.
 * See also 16-tag-ui.e2e.ts for additional tag UI tests.
 */
describe("06 - Tag System (UI)", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("6.1 should open tag panel and see system tags", async () => {
    await browser.execute(() => {
      const btn = document.querySelector('button[title="标签"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    const html = await getPageHtml();
    expect(html).toContain("工作");
    expect(html).toContain("生活");
    expect(html).toContain("旅行");
    expect(html).toContain("感悟");
    expect(html).toContain("学习");
  });

  it("6.2 should toggle a system tag on current day via UI", async () => {
    // Click the "工作" tag to assign it
    await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent?.trim() === "工作" || b.textContent?.includes("工作")) {
          if (b.closest('[class*="flex-wrap"]')) {
            b.click();
            return;
          }
        }
      }
    });
    await shortWait(1000);

    // Verify: tag gets colored background (selected state)
    const isSelected = await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent?.includes("工作") && (b as HTMLElement).style.backgroundColor) {
          return true;
        }
      }
      return false;
    });
    expect(isSelected).toBe(true);
  });

  it("6.3 should create custom tag via tag panel input", async () => {
    // Find the tag creation input
    const hasInput = await browser.execute(() => {
      return !!document.querySelector('input[placeholder*="标签"]');
    });

    if (hasInput) {
      await reactSetValue('input[placeholder*="标签"]', "UI自定义标签");
      await shortWait(300);

      // Submit (Enter or click create button)
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
      expect(html).toContain("UI自定义标签");
    }
  });

  it("6.4 should toggle tag off (deselect)", async () => {
    // Click "工作" again to deselect
    await browser.execute(() => {
      const buttons = document.querySelectorAll("button");
      for (const b of buttons) {
        if (b.textContent?.includes("工作") && (b as HTMLElement).style.backgroundColor) {
          b.click();
          return;
        }
      }
    });
    await shortWait(500);
  });

  it("6.5 should assign message-level tag via context menu", async () => {
    // Close tag panel first
    await browser.execute(() => {
      const btn = document.querySelector('button[title="标签"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(300);

    // Right-click on a message
    await browser.execute(() => {
      const bubbles = document.querySelectorAll('[class*="bg-[#95ec69]"]');
      if (bubbles.length === 0) return;
      const bubble = bubbles[0] as HTMLElement;
      const parent = bubble.closest("[class*='flex justify-end']") || bubble.parentElement?.parentElement;
      if (!parent) return;
      const rect = bubble.getBoundingClientRect();
      parent.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10,
      }));
    });
    await shortWait(500);

    // Click "标签" in context menu
    await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50");
      if (!menu) return;
      const btns = menu.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("标签")) { (b as HTMLElement).click(); return; }
      }
    });
    await shortWait(1500); // Async tag loading needs more time

    // Verify: tag selector sub-panel shows with checkboxes
    const hasTagSelector = await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50");
      if (!menu) return false;
      return menu.innerHTML.includes("选择标签");
    });
    expect(hasTagSelector).toBe(true);

    // Click a tag to assign it to message
    await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50");
      if (!menu) return;
      const btns = menu.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("生活")) { b.click(); return; }
      }
    });
    await shortWait(500);

    // Click "完成"
    await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50");
      if (!menu) return;
      const btns = menu.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("完成")) { (b as HTMLElement).click(); return; }
      }
    });
    await shortWait(500);
  });
});
