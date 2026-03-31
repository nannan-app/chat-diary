import { tauriInvoke, loginBeforeAll, shortWait, getPageHtml } from "./helpers";

/**
 * 12 - Random Memory
 *
 * Clicking the dice button is a UI interaction — test it through the UI.
 */
describe("12 - Random Memory", () => {
  before(async () => {
    await loginBeforeAll("final1234");

    // Precondition: ensure there's at least one diary entry with content
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "RandomMemoryTestData",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
  });

  it("12.1 should click dice button and navigate to a diary entry", async () => {
    // Click the dice button (title="随机回忆")
    await browser.execute(() => {
      const btn = document.querySelector('button[title="随机回忆"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(1500);

    // The diary view should show a date header (navigated to a past entry)
    const html = await getPageHtml();
    expect(html).toContain("年");
    expect(html).toContain("日");
  });

  // IPC verification: confirm backend returns data
  it("12.2 should have random diary day available via backend", async () => {
    const r = (await tauriInvoke("get_random_diary_day") as any);
    expect(r.ok).toBeDefined();
    expect(r.ok.word_count).toBeGreaterThan(0);
  });
});
