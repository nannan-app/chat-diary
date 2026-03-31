import { tauriInvoke, loginBeforeAll, shortWait, getPageHtml } from "./helpers";

/**
 * 14 - AI Summary
 *
 * AI summary is triggered by clicking the toolbar button — test via UI.
 * Verify the AI reply bubble appears in the chat.
 */
describe("14 - AI Summary", () => {
  before(async () => {
    await loginBeforeAll("final1234");
    // Precondition: ensure today has content for AI to summarize
    const day = ((await tauriInvoke("get_or_create_today")) as any).ok;
    await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "Today I went for a walk and enjoyed the sunshine",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
    // Reload page so the message shows in the UI
    await browser.execute(() => window.location.reload());
    await shortWait(4000);
    await loginBeforeAll("final1234");
  });

  it("14.1 should click AI button and see AI reply bubble", async () => {
    // Click the AI toolbar button (title="AI 总结与反馈")
    await browser.execute(() => {
      const btn = document.querySelector('button[title="AI 总结与反馈"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(3000);

    // The AI reply should appear as a white/left-aligned bubble
    // AI replies use bg-white and rounded-tl-md
    const hasAiReply = await browser.execute(() => {
      const bubbles = document.querySelectorAll('[class*="bg-white"][class*="rounded-tl-md"]');
      return bubbles.length > 0;
    });
    expect(hasAiReply).toBe(true);
  });

  it("14.2 should show AI reply content in DOM", async () => {
    const html = await getPageHtml();
    // Builtin AI returns placeholder text containing "今天" or "记录"
    expect(
      html.includes("今天") || html.includes("记录") || html.includes("内容")
    ).toBe(true);
  });

  // IPC verification: backend error handling
  it("14.3 should error on empty diary day via backend", async () => {
    let gotError = false;
    try {
      const r = await tauriInvoke("ai_summarize", {
        diaryDayId: 999999,
        apiProvider: "builtin",
        apiKey: "",
        apiUrl: null,
        personality: "test",
      }) as any;
      if (r.error) gotError = true;
    } catch {
      gotError = true;
    }
    expect(gotError).toBe(true);
  });
});
