/**
 * Shared helpers for Murmur E2E tests.
 * All IPC calls use Tauri's __TAURI_INTERNALS__.invoke via executeAsync
 * with JSON-encoded args to avoid WebDriver plugin interception.
 */

// ─── Wait / Pause ──────────────────────────────────────────────

export async function shortWait(ms = 1000) {
  await browser.pause(ms);
}

// ─── DOM Helpers ───────────────────────────────────────────────

export async function waitForEl(selector: string, timeout = 15000) {
  const el = await $(selector);
  await el.waitForExist({ timeout });
  return el;
}

export async function getPageText(): Promise<string> {
  return browser.execute(
    () => document.body.innerText || document.body.textContent || ""
  );
}

export async function getPageHtml(): Promise<string> {
  return browser.execute(() => document.body.innerHTML);
}

export async function findByText(
  tag: string,
  text: string,
  timeout = 10000
) {
  await browser.waitUntil(
    async () => {
      return browser.execute(
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
    },
    { timeout, timeoutMsg: `Could not find <${tag}> containing "${text}"` }
  );
}

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

// ─── React-Compatible Input Helpers ────────────────────────────

export async function reactSetValue(selector: string, value: string) {
  await reactSetValueNth(selector, 0, value);
}

export async function reactSetValueNth(
  selector: string,
  index: number,
  value: string
) {
  await browser.execute(
    (sel: string, idx: number, val: string) => {
      const els = document.querySelectorAll(
        sel
      ) as NodeListOf<HTMLInputElement>;
      const el = els[idx];
      if (!el) return;
      el.focus();
      const proto =
        el.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      setter?.call(el, val);

      // Reset React's _valueTracker so it detects a change.
      // React compares tracker.getValue() vs el.value — if equal, it
      // ignores the event. Setting tracker to a different value forces
      // React to fire onChange.
      const tracker = (el as any)._valueTracker;
      if (tracker) {
        tracker.setValue(val === "" ? " " : "");
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    selector,
    index,
    value
  );
}

// ─── Tauri IPC Helper ──────────────────────────────────────────

/**
 * Call a Tauri IPC command from the browser context.
 * Returns { ok: <result> } on success, { error: <string> } on failure.
 * NOTE: Tauri v2 converts Rust snake_case params to camelCase in JS.
 */
export async function tauriInvoke(
  cmd: string,
  args: Record<string, any> = {}
): Promise<{ ok?: any; error?: string }> {
  const argsJson = JSON.stringify(args);
  return browser.executeAsync(
    (command: string, argsStr: string, done: (r: any) => void) => {
      try {
        const parsed = JSON.parse(argsStr);
        const tauri = (window as any).__TAURI_INTERNALS__;
        if (!tauri?.invoke) {
          done({ error: "No Tauri internals" });
          return;
        }
        tauri
          .invoke(command, parsed)
          .then((result: any) => done({ ok: result }))
          .catch((err: any) => done({ error: String(err) }));
      } catch (e: any) {
        done({ error: e.message });
      }
    },
    cmd,
    argsJson
  ) as Promise<{ ok?: any; error?: string }>;
}

// ─── Auth Flow Helpers ─────────────────────────────────────────

/**
 * Run the full first-time setup flow and return the recovery code.
 * Assumes the app is showing the welcome screen.
 */
export async function doSetupFlow(
  password: string,
  hint?: string
): Promise<string> {
  // Step 1: Welcome → click "创建全新日记本"
  await clickByText("button", "创建全新日记本");
  await shortWait(800);

  // Step 2: Enter matching passwords
  await reactSetValueNth('input[type="password"]', 0, password);
  await shortWait(200);
  await reactSetValueNth('input[type="password"]', 1, password);
  await shortWait(200);
  await clickByText("button", "下一步");
  await shortWait(1000);

  // Step 3: Hint (click "完成设置" to use default or skip)
  if (hint) {
    await reactSetValue('input[type="text"]', hint);
    await shortWait(200);
  }
  await clickByText("button", "完成设置");
  await shortWait(6000); // Argon2 derivation

  // Step 4: Recovery code page (or auto-login)
  const text = await getPageText();
  let recoveryCode = "";
  if (text.includes("恢复码") || text.includes("开始使用")) {
    // Extract recovery code (XXXX-XXXX-XXXX-XXXX-XXXX format)
    const match = text.match(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
    recoveryCode = match ? match[0] : "";
    if (text.includes("开始使用")) {
      await clickByText("button", "开始使用");
      await shortWait(2000);
    }
  }

  return recoveryCode;
}

/**
 * Login with a password via the UI.
 */
export async function doLogin(password: string) {
  await reactSetValue('input[type="password"]', password);
  await shortWait(300);
  await clickByText("button", "进入");
  await shortWait(5000); // Argon2 derivation
}

/**
 * Lock and reload to get back to login screen.
 */
export async function lockAndReload() {
  await tauriInvoke("lock");
  await shortWait(500);
  await browser.execute(() => window.location.reload());
  await shortWait(3000);
}

/**
 * Ensure we're logged into private space.
 */
export async function ensurePrivateSpace(password: string) {
  const spaceResult = (await tauriInvoke("get_space")) as any;
  if (spaceResult.ok === "private") return;
  await lockAndReload();
  await doLogin(password);
}

/**
 * Standard before() hook for test files that need to be logged into private space.
 * Waits for app load, then logs in with the given password.
 */
export async function loginBeforeAll(password: string) {
  await shortWait(4000); // Wait for app load
  await doLogin(password);
  const r = (await tauriInvoke("get_space")) as any;
  if (r.ok !== "private") {
    throw new Error(`Expected private space but got ${r.ok}`);
  }
  // Wait for React to finish loading diary data.
  // After login, AppShell mounts and calls loadToday() asynchronously.
  // We wait until the "加载中" text disappears OR a textarea appears.
  await browser.waitUntil(
    async () => {
      return browser.execute(() => {
        const html = document.body.innerHTML;
        // Loading done when either: messages loaded, empty state (🐱), or textarea visible
        return !html.includes("加载中") || !!document.querySelector("textarea");
      });
    },
    { timeout: 15000, timeoutMsg: "App still loading after login" }
  );
  await shortWait(1000);
}
