# Handoff · Native Platform Profiles

> **For:** the engineer building the Host UK / Lethean native apps next week.  
> **Scope:** Darwin (Wails on macOS, eventually Windows), iOS, iPadOS.  
> **Web is out of scope** for this handoff — it already exists.

---

## About these files

Everything in this folder is a **design reference written in HTML + React + inline JSX**, not production code. The reference uses Babel-in-the-browser, inline styles, and a single shared CSS file. It exists to communicate intent — the visual system, density rules, chrome grammar, and component contrast — to whoever builds the real thing.

Your job is **not** to ship this code. Your job is to recreate these designs in the target stack (Wails + Go + WebView2/WKWebView, with whatever frontend framework you choose — React/Preact/Solid/vanilla all reasonable; this codebase happens to be inline React for prototyping speed). Use the project's preferred component library and state patterns. Keep the visual system and the platform rules; throw the implementation away.

If no frontend framework is chosen yet for the native shell: **React 18 + TypeScript + a CSS-in-JS-free approach (CSS modules or vanilla CSS with the tokens file)** is the recommended starting point. The design uses `oklch()` colour math and CSS custom properties heavily; anything that fights CSS variables will hurt.

---

## Fidelity

**High-fidelity.** Colours, type scales, density numbers, radii, and chrome layout are intentional and final. Where this design differs from a stock platform default (e.g. iOS uses our brand purple instead of system blue for tab bar selection), that's a brand decision, not an oversight — keep it.

The exception is iconography. Icons are rendered with Font Awesome 6 via CDN as a placeholder. Replace with the codebase's icon system (SF Symbols on Apple platforms is ideal, since these are native apps). Icon names referenced in source: `house`, `globe`, `at`, `envelope`, `wave-pulse`, `credit-card`, `users`, `sliders`, `bell`, `sparkles`, `magnifying-glass`, `arrow-rotate-right`, `chevron-left`, `chevron-right`, `signal`, `wifi`, `circle`, `sidebar`, `circle-plus`, `circle-question`, `code-branch`, `database`, `ellipsis`, `ellipsis-vertical`, `shield-check`, `clock`, `circle-exclamation`, `envelope-circle-check`, `user`.

---

## The core idea

**One React tree, three platforms.** The brand DNA (palette, Vi avatar, copy voice) stays constant. The chrome and type swap by `[data-platform="darwin|ios|ipad"]` applied at the artboard root. So a single `<ControlPanel>` component family renders correctly on every surface.

Why not media queries on a responsive web app? Because a Wails window is **not** a responsive web page. iOS large titles, NSToolbar segmented controls, and iPadOS three-column split view are distinct UX patterns that mobile-web cannot fake. We commit to native grammar per platform; the data model and brand tokens are shared.

---

## Files in this folder

| File | What it is |
|---|---|
| `tokens.css` | The full design system. Colour tokens (oklch), type stacks, radii, shadows, brand variants for `[data-brand="hostuk|lethean|ofm"]`, **and the platform overrides** in the `[data-platform="…"]` blocks. **Read this first.** |
| `native-profiles.jsx` | The native shells: `ControlPanelDarwin`, `ControlPanelIOS`, `ControlPanelIPad`, `NativeProfilesReference` (the rule-page), and three lightweight device frames. |
| `control-panel.jsx` | The **web** version of the Vi Control Panel. Useful as a reference for the data model (what Vi shows, the brief shape, the activity feed) and for understanding how the native shells diverge from the web one. |
| `components.jsx` | Shared atoms: `<Icon>`, `<BrandMark>`, `<Vi>` (the avatar), `<RavenGlyph>`. |

---

## Design system (tokens)

All in `tokens.css`. Highlights:

### Colour
- **Dark-calm palette** — `--ink-0` to `--ink-6` with a barely-warm purple cast (oklch hue 285). Never pure black.
- **Foreground** — `--fg-0` to `--fg-4`, paper-soft (oklch L:0.97 → 0.48). Never pure white.
- **Hairlines** — `--line-1`, `-2`, `-3` use `color-mix(in oklch, var(--fg-0) N%, transparent)` so they auto-adapt to dark/light.
- **Brand** — `--brand-50` to `--brand-900` anchored to Vi's `#663399` lineage (hue 305). Lethean shifts to hue 270 (cool indigo). OFM is a hue-28 placeholder.
- **State** — `--success-`, `--warning-`, `--danger-`, `--info-`, all desaturated for dark-calm comfort. Hue/chroma values in `tokens.css` lines 60–67.

### Type
- **Web profile** — Geist sans, Geist Mono, Instrument Serif (italic for editorial moments — pull-quotes, "Vi's note", etc.).
- **Darwin profile** — `-apple-system, "SF Pro Text", "SF Pro"`. Body 13px / 1.45 lh. Display: SF Pro Display 600 weight, -2.5% tracking.
- **iOS profile** — same SF Pro stack. Body 17pt / 1.4. Large title 34pt 700 weight, -2% tracking.
- **iPadOS profile** — same stack. Body 15pt / 1.45. Display 26pt 700 weight.

### Density
| Token | Web | Darwin | iOS | iPadOS |
|---|---|---|---|---|
| `--r-md` (base radius) | 8px | 6px | 10px | 10px |
| `--r-lg` | 12px | 8px | 14px | 14px |
| Body row height | 44px | 30px | 50px | 44px |
| Min hit target | 32px | 22px | 44pt | 44pt |

The Darwin profile is **dense** on purpose. Think Linear, Things, Tower. The iOS profile is **comfortable** on purpose — 44pt minimum, generous padding. iPad sits between the two.

### Editorial accent
`.editorial` class applies Instrument Serif italic. Used **sparingly** — one phrase per surface, max — for moments when Vi is being conversational ("*Quiet night.*", "*I'm here either way.*"). Don't sprinkle it; treat it as a punctuation mark.

---

## Platform shells — what each owes the user

### Darwin (Wails on macOS)

**Window chrome:**
- Unified toolbar, 52px tall, with `backdrop-filter: blur(28px) saturate(160%)`.
- Traffic lights (12px dots, 8px gap) inset from the left edge by 14px.
- Sidebar half (240px) on the left of the toolbar carries the brand mark + workspace identity.
- Content half (rest) carries the page title, a centred segmented control for primary navigation, and trailing tool buttons + the "Ask Vi · ⌘K" pill.

**Sidebar:**
- 240px wide, NSVisualEffectView vibrancy: `background: color-mix(in oklch, var(--ink-1) 78%, transparent); backdrop-filter: blur(40px) saturate(160%)`.
- Vi presence card pinned at top — `color-mix(in oklch, var(--brand-500) 12%, transparent)` background, brand-tinted border.
- Three groups: Workspace, Sites, Account. Group titles are 10.5px / 600 weight / uppercase / 0.04em tracking, fg-4.
- Row height 26px. Active row uses `color-mix(in oklch, var(--brand-500) 26%, transparent)`. Inactive row is transparent.
- Site rows show a status dot (success/warning/danger) instead of an icon.

**Content body:**
- 22px horizontal padding.
- Section headers are 13px / 600 weight / -0.005em tracking, fg-0.
- Brief grid: three columns, 10px gap, 6px radius cards with a 2px tone-coloured left strip. Cards are 10/12/11px padded.
- Sites: data-table layout, mono numbers (uptime, response, deploy time), column headers 10.5px mono uppercase 0.04em tracking.
- Activity: row-list with a "VI" / "YOU" mono badge on the left, mono timestamp on the right, content in the middle.

**Status bar (bottom of window):**
- 22px tall, top-bordered with `--line-1`, slightly translucent background.
- Left: connection indicator (success dot · "Vi connected · 12ms"), site count, monthly spend.
- Right: app version, runtime version (e.g. "WebView2 · 124.0").
- Whole row in mono at 10.5px.

**Keyboard shortcuts:**
- ⌘K — Ask Vi (visible in toolbar).
- ⌘1, ⌘2, ⌘⌫ — context-specific actions, shown inline as `<kbd>` elements next to action buttons.
- ⌘F — Search.

**Don't:**
- No big rounded buttons. No bottom tab bar. No large titles.
- No hover scale transforms; macOS apps don't bounce.

### iOS (iPhone, native via WKWebView)

**Status bar:**
- 54px tall (44px safe + 10px bottom padding for the title spacing).
- Time on left at 17pt / 600 weight. Status icons (signal, wifi, battery) on the right.
- Both rendered in `--fg-0` against the page bg.

**Large title navigation:**
- Back chevron + "Back" label in `--brand-300` on the left, trailing icon buttons on the right.
- Title at 34pt / 700 weight / -2% tracking, two lines max.
- Date subline at 13px mono / 0.02em tracking, `--fg-3`.

**Vi presence card:**
- Pinned to the top of the scroll. Brand-tinted bg, 14px radius, 14px padding.
- 44×44 Vi avatar tile on the left, status text on the right, "Ask Vi anything" pill button as the only CTA.

**Brief cards:**
- 14px radius, 14px padding, 1px line-1 border.
- 3px tone-coloured strip on the left edge.
- Card body: tone dot + "DONE" badge if applicable, then title at 16pt / 600 / -0.015em, body at 14pt / 1.4.
- Primary action is a full-width-ish (self-aligned) 50pt rounded button when not done. Done cards show a low-stakes link-styled trailing action.

**Grouped-inset tables:**
- 14px radius, edge padding 16px on rows.
- 50pt row height for iPhone.
- Use `.native-list` for the container and `.row` for each row — these classes are defined in `tokens.css`.

**Tab bar:**
- Bottom-pinned, 4 destinations max: Today, Sites, Activity, Account.
- Active icon + label both in `--brand-300`. Inactive in `--fg-3`.
- 8px top padding, 30px bottom padding (home indicator clearance).
- Translucent: `backdrop-filter: blur(20px)`.

**Home indicator:** 134×5 pill, `--fg-0`, centred 8px above the bottom edge.

**Don't:**
- No sidebar.
- No keyboard shortcuts (hide ⌘K affordances on iPhone).
- No menu bars.

### iPadOS (iPad with Magic Keyboard, native via WKWebView)

**Status bar:** 28px, minimal — "9:41 Fri 4 Oct" left, status icons right. Smaller than iPhone's because iPad has more screen.

**Three-column split view** at `grid-template-columns: 240px 320px 1fr`:

1. **Primary sidebar (240px):** Brand mark + Vi presence card + grouped nav. 32px row height. Active row uses `color-mix(in oklch, var(--brand-500) 24%, transparent)`. Same logical structure as Darwin sidebar but the chrome is solid (no vibrancy).

2. **Secondary list (320px):** A list of selectable items (briefs in our example). 12/16px padding per row. Active row gets a 3px brand left-strip and a brand-tinted bg. Below the title is a small mono date stamp.

3. **Detail (rest):** The full focused content. Toolbar at the top (44px) with a sidebar-toggle button, the active-item identifier, and trailing keyboard hints in mono. Body: title at 26pt 700, supporting copy, a 3-up action grid where each action shows a `<kbd>` shortcut (⌘1, ⌘2, ⌘⌫), Vi's reasoning callout, and a recent-activity list.

**Keyboard shortcuts:** Visible at all times in the detail-pane toolbar. iPad with an external keyboard is the real iPad; honour it.

**Home indicator:** Wider (220×5) than iPhone, lower opacity.

**Don't:**
- No tab bar.
- No iPhone-style large title above the content (the secondary list owns that role here).

---

## The Vi Control Panel — data model

This is the screen used to demo all three platforms. The data model is deliberately small.

```ts
type Brief = {
  tone: "warning" | "success" | "info" | "neutral";
  time: string;            // ISO or human ("06:42", "Yesterday")
  title: string;
  body: string;
  actions: { label: string; primary?: boolean }[];
  done?: boolean;
  shortcut?: string;       // Darwin/iPad only ("⌘1")
};

type Site = {
  domain: string;
  stack: string;           // "Host UK · Mail · Analytics"
  status: "green" | "amber" | "red";
  uptime: string;          // "99.998"
  response: number;        // ms
  sparkData: number[];     // 12 points
  lastDeploy: string;      // human relative
  warn?: string;           // optional inline warning
};

type ActivityItem = {
  who: "vi" | "you";
  time: string;
  text: string;
  icon: string;
  tone: "success" | "warning" | "info" | "neutral";
};

type ViStatus = {
  connected: boolean;
  latencyMs: number;       // shown in status bar
  watching: number;        // site count
  pending: number;         // things waiting on user input
};
```

Sample data is inline in `control-panel.jsx` and `native-profiles.jsx`. Treat it as fixtures for early dev; expect it to come from the Go side via Wails bindings (or a local JSON RPC for iOS/iPad).

---

## The reference page (`NativeProfilesReference`)

This is the "rule" surface — the second-most important thing in this folder after `tokens.css`. It contains:

1. **Token-swap table** — exact font/density/chrome values per platform, machine-readable.
2. **Type ladder** — the same headline + paragraph rendered four times, side by side, so you can eyeball the difference.
3. **Chrome rules** — three cards (one per native platform) with prose describing what each surface owes the user, plus an explicit "don't" callout per platform.
4. **Component contrast** — the same logical action ("Renew now / Cancel") rendered three ways: web button, Darwin NSToolbar action with `⌘1`/`⎋` chords, iOS sheet primary action.

When in doubt, this page is the arbiter.

---

## Brand variants

The system supports three brands via `[data-brand="hostuk|lethean|ofm"]` applied alongside `[data-platform=...]`. Both attributes coexist on the same element. The brand swap only changes brand colour scales (`--brand-*`) and the brand name; it doesn't change density or chrome.

- **Host UK** — Vi purple (oklch hue 305). Default.
- **Lethean** — cool indigo (hue 270). Confident-technical voice.
- **OFM** — warm amber (hue 28). Reserved slot.

---

## Light mode

Available via `[data-mode="light"]` on Lethean only. Host UK is dark-only. The light tokens are in `tokens.css` lines 200–230 — same colour math, inverted L values. The native shells inherit `[data-mode="light"]` cleanly because they reference tokens, not literal colours.

---

## What's intentionally not here

- **Android.** We have an Android frame in the prototype project, but the native push for the next two weeks is Apple-first. Android comes later.
- **Settings/Account screens.** Already designed at hi-fi in the parent project (`native-shells.jsx` there). Out of scope for this handoff because the data model and chrome rules transfer; the body content can be rebuilt straightforwardly once the shells exist.
- **Onboarding, provisioning, error states.** All web-only for now; native versions will be straightforward once the shell + brief-card patterns from this handoff are in place.

---

## Build order suggestion

1. **Port `tokens.css`** as-is (or as CSS modules / global CSS — your call). Verify `oklch()` and `color-mix()` render in the Wails WebView2 build target — both are Chromium ≥ 111, should be fine.
2. **Build the brand mark + Vi avatar primitives** (`<BrandMark>`, `<Vi>`). Reference the existing assets in the parent project's `assets/vi/` folder.
3. **Build the Darwin shell first** — it's the most complex and most of the patterns cascade from it. The status bar + vibrancy sidebar are the load-bearing pieces.
4. **Build the iOS shell** — far simpler structurally; the work is in the chrome details (large title, tab bar, home indicator).
5. **Build the iPad shell** last — it's a layout reshuffle of the Darwin and iOS components rather than new work.
6. **Wire Vi's status feed** — the brief, sites, and activity data need to come from Go. Until that's wired, use the fixtures in `native-profiles.jsx`.

Ship the Darwin shell to internal testing first; iterate on the density numbers there before duplicating to iOS/iPad.

---

## Questions before you start

- Wails WebView target: confirm WebView2 ≥ 111 on Windows and WKWebView on macOS (both fine).
- Frontend framework choice for the embedded webview: pick one and stick with it; the design doesn't care.
- Icon system: SF Symbols where available, otherwise a single icon library. Don't mix.
- Type loading: SF Pro is system-fonts on Apple platforms (no licensing). Geist is open-source under SIL Open Font License if any web fallback is needed.

Anything ambiguous, raise it — better to ask now than rebuild later.
