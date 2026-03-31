import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  getPageHtml,
} from "./helpers";

/**
 * 07 - Favorites
 *
 * Add to favorites via right-click context menu (UI).
 * View favorites by navigating to the Favorites view (UI).
 * Remove favorites from the Favorites view (UI).
 */
describe("07 - Favorites", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("7.1 should add message to favorites via context menu", async () => {
    // Right-click a message bubble to open context menu
    const menuShown = await browser.execute(() => {
      const bubbles = document.querySelectorAll('[class*="bg-[#95ec69]"]');
      if (bubbles.length === 0) return false;
      const bubble = bubbles[0] as HTMLElement;
      const parent = bubble.closest("[class*='flex justify-end']") || bubble.parentElement?.parentElement;
      if (!parent) return false;
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

    // Click "收藏" in context menu
    await browser.execute(() => {
      const btns = document.querySelectorAll(".fixed.z-50 button");
      for (const b of btns) {
        if (b.textContent?.includes("收藏")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1000);
  });

  it("7.2 should show favorites in Favorites view", async () => {
    // Navigate to Favorites via nav bar
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("收藏")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(2000);

    // Verify: favorites view has at least one item (not empty state)
    const isEmpty = await browser.execute(() => {
      return document.body.innerText.includes("收藏你珍视的每一段文字");
    });
    expect(isEmpty).toBe(false);
  });

  it("7.3 should display content preview in favorites list", async () => {
    // Verify: a truncated text element should exist within the favorites list
    const hasPreview = await browser.execute(() => {
      const items = document.querySelectorAll(".truncate");
      for (const item of items) {
        if (item.textContent && item.textContent.length > 0) return true;
      }
      return false;
    });
    expect(hasPreview).toBe(true);
  });

  it("7.4 should navigate back to diary", async () => {
    // Click diary nav button to go back
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("日记")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1000);

    // Verify: back to diary view (textarea visible)
    const hasTextarea = await browser.execute(() => {
      return !!document.querySelector("textarea");
    });
    expect(hasTextarea).toBe(true);
  });
});
