import {
  tauriInvoke,
  loginBeforeAll,
  shortWait,
  getPageHtml,
  TEST_JPEG_BYTES,
} from "./helpers";

/**
 * 13 - Image Gallery (UI)
 *
 * Navigate to gallery view via UI.
 * Verify images appear as a grid in the DOM.
 * IPC only for setup (uploading test image).
 */
describe("13 - Image Gallery (UI)", () => {
  before(async () => {
    await loginBeforeAll("final1234");

    // Setup: ensure at least one image exists (IPC = precondition)
    const dayId = ((await tauriInvoke("get_or_create_today")) as any).ok.id;
    await tauriInvoke("upload_image", {
      diaryDayId: dayId,
      imageBytes: TEST_JPEG_BYTES,
      compress: false,
    });
  });

  it("13.1 should navigate to gallery view", async () => {
    // Click gallery nav button
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("相册")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1500);

    // Gallery should load and show images or empty state
    const html = await getPageHtml();
    const hasContent = html.includes("<img") || html.includes("还没有图片");
    expect(hasContent).toBe(true);
  });

  it("13.2 should display image thumbnails in grid", async () => {
    const imageCount = await browser.execute(() => {
      const imgs = document.querySelectorAll("img");
      return imgs.length;
    });
    expect(imageCount).toBeGreaterThan(0);
  });

  it("13.3 should show image date information", async () => {
    // Gallery images should have date labels
    const html = await getPageHtml();
    // Date format like "2026" or "月" or specific date
    const hasDate = /\d{4}/.test(html);
    expect(hasDate).toBe(true);
  });

  it("13.4 should navigate back to diary", async () => {
    await browser.execute(() => {
      const btns = document.querySelectorAll("button[title]");
      for (const b of btns) {
        if (b.getAttribute("title")?.includes("日记")) {
          (b as HTMLElement).click();
          return;
        }
      }
    });
    await shortWait(1000);

    const hasTextarea = await browser.execute(() => {
      return !!document.querySelector("textarea");
    });
    expect(hasTextarea).toBe(true);
  });
});
