import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  reactSetValue,
  clickByText,
} from "./helpers";

/**
 * 11 - Export
 *
 * Export is a backend data transformation (no UI trigger for single-day export).
 * Data setup uses UI (send messages). Export verification uses IPC.
 * This is a legitimate use of IPC for the target — there is no UI path to
 * call export_diary_day, it's only exposed through the export feature.
 */
describe("11 - Export", () => {
  let dayId: number;

  before(async () => {
    await loginBeforeAll("final1234");

    // Setup: send test messages via UI
    await browser.waitUntil(
      async () => browser.execute(() => !!document.querySelector("textarea")),
      { timeout: 10000 }
    );

    await reactSetValue("textarea", "Export test message via UI");
    await shortWait(300);
    await clickByText("button", "发送");
    await shortWait(1500);

    // Send a mood via UI
    await browser.execute(() => {
      const btn = document.querySelector('button[title="心情"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(500);
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

    // Get day ID for export (verification IPC)
    dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
  });

  it("11.1 should export diary day in document format", async () => {
    const r = (await tauriInvoke("export_diary_day", {
      diaryDayId: dayId,
      format: "document",
    })) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.length).toBeGreaterThan(0);
    expect(r.ok).toContain("Export test message via UI");
  });

  it("11.2 should export diary day in chat format", async () => {
    const r = (await tauriInvoke("export_diary_day", {
      diaryDayId: dayId,
      format: "chat",
    })) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok).toContain("Export test message via UI");
  });

  it("11.3 should include mood in export", async () => {
    const r = (await tauriInvoke("export_diary_day", {
      diaryDayId: dayId,
      format: "document",
    })) as any;
    expect(r.ok).toContain("😊");
  });
});
