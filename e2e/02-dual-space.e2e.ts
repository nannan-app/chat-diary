import {
  shortWait,
  tauriInvoke,
  lockAndReload,
  doLogin,
  reactSetValue,
  clickByText,
  loginBeforeAll,
  getPageHtml,
} from "./helpers";

const PASSWORD = "test1234";

/**
 * 02 - Dual Space Privacy
 *
 * All message operations go through the UI (type + send).
 * Space verification uses tauriInvoke (backend state check = verification, not target).
 * DOM checks verify data isolation visually.
 */
describe("02 - Dual Space Privacy", () => {
  before(async () => {
    await loginBeforeAll(PASSWORD);
  });

  it("2.1 should be in private space after correct login", async () => {
    // Verification: check backend space state
    const r = (await tauriInvoke("get_space")) as any;
    expect(r.ok).toBe("private");
  });

  it("2.2 should send a private message via UI", async () => {
    // TARGET: type and send message through UI
    await reactSetValue("textarea", "PRIVATE_SECRET_DATA");
    await shortWait(300);
    await clickByText("button", "发送");
    await shortWait(1500);

    // Verify: message bubble appears in DOM
    const html = await getPageHtml();
    expect(html).toContain("PRIVATE_SECRET_DATA");
  });

  it("2.3 should enter public space with wrong password", async () => {
    await lockAndReload();
    await doLogin("wrong-password-xyz");

    // Verification: backend confirms public space
    const r = (await tauriInvoke("get_space")) as any;
    expect(r.ok).toBe("public");
  });

  it("2.4 should NOT see private data in public space DOM", async () => {
    // Wait for app to load
    await shortWait(2000);

    // TARGET: check DOM does NOT contain private message
    const html = await getPageHtml();
    expect(html).not.toContain("PRIVATE_SECRET_DATA");
  });

  it("2.5 should send a public message via UI", async () => {
    // Wait for textarea to appear (public space loads today)
    await browser.waitUntil(
      async () => browser.execute(() => !!document.querySelector("textarea")),
      { timeout: 10000 }
    );

    await reactSetValue("textarea", "PUBLIC_DATA_MSG");
    await shortWait(300);
    await clickByText("button", "发送");
    await shortWait(1500);

    const html = await getPageHtml();
    expect(html).toContain("PUBLIC_DATA_MSG");
  });

  it("2.6 should re-login to private and still see private data", async () => {
    await lockAndReload();
    await doLogin(PASSWORD);
    await shortWait(3000);

    // Wait for messages to load
    await browser.waitUntil(
      async () => {
        const html = await getPageHtml();
        return html.includes("PRIVATE_SECRET_DATA");
      },
      { timeout: 10000, timeoutMsg: "Private message not visible after re-login" }
    );

    // TARGET: DOM should show private data, not public data
    const html = await getPageHtml();
    expect(html).toContain("PRIVATE_SECRET_DATA");
    expect(html).not.toContain("PUBLIC_DATA_MSG");
  });
});
