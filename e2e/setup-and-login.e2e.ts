import { shortWait, clickByText, getPageText, getPageHtml } from "./helpers";

/**
 * React-compatible value setter via native setter + synthetic event.
 */
async function reactSetValueNth(
  selector: string,
  index: number,
  value: string
) {
  await browser.execute(
    (sel: string, idx: number, val: string) => {
      const els = document.querySelectorAll(sel) as NodeListOf<HTMLInputElement>;
      const el = els[idx];
      if (!el) return;
      el.focus();
      const proto =
        el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    index,
    value
  );
}

async function reactSetValue(selector: string, value: string) {
  await reactSetValueNth(selector, 0, value);
}

/**
 * Call Tauri IPC from browser context using executeAsync.
 * We JSON-encode the args to avoid the WebDriver plugin intercepting the invoke.
 */
async function tauriInvoke(cmd: string, args: Record<string, any> = {}) {
  const argsJson = JSON.stringify(args);
  return browser.executeAsync(
    (command: string, argsStr: string, done: (result: any) => void) => {
      try {
        const parsedArgs = JSON.parse(argsStr);
        const tauri = (window as any).__TAURI_INTERNALS__;
        if (!tauri || !tauri.invoke) {
          done({ error: "No Tauri internals" });
          return;
        }
        tauri
          .invoke(command, parsedArgs)
          .then((result: any) => done({ ok: result }))
          .catch((err: any) => done({ error: String(err) }));
      } catch (e: any) {
        done({ error: e.message });
      }
    },
    cmd,
    argsJson
  );
}

// ===================== TESTS =====================

describe("Setup Flow", () => {
  it("should show the welcome screen on first launch", async () => {
    await shortWait(4000); // Wait for app load
    const text = await getPageText();
    expect(text).toContain("欢迎使用喃喃");
  });

  it("should navigate to password step", async () => {
    await clickByText("button", "创建全新日记本");
    await shortWait(800);
    const text = await getPageText();
    expect(text).toContain("设置密码");
  });

  it("should enter password and proceed", async () => {
    await reactSetValueNth('input[type="password"]', 0, "test1234");
    await shortWait(200);
    await reactSetValueNth('input[type="password"]', 1, "test1234");
    await shortWait(200);
    await clickByText("button", "下一步");
    await shortWait(1000);
    const text = await getPageText();
    expect(text).toContain("密码提示");
  });

  it("should complete setup (skip hint) and enter main app", async () => {
    // "完成设置" calls handleSetHint which triggers setup + auto-login
    await clickByText("button", "完成设置");
    await shortWait(6000); // Argon2 key derivation takes time

    // Check if we landed on recovery code page or main app
    const text = await getPageText();
    if (text.includes("开始使用")) {
      await clickByText("button", "开始使用");
      await shortWait(2000);
    }

    // Verify main app is showing
    const html = await getPageHtml();
    expect(
      html.includes("textarea") || html.includes("写点什么")
    ).toBe(true);
  });
});

describe("Diary Writing via IPC", () => {
  it("should create a message via Tauri IPC", async () => {
    // Get today's diary
    const dayResult = await tauriInvoke("get_or_create_today") as any;
    expect(dayResult.ok).toBeDefined();
    const dayId = dayResult.ok.id;

    // Send a message
    const sendResult = await tauriInvoke("send_message", {
      diaryDayId: dayId,
      kind: "text",
      content: "Hello from E2E!",
      imageId: null,
      articleId: null,
      mood: null,
      quoteRefId: null,
      source: "app",
    }) as any;
    expect(sendResult.ok).toBeDefined();
    expect(sendResult.ok.content).toBe("Hello from E2E!");
  });

  it("should retrieve the message via IPC", async () => {
    const dayResult = await tauriInvoke("get_or_create_today") as any;
    const messagesResult = await tauriInvoke("get_messages", {
      diaryDayId: dayResult.ok.id,
    }) as any;

    expect(messagesResult.ok.length).toBeGreaterThan(0);
    const found = messagesResult.ok.some(
      (m: any) => m.content === "Hello from E2E!"
    );
    expect(found).toBe(true);
  });
});

describe("Search (FTS5)", () => {
  it("should find the message via full-text search", async () => {
    const searchResult = await tauriInvoke("search", {
      query: "E2E",
    }) as any;

    expect(searchResult.ok.length).toBeGreaterThan(0);
    expect(searchResult.ok[0].content_preview).toContain("E2E");
  });
});

describe("Lock & Re-Login", () => {
  it("should lock and return to login screen", async () => {
    await tauriInvoke("lock");
    await shortWait(500);
    await browser.execute(() => window.location.reload());
    await shortWait(3000);

    const text = await getPageText();
    // Should show login screen with password field and "进入" button
    expect(text).toContain("进入");
  });

  it("should re-login with correct password", async () => {
    await reactSetValue('input[type="password"]', "test1234");
    await shortWait(300);
    await clickByText("button", "进入");
    await shortWait(5000); // Argon2

    // Verify we're back in private space
    const spaceResult = await tauriInvoke("get_space") as any;
    expect(spaceResult.ok).toBe("private");

    // Message should still be there
    const dayResult = await tauriInvoke("get_or_create_today") as any;
    const messagesResult = await tauriInvoke("get_messages", {
      diaryDayId: dayResult.ok.id,
    }) as any;
    const found = messagesResult.ok.some(
      (m: any) => m.content === "Hello from E2E!"
    );
    expect(found).toBe(true);
  });
});

describe("Dual Space Privacy", () => {
  it("should enter public space with wrong password", async () => {
    // Lock first
    await tauriInvoke("lock");
    await shortWait(500);
    await browser.execute(() => window.location.reload());
    await shortWait(3000);

    // Login with wrong password
    await reactSetValue('input[type="password"]', "wrong-password");
    await shortWait(300);
    await clickByText("button", "进入");
    await shortWait(5000);

    // Should be in public space
    const spaceResult = await tauriInvoke("get_space") as any;
    expect(spaceResult.ok).toBe("public");
  });

  it("should NOT have private messages in public space", async () => {
    const dayResult = await tauriInvoke("get_or_create_today") as any;
    const messagesResult = await tauriInvoke("get_messages", {
      diaryDayId: dayResult.ok.id,
    }) as any;

    // Public space fresh — no messages with our private content
    const found = (messagesResult.ok || []).some(
      (m: any) => m.content === "Hello from E2E!"
    );
    expect(found).toBe(false);
  });
});
