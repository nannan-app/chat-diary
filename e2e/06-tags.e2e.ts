import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("06 - Tag System", () => {
  let dayId: number;
  let messageId: number;
  let customTagId: number;

  before(async () => {
    await loginBeforeAll("test1234");
    dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    // Get first text message
    const msgs = ((await tauriInvoke("get_messages", { diaryDayId: dayId })) as any).ok;
    const textMsg = msgs.find((m: any) => m.kind === "text");
    messageId = textMsg.id;
  });

  it("6.1 should have system tags", async () => {
    const r = await tauriInvoke("get_tags") as any;
    expect(r.ok.length).toBeGreaterThanOrEqual(5);
    const names = r.ok.map((t: any) => t.name);
    expect(names).toContain("工作");
    expect(names).toContain("生活");
    expect(names).toContain("旅行");
    expect(names).toContain("感悟");
    expect(names).toContain("学习");
  });

  it("6.2 should create custom tag", async () => {
    const r = await tauriInvoke("create_tag", { name: "E2E测试标签" }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.name).toBe("E2E测试标签");
    expect(r.ok.is_system).toBe(false);
    customTagId = r.ok.id;
  });

  it("6.3 should assign Morandi color to custom tag", async () => {
    const r = await tauriInvoke("get_tags") as any;
    const tag = r.ok.find((t: any) => t.name === "E2E测试标签");
    expect(tag.color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("6.4 should set and get day-level tags", async () => {
    const tags = ((await tauriInvoke("get_tags")) as any).ok;
    const workTag = tags.find((t: any) => t.name === "工作");
    await tauriInvoke("set_day_tags", { diaryDayId: dayId, tagIds: [workTag.id, customTagId] });

    const r = await tauriInvoke("get_day_tags", { diaryDayId: dayId }) as any;
    expect(r.ok.length).toBe(2);
    const names = r.ok.map((t: any) => t.name);
    expect(names).toContain("工作");
    expect(names).toContain("E2E测试标签");
  });

  it("6.5 should set and get message-level tags", async () => {
    const tags = ((await tauriInvoke("get_tags")) as any).ok;
    const lifeTag = tags.find((t: any) => t.name === "生活");
    await tauriInvoke("set_message_tags", { messageId, tagIds: [lifeTag.id] });

    const r = await tauriInvoke("get_message_tags", { messageId }) as any;
    expect(r.ok.length).toBe(1);
    expect(r.ok[0].name).toBe("生活");
  });

  it("6.6 should delete custom tag", async () => {
    await tauriInvoke("delete_tag", { tagId: customTagId });
    const r = await tauriInvoke("get_tags") as any;
    const found = r.ok.find((t: any) => t.name === "E2E测试标签");
    expect(found).toBeUndefined();
  });

  it("6.7 should not delete system tag", async () => {
    const tags = ((await tauriInvoke("get_tags")) as any).ok;
    const workTag = tags.find((t: any) => t.name === "工作");
    await tauriInvoke("delete_tag", { tagId: workTag.id });
    const r = await tauriInvoke("get_tags") as any;
    const stillThere = r.ok.find((t: any) => t.name === "工作");
    expect(stillThere).toBeDefined();
  });

  it("6.8 should cascade delete tag from day associations", async () => {
    // Create a tag, assign it, delete it, check it's gone from day tags
    const newTag = ((await tauriInvoke("create_tag", { name: "临时标签" })) as any).ok;
    await tauriInvoke("set_day_tags", { diaryDayId: dayId, tagIds: [newTag.id] });
    await tauriInvoke("delete_tag", { tagId: newTag.id });
    const r = await tauriInvoke("get_day_tags", { diaryDayId: dayId }) as any;
    const found = r.ok.find((t: any) => t.name === "临时标签");
    expect(found).toBeUndefined();
  });
});
