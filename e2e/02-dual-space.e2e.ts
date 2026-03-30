import { shortWait, tauriInvoke, lockAndReload, doLogin, reactSetValue, clickByText, loginBeforeAll } from "./helpers";

const PASSWORD = "test1234";

describe("02 - Dual Space Privacy", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("2.1 should be in private space after correct login", async () => {
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("private");
  });

  it("2.2 should write a private message", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msg = (await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "PRIVATE_SECRET_DATA",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    }) as any).ok;
    expect(msg.content).toBe("PRIVATE_SECRET_DATA");
  });

  it("2.3 should enter public space with wrong password", async () => {
    await lockAndReload();
    await doLogin("wrong-password-xyz");
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("public");
  });

  it("2.4 should NOT see private data in public space", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const found = (msgs || []).some((m: any) => m.content === "PRIVATE_SECRET_DATA");
    expect(found).toBe(false);
  });

  it("2.5 should write in public space independently", async () => {
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msg = (await tauriInvoke("send_message", {
      diaryDayId: day.id, kind: "text", content: "PUBLIC_DATA",
      imageId: null, articleId: null, mood: null, quoteRefId: null, source: "app",
    }) as any).ok;
    expect(msg.content).toBe("PUBLIC_DATA");
  });

  it("2.6 should not switch to private without master key", async () => {
    // In public-only session, switch_space to private should fail
    const r = await tauriInvoke("switch_space", { target: "private" }) as any;
    expect(r.ok).toBe("public");
  });

  it("2.7 should re-login to private and switch spaces", async () => {
    await lockAndReload();
    await doLogin(PASSWORD);
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("private");

    // Switch to public
    const r2 = await tauriInvoke("switch_space", { target: "public" }) as any;
    expect(r2.ok).toBe("public");

    // Verify public data is visible
    const day = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs = (await tauriInvoke("get_messages", { diaryDayId: day.id }) as any).ok;
    const found = (msgs || []).some((m: any) => m.content === "PUBLIC_DATA");
    expect(found).toBe(true);

    // Switch back to private
    const r3 = await tauriInvoke("switch_space", { target: "private" }) as any;
    expect(r3.ok).toBe("private");

    // Private data should be back
    const day2 = (await tauriInvoke("get_or_create_today") as any).ok;
    const msgs2 = (await tauriInvoke("get_messages", { diaryDayId: day2.id }) as any).ok;
    const found2 = (msgs2 || []).some((m: any) => m.content === "PRIVATE_SECRET_DATA");
    expect(found2).toBe(true);
  });
});
