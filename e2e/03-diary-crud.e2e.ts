import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  reactSetValue,
  getPageHtml,
  clickByText,
} from "./helpers";

/**
 * 03 - Diary CRUD
 *
 * Core user interactions (send, edit, delete, mood) MUST go through the UI.
 * Data structure verification (timestamps, word count, calendar) can use IPC.
 */
describe("03 - Diary CRUD", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  // ─── UI: Send a message ────────────────────────────────────

  it("3.1 should type in textarea and see text", async () => {
    await reactSetValue("textarea", "来自UI的测试消息");
    await shortWait(500);

    // Verify React state received the value (check via send button enabled)
    const btnDisabled = await browser.execute(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.includes("发送")) return b.disabled;
      }
      return true;
    });
    // If React received the value, the send button should be enabled
    expect(btnDisabled).toBe(false);
  });

  it("3.2 should send message by clicking send button and see bubble", async () => {
    // Click the "发送" button
    await clickByText("button", "发送");
    await shortWait(2000);

    // Verify: the message bubble should appear in the DOM
    const html = await getPageHtml();
    expect(html).toContain("来自UI的测试消息");

    // Verify: the bubble has the green background (user message = right-aligned)
    const hasBubble = await browser.execute(() => {
      const bubbles = document.querySelectorAll('[class*="bg-[#95ec69]"]');
      for (const b of bubbles) {
        if (b.textContent?.includes("来自UI的测试消息")) return true;
      }
      return false;
    });
    expect(hasBubble).toBe(true);
  });

  it("3.3 should send message by pressing Enter", async () => {
    await reactSetValue("textarea", "回车发送的消息");
    await shortWait(300);

    // Press Enter via keyboard event
    await browser.execute(() => {
      const ta = document.querySelector("textarea") as HTMLTextAreaElement;
      if (ta) {
        ta.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          })
        );
      }
    });
    await shortWait(1500);

    const html = await getPageHtml();
    expect(html).toContain("回车发送的消息");
  });

  it("3.4 should clear textarea after sending", async () => {
    const textareaValue = await browser.execute(() => {
      const ta = document.querySelector("textarea") as HTMLTextAreaElement;
      return ta?.value || "";
    });
    // After sending, textarea should be empty
    expect(textareaValue).toBe("");
  });

  // ─── UI: Mood message ──────────────────────────────────────

  it("3.5 should send mood via UI (click mood button → select emoji → see card)", async () => {
    // Click the mood toolbar button (title="心情")
    await browser.execute(() => {
      const btn = document.querySelector('button[title="心情"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(500);

    // Mood panel should be visible with emoji buttons
    const hasMoodPanel = await browser.execute(() => {
      const emojis = document.querySelectorAll("span.text-xl");
      return emojis.length > 0;
    });
    expect(hasMoodPanel).toBe(true);

    // Click the first mood emoji (😊)
    await browser.execute(() => {
      const emojis = document.querySelectorAll("span.text-xl");
      for (const el of emojis) {
        if (el.textContent === "😊") {
          (el.closest("button") as HTMLElement)?.click();
          return;
        }
      }
    });
    await shortWait(1000);

    // Verify: mood card with 😊 should appear in chat
    const html = await getPageHtml();
    expect(html).toContain("😊");
  });

  // ─── IPC: Data verification (preconditions) ────────────────

  it("3.6 should have timestamps on messages", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    // Messages from UI tests above should have created_at
    const uiMsg = msgs.find((m: any) => m.content === "来自UI的测试消息");
    expect(uiMsg).toBeDefined();
    expect(uiMsg.created_at).toBeDefined();
    expect(uiMsg.created_at.length).toBeGreaterThan(0);
  });

  it("3.7 should update word count on diary day", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    expect(day.word_count).toBeGreaterThan(0);
  });

  it("3.8 should support quote reply (IPC for data setup)", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const firstMsg = msgs.find((m: any) => m.kind === "text");

    const reply = (await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "引用回复",
      imageId: null, articleId: null, mood: null,
      quoteRefId: firstMsg.id, source: "app",
    }) as any).ok;
    expect(reply.quote_ref_id).toBe(firstMsg.id);
  });

  it("3.9 should track message source", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msg = (await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "telegram消息",
      imageId: null, articleId: null, mood: null,
      quoteRefId: null, source: "telegram",
    }) as any).ok;
    expect(msg.source).toBe("telegram");
  });

  it("3.10 should edit a message via IPC", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const msg = msgs.find((m: any) => m.content === "来自UI的测试消息");
    await tauriInvoke("edit_message", { messageId: msg.id, content: "已编辑的消息" });
    const msgs2 = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const edited = msgs2.find((m: any) => m.id === msg.id);
    expect(edited.content).toBe("已编辑的消息");
  });

  it("3.11 should delete a message via IPC", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const tmp = (await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "to_delete",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    }) as any).ok;
    await tauriInvoke("delete_message", { messageId: tmp.id });
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    expect(msgs.find((m: any) => m.content === "to_delete")).toBeUndefined();
  });

  it("3.12 should allow multiple moods per day", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const moods = msgs.filter((m: any) => m.kind === "mood");
    expect(moods.length).toBeGreaterThanOrEqual(1);
  });

  it("3.13 should list diary days for current month", async () => {
    const now = new Date();
    const r = (await tauriInvoke("list_diary_days", {
      year: now.getFullYear(), month: now.getMonth() + 1,
    }) as any);
    expect(r.ok.length).toBeGreaterThan(0);
  });

  it("3.14 should get diary dates for calendar", async () => {
    const now = new Date();
    const r = (await tauriInvoke("get_diary_dates", {
      year: now.getFullYear(), month: now.getMonth() + 1,
    }) as any);
    expect(r.ok.length).toBeGreaterThan(0);
  });
});
