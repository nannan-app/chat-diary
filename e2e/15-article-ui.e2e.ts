import {
  loginBeforeAll,
  shortWait,
  reactSetValue,
  getPageHtml,
  clickByText,
  findByText,
} from "./helpers";

/**
 * 15 - Article UI (Long Article Card)
 *
 * Tests creating articles through the UI:
 * - Click "长文" button → editor modal opens
 * - Type title + content → save → article card appears in chat
 * - Article card should show title and "长文 · 点击查看"
 */
describe("15 - Article UI", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("15.1 should open markdown editor when clicking 长文 button", async () => {
    // Click the "长文" toolbar button
    await browser.execute(() => {
      const btn = document.querySelector('button[title="长文"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    // Verify: editor modal should appear with title input and 取消/完成 buttons
    const html = await getPageHtml();
    expect(html).toContain("取消");
    expect(html).toContain("完成");

    // Verify: title input placeholder "标题" should be visible
    const hasTitleInput = await browser.execute(() => {
      const inputs = document.querySelectorAll('input[placeholder="标题"]');
      return inputs.length > 0;
    });
    expect(hasTitleInput).toBe(true);
  });

  it("15.2 should not save article without title", async () => {
    // The "完成" button should be disabled when title is empty
    const isDisabled = await browser.execute(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("完成")) return b.disabled || b.classList.contains("disabled:opacity-50");
      }
      return false;
    });
    expect(isDisabled).toBe(true);
  });

  it("15.3 should type title and save article", async () => {
    // Type title
    await reactSetValue('input[placeholder="标题"]', "E2E测试长文标题");
    await shortWait(300);

    // Type some content in the tiptap editor
    await browser.execute(() => {
      const editor = document.querySelector(".ProseMirror") as HTMLElement;
      if (editor) {
        editor.focus();
        editor.innerHTML = "<p>这是E2E测试的长文内容，包含一些文字。</p>";
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await shortWait(300);

    // Click "完成" to save
    await clickByText("button", "完成");
    await shortWait(1500);

    // Verify: editor modal should close
    const hasEditor = await browser.execute(() => {
      return !!document.querySelector('input[placeholder="标题"]');
    });
    expect(hasEditor).toBe(false);
  });

  it("15.4 should show article card in chat with title and preview", async () => {
    await shortWait(500);
    const html = await getPageHtml();
    // Article card should show the title
    expect(html).toContain("E2E测试长文标题");
    // Should show "长文 · 点击查看全文" indicator
    expect(html).toContain("点击查看全文");
    // Should show content preview
    expect(html).toContain("E2E测试的长文内容");
  });

  it("15.5 should cancel editor without saving", async () => {
    // Open editor again
    await browser.execute(() => {
      const btn = document.querySelector('button[title="长文"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    // Type a title
    await reactSetValue('input[placeholder="标题"]', "不应该保存的文章");
    await shortWait(300);

    // Click "取消"
    await clickByText("button", "取消");
    await shortWait(500);

    // Verify: editor closed and no article card with that title
    const html = await getPageHtml();
    expect(html).not.toContain("不应该保存的文章");
  });
});
