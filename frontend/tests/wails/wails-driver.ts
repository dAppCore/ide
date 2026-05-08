/**
 * wails-driver — Playwright-shaped test driver for the LIVE Wails window
 * via the MCP bridge's webview_* tools. Drives the actual production
 * WebKit (macOS) / WebView2 (Windows) / WebKitGTK (Linux) instance —
 * not a separate Chromium / patched WebKit.
 *
 * Why this exists: the macOS WebKit shipped in Wails doesn't speak CDP,
 * so Playwright's chromium.connectOverCDP() can't attach. But the IDE's
 * MCP bridge already exposes webview_eval / webview_console / webview_*
 * primitives that I've been using all session to drive the live window.
 * This wraps those primitives in a Locator-like API so the same tests
 * that would target Chromium can target the actual native window.
 *
 * Trade-off: only drives the live binary. Tests that should run in CI
 * without a binary should keep using Playwright + a static-served dist.
 */

const BRIDGE = 'http://127.0.0.1:9877';
const DEFAULT_WINDOW = 'core-ide-chat';

export interface BridgeResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
}

async function call<T = unknown>(tool: string, params: Record<string, unknown> = {}): Promise<BridgeResult<T>> {
  const res = await fetch(`${BRIDGE}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return res.json();
}

export class Window {
  constructor(public readonly name: string = DEFAULT_WINDOW) {}

  async title(): Promise<string> {
    // webview_title returns the title string directly in `value`.
    const r = await call<string>('webview_title', { window: this.name });
    return typeof r.value === 'string' ? r.value : '';
  }

  async url(): Promise<string> {
    const r = await call<string>('webview_url', { window: this.name });
    return typeof r.value === 'string' ? r.value : '';
  }

  async evaluate<T = unknown>(script: string): Promise<T | undefined> {
    const r = await call<T>('webview_eval', { window: this.name, script });
    if (!r.ok) throw new Error(`webview_eval failed: ${r.error}`);
    return r.value;
  }

  /** Run a JS function with optional serialisable args. Mirrors Playwright's page.evaluate(fn, arg). */
  async evaluateFn<T = unknown, A = unknown>(fn: (arg?: A) => T, arg?: A): Promise<T | undefined> {
    const argJSON = arg === undefined ? 'undefined' : JSON.stringify(arg);
    const script = `return (${fn.toString()})(${argJSON});`;
    return this.evaluate<T>(script);
  }

  /** Fetch a DOM subtree, scoped to a CSS selector. Use for shape inspection,
   *  not whole-page assertions — the eval has a 5s timeout that the full
   *  page (with Monaco etc.) can blow on macOS. Default selector: 'body > *'. */
  async domTree(opts: { selector?: string; maxDepth?: number } = {}): Promise<unknown> {
    const r = await call('webview_dom_tree', {
      window: this.name,
      selector: opts.selector ?? 'app-ide',
      max_depth: opts.maxDepth ?? 2,
    });
    return r.value;
  }

  /** Read recent console messages. Optionally filter by regex pattern.
   *  webview_console returns an array directly in `value`. */
  async console(opts: { limit?: number; pattern?: string } = {}): Promise<Array<{ level: string; message: string; ts?: string }>> {
    const r = await call<Array<{ level: string; message: string; ts?: string }>>('webview_console', {
      window: this.name,
      limit: opts.limit ?? 50,
      pattern: opts.pattern,
    });
    return Array.isArray(r.value) ? r.value : [];
  }

  /** Read recent error messages. webview_errors returns an array directly in `value`. */
  async errors(opts: { limit?: number } = {}): Promise<Array<{ message: string; stack?: string; ts?: string }>> {
    const r = await call<Array<{ message: string; stack?: string; ts?: string }>>('webview_errors', {
      window: this.name,
      limit: opts.limit ?? 20,
    });
    return Array.isArray(r.value) ? r.value : [];
  }

  /** Save a PNG screenshot to disk on the host. Returns the file path. */
  async screenshot(path?: string): Promise<string> {
    const r = await call<{ path: string }>('webview_screenshot', { window: this.name, path });
    if (!r.ok) throw new Error(`webview_screenshot failed: ${r.error}`);
    return r.value?.path ?? '';
  }

  /** Navigate the window. Equivalent to page.goto(). */
  async goto(url: string): Promise<void> {
    const r = await call('webview_navigate', { window: this.name, url });
    if (!r.ok) throw new Error(`webview_navigate failed: ${r.error}`);
  }

  /** Locate one or more elements via CSS selector. Returns a Locator handle. */
  locator(selector: string): Locator {
    return new Locator(this, selector);
  }

  /** Wait for a predicate to become true. Default 5s, polled every 100ms. */
  async waitFor(predicate: () => boolean | string | Promise<boolean | string>, opts: { timeout?: number; interval?: number; description?: string } = {}): Promise<void> {
    const timeout = opts.timeout ?? 5000;
    const interval = opts.interval ?? 100;
    const start = Date.now();
    let lastVal: unknown = undefined;
    while (Date.now() - start < timeout) {
      const ok = await predicate();
      lastVal = ok;
      if (ok === true || (typeof ok === 'string' && ok.length > 0)) return;
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(`waitFor timed out after ${timeout}ms${opts.description ? ` (${opts.description})` : ''}: last value = ${JSON.stringify(lastVal)}`);
  }

  /** Send a keyboard event to the window's body. Modifier keys: meta, ctrl, shift, alt. */
  async keyDown(key: string, modifiers: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): Promise<void> {
    const init = {
      key,
      metaKey: !!modifiers.meta,
      ctrlKey: !!modifiers.ctrl,
      shiftKey: !!modifiers.shift,
      altKey: !!modifiers.alt,
      bubbles: true,
    };
    const initJSON = JSON.stringify(init);
    await this.evaluate<void>(`document.body.dispatchEvent(new KeyboardEvent('keydown', ${initJSON}));`);
  }
}

export class Locator {
  constructor(private readonly window: Window, public readonly selector: string) {}

  /** Returns the count of matching elements. */
  async count(): Promise<number> {
    return (await this.window.evaluate<number>(`return document.querySelectorAll(${JSON.stringify(this.selector)}).length;`)) ?? 0;
  }

  /** Whether at least one match is currently in the DOM. */
  async isAttached(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  /** Whether the first match is visible (display + visibility + opacity + non-zero box). */
  async isVisible(): Promise<boolean> {
    return (await this.window.evaluate<boolean>(`
      var el = document.querySelector(${JSON.stringify(this.selector)});
      if (!el) return false;
      var s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return false;
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    `)) ?? false;
  }

  /** Text content of the first match. */
  async textContent(): Promise<string> {
    return (await this.window.evaluate<string>(`
      var el = document.querySelector(${JSON.stringify(this.selector)});
      return el ? (el.textContent || '').replace(/\\s+/g, ' ').trim() : '';
    `)) ?? '';
  }

  /** Click the first match. */
  async click(): Promise<void> {
    const ok = await this.window.evaluate<boolean>(`
      var el = document.querySelector(${JSON.stringify(this.selector)});
      if (!el) return false;
      el.click();
      return true;
    `);
    if (!ok) throw new Error(`click(${this.selector}) — element not found`);
  }

  /** Filter to elements containing the given text. Returns a new Locator. */
  filter(opts: { hasText: string }): TextFilteredLocator {
    return new TextFilteredLocator(this.window, this.selector, opts.hasText);
  }

  /** Returns the first match as a single Locator (for chained calls). */
  first(): Locator {
    return this; // CSS selectors already collapse via querySelector; same behaviour.
  }

  /** Get an attribute on the first match. */
  async getAttribute(name: string): Promise<string | null> {
    return (await this.window.evaluate<string | null>(`
      var el = document.querySelector(${JSON.stringify(this.selector)});
      return el ? el.getAttribute(${JSON.stringify(name)}) : null;
    `)) ?? null;
  }

  /** Wait for the locator to be visible. */
  async waitForVisible(timeout = 5000): Promise<void> {
    await this.window.waitFor(() => this.isVisible(), { timeout, description: `${this.selector} visible` });
  }

  /** Wait for any element matching to be attached to the DOM. */
  async waitForAttached(timeout = 5000): Promise<void> {
    await this.window.waitFor(() => this.isAttached(), { timeout, description: `${this.selector} attached` });
  }
}

/**
 * Locator narrowed by text content. Uses a runtime filter via Array.from(querySelectorAll).
 * The first matching element (in DOM order) is what click()/textContent()/etc. operate on.
 */
export class TextFilteredLocator {
  constructor(private readonly window: Window, public readonly selector: string, public readonly hasText: string) {}

  private filterScript(): string {
    return `
      Array.from(document.querySelectorAll(${JSON.stringify(this.selector)}))
        .filter(function (el) { return (el.textContent || '').includes(${JSON.stringify(this.hasText)}); })
    `.trim();
  }

  async count(): Promise<number> {
    return (await this.window.evaluate<number>(`return ${this.filterScript()}.length;`)) ?? 0;
  }

  async first(): Promise<Locator> {
    // Returns a "synthetic" locator that calls back into the same filter.
    // Wrap the click into a single eval so the filter and click happen in one shot.
    const self = this;
    const synthetic = new Locator(this.window, this.selector);
    synthetic.click = async () => {
      const ok = await self.window.evaluate<boolean>(`
        var matches = ${self.filterScript()};
        if (!matches.length) return false;
        matches[0].click();
        return true;
      `);
      if (!ok) throw new Error(`filter(hasText=${self.hasText}).click() — no match for ${self.selector}`);
    };
    synthetic.textContent = async () => {
      return (await self.window.evaluate<string>(`
        var matches = ${self.filterScript()};
        return matches.length ? (matches[0].textContent || '').replace(/\\s+/g, ' ').trim() : '';
      `)) ?? '';
    };
    synthetic.isVisible = async () => {
      return (await self.window.evaluate<boolean>(`
        var matches = ${self.filterScript()};
        if (!matches.length) return false;
        var el = matches[0];
        var s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return false;
        var r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      `)) ?? false;
    };
    return synthetic;
  }

  async click(): Promise<void> {
    const loc = await this.first();
    await loc.click();
  }

  async textContent(): Promise<string> {
    const loc = await this.first();
    return loc.textContent();
  }
}

/** Probe the bridge — returns true when the binary is running. */
export async function bridgeReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE}/mcp/info`);
    return res.ok;
  } catch {
    return false;
  }
}

/** Direct bridge call for arranging state outside the window. */
export async function callBridge(tool: string, params: Record<string, unknown> = {}): Promise<BridgeResult> {
  return call(tool, params);
}

/**
 * webview_query is a CSS-selector query tool, not a window enumerator.
 * If you need to confirm a window is responding, just call w.title()
 * and check it succeeded.
 */
export async function queryDOM(window: string, selector: string): Promise<unknown> {
  const r = await call('webview_query', { window, selector });
  return r.value;
}
