import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("99 - Destructive Tests (run last)", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("should delete all data successfully", async () => {
    const r = await tauriInvoke("delete_all_data") as any;
    expect(r.error).toBeUndefined();
  });

  it("should show fresh state after delete", async () => {
    const r = await tauriInvoke("check_setup") as any;
    expect(r.ok).toBe(false);
  });
});
