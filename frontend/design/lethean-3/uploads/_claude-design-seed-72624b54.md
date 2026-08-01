# Claude Design Seed — Lethean + Host UK Unified Visual Language

> Paste-ready brief for [Claude Design](https://claude.ai) (research preview). Generates a unified visual system spanning two brands and ~10 web properties, built on a specific stack of licensed component libraries.

**File location:** `plans/ops/_claude-design-seed.md`
**Author:** Cladius (project coordinator), 2026-05-04
**Refresh trigger:** any time we add/change a website, swap a licensed library, or shift brand position.

---

## The ask

I run two related but distinct brands — **Lethean** (technical AI infrastructure) and **Host UK** (UK SMB hosting + SaaS) — and a third sibling brand **OFM** (creator-agency tooling) is coming next week as its own design pass. They share a CorePHP/Laravel codebase, a licensed component-library stack, and an organisational owner (Lethean owns Host UK; OFM is a Lethean spin-out), but speak to different audiences.

The visual system must work across **both web AND native** surfaces:
- **~10 web properties** (marketing sites, SaaS product wrappers, branded chat/mail UIs)
- **Desktop apps** (CoreGUI / Wails-based — the Lethean Desktop is in active dev)
- **Phone apps** (iOS + Android — same CoreGUI shell, mobile mode)

Currently the web apps ship the same accidental visual language (forked code, never re-themed). I want a **unified custom visual system** where:

1. The two brands (three soon) feel like a coherent family — same hand
2. Each brand still has its own voice — Lethean = considered/technical, Host UK = warm/practical, OFM = creator-agency-confident (next week's pass)
3. The system scales cleanly across ~13+ surfaces (web + desktop + phone)
4. The native apps don't feel like "websites pretending to be apps" — they feel native, but recognisably the same brand as the web
5. It's built on the specific licensed libraries below — no inventing components we have to build from scratch
6. **The colour system holds at least one accent slot in reserve for OFM next week** — don't paint into a corner

Output I'm hoping for:
- A unified colour system with brand variants (one warm/one cool? one accent-shift? — your call to propose) AND a held-in-reserve slot for OFM
- Typography system (defending or replacing Inter)
- Component-library mapping (which surface uses Tailwind Plus vs. Flux Pro vs. Web Awesome vs. raw Tailwind)
- Reference Blade/HTML templates for the load-bearing surfaces (hero, pricing, login, dashboard chrome, empty states)
- Design tokens as Tailwind v4 `@theme` blocks + Flux/Web Awesome theme JSON
- Override pattern for branded Mattermost + Mailcow (where we can only set colours + logos)
- **Native-app adaptation** — the same components running inside Wails/WebView, with platform-aware affordances (no hover-only states; touch-target sizing; safe-area aware)
- **STRETCH:** full e-commerce design pass for `order.host.uk.com` — cart / checkout / account dashboard / email templates / mobile checkout flow / cross-product upsell. E-commerce is tricky and the financial-spine surface deserves dedicated love.

---

## Brand 1 — Lethean (lthn.ai)

| | |
|---|---|
| Composer name | `lthn/app` |
| Description | "LTHN — Ethical AI, Open Source" |
| Live tagline | "Open Source AI Infrastructure" *(current homepage; edited on prod, not in source)* |
| Audience | Technical buyers (CTOs, data leads at regulated UK SMBs), self-hosters, developers in the Lethean ecosystem |
| Voice | Considered. Technical-credible. Anti-frontier-cloud-default without being preachy. UK-grounded. |
| Pitch | "Use the OSS, or pay us to host it for you." |
| Position | Dual-licensed: EUPL-1.2 OSS `core/agent` baseline + commercial hosted service |
| Sister surfaces | `team.lthn.ai` (Mattermost branded), `forge.lthn.ai` (Forgejo), `wiki.lthn.sh`, `tasks.lthn.sh` |

## Brand 2 — Host UK (host.uk.com)

| | |
|---|---|
| Composer name | `laravel/laravel` (vanilla skeleton + custom packages) |
| Tagline | "Hosting and SaaS for UK businesses and creators" |
| Audience | UK SMBs, creators, agencies — buying hosting + the wrapped SaaS family |
| Voice | Warm. Practical. UK consumer-rights-aware. Plain pricing, no surprise charges, clear cancellation. |
| Pitch | "Your link in one place, your social scheduled, your analytics private — one Host UK login across the family." |
| Position | Customer-facing commerce front. CorePHP wrapper sitting on top of turnkey engines (AltumCode products, MixPost Enterprise, Blesta) |
| Existing logo | Raven (geometric polygon, navy `#336` + periwinkle `#66c`) — `public/images/host-uk-raven.svg` |

## Brand relationship

Lethean OWNS Host UK. Host UK is the consumer-facing commerce surface; Lethean is the technical/ethical backbone. They should feel like sibling brands from the same studio:
- Same typography family
- Related colour palettes (one cool/serious for Lethean, one warm/welcoming for Host UK — or other unification scheme you'd recommend)
- Same component primitives (cards, buttons, forms behave identically)
- Same iconography family
- Same illustration style for empty/error states

---

## Site footprint (where this design lands)

### Web — Lethean surfaces

1. **lthn.ai** — marketing + AI product surface (Laravel app, multi-subdomain: also `app.`, `api.`, `mcp.`, `docs.`)
2. **team.lthn.ai** — Mattermost branded (theme JSON + logo only — no full reskin possible)

### Web — Host UK surfaces

3. **host.uk.com** — marketing + customer hub (Laravel app, the same skeleton as lthn.ai)
4. **link.host.uk.com** — link-in-bio + login bridge (CorePHP wrapper around AltumCode 66biolinks) — **the most-touched surface in the network; every paying customer logs in here every session**
5. **analytics.host.uk.com** — privacy analytics (wrapper around AltumCode 66analytics)
6. **notify.host.uk.com** — push notifications (wrapper around AltumCode 66pusher)
7. **social.host.uk.com** — social scheduling (wrapper around MixPost Enterprise)
8. **trust.host.uk.com** — social proof widgets (wrapper around AltumCode 66socialproof)
9. **order.host.uk.com** — billing/orders (wrapper around Blesta) — **STRETCH-GOAL marquee surface** (see deliverables)
10. **mail.host.org.mx** — webmail (Mailcow + SOGo, theme JSON + custom CSS only)

### Native — desktop

11. **CoreGUI Desktop** (Lethean Desktop) — Wails-v3-based shell wrapping CoreTS frontend. Window-managed, background-services-aware, OS-tray-integrated. The same Tailwind/Flux/Web-Awesome components rendering inside WebView2 (Win), WebKit (mac), WebKitGTK (Linux). The desktop is becoming the canonical Lethean surface — agents, dashboards, chat, file/secret manager all live here.

### Native — phone (iOS + Android)

12. **CoreGUI Mobile (iOS)** — same Wails-mobile / Capacitor-style wrap. Touch-first, safe-area-aware (notch / home-indicator), uses the iOS keyboard accessory bar.
13. **CoreGUI Mobile (Android)** — same shell on Android WebView. Touch-first, navigation-bar-aware.

### Future sibling — OFM (next-week design pass)

14. **ofm.bot family** — creator-agency tooling, separate Lethean spin-out. Will get its own design pass next week. **The colour system + component mapping must accommodate a third sibling brand without breaking** — hold one accent slot in reserve.

### Wrapper pattern (load-bearing for surfaces 4-9)

We override the AltumCode product's `index.php` with a CorePHP app that handles brand chrome (header, footer, nav, marketing landing) and proxies into the AltumCode engine for actual product features. The visual language must therefore work BOTH:
- Wrapped around our chrome (full design control)
- Layered over the AltumCode product's screens (limited overrides — needs to feel like a coherent design when only colours, headers, footers, and a few CSS variables are in our control)

### Most load-bearing surface

**`link.host.uk.com`** is the **login bridge** for the entire Host UK SaaS network — every product login routes through it via `one-time-login-code` tokens. The design here gets seen by every paying customer, multiple times per session. Treat this surface's auth UX as the primary brand-impression surface.

---

## Available licensed component libraries

I have the licences for ALL of these. Use them — don't propose primitives we'd have to build from scratch.

| Library | What it gives | Where it shines |
|---------|--------------|----------------|
| **Tailwind CSS v4** | Utility-first base, `@theme` design tokens | Foundation for everything |
| **Tailwind Plus** (`@tailwindplus/elements`) | Tailwind Labs' commercial component set — heroes, pricing tables, CTAs, application UI | Marketing landing pages + application chrome |
| **Tailwind Plugins** | `@tailwindcss/forms` (Tailwind-styled form controls), `@tailwindcss/typography` (prose styling) | Forms + long-form content |
| **Flux UI Pro** (Livewire-native) | Caleb Porzio's commercial Livewire components — modals, dropdowns, navigation, tables with reactive bindings | Authenticated app surfaces (customer dashboards) where Livewire reactivity is wanted |
| **Web Awesome Pro** (Lit/Web Components — Shoelace successor) | Framework-agnostic web components — datepickers, color pickers, complex inputs, popovers, dialogs, drawers | Embedded surfaces (widgets), parts of the AltumCode wrapper layer where Livewire isn't running |
| **Font Awesome Pro+** | Full Pro icon family + Sharp + Duotone variants | Universal iconography across all surfaces. **Do not use Heroicons** (project standard) |

### Mapping principle to follow

- **Marketing landing + pricing pages** → Tailwind Plus (their hero/pricing/CTA blocks are battle-tested)
- **Authenticated dashboards (Livewire-driven)** → Flux UI Pro
- **Embedded widgets / multi-framework surfaces** → Web Awesome (Lit components are framework-agnostic)
- **Forms** → `@tailwindcss/forms` baseline + Flux Pro for inline interactivity
- **Long-form (blog, docs, help)** → `@tailwindcss/typography`
- **Icons** → Font Awesome Pro everywhere — propose a sub-family choice (Sharp Solid? Duotone? Light?) per brand

---

## Existing brand hooks (extracted from current source)

| Asset | Detail |
|-------|--------|
| **Raven mark** | Geometric polygon raven (`public/images/host-uk-raven.svg`), fill `#336`, stroke `#66c`. Strong distinctive shape. Worth keeping if it can be extended to Lethean — propose as either shared mascot or paired with a Lethean equivalent. |
| **Current typography** | Inter (font-sans). Custom type scale called "Stellar" with letter-spacing tightened to `-0.017em` on most sizes. Defend or replace; if replacing, justify. |
| **Current admin palette** | Violet primary (`#8470ff` = violet-500, full 50→950 scale declared). Sky / green / red / yellow state accents. Tweaked grays (gray-300 = `#bfc4cd`). |
| **Named accent palettes** | "Hermes" (emerald) and "Ploutōn" (amber) — used on partner/landing pages. Greek-mythology-flavoured palette names suggest a brand naming convention worth preserving and extending. |
| **Animations** | Custom keyframes: `endless`, `shine`, `shineLine`, `float`, `pulse-slow`, `gradient`. The `shine` + `endless` animations are visible on marketing pages. |
| **Visual Identity (vi_*) illustration pack** | Hand-drawn-feel WebP illustrations for empty states + error pages: `vi_404`, `vi_500`, `vi_503`, `vi_dashboard_empty`, `vi_no_connected_accounts`, `vi_no_scheduled_posts`, `vi_social_host`, `vi_analytics`. Need extending for the wider product family. |
| **Flux UI Pro vendored** | `vendor/livewire/flux/dist/flux.css` already imported. |
| **Tailwind Plus elements** | `@tailwindplus/elements` already in package.json. |

---

## Design priorities (in order)

1. **Coherent family across both brands AND across web + native** — anyone seeing any surface (web or app) should feel the same studio designed all of it.
2. **Login surface is the primary impression** (`link.host.uk.com` is touched by every paying customer, every session) — its design is the bar everything else has to clear.
3. **Mobile-first** — most SaaS-product customers convert from phone (especially link-in-bio audience). Native phone apps are first-class, not an afterthought.
4. **Native apps must feel native, not "wrapped website"** — propose touch-target sizing, safe-area handling, no hover-only states, OS-aware affordances (iOS rubber-band, Android system back), platform-correct typography for native chrome
5. **Dark-mode capable** — Lethean technical audience often defaults to dark; SMB customers default to light. Both surfaces + both apps need light + dark with system-respecting auto-mode.
6. **Accessibility WCAG 2.1 AA minimum** — UK SMB audience includes neurodiverse + low-vision users.
7. **Performant first paint** — the public link-in-bio pages get shared widely, OG-tag-rendered, low-bandwidth-served. Don't ship 500kb of webfonts.
8. **Mailcow + Mattermost theme overrides** — the design system has to gracefully degrade into a Mattermost theme JSON + a SOGo CSS override. If a colour can't survive that constraint, it's not the right colour.
9. **Extensible to OFM next week** — colour system has at least one held-in-reserve accent slot; component patterns aren't so brand-saturated that a third sibling can't slot in cleanly.

## Non-negotiables

- **UK English** in every string of generated copy (colour, organisation, customise, centre, licence)
- **Font Awesome Pro** for icons — never Heroicons / Lucide / etc.
- **No Material Design** — too Google-coded for the audience
- **No glassmorphism** — dated, accessibility-hostile
- **No rounded-button + flat-card "SaaS template" look** — everyone has it, distinguishes nothing
- **EUPL-1.2 license** on every produced artefact

---

## Specific deliverables wanted

I'm burning **100% of my Claude Design weekly limit on this single seed** — there is no follow-up session this week. Produce as much as the budget allows; if you have to skip, skip from the bottom of this list, not the top.

### Foundation (must-have)

1. **Brand colour system** — primary + secondary + accents, light + dark modes, with hex values and a justification per choice. Hold one accent slot in reserve for OFM next week. Either:
   - Single palette with brand-variant accents (Lethean = cool primary, Host UK = warm primary), OR
   - Two related palettes that share neutrals + state colours but diverge on primary
   Your call which is stronger for this brand pair.

2. **Typography system** — defend Inter or propose alternatives, with a fallback chain. Type scale, letter-spacing, line-height. Heading vs. body vs. mono treatment. **Native-app considerations** — same family across web + native, OR platform-system-font swap on native (your call, justify).

3. **Component-library mapping table** — for every load-bearing UI surface in the site footprint above (incl. native app surfaces), name which library provides the primitive. Where multiple libraries could provide it, pick one and justify.

4. **Tailwind v4 `@theme` block** for both apps' `app.css` files — ready to drop into `/Users/snider/Code/lab/{lthn.ai,host.uk.com}/resources/css/app.css`.

### Reference web templates (load-bearing)

5. **Marketing landing hero — Lethean voice** for `lthn.ai` (technical audience, "Ethical AI, Open Source").

6. **Marketing landing hero — Host UK voice** for `host.uk.com` (SMB audience, "Hosting and SaaS for UK businesses and creators"). Show how it's the same hand designing both.

7. **Login surface — `link.host.uk.com`** (load-bearing — every paying customer touches this). Include the post-login "you're being signed in to <product>" splash for the one-time-login-code bridge.

8. **Pricing page pattern** — must work for all 6 SaaS subdomains and Lethean's commercial tiers. Show with two products' content as proof of pattern-fit.

### Native-app templates

9. **Native shell template — desktop** (CoreGUI / Wails) — window chrome, sidebar, content area, status bar. Light + dark. Desktop-typical density (denser than web).

10. **Native shell template — phone** (iOS + Android) — tab bar / nav drawer / safe-area handling, the brand applied at touch density. Show the same component (e.g. an account/settings screen) on web + desktop + phone to prove cross-surface coherence.

### Limited-knob surfaces

11. **Mattermost theme JSON** for `team.lthn.ai` — the limited-knob version of the Lethean palette.

12. **SOGo / Mailcow Admin CSS override** for `mail.host.org.mx` — the limited-knob version of the Host UK palette.

### Stretch — `order.host.uk.com` e-commerce design

13. **STRETCH MARQUEE: full `order.host.uk.com` e-commerce design pass.** E-commerce is tricky and the financial-spine surface deserves dedicated thinking. Includes:
    - Marketing landing for the orders portal (the "buy here" page from a sister product CTA)
    - **Cart UI** (single-item add → multi-item review → totals/VAT/discounts)
    - **Checkout flow** — recommend single-page vs. stepped, justify against conversion data
    - **Mobile checkout** — high-conversion priority; this is where most buyers convert
    - **Account dashboard** — active subscriptions, invoices/receipts, payment-method management, subscription change (upgrade/downgrade/cancel), GDPR data-export request
    - **Email templates** (HTML + plain): order received, payment received, invoice, trial expiring, subscription expiring, failed payment dunning sequence, account suspension, refund processed
    - **Cross-product upsell pattern within checkout** (the bundle-conversion pitch — "buy 2 products, save X%")
    - **Trust signals** treatment (testimonials, security badges, GDPR/UK-hosted markers, returns policy)
    - **Refund-request flow** UI
    - **Failure states** — payment declined, provisioning timeout, existing-customer-buying-second-product (don't force re-signup)

### Empty-state extension

14. **Empty-state pattern** — using the existing `vi_*.webp` illustration style, propose how to extend the pack for the new SaaS subdomains (analytics / notify / trust empty states). Style guide for future illustrations.

### Native-app polish (if budget remains)

15. **Native-platform affordance guide** — touch-target minimums, safe-area patterns, gesture conventions, OS-back vs. in-app-back, status-bar treatment, splash-screen treatment per platform, app-icon recommendations.

---

## Stack constraints

### Web

- **Backend:** Laravel 11 + CorePHP federated packages (core-php-tenant / -admin / -content / -commerce / -developer / -uptelligence + 8 `php-plug-*` packages — 600+ vendored PHP files do the heavy lifting)
- **Frontend:** Blade templates + **Livewire 3 + Flux UI Pro** + Vite + **Tailwind CSS v4** (not v3)
- **Runtime:** **FrankenPHP + Octane worker mode** (persistent PHP processes, NOT classic FPM) — design must respect that views render in long-lived processes (no per-request bootstrap waste, but also avoid global state mutation)
- **Real-time:** Pusher + Laravel Echo (`channels.php` wired) + Reverb websocket on :8080
- **Multi-tenant:** core-tenant's `BelongsToWorkspace` trait scopes queries; domain routing via per-Website `Boot::$domains` regex + `DomainResolving` event (not Laravel's `Route::domain()`)
- **Subdomain wrapping (current state):** API-only — `app/Mod/{Social,Links,Analytics,Notify,Trust}/Services/<X>Client.php` HTTP clients talking to AltumCode/MixPost admin APIs. Engine UIs run in separate containers. No index.php override yet. The "CorePHP wrapper-on-engine" pattern is the FUTURE direction; today's wrappers are HTTP-aggregation only.
- **Deploy:** single-stage Dockerfile → de1 (Hetzner, Germany). Host-builds vendor + node_modules + public/build first, then COPY'd in.

### Native (CoreGUI / Wails v3)

- **Shell:** Wails v3 (Go backend + WebView frontend on macOS/Win/Linux/iOS/Android)
- **Renderer:** WebView2 (Win), WKWebView (mac/iOS), WebKitGTK (Linux), Android WebView (Android)
- **Frontend:** **same** Tailwind v4 + Web Awesome (Lit components, framework-agnostic) + Flux Pro where Livewire is wrapped — runs inside the WebView
- **Native-only affordances:** Go-backed file/process/system APIs (no fetch-the-internet for OS work), tray integration, native menus, OS-level notifications
- **Mobile-only constraints:** safe areas (notch/home-indicator), platform-system fonts may be preferred for chrome, gesture-back, keyboard accessory bar (iOS), navigation bar (Android)

## What I'm NOT asking for

- Don't propose new component libraries to add (the licensed stack is fixed)
- Don't propose backend changes (the wrapper-on-engines pattern is decided)
- Don't propose new tooling (Vite + Tailwind v4 + Blade is fixed)
- Don't propose breaking the multi-tenant model
- Don't propose abandoning the AltumCode/MixPost/Blesta engines

## Inspiration directions to consider (not constraints)

- **Linear** — the considered, technical, calm-but-confident voice we want for Lethean
- **Stripe** — the conversion-design competence we want at `order.host.uk.com`
- **Buttondown / Beehiv / Ghost** — the warm-creator voice we want for `link.host.uk.com`
- **Plausible / Fathom** — the trust-by-restraint we want for `analytics.host.uk.com`
- **Fly.io** — the hand-crafted-but-technical aesthetic we'd love for the docs surface

These are reference points for tone, NOT visual templates to copy.

---

## Output format

Deliver as: design-decisions document (markdown) + per-surface code blocks (HTML/Blade) + the `@theme` block + the Mattermost theme JSON + the SOGo CSS override. I'll convert the design-decisions doc into one or more `DESIGN.md` updates across the website ops tree at `plans/ops/{hostuk,lthn}/website/<site>/DESIGN.md`.

If you have to make trade-offs against the priorities, tell me which priority you sacrificed and why.

---

## Closing

I want a system that says **"three confident sibling brands (two now, OFM next week), one studio, web + native, ecommerce-ready"** — not "Bootstrap themed twice" and not "two disconnected splash pages."

I have all the licensed primitives. I have a clear technical stack. I have a defined audience for each brand. I'm spending **100% of this week's Claude Design budget on this single seed** — there is no follow-up session. **If you have to skip deliverables to fit the budget, skip from #15 upward, NOT from #1 down.**

The order of importance:
1. Foundation (#1-4) — colour, type, component map, `@theme` block. Without these nothing else fits.
2. Web load-bearing templates (#5-8) — landing × 2, login (the most-touched surface), pricing.
3. Native shells (#9-10) — desktop + phone, prove cross-surface coherence.
4. Limited-knob (#11-12) — Mattermost + Mailcow themes.
5. **Stretch marquee (#13)** — `order.host.uk.com` ecommerce design pass. **If you can fit this, it's the highest-leverage single deliverable in the whole list** — the financial spine touches every paying customer's most-anxious moment (handing over money). It deserves the same attention as the foundation.
6. Empty-state extension (#14).
7. Native polish (#15).

Make the visual language that ties it together.
