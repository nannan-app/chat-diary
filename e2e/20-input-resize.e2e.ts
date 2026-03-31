import {
  loginBeforeAll,
  shortWait,
} from "./helpers";

/**
 * 20 - Input Resize & UI Details
 *
 * Tests:
 * - Textarea resize handle exists
 * - Textarea has dynamic height
 * - Toolbar buttons all present
 * - Word count display
 */
describe("20 - Input Resize & UI Details", () => {
  before(async () => {
    await loginBeforeAll("final1234");
  });

  it("20.1 should have resize drag handle above input area", async () => {
    const hasResizeHandle = await browser.execute(() => {
      // Look for the resize handle (cursor-ns-resize)
      const handles = document.querySelectorAll(".cursor-ns-resize");
      return handles.length > 0;
    });
    expect(hasResizeHandle).toBe(true);
  });

  it("20.2 should have textarea with initial height", async () => {
    const textareaHeight = await browser.execute(() => {
      const ta = document.querySelector("textarea") as HTMLTextAreaElement;
      if (!ta) return 0;
      return ta.offsetHeight;
    });
    // Should have a reasonable initial height (around 80px)
    expect(textareaHeight).toBeGreaterThan(50);
  });

  it("20.3 should have all toolbar buttons", async () => {
    const buttons = await browser.execute(() => {
      const expected = ["插入图片", "心情", "AI 总结与反馈", "标签", "长文"];
      const found: string[] = [];
      for (const title of expected) {
        if (document.querySelector(`button[title="${title}"]`)) {
          found.push(title);
        }
      }
      return found;
    });
    expect(buttons).toContain("插入图片");
    expect(buttons).toContain("心情");
    expect(buttons).toContain("AI 总结与反馈");
    expect(buttons).toContain("标签");
    expect(buttons).toContain("长文");
  });

  it("20.4 should display word count", async () => {
    const hasWordCount = await browser.execute(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) {
        if (s.textContent?.includes("字") && s.classList.contains("text-text-hint")) {
          return true;
        }
      }
      return false;
    });
    expect(hasWordCount).toBe(true);
  });

  it("20.5 should have timestamp on messages showing local time format", async () => {
    // Verify timestamps are in HH:mm format and look like local time
    const timestamps = await browser.execute(() => {
      const timeSpans = document.querySelectorAll(".text-text-hint");
      const times: string[] = [];
      for (const s of timeSpans) {
        const text = s.textContent?.trim() || "";
        // Match HH:mm format
        if (/^\d{2}:\d{2}$/.test(text)) {
          times.push(text);
        }
      }
      return times;
    });
    expect(timestamps.length).toBeGreaterThan(0);
    // Timestamps should be reasonable local times (not all 00:00)
    const allZero = timestamps.every((t) => t === "00:00");
    expect(allZero).toBe(false);
  });
});
