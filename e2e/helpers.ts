/**
 * Wait for an element to exist in DOM, then return it.
 * Uses waitForExist instead of waitForDisplayed to avoid
 * the Node.contains() compatibility issue with tauri-wd.
 */
export async function waitForEl(selector: string, timeout = 15000) {
  const el = await $(selector);
  await el.waitForExist({ timeout });
  return el;
}

/**
 * Type text into an input field after clearing it.
 */
export async function typeInto(selector: string, text: string) {
  const el = await waitForEl(selector);
  await el.clearValue();
  await el.setValue(text);
}

/**
 * Click a button/element by selector.
 */
export async function clickEl(selector: string) {
  const el = await waitForEl(selector);
  await el.click();
}

/**
 * Wait a short time for async operations.
 */
export async function shortWait(ms = 1000) {
  await browser.pause(ms);
}

/**
 * Find element by executing JS directly (avoids WebDriver element lookup issues).
 */
export async function findByText(tag: string, text: string, timeout = 10000) {
  await browser.waitUntil(
    async () => {
      const result = await browser.execute(
        (t: string, txt: string) => {
          const els = document.querySelectorAll(t);
          for (const el of els) {
            if (el.textContent?.includes(txt)) return true;
          }
          return false;
        },
        tag,
        text
      );
      return result;
    },
    { timeout, timeoutMsg: `Could not find <${tag}> containing "${text}"` }
  );
}

/**
 * Click element found by text content using JS execution.
 */
export async function clickByText(tag: string, text: string) {
  await findByText(tag, text);
  await browser.execute(
    (t: string, txt: string) => {
      const els = document.querySelectorAll(t);
      for (const el of els) {
        if (el.textContent?.includes(txt)) {
          (el as HTMLElement).click();
          return;
        }
      }
    },
    tag,
    text
  );
}

/**
 * Get page text content via JS execution.
 */
export async function getPageText(): Promise<string> {
  return browser.execute(() => document.body.innerText || document.body.textContent || "");
}

/**
 * Get page HTML via JS execution.
 */
export async function getPageHtml(): Promise<string> {
  return browser.execute(() => document.body.innerHTML);
}

/**
 * Set value on an input via JS (more reliable than WebDriver setValue).
 */
export async function setInputValue(selector: string, value: string) {
  await waitForEl(selector);
  await browser.execute(
    (sel: string, val: string) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el) {
        // React-compatible value setting
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        const setter = el.tagName === "TEXTAREA" ? nativeTextAreaValueSetter : nativeInputValueSetter;
        setter?.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    selector,
    value
  );
}

/**
 * Press Enter on an element via JS.
 */
export async function pressEnter(selector: string) {
  await browser.execute((sel: string) => {
    const el = document.querySelector(sel);
    if (el) {
      el.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
      );
    }
  }, selector);
}
