import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("07 - Favorites", () => {
  let dayId: number;
  let messageId: number;
  let articleId: number;
  let favId1: number;
  let favId2: number;

  before(async () => {
    await loginBeforeAll("test1234");
    dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    const msgs = ((await tauriInvoke("get_messages", { diaryDayId: dayId })) as any).ok;
    const textMsg = msgs.find((m: any) => m.kind === "text");
    messageId = textMsg.id;

    const articles = ((await tauriInvoke("get_all_articles")) as any).ok;
    articleId = articles[0].id;
  });

  it("7.1 should add message to favorites", async () => {
    const r = await tauriInvoke("add_favorite", {
      messageId,
      articleId: null,
      contentPreview: "这是收藏的消息预览",
      sourceDate: new Date().toISOString().slice(0, 10),
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.message_id).toBe(messageId);
    favId1 = r.ok.id;
  });

  it("7.2 should add article to favorites", async () => {
    const r = await tauriInvoke("add_favorite", {
      messageId: null,
      articleId,
      contentPreview: "长文收藏预览",
      sourceDate: new Date().toISOString().slice(0, 10),
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.article_id).toBe(articleId);
    favId2 = r.ok.id;
  });

  it("7.3 should list all favorites", async () => {
    const r = await tauriInvoke("get_favorites") as any;
    expect(r.ok.length).toBeGreaterThanOrEqual(2);
  });

  it("7.4 should have content preview", async () => {
    const r = await tauriInvoke("get_favorites") as any;
    const fav = r.ok.find((f: any) => f.id === favId1);
    expect(fav.content_preview).toBe("这是收藏的消息预览");
  });

  it("7.5 should have source date", async () => {
    const r = await tauriInvoke("get_favorites") as any;
    const fav = r.ok.find((f: any) => f.id === favId1);
    expect(fav.source_date).toBe(new Date().toISOString().slice(0, 10));
  });

  it("7.6 should remove favorite", async () => {
    await tauriInvoke("remove_favorite", { favoriteId: favId1 });
    const r = await tauriInvoke("get_favorites") as any;
    const found = r.ok.find((f: any) => f.id === favId1);
    expect(found).toBeUndefined();
  });
});
