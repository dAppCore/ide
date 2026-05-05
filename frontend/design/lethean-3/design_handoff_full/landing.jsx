/* eslint-disable */
// host.uk.com — marketing landing
// Density: 1280×900 artboard. Showcases hero, product family, pricing pattern, trust strip, footer.

function HostLanding({ brand = "hostuk" }) {
  const products = PRODUCTS_BY_BRAND[brand];
  const copy = BRAND_COPY[brand];

  return (
    <div className="surface" data-brand={brand} style={{ width: 1280, minHeight: 900, position: "relative" }}>
      <Nav brand={brand} />
      <Hero brand={brand} copy={copy} />
      <ProductFamily products={products} brand={brand} />
      <PricingStrip brand={brand} />
      <TrustBar />
      <Footer brand={brand} copy={copy} />
    </div>
  );
}

function Nav({ brand }) {
  const items = brand === "lethean"
    ? ["Product", "Docs", "Open source", "Pricing", "Blog"]
    : brand === "ofm"
    ? ["Studio", "Roster", "Pricing", "About"]
    : ["Products", "Pricing", "About", "Help", "Status"];
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 56px", borderBottom: "1px solid var(--line-1)",
      position: "sticky", top: 0, background: "color-mix(in oklch, var(--ink-1) 88%, transparent)",
      backdropFilter: "blur(8px)", zIndex: 5,
    }}>
      <BrandMark size="md" />
      <nav style={{ display: "flex", gap: 28 }}>
        {items.map(i => (
          <a key={i} style={{ fontSize: 14, color: "var(--fg-2)" }}>{i}</a>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a className="btn btn-ghost btn-sm">Sign in</a>
        <a className="btn btn-primary btn-sm">{brand === "lethean" ? "Get a quote" : "Start free"}</a>
      </div>
    </header>
  );
}

function Hero({ brand, copy }) {
  return (
    <section className="brand-glow" style={{ padding: "72px 56px 56px", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 48, alignItems: "center", maxWidth: 1180 }}>
        <div>
          <div className="pill pill-brand" style={{ marginBottom: 22 }}>
            <Icon name="circle-dot" size={9} />
            {brand === "lethean" ? "EUPL-1.2 · Self-host or hosted" : brand === "ofm" ? "Private beta · invite only" : "UK-hosted · Privacy-first"}
          </div>
          <h1 style={{ fontSize: 60, lineHeight: 1.02, letterSpacing: "-0.035em", marginBottom: 22 }}>
            {brand === "hostuk" ? (
              <>Hosting and SaaS, <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>built quietly</span> for UK businesses and creators.</>
            ) : brand === "lethean" ? (
              <>Open source AI infrastructure, <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>for people who'd rather own it.</span></>
            ) : (
              <>The operating system for <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>creator agencies</span>.</>
            )}
          </h1>
          <p style={{ fontSize: 18, color: "var(--fg-2)", maxWidth: 560, marginBottom: 32, lineHeight: 1.5 }}>
            {copy.sub}
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a className="btn btn-primary btn-lg">{copy.cta}<Icon name="arrow-right" size={13} /></a>
            <a className="btn btn-ghost btn-lg">
              <Icon name="circle-play" iconStyle="regular" size={15} />
              See how it works · 90s
            </a>
          </div>
          <div style={{ marginTop: 40, display: "flex", gap: 28, alignItems: "center" }}>
            <Stat n="2,400+" label={brand === "lethean" ? "self-hosted nodes" : "UK businesses"} />
            <div style={{ width: 1, height: 36, background: "var(--line-1)" }} />
            <Stat n="99.98%" label="uptime · last 90 days" />
            <div style={{ width: 1, height: 36, background: "var(--line-1)" }} />
            <Stat n="DE1, FR1, UK1" label="EU-only data plane" mono />
          </div>
        </div>

        {/* Vi hero panel */}
        <div style={{ position: "relative", height: 460, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ViHeroFrame brand={brand} />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label, mono }) {
  return (
    <div>
      <div className={mono ? "num" : ""} style={{ fontSize: mono ? 13 : 22, fontWeight: 600, color: "var(--fg-0)", letterSpacing: mono ? 0 : "-0.02em" }}>{n}</div>
      <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ViHeroFrame({ brand }) {
  // For Host UK: full Vi mascot front and centre.
  // For Lethean: more abstract — Vi peeking from behind a terminal-y card.
  // For OFM: Vi placeholder labelled, since we haven't commissioned.
  if (brand === "hostuk") {
    return (
      <div style={{ position: "relative", width: 460, height: 460 }}>
        <div className="dot-grid" style={{
          position: "absolute", inset: 0, borderRadius: 24, opacity: 0.5,
          maskImage: "radial-gradient(circle at 60% 50%, black 30%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", left: 30, top: 60, width: 300, padding: 18,
          background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14,
          boxShadow: "var(--shadow-2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "color-mix(in oklch, var(--brand-500) 25%, var(--ink-3))", display: "grid", placeItems: "center" }}>
              <Icon name="link" size={13} color="var(--brand-200)" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>link.host.uk.com</div>
            <div className="pill pill-success" style={{ marginLeft: "auto" }}>Live</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", lineHeight: 1.5 }}>
            "Your bio link, social schedule and analytics — one login, one bill."
          </div>
        </div>
        <Vi pose="master" size={420} style={{ position: "absolute", right: -30, bottom: -10, filter: "drop-shadow(0 24px 40px rgba(0,0,0,0.5))" }} />
        <div style={{
          position: "absolute", right: 12, top: 30, padding: "10px 14px",
          background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 12,
          fontSize: 12, color: "var(--fg-1)", boxShadow: "var(--shadow-2)", maxWidth: 200,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--brand-200)", marginBottom: 4 }}>VI</div>
          Right then. Fancy a cuppa whilst I sort your hosting?
        </div>
      </div>
    );
  }

  if (brand === "lethean") {
    return (
      <div style={{ position: "relative", width: 460, height: 460 }}>
        <div style={{
          position: "absolute", inset: "20px 10px 40px 20px",
          background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 14,
          boxShadow: "var(--shadow-3)", padding: 18, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-1)",
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ink-4)" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ink-4)" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ink-4)" }} />
            <div style={{ marginLeft: "auto", color: "var(--fg-3)", fontSize: 11 }}>~/lethean</div>
          </div>
          <div style={{ color: "var(--fg-3)" }}>$ <span style={{ color: "var(--fg-0)" }}>lthn agent up</span></div>
          <div style={{ color: "var(--success-400)" }}>✓ pulled lthn-core 0.42.1</div>
          <div style={{ color: "var(--success-400)" }}>✓ key set · EUPL-1.2</div>
          <div style={{ color: "var(--success-400)" }}>✓ MCP bridge :7331</div>
          <div style={{ color: "var(--fg-2)", marginTop: 8 }}>agent listening on de1.lthn.ai</div>
          <div style={{ color: "var(--fg-3)", marginTop: 8 }}>$ <span style={{ color: "var(--brand-200)" }}>_</span></div>
        </div>
        <Vi pose="peek-right" size={180} style={{ position: "absolute", right: -10, bottom: -20 }} />
      </div>
    );
  }

  // OFM
  return (
    <div style={{ position: "relative", width: 460, height: 460 }}>
      <Vi pose="ofm-confident-roster" size={400} label="confident, roster sheet, headphones" style={{ position: "absolute", inset: 30 }} />
    </div>
  );
}

function ProductFamily({ products, brand }) {
  return (
    <section style={{ padding: "64px 56px", borderTop: "1px solid var(--line-1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 32 }}>
        <div>
          <div className="pill" style={{ marginBottom: 14 }}>{brand === "lethean" ? "Stack" : brand === "ofm" ? "Modules" : "The family"}</div>
          <h2 style={{ fontSize: 38, letterSpacing: "-0.03em", maxWidth: 640 }}>
            {brand === "lethean" ? "One stack. Self-host or hand it to us." :
             brand === "ofm" ? "One desk. Every part of the agency." :
             "Six products. One login. No surprises."}
          </h2>
        </div>
        <a style={{ fontSize: 14, color: "var(--brand-200)", display: "flex", alignItems: "center", gap: 6 }}>
          See pricing <Icon name="arrow-right" size={11} />
        </a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {products.map(p => (
          <div key={p.id} className="card" style={{ padding: 22, position: "relative", transition: "border-color 120ms" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))",
                display: "grid", placeItems: "center",
                border: "1px solid color-mix(in oklch, var(--brand-500) 30%, transparent)",
              }}>
                <Icon name={p.icon} size={15} color="var(--brand-200)" />
              </div>
              <span className="pill">{p.tag}</span>
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--fg-0)", marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: "var(--fg-2)", marginBottom: 14, minHeight: 38 }}>{p.desc}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: "1px solid var(--line-1)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{p.subdomain}</span>
              <span style={{ fontSize: 13, color: "var(--fg-1)" }}>
                {p.price === 0 ? "Free / OSS" : <><span className="tnum" style={{ fontWeight: 600, color: "var(--fg-0)" }}>{gbp(p.price)}</span><span style={{ color: "var(--fg-3)" }}> / mo</span></>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingStrip({ brand }) {
  const tiers = brand === "lethean" ? [
    { name: "Self-hosted", price: "Free", note: "EUPL-1.2 · run it yourself", features: ["Lethean Agent OSS", "MCP bridge", "Community support"], cta: "Read the docs", featured: false },
    { name: "Hosted", price: "£24", suffix: "/mo", note: "We run it for you", features: ["Everything in self-hosted", "DE1 / FR1 data plane", "9×5 UK support"], cta: "Start free trial", featured: true },
    { name: "Team", price: "£8", suffix: "/seat", note: "Workspaces + audit", features: ["Mattermost included", "SSO + audit log", "DPA + UK invoicing"], cta: "Talk to us", featured: false },
  ] : brand === "ofm" ? [
    { name: "Solo", price: "£18", suffix: "/mo", note: "1 manager · 5 creators", features: ["Studio + Pulse", "Brief library", "Rate cards"], cta: "Request access", featured: false },
    { name: "Studio", price: "£64", suffix: "/mo", note: "5 managers · 50 creators", features: ["Everything in Solo", "OFM Pay splits", "Asset vault 1TB"], cta: "Request access", featured: true },
    { name: "Network", price: "POA", note: "Unlimited", features: ["Everything in Studio", "Dedicated CSM", "Custom contracts"], cta: "Talk to sales", featured: false },
  ] : [
    { name: "Starter", price: "£7", suffix: "/mo", note: "One product, one login", features: ["Pick any one product", "1 GB storage", "Email support"], cta: "Start free", featured: false },
    { name: "Family", price: "£24", suffix: "/mo", note: "All six products, one bill", features: ["Everything in the family", "10 GB · 5 seats", "Priority UK support"], cta: "Start 14-day trial", featured: true },
    { name: "Agency", price: "£64", suffix: "/mo", note: "Multi-tenant for clients", features: ["Family × 25 workspaces", "Reseller branding", "DPA + invoicing"], cta: "Talk to us", featured: false },
  ];

  return (
    <section style={{ padding: "64px 56px", borderTop: "1px solid var(--line-1)" }}>
      <div style={{ marginBottom: 32 }}>
        <div className="pill" style={{ marginBottom: 14 }}>Plain pricing</div>
        <h2 style={{ fontSize: 32, letterSpacing: "-0.03em" }}>No surprise charges. Cancel any time.</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {tiers.map((t, i) => (
          <div key={i} className="card" style={{
            padding: 28,
            border: t.featured ? "1px solid color-mix(in oklch, var(--brand-400) 60%, transparent)" : "1px solid var(--line-1)",
            background: t.featured ? "color-mix(in oklch, var(--brand-500) 5%, var(--ink-2))" : "var(--ink-2)",
            position: "relative",
          }}>
            {t.featured && (
              <div className="pill pill-brand" style={{ position: "absolute", top: -11, left: 24 }}>Most popular</div>
            )}
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", marginBottom: 4 }}>{t.name}</div>
            <div style={{ fontSize: 13, color: "var(--fg-3)", marginBottom: 18 }}>{t.note}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 22 }}>
              <span className="tnum" style={{ fontSize: 38, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.03em" }}>{t.price}</span>
              {t.suffix && <span style={{ color: "var(--fg-3)", fontSize: 14 }}>{t.suffix}</span>}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              {t.features.map((f, j) => (
                <li key={j} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, color: "var(--fg-1)" }}>
                  <Icon name="check" size={11} color="var(--success-400)" />
                  {f}
                </li>
              ))}
            </ul>
            <a className={t.featured ? "btn btn-primary" : "btn btn-secondary"} style={{ width: "100%" }}>{t.cta}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: "shield-halved", t: "GDPR by default", s: "UK-hosted, no third-party trackers" },
    { icon: "file-contract", t: "DPA on request", s: "Plain-English, signed inside a day" },
    { icon: "circle-sterling", t: "UK invoicing", s: "VAT receipts, BACS supported" },
    { icon: "headset", t: "Real UK support", s: "Reply within 4 hours, 9-5" },
  ];
  return (
    <section style={{ padding: "40px 56px", borderTop: "1px solid var(--line-1)", background: "var(--ink-0)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
        {items.map((i, k) => (
          <div key={k} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Icon name={i.icon} size={18} color="var(--brand-300)" />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-0)", marginBottom: 2 }}>{i.t}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{i.s}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer({ brand, copy }) {
  return (
    <footer style={{ padding: "40px 56px 32px", borderTop: "1px solid var(--line-1)", background: "var(--ink-0)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div style={{ maxWidth: 320 }}>
          <BrandMark size="md" />
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 12, lineHeight: 1.5 }}>
            {brand === "lethean" ? "Lethean Ltd. Registered in the UK. EUPL-1.2 OSS + commercial hosting." :
             brand === "ofm" ? "OFM is a Lethean spin-out. Private beta · 2026." :
             "Host UK is a Lethean company. Registered in England · No. 14820413."}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, auto)", gap: "8px 56px" }}>
          {[
            ["Products", ["Host Link", "Host Social", "Host Analytics", "Host Trust"]],
            ["Company", ["About", "Careers", "Press", "Contact"]],
            ["Resources", ["Docs", "Status", "Changelog", "API"]],
            ["Legal", ["Terms", "Privacy", "DPA", "Cookies"]],
          ].map(([h, items]) => (
            <div key={h}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginBottom: 12 }}>{h}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                {items.map(i => <li key={i} style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)" }}>© 2026 · UK English everywhere · EU-only data plane</div>
        <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--fg-3)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success-500)" }} />
            All systems normal
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>v0.42.1</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { HostLanding });
