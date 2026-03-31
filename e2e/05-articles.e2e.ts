import {
  loginBeforeAll,
  shortWait,
  reactSetValue,
  getPageHtml,
  clickByText,
} from "./helpers";

/**
 * 05 - Markdown Articles (UI)
 *
 * Replaced IPC-based tests with UI tests.
 * See also 15-article-ui.e2e.ts for additional article UI tests.
 */
describe("05 - Markdown Articles (UI)", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("5.1 should create article via editor UI", async () => {
    // Click the "长文" toolbar button
    await browser.execute(() => {
      const btn = document.querySelector('button[title="长文"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    // Type title
    await reactSetValue('input[placeholder="标题"]', "IPC替代测试长文");
    await shortWait(300);

    // Type content in tiptap editor
    await browser.execute(() => {
      const editor = document.querySelector(".ProseMirror") as HTMLElement;
      if (editor) {
        editor.focus();
        editor.innerHTML = "<p>这是通过UI创建的长文内容，用于替代IPC测试。</p>";
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await shortWait(300);

    // Click "完成"
    await clickByText("button", "完成");
    await shortWait(1500);

    // Verify: article card appears in chat
    const html = await getPageHtml();
    expect(html).toContain("IPC替代测试长文");
    expect(html).toContain("点击查看全文");
  });

  it("5.2 should show article card with content preview", async () => {
    const html = await getPageHtml();
    expect(html).toContain("通过UI创建的长文内容");
  });

  it("5.3 should navigate to library and see article", async () => {
    // Click library nav button
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("文库")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1500);

    // Verify: library should list the article
    const html = await getPageHtml();
    expect(html).toContain("IPC替代测试长文");
  });

  it("5.4 should navigate back to diary", async () => {
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

    const hasTextarea = await browser.execute(() => {
      return !!document.querySelector("textarea");
    });
    expect(hasTextarea).toBe(true);
  });
});
