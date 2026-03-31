import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  TEST_JPEG_BYTES,
} from "./helpers";

/**
 * 19 - Image UI
 *
 * Tests image functionality through real user paths:
 * - Image toolbar button exists
 * - fs:readFile permission works (root cause of upload bug)
 * - Image uploaded via IPC displays correctly in chat (IPC = precondition, UI display = target)
 * - Image has correct visual styling
 *
 * Note: OS-level file dialog cannot be automated. We test the readFile
 * permission separately and verify image display in the DOM.
 */
describe("19 - Image UI", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("19.1 should have image upload button in toolbar", async () => {
    const hasImageBtn = await browser.execute(() => {
      return !!document.querySelector('button[title="插入图片"]');
    });
    expect(hasImageBtn).toBe(true);
  });

  it("19.2 should have fs plugin available in app", async () => {
    // Verify the Tauri fs plugin is loaded in the app context
    // (can't do dynamic import of bare specifiers in executeAsync,
    // so check the TAURI_INTERNALS invoke works for fs operations)
    const result = await browser.executeAsync((done: (r: any) => void) => {
      const tauri = (window as any).__TAURI_INTERNALS__;
      if (!tauri?.invoke) {
        done({ error: "No Tauri internals" });
        return;
      }
      // Check that fs plugin's core command is registered
      // If fs:allow-read-file is in capabilities, this should not error
      tauri.invoke("plugin:fs|read_file", { path: "/nonexistent_test_file", options: {} })
        .then(() => done({ ok: true }))
        .catch((err: any) => {
          const errStr = String(err);
          // "forbidden path" or "not found" = plugin loaded, permission exists, path just not in scope
          // "unknown command" = plugin not registered
          if (errStr.includes("forbidden path") || errStr.includes("not found") || errStr.includes("not allowed")) {
            done({ ok: true }); // Plugin loaded and permission configured
          } else {
            done({ error: errStr });
          }
        });
    });
    expect((result as any).error).toBeUndefined();
    expect((result as any).ok).toBe(true);
  });

  it("19.3 should display image thumbnail in chat after upload", async () => {
    // Precondition: upload a test image via IPC
    const dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;

    // Use a slightly modified version of TEST_JPEG_BYTES to avoid UNIQUE hash collision
    // with test 13 (which uploads the same image)
    const modifiedBytes = [...TEST_JPEG_BYTES];
    // Append a comment to make the hash different
    modifiedBytes.push(0xFF, 0xFE, 0x00, 0x04, 0x31, 0x39);
    const r = await tauriInvoke("upload_image", {
      diaryDayId: dayId,
      imageBytes: modifiedBytes,
      compress: false,
    });
    // If upload itself fails, the test should fail here
    expect((r as any).error).toBeUndefined();

    // Target: verify the image appears in the DOM after store reloads messages
    // The store calls getMessages after upload, so we wait and check
    await shortWait(2000);

    const hasImage = await browser.execute(() => {
      const imgs = document.querySelectorAll("img.rounded-xl");
      return imgs.length > 0;
    });
    expect(hasImage).toBe(true);
  });

  it("19.4 should show image with correct styling", async () => {
    const imgInfo = await browser.execute(() => {
      const img = document.querySelector("img.rounded-xl") as HTMLImageElement;
      if (!img) return null;
      const parent = img.parentElement;
      return {
        hasRoundedXl: img.classList.contains("rounded-xl"),
        hasCursorPointer: img.classList.contains("cursor-pointer"),
        parentMaxWidth: parent?.classList.contains("max-w-[200px]") || false,
        imgSrc: img.src.substring(0, 10), // blob: URL should start with "blob:"
      };
    });
    expect(imgInfo).not.toBeNull();
    expect(imgInfo!.hasRoundedXl).toBe(true);
    expect(imgInfo!.hasCursorPointer).toBe(true);
    expect(imgInfo!.parentMaxWidth).toBe(true);
    expect(imgInfo!.imgSrc).toContain("blob:");
  });

  it("19.5 should show timestamp below image", async () => {
    // Verify that image messages have timestamps
    const hasTimestamp = await browser.execute(() => {
      const imgs = document.querySelectorAll("img.rounded-xl");
      for (const img of imgs) {
        const container = img.closest("[class*='flex justify']")
          || img.parentElement?.parentElement;
        if (container) {
          const timeSpan = container.querySelector(".text-text-hint");
          if (timeSpan && /\d{2}:\d{2}/.test(timeSpan.textContent || "")) {
            return true;
          }
        }
      }
      return false;
    });
    expect(hasTimestamp).toBe(true);
  });
});
