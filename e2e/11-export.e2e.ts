import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("11 - Export", () => {
  let dayId: number;

  before(async () => {
    await loginBeforeAll("final1234");
    dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    // Create test data for export (today may be empty if date changed)
    await tauriInvoke("send_message", {
      diaryDayId: dayId, kind: "text", content: "Export test message content here",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    });
    await tauriInvoke("send_message", {
      diaryDayId: dayId, kind: "mood", content: null,
      imageId: null, articleId: null, mood: "😊", quoteRefId: null, source: "app",
    });
  });

  it("11.1 should export diary day in document format", async () => {
    const r = await tauriInvoke("export_diary_day", {
      diaryDayId: dayId, format: "document",
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok).toContain("#");
  });

  it("11.2 should export diary day in chat format", async () => {
    const r = await tauriInvoke("export_diary_day", {
      diaryDayId: dayId, format: "chat",
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok).toContain("===");
  });

  it("11.3 should include message content in export", async () => {
    const r = await tauriInvoke("export_diary_day", {
      diaryDayId: dayId, format: "document",
    }) as any;
    expect(r.ok.length).toBeGreaterThan(50);
  });

  it("11.4 should include mood in document export", async () => {
    const r = await tauriInvoke("export_diary_day", {
      diaryDayId: dayId, format: "document",
    }) as any;
    expect(r.ok).toContain("心情");
  });
});
