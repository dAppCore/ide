/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Marketing-shared atoms: mega-menu nav, product Vi placeholder,
// section primitives, footer. Used by all 7 product pages +
// blog/changelog + help/docs.
// ─────────────────────────────────────────────────────────

/* The seven product slots, with named Vi poses that the next
   art-pass can fill in. Each pose name is intentional — it
   describes what Vi is doing, not what she looks like. */
const HOST_PRODUCTS = [
  { id: "hosting",   name: "Hosting",         tag: "Web hosting",       sub: "host.uk.com",            blurb: "WordPress, static, Node, Python — and a calm Vi watching", icon: "server",         hue: 305, viPose: "vi-hosting-watching" },
  { id: "link",      name: "Host Link",       tag: "Bio link",          sub: "link.host.uk.com",       blurb: "One link, everything you do — the login bridge for the family", icon: "link",      hue: 305, viPose: "vi-link-curating"  },
  { id: "analytics", name: "Host Analytics",  tag: "Privacy analytics", sub: "analytics.host.uk.com",  blurb: "Cookieless. GDPR. The numbers you actually need", icon: "chart-line",            hue: 305, viPose: "vi-analytics-charting" },
  { id: "notify",    name: "Host Notify",     tag: "Push notifications",sub: "notify.host.uk.com",     blurb: "Web + app push, deliverability you can audit", icon: "bell",                          hue: 305, viPose: "vi-notify-listening" },
  { id: "social",    name: "Host Social",     tag: "Social scheduling", sub: "social.host.uk.com",     blurb: "Schedule, queue, analyse — six networks, one calm grid", icon: "calendar-days",   hue: 305, viPose: "vi-social-scheduling" },
  { id: "trust",     name: "Host Trust",      tag: "Social proof",      sub: "trust.host.uk.com",      blurb: "Embeddable widgets so your customers' words can do the selling", icon: "shield-halved", hue: 305, viPose: "vi-trust-vouching"  },
  { id: "mail",      name: "Host Mail",       tag: "Webmail",           sub: "mail.host.org.mx",       blurb: "Plain mail with proper deliverability and Vi as your assistant", icon: "envelope",     hue: 305, viPose: "vi-mail-sorting"   },
];

/* ── ViAvatar — small circular avatar wrapper around the Vi sprite,
   used inside chat lines, callouts, search bars and inboxes. */
function ViAvatar({ size = 24, pose = "master" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
      border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
      overflow: "hidden", display: "grid", placeItems: "center",
      flexShrink: 0,
    }}>
      <Vi pose={pose === "thinking" ? "master" : pose} size={size * 1.15} />
    </div>
  );
}

/* ── ViContext — Vi master sprite + a context-frame that names
   the pose for the next pass. Looks like a real illustration
   on the canvas; documents the pose name in mono small print. */
function ViContext({ product, size = 220, framing = "card" }) {
  const p = HOST_PRODUCTS.find((x) => x.id === product);
  if (!p) return <Vi size={size} />;

  // The frame uses CSS to put Vi inside a "scene" — terminal pane,
  // calendar grid, chart pane etc. — sized to its product.
  const scenes = {
    hosting:   <SceneServerRack />,
    link:      <SceneLinkPreview />,
    analytics: <SceneChartLines />,
    notify:    <SceneNotificationStack />,
    social:    <SceneCalendarGrid />,
    trust:     <SceneStarStack />,
    mail:      <SceneMailStack />,
  };

  return (
    <div style={{
      width: size, aspectRatio: "1 / 1",
      borderRadius: 18,
      background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
      border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
      position: "relative", overflow: "hidden",
      boxShadow: "var(--shadow-2)",
    }}>
      {/* the scene fills the back of the frame */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        {scenes[product]}
      </div>
      {/* radial wash so Vi pops */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 60% at 50% 70%, color-mix(in oklch, var(--brand-500) 22%, transparent), transparent 70%)",
      }} />
      {/* Vi front-and-centre */}
      <div style={{
        position: "absolute", inset: 0,
        display: "grid", placeItems: "end center",
        paddingBottom: size * 0.04,
      }}>
        <Vi pose="master" size={size * 0.78} />
      </div>
      {/* pose name (canvas/dev artefact — visible in artboard,
          will be replaced when the real pose is drawn) */}
      <div style={{
        position: "absolute", left: 10, bottom: 8,
        fontSize: 9.5, fontFamily: "var(--font-mono)",
        color: "color-mix(in oklch, var(--fg-0) 50%, transparent)",
        letterSpacing: "0.04em",
      }}>
        {p.viPose}
      </div>
    </div>
  );
}

/* ── Scenes (CSS-only, abstracted to look like backgrounds) ── */
function SceneServerRack() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          height: 9, borderRadius: 1,
          background: i % 4 === 0 ? "color-mix(in oklch, var(--success-500) 50%, var(--ink-3))" : "var(--ink-3)",
          border: "1px solid var(--line-1)",
          display: "flex", alignItems: "center", paddingLeft: 4, gap: 3,
        }}>
          <span style={{ width: 3, height: 3, borderRadius: 999, background: i % 4 === 0 ? "var(--success-400)" : "var(--fg-4)" }} />
          <span style={{ flex: 1, height: 1, background: "var(--line-2)" }} />
        </div>
      ))}
    </div>
  );
}
function SceneLinkPreview() {
  return (
    <div style={{ position: "absolute", inset: 14, background: "var(--ink-3)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 999, background: "var(--brand-500)", margin: "4px auto 6px" }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 12, borderRadius: 4, background: i === 0 ? "var(--brand-500)" : "var(--ink-4)" }} />
      ))}
    </div>
  );
}
function SceneChartLines() {
  return (
    <svg viewBox="0 0 100 80" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <path d="M5 70 Q 25 40, 40 50 T 70 30 T 95 18" stroke="oklch(0.72 0.115 305)" strokeWidth="2" fill="none" />
      <path d="M5 76 Q 25 60, 40 64 T 70 50 T 95 42" stroke="oklch(0.72 0.115 165)" strokeWidth="1.5" fill="none" opacity="0.6" />
      {[15, 30, 45, 60, 75].map((x, i) => (
        <line key={i} x1={x} y1="6" x2={x} y2="76" stroke="oklch(0.42 0.012 285)" strokeWidth="0.3" strokeDasharray="1 2" />
      ))}
    </svg>
  );
}
function SceneNotificationStack() {
  return (
    <div style={{ position: "absolute", top: 16, right: 12, display: "flex", flexDirection: "column", gap: 6 }}>
      {[0.95, 0.75, 0.55].map((o, i) => (
        <div key={i} style={{ width: 110, opacity: o, padding: "6px 8px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 6, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--brand-500)" }} />
          <span style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--ink-5)" }} />
        </div>
      ))}
    </div>
  );
}
function SceneCalendarGrid() {
  return (
    <div style={{ position: "absolute", inset: 14, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} style={{
          aspectRatio: "1 / 1", borderRadius: 2,
          background: [3, 8, 14, 20, 26].includes(i) ? "color-mix(in oklch, var(--brand-500) 60%, var(--ink-3))" : "var(--ink-3)",
          border: "1px solid var(--line-1)",
        }} />
      ))}
    </div>
  );
}
function SceneStarStack() {
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", gap: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ fontSize: 18, color: "var(--gold-400)" }}>★</span>
        ))}
      </div>
    </div>
  );
}
function SceneMailStack() {
  return (
    <div style={{ position: "absolute", inset: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 30px", gap: 6, padding: "5px 7px", background: i === 0 ? "var(--ink-3)" : "transparent", borderRadius: 4, alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: i < 2 ? "var(--brand-400)" : "transparent" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ height: 4, borderRadius: 1, background: "var(--ink-5)" }} />
            <span style={{ height: 3, borderRadius: 1, background: "var(--ink-4)", width: "70%" }} />
          </div>
          <span style={{ fontSize: 7, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textAlign: "right" }}>09:42</span>
        </div>
      ))}
    </div>
  );
}

/* ── Mega menu nav ──────────────────────────────────────── */
function MarketingNav({ active = null, brand = "hostuk" }) {
  const [openMenu, setOpenMenu] = React.useState(null);
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      background: "color-mix(in oklch, var(--ink-0) 88%, transparent)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--line-1)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 56px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMark size="md" />
          <nav style={{ display: "flex", gap: 4, fontSize: 13, color: "var(--fg-2)" }}>
            <NavTrigger label="Products" open={openMenu === "products"} onEnter={() => setOpenMenu("products")} onLeave={() => setOpenMenu(null)} active={active === "products"} />
            <NavTrigger label="Solutions" open={openMenu === "solutions"} onEnter={() => setOpenMenu("solutions")} onLeave={() => setOpenMenu(null)} active={active === "solutions"} />
            <NavLink label="Pricing" active={active === "pricing"} />
            <NavLink label="Customers" active={active === "customers"} />
            <NavLink label="Help" active={active === "help"} />
            <NavLink label="Blog" active={active === "blog"} />
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-ghost btn-sm">
            <Icon name="magnifying-glass" size={11} /> Ask Vi
            <kbd style={{ marginLeft: 4, padding: "1px 5px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 3, fontSize: 10, fontFamily: "var(--font-mono)" }}>⌘K</kbd>
          </button>
          <button className="btn btn-ghost btn-sm">Sign in</button>
          <button className="btn btn-primary btn-sm">Start free</button>
        </div>
      </div>
      {openMenu === "products" && <ProductsMega onLeave={() => setOpenMenu(null)} />}
      {openMenu === "solutions" && <SolutionsMega onLeave={() => setOpenMenu(null)} />}
    </header>
  );
}

function NavTrigger({ label, open, onEnter, onLeave, active }) {
  return (
    <button
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "8px 12px",
        background: open ? "var(--ink-2)" : "transparent",
        border: "none", borderRadius: 6,
        color: active || open ? "var(--fg-0)" : "var(--fg-2)",
        fontSize: 13, fontWeight: 500,
      }}
    >
      {label}
      <Icon name="chevron-down" size={9} color="var(--fg-4)" />
    </button>
  );
}
function NavLink({ label, active }) {
  return (
    <a style={{
      padding: "8px 12px", borderRadius: 6,
      color: active ? "var(--fg-0)" : "var(--fg-2)",
      fontWeight: active ? 500 : 400,
      fontSize: 13,
    }}>{label}</a>
  );
}

function ProductsMega({ onLeave }) {
  return (
    <div
      onMouseLeave={onLeave}
      style={{
        position: "absolute", left: 0, right: 0, top: "100%",
        background: "var(--ink-1)",
        borderTop: "1px solid var(--line-1)",
        borderBottom: "1px solid var(--line-2)",
        boxShadow: "var(--shadow-3)",
        padding: "28px 56px 32px",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
        {/* products grid */}
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 14 }}>THE FAMILY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {HOST_PRODUCTS.map((p) => (
              <a key={p.id} style={{
                display: "grid", gridTemplateColumns: "32px 1fr", gap: 12, alignItems: "start",
                padding: "10px 12px", borderRadius: 8,
                cursor: "pointer",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 7,
                  background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))",
                  border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
                  display: "grid", placeItems: "center",
                }}>
                  <Icon name={p.icon} size={13} color="var(--brand-200)" />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-0)" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.45 }}>{p.blurb}</div>
                  <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", marginTop: 4 }}>{p.sub}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* sidebar — featured / quick links */}
        <div style={{
          padding: 22, borderRadius: 12,
          background: "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2))",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.08em" }}>NEW</div>
          <div>
            <div style={{ fontSize: 17, color: "var(--fg-0)", letterSpacing: "-0.02em", fontWeight: 600 }}>Vi Bundle · save 30%</div>
            <p style={{ fontSize: 12.5, color: "var(--fg-2)", marginTop: 6, lineHeight: 1.5 }}>
              Hosting + Link + Analytics for the price of two. Most start here.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>See the bundle <Icon name="arrow-right" size={10} /></button>
          <div className="divider" />
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em" }}>USEFUL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--fg-2)" }}>
            <a>Migration from Squarespace / Bluehost / GoDaddy</a>
            <a>Compare us with Cloudflare Pages</a>
            <a>API documentation</a>
            <a>Status (current uptime: 99.99%)</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SolutionsMega({ onLeave }) {
  const cols = [
    { title: "By role", items: ["For founders", "For designers", "For agencies", "For developers", "For creators"] },
    { title: "By need", items: ["Migrating in", "Going UK-sovereign", "GDPR / data export", "Multi-site management", "Team workspace"] },
    { title: "By industry", items: ["Hospitality", "Retail / e-commerce", "Charities", "Public sector", "Independent press"] },
  ];
  return (
    <div onMouseLeave={onLeave} style={{
      position: "absolute", left: 0, right: 0, top: "100%",
      background: "var(--ink-1)",
      borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-2)",
      boxShadow: "var(--shadow-3)",
      padding: "24px 56px 28px",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 36 }}>
        {cols.map((c) => (
          <div key={c.title}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 12 }}>{c.title.toUpperCase()}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {c.items.map((i) => <a key={i} style={{ fontSize: 13, color: "var(--fg-1)" }}>{i}</a>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Marketing footer (shared across all pages) ─────────── */
function MarketingFooter() {
  return (
    <footer style={{
      padding: "56px 56px 28px",
      borderTop: "1px solid var(--line-1)",
      background: "var(--ink-0)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 1fr", gap: 32, marginBottom: 36 }}>
        <div>
          <BrandMark size="md" />
          <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 14, lineHeight: 1.55, maxWidth: 320 }}>
            Hosting and SaaS for UK businesses and creators. Owned by Lethean Studio. Built in the UK, hosted UK-South + EU-West.
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 10, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>
            <span>UK Ltd · 14982737</span>
            <span>·</span>
            <span>VAT GB456789012</span>
          </div>
        </div>
        {[
          ["Products", HOST_PRODUCTS.map(p => p.name)],
          ["Company", ["About", "Careers", "Press kit", "Brand", "Contact"]],
          ["Legal", ["Terms", "Privacy", "AUP", "GDPR", "Modern Slavery Act"]],
          ["Resources", ["Help centre", "API docs", "Changelog", "Status", "RSS"]],
        ].map(([h, items]) => (
          <div key={h}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 14 }}>{h.toUpperCase()}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((i) => <li key={i} style={{ fontSize: 13, color: "var(--fg-2)" }}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 18, borderTop: "1px solid var(--line-1)",
        fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
      }}>
        <span>© Host UK 2026 · a Lethean studio brand</span>
        <span>Built with ☕ in Manchester</span>
      </div>
    </footer>
  );
}

/* ── Section primitives (used everywhere) ───────────────── */
function MktSection({ children, eyebrow, title, body, align = "left", maxBody = 580, style = {} }) {
  return (
    <section style={{ padding: "80px 56px", ...style }}>
      {(eyebrow || title || body) && (
        <div style={{
          maxWidth: 720, marginBottom: 40,
          textAlign: align,
          marginInline: align === "center" ? "auto" : undefined,
        }}>
          {eyebrow && <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>{eyebrow}</div>}
          {title && <h2 style={{ fontSize: 38, letterSpacing: "-0.03em", lineHeight: 1.08 }}>{title}</h2>}
          {body && <p style={{ fontSize: 15.5, color: "var(--fg-2)", marginTop: 14, lineHeight: 1.6, maxWidth: maxBody, marginInline: align === "center" ? "auto" : undefined }}>{body}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function MktCTA({ title, body, primary = "Start free", secondary = "Talk to us" }) {
  return (
    <section style={{ padding: "64px 56px" }}>
      <div style={{
        background: "var(--ink-2)",
        border: "1px solid var(--line-2)",
        borderRadius: 18,
        padding: 40,
        display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="brand-glow" style={{ position: "absolute", inset: 0, opacity: 0.6, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: 30, letterSpacing: "-0.025em", maxWidth: 540, lineHeight: 1.15 }}>{title}</h2>
          {body && <p style={{ fontSize: 14.5, color: "var(--fg-2)", marginTop: 10, maxWidth: 540, lineHeight: 1.55 }}>{body}</p>}
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
          <button className="btn btn-primary btn-lg">{primary}</button>
          <button className="btn btn-secondary btn-lg">{secondary}</button>
        </div>
      </div>
    </section>
  );
}

/* ── Reusable hero — type-led, with optional ViContext + custom proof ── */
function MktHero({ eyebrow, title, italics, body, primary = "Start free trial", secondary, viProduct, proof, customRight }) {
  return (
    <section style={{
      padding: "80px 56px 56px",
      display: "grid", gridTemplateColumns: customRight || viProduct ? "1.05fr 1fr" : "1fr",
      gap: 56, alignItems: "center", position: "relative",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {eyebrow && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 12px", borderRadius: "var(--r-pill)",
            background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
            fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em", alignSelf: "flex-start",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)", boxShadow: "0 0 8px var(--brand-400)" }} />
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontSize: 56, letterSpacing: "-0.04em", lineHeight: 1.04, color: "var(--fg-0)" }}>
          {title} {italics && <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)", fontSize: 58 }}>{italics}</span>}
        </h1>
        <p style={{ fontSize: 17.5, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 540 }}>{body}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <button className="btn btn-primary btn-lg">{primary}</button>
          {secondary && <button className="btn btn-secondary btn-lg">{secondary} <Icon name="arrow-right" size={11} /></button>}
        </div>
        {proof && (
          <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            {proof.map((p, i) => (
              <span key={i}><Icon name="circle-check" size={11} color="var(--success-400)" /> {p}</span>
            ))}
          </div>
        )}
      </div>
      {customRight ? customRight : viProduct ? <div style={{ display: "grid", placeItems: "center" }}><ViContext product={viProduct} size={420} /></div> : null}
    </section>
  );
}

Object.assign(window, {
  HOST_PRODUCTS, ViContext, ViAvatar,
  MarketingNav, ProductsMega, SolutionsMega,
  MarketingFooter, MktSection, MktCTA, MktHero,
});
