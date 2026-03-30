import { tauriInvoke, loginBeforeAll } from "./helpers";

describe("12 - Random Memory", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("12.1 should return a random diary day with entries", async () => {
    const r = await tauriInvoke("get_random_diary_day") as any;
    // Should return a day since we have entries from earlier tests
    expect(r.ok).toBeDefined();
    expect(r.ok.date).toBeDefined();
    expect(r.ok.word_count).toBeGreaterThan(0);
  });
});
