import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  clickByText,
  getPageHtml,
} from "./helpers";

/**
 * 99 - Destructive Tests (run last)
 *
 * Delete all data via Settings UI data management section.
 * Note: Tauri dialog plugin's ask() cannot be automated, so we use IPC
 * for the actual delete. But we verify the UI path exists.
 */
describe("99 - Destructive Tests (run last)", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("99.1 should show delete button in settings data section", async () => {
    // Open settings
    await browser.execute(() => {
      const btn = document.querySelector('button[title="设置"]') as HTMLElement;
      btn?.click();
    });
    await shortWait(800);

    // Navigate to data management
    await clickByText("button", "数据管理");
    await shortWait(500);

    // Verify delete button is present and styled red
    const hasDeleteBtn = await browser.execute(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent?.trim() === "删除" && b.classList.contains("text-red-400")) {
          return true;
        }
      }
      return false;
    });
    expect(hasDeleteBtn).toBe(true);

    // Close settings before IPC call
    await browser.execute(() => {
      const backdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement;
      backdrop?.click();
    });
    await shortWait(500);
  });

  it("99.2 should delete all data via IPC (dialog can't be automated)", async () => {
    // The actual delete uses Tauri dialog plugin (ask/confirm) which is OS-native
    // and cannot be automated by WebDriver. Use IPC for the delete itself.
    const r = (await tauriInvoke("delete_all_data")) as any;
    expect(r.error).toBeUndefined();
  });

  it("99.3 should show fresh state after delete", async () => {
    const r = (await tauriInvoke("check_setup")) as any;
    expect(r.ok).toBe(false);
  });
});
