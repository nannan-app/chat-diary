import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("14 - AI Summary", () => {
  before(async () => {
    await loginBeforeAll("final1234");
    // Ensure today has some content for AI to summarize
    const day = ((await tauriInvoke("get_or_create_today")) as any).ok;
    await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "Today I went for a walk and enjoyed the sunshine",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
  });

  it("14.1 should get AI summary with builtin provider", async () => {
    const dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    const r = await tauriInvoke("ai_summarize", {
      diaryDayId: dayId,
      apiProvider: "builtin",
      apiKey: "",
      apiUrl: null,
      personality: "你是一个温暖的朋友",
    }) as any;
    // Builtin returns a placeholder message
    expect(r.ok).toBeDefined();
    expect(r.ok.kind).toBe("ai_reply");
    expect(r.ok.content.length).toBeGreaterThan(0);
  });

  it("14.2 should show AI reply in messages", async () => {
    const dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    const msgs = ((await tauriInvoke("get_messages", { diaryDayId: dayId })) as any).ok;
    const aiMsgs = msgs.filter((m: any) => m.kind === "ai_reply");
    expect(aiMsgs.length).toBeGreaterThan(0);
  });

  it("14.3 should error on empty diary day", async () => {
    // Use a non-existent diary day ID — should get an error about no content
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
