import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("05 - Markdown Articles", () => {
  let dayId: number;

  before(async () => {
    await loginBeforeAll("test1234");
    dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
  });

  it("5.1 should create article with title and content", async () => {
    const r = await tauriInvoke("create_article", {
      diaryDayId: dayId,
      title: "我的第一篇长文",
      content: "# 标题\n\n这是一篇测试长文，包含Markdown格式。\n\n- 列表项1\n- 列表项2",
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.kind).toBe("article");
  });

  it("5.2 should show article in messages list", async () => {
    const r = await tauriInvoke("get_messages", { diaryDayId: dayId }) as any;
    const articles = r.ok.filter((m: any) => m.kind === "article");
    expect(articles.length).toBeGreaterThan(0);
  });

  it("5.3 should list all articles in library", async () => {
    const r = await tauriInvoke("get_all_articles") as any;
    expect(r.ok.length).toBeGreaterThan(0);
    const article = r.ok.find((a: any) => a.title === "我的第一篇长文");
    expect(article).toBeDefined();
    expect(article.content).toContain("Markdown");
  });

  it("5.4 should allow multiple articles per day", async () => {
    await tauriInvoke("create_article", {
      diaryDayId: dayId,
      title: "第二篇长文",
      content: "另一篇文章内容",
    });
    const r = await tauriInvoke("get_all_articles") as any;
    expect(r.ok.length).toBeGreaterThanOrEqual(2);
  });

  it("5.5 should track article word count", async () => {
    const r = await tauriInvoke("get_all_articles") as any;
    const article = r.ok.find((a: any) => a.title === "我的第一篇长文");
    expect(article.word_count).toBeGreaterThan(0);
  });
});
