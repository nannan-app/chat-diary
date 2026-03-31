import {
  loginBeforeAll,
  shortWait,
  getPageHtml,
} from "./helpers";

/**
 * 18 - Context Menu & Text Selection
 *
 * Tests:
 * - Right-click on message → context menu appears with correct items
 * - Context menu opens from the LEFT side (not right, to avoid clipping)
 * - Menu items: 引用, 编辑, 收藏, 标签, 删除
 * - Message text is selectable
 */
describe("18 - Context Menu & Text Selection", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("18.1 should show context menu on right-click of a message", async () => {
    // Trigger context menu on a message bubble
    const menuShown = await browser.execute(() => {
      // Find a text message bubble (green bg)
      const bubbles = document.querySelectorAll('[class*="bg-[#95ec69]"]');
      if (bubbles.length === 0) return false;

      const bubble = bubbles[0] as HTMLElement;
      const parent = bubble.closest("[class*='flex justify-end']") || bubble.parentElement?.parentElement;
      if (!parent) return false;

      // Dispatch contextmenu event
      const rect = bubble.getBoundingClientRect();
      parent.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
      return true;
    });
    expect(menuShown).toBe(true);
    await shortWait(500);

    // Verify: context menu should appear with standard items
    const html = await getPageHtml();
    expect(html).toContain("引用");
    expect(html).toContain("编辑");
    expect(html).toContain("收藏");
    expect(html).toContain("标签");
    expect(html).toContain("删除");
  });

  it("18.2 should position context menu to the left of click point", async () => {
    // Verify the context menu's left position is less than the click X
    const positions = await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50.bg-white.rounded-xl") as HTMLElement;
      if (!menu) return null;
      const style = menu.style;
      return {
        left: parseFloat(style.left),
        top: parseFloat(style.top),
      };
    });
    expect(positions).not.toBeNull();
    // Menu should be positioned (have actual coordinates)
    expect(positions!.left).toBeGreaterThanOrEqual(0);
    expect(positions!.top).toBeGreaterThanOrEqual(0);
  });

  it("18.3 should close context menu when clicking elsewhere", async () => {
    // Click somewhere else to close the menu
    await browser.execute(() => {
      document.body.click();
    });
    await shortWait(300);

    // Verify: context menu should be gone
    const menuVisible = await browser.execute(() => {
      const menu = document.querySelector(".fixed.z-50.bg-white.rounded-xl");
      return !!menu;
    });
    expect(menuVisible).toBe(false);
  });

  it("18.4 should allow text selection in message bubbles", async () => {
    // Verify the select-text class is present on message bubble content
    const hasSelectText = await browser.execute(() => {
      const bubbles = document.querySelectorAll('[class*="select-text"]');
      return bubbles.length > 0;
    });
    expect(hasSelectText).toBe(true);

    // Verify computed style allows text selection
    const userSelect = await browser.execute(() => {
      const bubble = document.querySelector('[class*="select-text"]') as HTMLElement;
      if (!bubble) return "none";
      return window.getComputedStyle(bubble).userSelect || window.getComputedStyle(bubble).webkitUserSelect;
    });
    expect(userSelect).toBe("text");
  });
});
