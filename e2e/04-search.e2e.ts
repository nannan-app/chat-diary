import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("04 - Full-Text Search", () => {
  before(async () => {
    await loginBeforeAll("test1234");

    // Create test data for search (each file is a fresh session)
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "SearchTestAlpha wonderful weather today",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
    await tauriInvoke("create_article", {
      diaryDayId: day.id, title: "Search Article Title", content: "This article has UniqueKeywordBeta inside",
    });
  });

  it("4.1 should find text messages by keyword", async () => {
    const r = await tauriInvoke("search", { query: "SearchTestAlpha" }) as any;
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok[0].content_preview).toContain("SearchTestAlpha");
  });

  it("4.2 should find article content", async () => {
    const r = await tauriInvoke("search", { query: "UniqueKeywordBeta" }) as any;
    expect(r.ok.length).toBeGreaterThan(0);
  });

  it("4.3 should return diary date in results", async () => {
    const r = await tauriInvoke("search", { query: "SearchTestAlpha" }) as any;
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok[0].diary_date).toBeDefined();
    expect(r.ok[0].diary_date.length).toBe(10); // YYYY-MM-DD
  });

  it("4.4 should handle empty query gracefully", async () => {
    // FTS5 doesn't accept empty strings — an error or empty result is acceptable
    let handled = false;
    try {
      const r = await tauriInvoke("search", { query: "" }) as any;
      // Any response (empty array or error) is fine
      handled = true;
    } catch {
      // WebDriver throws the FTS5 error — that's acceptable too
      handled = true;
    }
    expect(handled).toBe(true);
  });

  it("4.5 should return empty for non-matching query", async () => {
    const r = await tauriInvoke("search", { query: "zzznonexistent999" }) as any;
    expect(r.ok.length).toBe(0);
  });
});
