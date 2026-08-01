# Lethean-3 design system — vendored mirror

**Source of truth:** `/Users/snider/Downloads/Lethean-3/` (Snider's local design tree).
**Mirrored here:** so the IDE codebase has the spec living alongside the Angular code.

## Status

Design source-of-truth, **not source code**. The JSX files are the visual canon — they encode layout, state, animations, copy. The IDE itself is Angular 20.3 + Wails 3.0-alpha; ports happen pane-by-pane (`<surface>.jsx` → `frontend/src/app/.../<surface>.component.ts`).

## Build exclusion

Angular's `tsconfig.app.json` only includes `src/`. This `design/` tree is outside the compile root, so the JSX won't break the build, but **don't import from here** — port the visuals into Angular instead.

## Contents

- **`tokens.css`** — colour (OKLCH), spacing, type, atom CSS (`.surface .btn .card .pill .editorial .brand-glow .dot-grid`). Already mirrored at `frontend/src/tokens.css`.
- **`components.jsx`** — `BrandMark`, `RavenGlyph`, `Vi` (mascot poses), `Field`, `Icon`, `PRODUCTS_BY_BRAND`, `BRAND_COPY`. Foundation primitives.
- **Web surfaces** — `landing.jsx`, `lethean-landing.jsx`, `marketing-shared.jsx`, `pricing.jsx`, `products-set{1,2}.jsx`.
- **App surfaces (IDE-relevant)** — `dashboard.jsx`, `control-panel.jsx`, `ask-vi.jsx`, `tweaks-panel.jsx`, `cart-checkout.jsx`, `emails-invoice.jsx`, `provisioning.jsx`, `onboarding.jsx`, `status-errors.jsx`, `help-blog-changelog.jsx`.
- **Native chrome** — `native-shells.jsx`, `native-profiles.jsx`, `ios-frame.jsx`, `macos-window.jsx`, `android-frame.jsx`, `mobile.jsx`.
- **Specialised** — `animations.jsx`, `browser-window.jsx`, `design-canvas.jsx`, `splash-icons.jsx`.
- **Bundles** — `design_handoff_full/`, `design_handoff_native_profiles/`.
- **Static** — `assets/`, `uploads/`.

## Hero canon (web + native, validated across host.uk.com 19 surfaces)

```
<section class="brand-glow" style="padding: 56-72px 24px;">
  <span class="pill pill-brand"><i/> Eyebrow</span>
  <h1>Plain text <span class="editorial" style="font-style:italic; color:var(--brand-200);">italic phrase</span>.</h1>
  <p>Subhead in var(--fg-2)</p>
  <a class="btn btn-primary btn-lg">Primary</a>
  <a class="btn btn-ghost btn-lg">Secondary</a>
</section>
```

## Voice rules (locked 2026-05-05)

- No UK-as-positioning ("UK businesses", "UK-hosted") — Host UK is the brand name, not the geography.
- "Start free" CTA. Private-beta state lives in pill copy, not in CTA labels.
- One italic phrase per H1, on the punchline word.

## Update flow

When `/Users/snider/Downloads/Lethean-3/` changes, re-mirror with:

```bash
rsync -a --delete /Users/snider/Downloads/Lethean-3/ /Users/snider/Code/core/ide/frontend/design/lethean-3/
```

Or just `cp -R` — it's a static reference, not a live link.
