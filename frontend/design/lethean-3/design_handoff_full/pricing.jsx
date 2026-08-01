/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Pricing — host.uk.com/pricing. Comparison table + FAQ +
// "which plan for me?" Vi widget. Annual/monthly toggle.
// ─────────────────────────────────────────────────────────

function PricingPage({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: "32px 56px 64px",
      display: "flex", flexDirection: "column", gap: 36,
    }}>
      {/* nav */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark size="md" />
        <nav style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--fg-2)" }}>
          <a>Products</a><a>Pricing</a><a>Customers</a><a>Docs</a><a>Company</a>
        </nav>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm">Sign in</button>
          <button className="btn btn-primary btn-sm">Start free</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 16 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em" }}>
          PLAIN PRICING · GBP · NO HIDDEN FEES
        </div>
        <h1 style={{ fontSize: 48, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 720 }}>
          One price. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Everything bundled.</span>
        </h1>
        <p style={{ fontSize: 16, color: "var(--fg-2)", maxWidth: 580, lineHeight: 1.55 }}>
          Hosting, domain, mail, analytics, and Vi watching over the lot. Cancel any time, your data ports out clean.
        </p>
        {/* annual/monthly */}
        <div style={{
          marginTop: 8,
          display: "inline-flex", padding: 4, borderRadius: 999,
          background: "var(--ink-2)", border: "1px solid var(--line-2)", gap: 4,
        }}>
          <button style={{ padding: "7px 16px", borderRadius: 999, background: "var(--ink-3)", color: "var(--fg-0)", fontSize: 12.5, border: "none" }}>Annual <span style={{ color: "var(--success-400)" }}>· save 2 months</span></button>
          <button style={{ padding: "7px 16px", borderRadius: 999, background: "transparent", color: "var(--fg-3)", fontSize: 12.5, border: "none" }}>Monthly</button>
        </div>
      </section>

      {/* Plans */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <PlanCard
          name="Starter"
          tagline="One site, kept simple"
          price={6}
          features={[
            "1 site · 5 GB hosting",
            "1 mailbox · 2 GB",
            "Free .uk.com subdomain",
            "Vi: alerts only",
            "Community support",
          ]}
          limits="Email response within 48h"
        />
        <PlanCard
          name="Standard"
          tagline="Most people start here"
          price={12}
          featured
          features={[
            "3 sites · 20 GB hosting",
            "5 mailboxes · 5 GB each",
            "Free domain (1st year)",
            "Vi: full agent · acts on your behalf",
            "Privacy analytics + bio link included",
            "Email + chat support · 4h response",
          ]}
          limits="14-day backups · auto-failover"
        />
        <PlanCard
          name="Studio"
          tagline="Agencies + teams"
          price={32}
          features={[
            "10 sites · 100 GB hosting",
            "Unlimited mailboxes",
            "Up to 5 free domains",
            "Vi: team mode · per-site permissions",
            "All Host UK products included",
            "Priority support · 1h response",
          ]}
          limits="Custom invoicing · VAT export"
        />
      </section>

      {/* Vi widget — pick a plan for me */}
      <section style={{
        background: "var(--ink-1)",
        border: "1px solid color-mix(in oklch, var(--brand-500) 24%, var(--line-2))",
        borderRadius: 18,
        padding: 28,
        display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 50% 80% at 80% 50%, color-mix(in oklch, var(--brand-500) 14%, transparent), transparent 60%)",
          pointerEvents: "none",
        }} />
        <div style={{
          width: 90, height: 90, borderRadius: 16,
          background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2))",
          display: "grid", placeItems: "center", overflow: "hidden",
          position: "relative", zIndex: 1,
        }}>
          <Vi pose="master" size={108} style={{ marginTop: 12 }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>VI · ASK BEFORE YOU BUY</div>
          <h3 style={{ fontSize: 22, marginTop: 6, letterSpacing: "-0.02em" }}>Tell me what you're building. I'll pick the plan.</h3>
          <p style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 6, maxWidth: 540, lineHeight: 1.55 }}>
            Two questions — what you're hosting and how many people use it. I'll suggest a plan and tell you when to upgrade. No hard sell, no upgrade nags.
          </p>
        </div>
        <button className="btn btn-primary btn-lg" style={{ position: "relative", zIndex: 1 }}>
          Ask Vi · 30s
          <Icon name="arrow-right" size={12} />
        </button>
      </section>

      {/* Comparison table */}
      <section>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em", marginBottom: 18 }}>Plan-by-plan</h2>
        <div style={{
          background: "var(--ink-2)",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {/* head */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 22px", background: "var(--ink-1)", borderBottom: "1px solid var(--line-1)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em" }}>
            <span>FEATURE</span><span style={{ textAlign: "center" }}>STARTER</span><span style={{ textAlign: "center", color: "var(--brand-300)" }}>STANDARD</span><span style={{ textAlign: "center" }}>STUDIO</span>
          </div>
          {[
            ["Sites", "1", "3", "10"],
            ["Hosting storage", "5 GB", "20 GB", "100 GB"],
            ["Mailboxes", "1", "5", "Unlimited"],
            ["Free domain (1st year)", "—", "✓", "Up to 5"],
            ["Bandwidth", "100 GB", "500 GB", "2 TB"],
            ["Vi agent", "Alerts only", "Full · acts on your behalf", "Team mode"],
            ["Privacy analytics", "—", "✓", "✓"],
            ["Bio-link page (Host Link)", "—", "✓", "✓"],
            ["Backups retained", "7 days", "14 days", "30 days"],
            ["Auto-failover (UK ↔ EU)", "—", "✓", "✓"],
            ["Support response", "48h", "4h", "1h · Slack channel"],
            ["VAT-itemised invoices", "—", "✓", "Bulk export · API"],
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr",
              padding: "11px 22px", fontSize: 13,
              borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
              alignItems: "center",
            }}>
              <span style={{ color: "var(--fg-1)" }}>{row[0]}</span>
              {row.slice(1).map((cell, j) => (
                <span key={j} style={{
                  textAlign: "center",
                  color: cell === "—" ? "var(--fg-4)" : j === 1 ? "var(--brand-200)" : "var(--fg-1)",
                  fontFamily: /[\d✓]/.test(cell) || cell === "—" ? "var(--font-mono)" : "inherit",
                  fontSize: cell === "✓" || cell === "—" ? 14 : 13,
                }}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.02em", marginBottom: 18 }}>Things people ask</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            ["Can I move existing sites in?", "Yes. Vi handles WordPress, Ghost, static sites, and most Node/Python apps. She'll do the migration overnight while you sleep."],
            ["What if I want to leave?", "Press one button. Your sites, mail, and data export as standard formats. No lock-in clauses, no exit fees, no awkward calls."],
            ["Is Vi reading my site content?", "No. She reads account data — uptime, bills, configurations. Site content (your files, your visitors' data) stays untouched unless you explicitly ask her to look."],
            ["Do you charge VAT?", "Yes — 20% UK VAT, itemised on every invoice. Reverse-charge applies for EU-registered businesses."],
            ["Where's my data hosted?", "UK-South (Manchester) by default, with auto-failover to EU-West (Amsterdam) on Standard and Studio. We're never on US-only infrastructure."],
            ["What counts as a 'site'?", "A unique domain or subdomain. Ten subdomains of one site = one site, in our counting."],
          ].map(([q, a], i) => (
            <div key={i} style={{
              background: "var(--ink-2)",
              border: "1px solid var(--line-1)",
              borderRadius: 12,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.005em" }}>{q}</div>
              <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 8, lineHeight: 1.55 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanCard({ name, tagline, price, featured, features, limits }) {
  return (
    <article style={{
      background: featured ? "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))" : "var(--ink-2)",
      border: featured ? "1px solid color-mix(in oklch, var(--brand-500) 38%, var(--line-2))" : "1px solid var(--line-1)",
      borderRadius: 16,
      padding: 24,
      display: "flex", flexDirection: "column", gap: 16,
      position: "relative",
      boxShadow: featured ? "0 0 0 1px color-mix(in oklch, var(--brand-400) 22%, transparent), 0 18px 50px color-mix(in oklch, var(--brand-700) 14%, transparent)" : "none",
    }}>
      {featured && (
        <div style={{
          position: "absolute", top: -10, left: 24,
          padding: "3px 10px", borderRadius: 999,
          background: "var(--brand-500)", color: "var(--fg-0)",
          fontSize: 10.5, letterSpacing: "0.06em", fontWeight: 500,
        }}>MOST POPULAR</div>
      )}
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.015em" }}>{name}</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>{tagline}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 18, color: "var(--fg-3)" }}>£</span>
        <span className="num tnum" style={{ fontSize: 44, color: "var(--fg-0)", letterSpacing: "-0.04em", fontWeight: 600 }}>{price}</span>
        <span style={{ fontSize: 13, color: "var(--fg-3)" }}>/month, billed yearly</span>
      </div>
      <div className="divider" />
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--fg-1)", lineHeight: 1.5 }}>
            <Icon name="check" size={11} color={featured ? "var(--brand-300)" : "var(--success-400)"} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 11.5, color: "var(--fg-4)", lineHeight: 1.5, marginTop: "auto" }}>{limits}</div>
      <button className={featured ? "btn btn-primary btn-lg" : "btn btn-secondary btn-lg"}>
        Start 30-day trial
      </button>
    </article>
  );
}

Object.assign(window, { PricingPage });
