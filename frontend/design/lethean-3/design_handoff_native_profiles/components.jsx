/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Shared primitives for Host UK / Lethean prototypes
// All components scoped to a .surface ancestor.
// ─────────────────────────────────────────────────────────

const { useState, useEffect, useRef, useMemo } = React;

// ── Icon: Font Awesome Pro free fallback (Free 6 CDN — Pro classes
// gracefully degrade in CDN). Used as <Icon name="cart-shopping" /> etc.
function Icon({ name, style: iconStyle = "solid", className = "", size = 16, color }) {
  const prefix = iconStyle === "regular" ? "far" : iconStyle === "light" ? "fal" : iconStyle === "duotone" ? "fad" : "fas";
  return (
    <i
      className={`${prefix} fa-${name} ${className}`}
      style={{ fontSize: size, color, lineHeight: 1, display: "inline-block" }}
      aria-hidden="true"
    />
  );
}

// ── Brand wordmark — set by data-brand var; we render the word + raven dot
function BrandMark({ size = "md", showSubdomain = null }) {
  const sizes = { sm: { font: 14, dot: 8 }, md: { font: 17, dot: 10 }, lg: { font: 22, dot: 12 } };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: s.font + 8, height: s.font + 8,
        borderRadius: 6,
        background: "var(--brand-500)",
        display: "grid", placeItems: "center",
        boxShadow: "inset 0 1px 0 var(--line-2)"
      }}>
        <RavenGlyph size={s.font - 2} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: s.font, letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          <span data-brand-name>Host UK</span>
        </span>
        {showSubdomain && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: s.font - 4, color: "var(--fg-3)" }}>
            /{showSubdomain}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Tiny geometric raven glyph (matches the brand-mark dot — not a photo of Vi)
function RavenGlyph({ size = 14, color = "var(--fg-0)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 14c0-3.5 2.5-6 6.5-6.5 0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5l4 1.5c0 .8-.5 1.5-1.3 1.7l1 1.3-1.7.3.7 2-2-.7c-.8 1.5-2.5 2.4-4.7 2.4H8l-2 4-1-2 1-3c-1.6-.5-3-1.5-3-3.5z"
        fill={color}
        opacity="0.95"
      />
      <circle cx="13.5" cy="9" r="0.9" fill="var(--ink-1)" />
    </svg>
  );
}

// ── Vi sprite — uses the uploaded master image when pose === "master",
// peek poses for "peek-left"/"peek-right", and styled placeholder otherwise.
function Vi({ pose = "master", size = 200, label, style = {} }) {
  const real = {
    "master": "assets/vi/vi-master.png",
    "peek-right": "assets/vi/vi-peek-1.png",
    "peek-left": "assets/vi/vi-peek-2.png",
  }[pose];

  if (real) {
    return (
      <img
        src={real}
        alt={label || `Vi (${pose})`}
        style={{ width: size, height: "auto", display: "block", ...style }}
      />
    );
  }

  // Placeholder for poses we haven't commissioned yet
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: 16,
        border: "1px dashed var(--line-3)",
        background: "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6, padding: 12, textAlign: "center",
        ...style,
      }}
    >
      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--brand-200)", letterSpacing: "0.05em" }}>
        VI · {pose.toUpperCase()}
      </div>
      {label && <div style={{ fontSize: 11, color: "var(--fg-3)", lineHeight: 1.3 }}>{label}</div>}
    </div>
  );
}

// ── Field — label + input/select wrapper
function Field({ label, hint, error, children, span = 12 }) {
  return (
    <div style={{ gridColumn: `span ${span} / span ${span}` }}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 6 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11.5, color: "var(--danger-400)", marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ── Currency formatter — UK GBP
function gbp(n) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 }).format(n);
}

// ── Brand-aware product list (Host UK family). Lethean & OFM swap content.
const HOSTUK_PRODUCTS = [
  { id: "link", name: "Host Link", tag: "Bio link", icon: "link", subdomain: "link.host.uk.com", desc: "One link, everything you do.", price: 4 },
  { id: "social", name: "Host Social", tag: "Scheduling", icon: "calendar-days", subdomain: "social.host.uk.com", desc: "Schedule posts. Analyse results.", price: 12 },
  { id: "analytics", name: "Host Analytics", tag: "Privacy analytics", icon: "chart-line", subdomain: "analytics.host.uk.com", desc: "Cookieless. GDPR. Yours.", price: 9 },
  { id: "trust", name: "Host Trust", tag: "Social proof", icon: "shield-check", subdomain: "trust.host.uk.com", desc: "Reviews and proof, on-site.", price: 7 },
  { id: "notify", name: "Host Notify", tag: "Push", icon: "bell", subdomain: "notify.host.uk.com", desc: "Bring people back, gently.", price: 6 },
  { id: "mail", name: "Host Mail", tag: "Webmail", icon: "envelope", subdomain: "mail.host.org.mx", desc: "Private, UK-hosted email.", price: 5 },
];

const LETHEAN_PRODUCTS = [
  { id: "agent", name: "Lethean Agent", tag: "Self-hosted", icon: "microchip", subdomain: "lthn.ai/agent", desc: "EUPL-1.2. Run it yourself.", price: 0 },
  { id: "core", name: "Lethean Core", tag: "Hosted runtime", icon: "server", subdomain: "app.lthn.ai", desc: "We host the OSS for you.", price: 24 },
  { id: "mcp", name: "MCP Bridge", tag: "Tooling", icon: "plug", subdomain: "mcp.lthn.ai", desc: "Tool-server for any model.", price: 12 },
  { id: "team", name: "Lethean Team", tag: "Workspace", icon: "users", subdomain: "team.lthn.ai", desc: "Mattermost, themed.", price: 8 },
  { id: "forge", name: "Lethean Forge", tag: "Code", icon: "code-branch", subdomain: "forge.lthn.ai", desc: "Forgejo, but ours.", price: 10 },
  { id: "wiki", name: "Lethean Wiki", tag: "Docs", icon: "book-open", subdomain: "wiki.lthn.sh", desc: "Long-form, indexed.", price: 4 },
];

const OFM_PRODUCTS = [
  { id: "ofm-core", name: "OFM Studio", tag: "Agency core", icon: "palette", subdomain: "ofm.bot", desc: "The creator agency desk.", price: 18 },
  { id: "ofm-pipe", name: "OFM Pipeline", tag: "Workflows", icon: "diagram-project", subdomain: "pipe.ofm.bot", desc: "Briefs in, drafts out.", price: 22 },
  { id: "ofm-cast", name: "OFM Cast", tag: "Talent", icon: "address-card", subdomain: "cast.ofm.bot", desc: "Roster, rights, rates.", price: 14 },
  { id: "ofm-pulse", name: "OFM Pulse", tag: "Analytics", icon: "wave-pulse", subdomain: "pulse.ofm.bot", desc: "Performance across creators.", price: 11 },
  { id: "ofm-vault", name: "OFM Vault", tag: "Assets", icon: "vault", subdomain: "vault.ofm.bot", desc: "Source files, secured.", price: 8 },
  { id: "ofm-pay", name: "OFM Pay", tag: "Splits", icon: "money-bill-transfer", subdomain: "pay.ofm.bot", desc: "Pay creators on time.", price: 9 },
];

const PRODUCTS_BY_BRAND = {
  hostuk: HOSTUK_PRODUCTS,
  lethean: LETHEAN_PRODUCTS,
  ofm: OFM_PRODUCTS,
};

const BRAND_COPY = {
  hostuk: {
    name: "Host UK",
    domain: "host.uk.com",
    tagline: "Hosting and SaaS, for UK businesses and creators.",
    sub: "One login across the family. Privacy-first by default. Plain pricing, clear cancellation, no surprise charges.",
    pitch: "Your link in one place, your social scheduled, your analytics private — all from a single Host UK login.",
    cta: "Start with Host UK",
    voice: "warm",
  },
  lethean: {
    name: "Lethean",
    domain: "lthn.ai",
    tagline: "Open source AI infrastructure.",
    sub: "Dual-licensed: EUPL-1.2 OSS for self-hosters, commercial hosted service for teams that want it run for them.",
    pitch: "Use the OSS, or pay us to host it for you. Either way, your data stays where it should.",
    cta: "Read the docs",
    voice: "considered",
  },
  ofm: {
    name: "OFM",
    domain: "ofm.bot",
    tagline: "The operating system for creator agencies.",
    sub: "Briefs, talent, splits, and reporting — in one place built for the people running the agency, not the platforms.",
    pitch: "Stop running your roster out of spreadsheets and DMs. OFM is the desk every agency wishes it had.",
    cta: "Request access",
    voice: "confident",
  },
};

Object.assign(window, {
  Icon, BrandMark, RavenGlyph, Vi, Field, gbp,
  HOSTUK_PRODUCTS, LETHEAN_PRODUCTS, OFM_PRODUCTS,
  PRODUCTS_BY_BRAND, BRAND_COPY,
});
