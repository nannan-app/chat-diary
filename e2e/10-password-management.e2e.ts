import { tauriInvoke, lockAndReload, doLogin, shortWait, loginBeforeAll } from "./helpers";

describe("10 - Password Management", () => {
  before(async () => {
    await loginBeforeAll("test1234");
  });

  it("10.1 should change password successfully", async () => {
    const r = await tauriInvoke("change_password", {
      oldPassword: "test1234",
      newPassword: "newpass5678",
      newHint: "new hint",
    }) as any;
    expect(r.error).toBeUndefined();
  });

  it("10.2 should login with new password", async () => {
    await lockAndReload();
    await doLogin("newpass5678");
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("private");
  });

  it("10.3 should fail login with old password (enters public)", async () => {
    await lockAndReload();
    await doLogin("test1234");
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("public");
  });

  it("10.4 should get and update password hint", async () => {
    await lockAndReload();
    await doLogin("newpass5678");

    await tauriInvoke("update_password_hint", { hint: "updated hint text" });
    const r = await tauriInvoke("get_password_hint") as any;
    expect(r.ok).toBe("updated hint text");
  });

  it("10.5 should regenerate recovery code", async () => {
    const r = await tauriInvoke("regenerate_recovery_code") as any;
    expect(r.ok).toBeDefined();
    expect(r.ok).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("10.6 should reset password with recovery code", async () => {
    const codeResult = await tauriInvoke("regenerate_recovery_code") as any;
    const recoveryCode = codeResult.ok;

    await lockAndReload();

    const r = await tauriInvoke("reset_password_with_recovery", {
      recoveryCode,
      newPassword: "reset9999",
      newHint: "after reset",
    }) as any;
    expect(r.ok).toBeDefined();
    expect(r.ok.recovery_code).toBeDefined();
    expect(r.ok.recovery_code).not.toBe(recoveryCode);
  });

  it("10.7 should login with reset password", async () => {
    await lockAndReload();
    await doLogin("reset9999");
    const r = await tauriInvoke("get_space") as any;
    expect(r.ok).toBe("private");
  });

  it("10.8 should fail with invalid recovery code", async () => {
    let failed = false;
    try {
      const r = await tauriInvoke("reset_password_with_recovery", {
        recoveryCode: "AAAA-BBBB-CCCC-DDDD-EEEE",
        newPassword: "shouldfail",
        newHint: null,
      }) as any;
      if (r.error) failed = true;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  it("10.9 should restore password for subsequent tests", async () => {
    // We're still logged in from 10.7 (reset_password_with_recovery auto-logins)
    // or from the failed 10.8 which didn't change anything.
    // Make sure we're in private space.
    const space = (await tauriInvoke("get_space") as any).ok;
    if (space !== "private") {
      await lockAndReload();
      await doLogin("reset9999");
    }
    // Change to final password
    const r = await tauriInvoke("change_password", {
      oldPassword: "reset9999",
      newPassword: "final1234",
      newHint: null,
    }) as any;
    expect(r.error).toBeUndefined();
  });
});
