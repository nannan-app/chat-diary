import { tauriInvoke, loginBeforeAll, shortWait, reactSetValue, getPageHtml } from "./helpers";

/**
 * 04 - Full-Text Search
 *
 * Search is a core UI interaction: type in search box → see results.
 * Data preparation (creating searchable content) uses IPC as a precondition.
 */
describe("04 - Full-Text Search", () => {
  before(async () => {
    await loginBeforeAll("test1234");

    // Precondition: create searchable data via IPC
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "SearchTestAlpha wonderful weather today",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
    await tauriInvoke("create_article", {
      diaryDayId: day.id, title: "Search Article Title", content: "This article has UniqueKeywordBeta inside",
    });
  });

  it("4.1 should type in search box and see matching results", async () => {
    // Find the search input (placeholder="搜索日记...")
    await reactSetValue('input[placeholder="搜索日记..."]', "SearchTestAlpha");
    await shortWait(1500);

    // Search results should appear in the sidebar
    const html = await getPageHtml();
    expect(html).toContain("SearchTestAlpha");
  });

  it("4.2 should search for article content via UI", async () => {
    await reactSetValue('input[placeholder="搜索日记..."]', "UniqueKeywordBeta");
    await shortWait(1500);

    // Article search result should appear
    const html = await getPageHtml();
    // The search results component shows article results
    expect(html).toContain("Search Article Title");
  });

  it("4.3 should clear search and return to diary list", async () => {
    await reactSetValue('input[placeholder="搜索日记..."]', "");
    await shortWait(500);

    // Should be back to normal diary list (no search results overlay)
    const html = await getPageHtml();
    // The diary list shows date entries, not search results
    expect(html).toContain("月");
  });

  it("4.4 should show empty state for non-matching search", async () => {
    await reactSetValue('input[placeholder="搜索日记..."]', "zzznonexistent999");
    await shortWait(1500);

    // Should not show any matching content
    const hasResults = await browser.execute(() => {
      // Check if any search result items exist
      const text = document.body.innerText || "";
      return text.includes("SearchTestAlpha") || text.includes("UniqueKeywordBeta");
    });
    expect(hasResults).toBe(false);

    // Clean up: clear search
    await reactSetValue('input[placeholder="搜索日记..."]', "");
    await shortWait(300);
  });

  // IPC verification: confirm search backend correctness
  it("4.5 should find messages via FTS5 backend", async () => {
    const r = (await tauriInvoke("search", { query: "SearchTestAlpha" }) as any);
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok[0].diary_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
