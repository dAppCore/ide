/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Help centre · article template · search · blog · changelog
// All wrapped by MarketingNav + MarketingFooter.
// ─────────────────────────────────────────────────────────

/* ═════════════════════════════════════════════════════════
   help.host.uk.com — HOME
   Vi as the search field. Categories below.
   ═════════════════════════════════════════════════════════ */
function HelpCentreHome({ brand = "hostuk" }) {
  const cats = [
    { icon: "rocket", title: "Getting started", count: 18, lead: "Make your first site, point your domain, set up email" },
    { icon: "server", title: "Hosting", count: 42, lead: "WordPress, Ghost, Node, Python · runtime quirks" },
    { icon: "envelope", title: "Email & DNS", count: 24, lead: "DKIM, SPF, DMARC, MX records the way Vi writes them" },
    { icon: "credit-card", title: "Billing", count: 16, lead: "Invoices, VAT, plan changes, refunds" },
    { icon: "key", title: "Domains", count: 21, lead: "Register, transfer, point, .uk policy" },
    { icon: "shield-halved", title: "Security", count: 14, lead: "2FA, audit log, who has access, key rotation" },
    { icon: "robot", title: "About Vi", count: 9, lead: "What she does, what she doesn't, how to override" },
    { icon: "gear", title: "Account & teams", count: 11, lead: "Roles, switching workspaces, leaving a team" },
  ];
  const popular = [
    { title: "How to point a domain to your Host UK site", cat: "Domains", min: 4 },
    { title: "Setting up DKIM, SPF, DMARC properly", cat: "Email & DNS", min: 6 },
    { title: "Migrating from WordPress.com", cat: "Hosting", min: 8 },
    { title: "Adding a teammate with limited access", cat: "Account & teams", min: 2 },
    { title: "What Vi does and doesn't have access to", cat: "About Vi", min: 5 },
    { title: "Enabling Reverse VAT for B2B EU customers", cat: "Billing", min: 3 },
  ];
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="help" />
      {/* Hero */}
      <section style={{ padding: "72px 56px 48px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))", fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", marginBottom: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)" }} />
          HELP CENTRE · 156 ARTICLES · UPDATED WEEKLY
        </div>
        <h1 style={{ fontSize: 52, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
          Ask Vi. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Or browse below.</span>
        </h1>
        <p style={{ fontSize: 16.5, color: "var(--fg-2)", marginTop: 16, maxWidth: 580, marginInline: "auto", lineHeight: 1.55 }}>
          Most answers come back in under a second. If Vi can't find it, our humans are an email away.
        </p>
        {/* search */}
        <div style={{
          margin: "36px auto 0", maxWidth: 680, padding: "16px 18px",
          background: "var(--ink-2)", border: "1px solid var(--line-2)",
          borderRadius: 14, boxShadow: "var(--shadow-2)",
          display: "flex", gap: 14, alignItems: "center",
        }}>
          <ViAvatar size={36} pose="thinking" />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", marginBottom: 2 }}>ASK VI</div>
            <div style={{ fontSize: 15, color: "var(--fg-3)" }}>How do I point my domain to a new server?</div>
          </div>
          <kbd style={{ padding: "3px 8px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 4, fontSize: 11, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>↵</kbd>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6, fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          recent: "DKIM record" · "cancel plan" · "transfer domain" · "Squarespace migration"
        </div>
      </section>
      {/* Categories grid */}
      <section style={{ padding: "48px 56px 24px" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 18 }}>BROWSE BY TOPIC</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {cats.map((c) => (
            <a key={c.title} style={{
              padding: 22, background: "var(--ink-2)", border: "1px solid var(--line-1)",
              borderRadius: 12, display: "flex", flexDirection: "column", gap: 10,
              cursor: "pointer", transition: "border-color 0.18s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
                  border: "1px solid color-mix(in oklch, var(--brand-500) 26%, var(--line-2))",
                  display: "grid", placeItems: "center",
                }}>
                  <Icon name={c.icon} size={14} color="var(--brand-200)" />
                </div>
                <span className="num tnum" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>{c.count}</span>
              </div>
              <div>
                <div style={{ fontSize: 14.5, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.01em" }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4, lineHeight: 1.5 }}>{c.lead}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
      {/* Popular */}
      <section style={{ padding: "32px 56px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em" }}>POPULAR THIS WEEK</div>
          <a style={{ fontSize: 12.5, color: "var(--brand-300)" }}>All articles →</a>
        </div>
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12, overflow: "hidden" }}>
          {popular.map((p, i) => (
            <a key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 140px 50px",
              padding: "16px 20px", borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
              alignItems: "center", cursor: "pointer",
            }}>
              <span style={{ fontSize: 14, color: "var(--fg-1)" }}>{p.title}</span>
              <span style={{ fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{p.cat.toUpperCase()}</span>
              <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{p.min} min</span>
            </a>
          ))}
        </div>
      </section>
      {/* Talk to a human */}
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{
          padding: 32, background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 14,
          display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 18, color: "var(--fg-0)", letterSpacing: "-0.02em", fontWeight: 500 }}>
              Vi couldn't help? <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Then write to us.</span>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 6, maxWidth: 560 }}>
              Standard plans: average 3h 42m response. Studio plans: 38 minutes. Real humans, mostly in Manchester, occasionally in Oaxaca.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-secondary btn-md">Email support</button>
            <button className="btn btn-primary btn-md">Open a ticket</button>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   help.host.uk.com — ARTICLE TEMPLATE
   Long-form layout: breadcrumbs · sidebar · body · footer.
   ═════════════════════════════════════════════════════════ */
function HelpArticle({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="help" />
      {/* breadcrumb */}
      <div style={{ padding: "20px 56px 0", fontSize: 12, color: "var(--fg-3)", display: "flex", gap: 8, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        <a style={{ color: "var(--fg-4)" }}>HELP</a>
        <span style={{ color: "var(--fg-5)" }}>/</span>
        <a style={{ color: "var(--fg-4)" }}>EMAIL & DNS</a>
        <span style={{ color: "var(--fg-5)" }}>/</span>
        <span style={{ color: "var(--fg-1)" }}>SETTING UP DKIM, SPF, DMARC</span>
      </div>
      <section style={{ padding: "32px 56px 64px", display: "grid", gridTemplateColumns: "240px 1fr 240px", gap: 48 }}>
        {/* sidebar — section TOC */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "flex-start" }}>
          <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 12 }}>EMAIL & DNS</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              ["Email basics", false],
              ["MX records explained", false],
              ["Setting up DKIM, SPF, DMARC", true],
              ["DMARC reporting & alignment", false],
              ["Custom domain mailboxes", false],
              ["Forwarders & aliases", false],
              ["Catch-all addresses", false],
              ["Migrating from cPanel mail", false],
              ["Migrating from Google Workspace", false],
            ].map(([t, active]) => (
              <li key={t}>
                <a style={{
                  display: "block", padding: "6px 12px", borderRadius: 5,
                  fontSize: 13, color: active ? "var(--fg-0)" : "var(--fg-2)",
                  background: active ? "var(--ink-2)" : "transparent",
                  borderLeft: active ? "2px solid var(--brand-400)" : "2px solid transparent",
                }}>{t}</a>
              </li>
            ))}
          </ul>
        </aside>
        {/* body */}
        <article style={{ maxWidth: 720 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.08em", marginBottom: 14 }}>
            EMAIL & DNS · 6 MIN READ · UPDATED 14 MAR 2026
          </div>
          <h1 style={{ fontSize: 40, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 18 }}>
            Setting up DKIM, SPF, and DMARC <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>properly.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 18 }}>
            Three records, three jobs. SPF tells the world which servers are allowed to send email on your behalf. DKIM signs each outgoing message. DMARC tells receiving servers what to do if SPF or DKIM fails — and asks them to email you reports.
          </p>
          <p style={{ fontSize: 16, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 26 }}>
            If you set Host Mail up through onboarding, Vi has already done all three. This article is for people who want to know what was added and why — or who are setting up a custom sending domain by hand.
          </p>

          <h2 style={{ fontSize: 22, color: "var(--fg-0)", marginTop: 36, marginBottom: 10, letterSpacing: "-0.02em" }}>1 · The SPF record</h2>
          <p style={{ fontSize: 15.5, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 16 }}>
            Add a single TXT record at the apex of your domain (the bare <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-2)", padding: "2px 6px", borderRadius: 3 }}>@</code> entry):
          </p>
          <pre style={{
            padding: "16px 20px", background: "var(--ink-2)", border: "1px solid var(--line-2)",
            borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-0)",
            overflow: "auto", lineHeight: 1.6, marginBottom: 22,
          }}>
{`@   TXT   "v=spf1 include:_spf.host.uk.com ~all"`}
          </pre>

          <Callout kind="vi" title="Vi adds this for you">
            If you connected your domain in onboarding, this record is already in place. You can verify it in Settings → Email → Sending domain.
          </Callout>

          <h2 style={{ fontSize: 22, color: "var(--fg-0)", marginTop: 36, marginBottom: 10, letterSpacing: "-0.02em" }}>2 · The DKIM record</h2>
          <p style={{ fontSize: 15.5, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 16 }}>
            DKIM uses a public key. We generate one per sending domain and rotate monthly. The DNS record points at our key server:
          </p>
          <pre style={{ padding: "16px 20px", background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-0)", overflow: "auto", lineHeight: 1.6, marginBottom: 22 }}>
{`hk1._domainkey   CNAME   hk1._domainkey.host.uk.com.`}
          </pre>

          <h2 style={{ fontSize: 22, color: "var(--fg-0)", marginTop: 36, marginBottom: 10, letterSpacing: "-0.02em" }}>3 · The DMARC record</h2>
          <p style={{ fontSize: 15.5, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 16 }}>
            We start everyone at <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-2)", padding: "2px 6px", borderRadius: 3 }}>p=quarantine</code> with a 100% sample. Once we've watched alignment hold for two weeks, Vi will offer to bump you to <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-2)", padding: "2px 6px", borderRadius: 3 }}>p=reject</code>.
          </p>
          <pre style={{ padding: "16px 20px", background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-0)", overflow: "auto", lineHeight: 1.6, marginBottom: 22 }}>
{`_dmarc   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@host.uk.com;
                 pct=100; aspf=s; adkim=s"`}
          </pre>

          <Callout kind="warn" title="Don't paste two SPF records">
            DNS only allows one SPF record per domain. If you already send via Mailgun or Postmark, merge the includes into a single record. Vi will spot the conflict during the connect step and offer the merged version.
          </Callout>

          <h2 style={{ fontSize: 22, color: "var(--fg-0)", marginTop: 36, marginBottom: 10, letterSpacing: "-0.02em" }}>Verifying it worked</h2>
          <p style={{ fontSize: 15.5, color: "var(--fg-1)", lineHeight: 1.7, marginBottom: 16 }}>
            Send a test email to <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-2)", padding: "2px 6px", borderRadius: 3 }}>check@host.uk.com</code>. Vi replies in under a minute with a per-record breakdown.
          </p>
          {/* feedback */}
          <div style={{
            marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line-1)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: 13, color: "var(--fg-2)" }}>Was this helpful?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm">👍 Yes</button>
              <button className="btn btn-secondary btn-sm">👎 No, suggest an edit</button>
            </div>
          </div>
        </article>
        {/* right rail — meta */}
        <aside style={{ position: "sticky", top: 90, alignSelf: "flex-start" }}>
          <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 12 }}>ON THIS PAGE</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--fg-3)" }}>
            <li>1 · The SPF record</li>
            <li>2 · The DKIM record</li>
            <li style={{ color: "var(--brand-300)" }}>3 · The DMARC record</li>
            <li>Verifying it worked</li>
          </ul>
          <div style={{ marginTop: 36, paddingTop: 16, borderTop: "1px solid var(--line-1)" }}>
            <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 10 }}>RELATED</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
              <a style={{ color: "var(--fg-2)" }}>DMARC reporting & alignment</a>
              <a style={{ color: "var(--fg-2)" }}>Custom domain mailboxes</a>
              <a style={{ color: "var(--fg-2)" }}>Migrating from Google Workspace</a>
            </div>
          </div>
        </aside>
      </section>
      <MarketingFooter />
    </div>
  );
}

function Callout({ kind = "info", title, children }) {
  const palette = {
    info:  { bg: "color-mix(in oklch, var(--brand-500) 9%, var(--ink-2))", border: "color-mix(in oklch, var(--brand-500) 26%, var(--line-2))", icon: "circle-info", iconColor: "var(--brand-300)" },
    warn:  { bg: "color-mix(in oklch, var(--gold-500) 9%, var(--ink-2))", border: "color-mix(in oklch, var(--gold-500) 26%, var(--line-2))", icon: "triangle-exclamation", iconColor: "var(--gold-400)" },
    vi:    { bg: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "color-mix(in oklch, var(--brand-500) 32%, var(--line-2))", icon: null, iconColor: "var(--brand-200)" },
  }[kind];
  return (
    <div style={{
      padding: 18, borderRadius: 10,
      background: palette.bg, border: `1px solid ${palette.border}`,
      display: "grid", gridTemplateColumns: "auto 1fr", gap: 14,
      marginBottom: 22,
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--ink-2)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center" }}>
        {kind === "vi" ? <ViAvatar size={20} pose="thinking" /> : <Icon name={palette.icon} size={13} color={palette.iconColor} />}
      </div>
      <div>
        <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.005em" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.6, marginTop: 4 }}>{children}</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   help.host.uk.com/search — RESULTS
   Vi at top with reasoning · ranked results.
   ═════════════════════════════════════════════════════════ */
function HelpSearchResults({ brand = "hostuk", query = "domain not pointing" }) {
  const results = [
    { title: "How to point a domain to your Host UK site", cat: "Domains", min: 4, snippet: "Add an A record to <code>@</code> and a CNAME for <code>www</code> pointing at <code>edge.host.uk.com</code>. DNS can take up to 24 hours…" },
    { title: "Why isn't my domain working yet?", cat: "Domains", min: 5, snippet: "Three things to check first: (1) the nameservers, (2) the A and CNAME records, (3) DNSSEC if you've enabled it…" },
    { title: "Transferring an existing domain in", cat: "Domains", min: 6, snippet: "Unlock the domain at your current registrar, request the auth code, paste it during transfer…" },
    { title: "Pointing a subdomain to a different service", cat: "Domains", min: 3, snippet: "You can point <code>shop.yourdomain.com</code> at Shopify or any other host while keeping the apex on Host UK…" },
    { title: "DNS propagation: what the wait actually means", cat: "Email & DNS", min: 4, snippet: "Resolvers cache responses based on TTL. Lower TTL before a change to speed propagation…" },
  ];
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="help" />
      <section style={{ padding: "32px 56px 64px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 36 }}>
        <div style={{ maxWidth: 760 }}>
          {/* search bar */}
          <div style={{
            padding: "12px 16px",
            background: "var(--ink-2)", border: "1px solid var(--line-2)",
            borderRadius: 10, display: "flex", gap: 12, alignItems: "center", marginBottom: 24,
          }}>
            <Icon name="magnifying-glass" size={13} color="var(--fg-3)" />
            <span style={{ flex: 1, fontSize: 14.5, color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{query}</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>14 results · 184ms</span>
          </div>
          {/* Vi answer */}
          <div style={{
            padding: 22, marginBottom: 28,
            background: "color-mix(in oklch, var(--brand-500) 10%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
            borderRadius: 12,
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              <ViAvatar size={22} pose="thinking" /> VI'S BEST GUESS · WITH SOURCES
            </div>
            <p style={{ fontSize: 14.5, color: "var(--fg-0)", lineHeight: 1.65, margin: 0 }}>
              Most "domain not pointing" issues come down to one of three things: the nameservers haven't been changed at your registrar, the A and CNAME records are wrong, or DNS hasn't propagated yet (it can take up to 24 hours, but usually under 30 minutes for new domains).
              <br /><br />
              Quickest check: run <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-3)", padding: "1px 6px", borderRadius: 3 }}>dig yourdomain.com</code> in a terminal — if you see <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-3)", padding: "1px 6px", borderRadius: 3 }}>edge.host.uk.com</code> in the answer, you're set.
            </p>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-2))", fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
              sources · article #DNS-014 · article #DOMAINS-021 · status incident #2026-03-12
            </div>
          </div>
          {/* result list */}
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 14 }}>RANKED ARTICLES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {results.map((r, i) => (
              <a key={i} style={{
                padding: "16px 18px", background: i === 0 ? "var(--ink-2)" : "transparent",
                border: "1px solid " + (i === 0 ? "var(--line-2)" : "transparent"),
                borderRadius: 8, cursor: "pointer",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 14.5, color: "var(--fg-0)", fontWeight: 500 }}>{r.title}</span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>· {r.cat.toUpperCase()} · {r.min} MIN</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: r.snippet }} />
              </a>
            ))}
          </div>
        </div>
        {/* filters */}
        <aside>
          <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 12 }}>FILTER BY</div>
          {[
            { title: "Topic", items: ["Domains (8)", "Email & DNS (4)", "Hosting (2)", "Billing (0)"] },
            { title: "Type", items: ["How-to (10)", "Reference (3)", "Troubleshooting (1)"] },
            { title: "Updated", items: ["Last 30 days (6)", "Last 90 days (12)", "Last year (14)"] },
          ].map((g) => (
            <div key={g.title} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, color: "var(--fg-1)", fontWeight: 500, marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {g.items.map((i) => (
                  <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--fg-2)" }}>
                    <input type="checkbox" />
                    <span>{i}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </section>
      <MarketingFooter />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   blog.host.uk.com — INDEX
   Editorial. One feature, then a 3-up grid, then archive list.
   ═════════════════════════════════════════════════════════ */
function BlogIndex({ brand = "hostuk" }) {
  const features = [
    { tag: "ESSAY", date: "14 MAR 2026", title: "What we mean by \"sovereign hosting\"", lead: "We host in Manchester. The data is in the UK. The company is in the UK. None of these are accidents — and here's why each one matters in 2026.", author: "Anson Le", min: 12 },
  ];
  const grid = [
    { tag: "ENGINEERING", date: "12 Mar", title: "How Vi runs migrations overnight", min: 6, author: "Lina Holm" },
    { tag: "POLICY", date: "08 Mar", title: "What the new Online Safety guidance means for small UK sites", min: 8, author: "Dr. Priya Patel" },
    { tag: "PRODUCT", date: "01 Mar", title: "Host Mail's deliverability story, six months in", min: 5, author: "Anson Le" },
  ];
  const archive = [
    { date: "24 FEB", title: "Why we don't have a Black Friday sale", tag: "ESSAY" },
    { date: "17 FEB", title: "Reading our DMARC reports out loud, properly", tag: "ENGINEERING" },
    { date: "10 FEB", title: "Adding Apple Maps reviews to Host Trust", tag: "PRODUCT" },
    { date: "03 FEB", title: "How we onboarded our first 100 charity customers", tag: "STORIES" },
    { date: "27 JAN", title: "An honest comparison of UK hosts in 2026", tag: "POLICY" },
    { date: "20 JAN", title: "Vi's runbook for the November 2025 outage", tag: "ENGINEERING" },
    { date: "13 JAN", title: "Reflections on year one", tag: "ESSAY" },
  ];
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="blog" />
      <section style={{ padding: "56px 56px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 36 }}>
          <h1 style={{ fontSize: 48, letterSpacing: "-0.04em" }}>
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>The</span> Host UK <span className="editorial" style={{ fontStyle: "italic" }}>journal.</span>
          </h1>
          <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em" }}>
            <a>ALL</a><a>ESSAYS</a><a>ENGINEERING</a><a>POLICY</a><a>PRODUCT</a><a>RSS</a>
          </div>
        </div>
        {/* lead feature */}
        {features.map((f, i) => (
          <article key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 36, paddingBottom: 48, borderBottom: "1px solid var(--line-1)" }}>
            <div>
              <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.08em", marginBottom: 14 }}>{f.tag} · {f.date}</div>
              <h2 style={{ fontSize: 44, letterSpacing: "-0.035em", lineHeight: 1.08 }}>
                {f.title.replace(/"([^"]+)"/, "")} <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>"{f.title.match(/"([^"]+)"/)?.[1]}"</span>
              </h2>
              <p style={{ fontSize: 16, color: "var(--fg-2)", lineHeight: 1.6, marginTop: 18, maxWidth: 560 }}>{f.lead}</p>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 26, fontSize: 12.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: "linear-gradient(135deg, var(--brand-400), var(--brand-700))" }} />
                <span>{f.author.toUpperCase()}</span>
                <span style={{ color: "var(--fg-5)" }}>·</span>
                <span>{f.min} MIN READ</span>
              </div>
            </div>
            <div style={{
              borderRadius: 14,
              background: "linear-gradient(135deg, color-mix(in oklch, var(--brand-500) 28%, var(--ink-2)), color-mix(in oklch, var(--brand-700) 22%, var(--ink-1)))",
              border: "1px solid color-mix(in oklch, var(--brand-500) 26%, var(--line-2))",
              minHeight: 280, display: "grid", placeItems: "center",
              position: "relative", overflow: "hidden",
            }}>
              <div className="editorial" style={{ fontStyle: "italic", color: "color-mix(in oklch, var(--fg-0) 80%, transparent)", fontSize: 36, letterSpacing: "-0.02em", padding: 24, textAlign: "center", lineHeight: 1.2, maxWidth: "85%" }}>
                "Sovereign isn't a marketing word. It's <span style={{ color: "var(--brand-200)" }}>a contract.</span>"
              </div>
            </div>
          </article>
        ))}
      </section>
      {/* 3-up grid */}
      <section style={{ padding: "48px 56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {grid.map((p, i) => (
            <article key={i} style={{
              padding: 24, background: "var(--ink-2)", border: "1px solid var(--line-1)",
              borderRadius: 12, display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.06em" }}>{p.tag} · {p.date}</div>
              <h3 style={{ fontSize: 21, letterSpacing: "-0.02em", lineHeight: 1.18, color: "var(--fg-0)" }}>{p.title}</h3>
              <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line-1)", display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
                <span>{p.author}</span>
                <span>{p.min} MIN</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      {/* archive */}
      <section style={{ padding: "32px 56px 64px" }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 18 }}>ARCHIVE</div>
        <div style={{ borderTop: "1px solid var(--line-1)" }}>
          {archive.map((p, i) => (
            <a key={i} style={{
              display: "grid", gridTemplateColumns: "80px 1fr 110px",
              padding: "16px 0", borderBottom: "1px solid var(--line-1)",
              alignItems: "center", cursor: "pointer",
            }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em" }}>{p.date}</span>
              <span style={{ fontSize: 14.5, color: "var(--fg-1)" }}>{p.title}</span>
              <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.06em", textAlign: "right" }}>{p.tag}</span>
            </a>
          ))}
        </div>
      </section>
      {/* subscribe */}
      <section style={{ padding: "32px 56px 80px" }}>
        <div style={{
          padding: 32, background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 14,
          display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 19, color: "var(--fg-0)", letterSpacing: "-0.02em", fontWeight: 500 }}>
              <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>One</span> long-read a fortnight. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>That's it.</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4 }}>2 384 readers. Unsubscribe in one click.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="anson@yourbrand.com" style={{ width: 240, height: 40, padding: "0 14px", background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 8, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontSize: 13 }} />
            <button className="btn btn-primary btn-md">Subscribe</button>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════
   changelog.host.uk.com — MONO-LED
   Engineering changelog: dates, semver, tight rows, code.
   ═════════════════════════════════════════════════════════ */
function ChangelogPage({ brand = "hostuk" }) {
  const releases = [
    {
      v: "2026.03.14", date: "14 MARCH", tag: "FEATURE",
      title: "Vi can now read DMARC reports out loud",
      bullets: [
        ["new",  "Daily DMARC summary in the inbox · per-domain · per-source"],
        ["new",  "Vi auto-generates the corrected SPF when a third-party sender is found"],
        ["fix",  "Edge case where DKIM rotation lagged 6h on .uk.com domains · resolved"],
        ["docs", "Help · Email & DNS · Setting up DKIM, SPF, DMARC properly · rewritten"],
      ],
    },
    {
      v: "2026.03.07", date: "07 MARCH", tag: "PERFORMANCE",
      title: "Faster TTFB on UK-South · median 28 ms",
      bullets: [
        ["chg",  "FrankenPHP upgraded · 7 % CPU reduction across PHP-Nginx workloads"],
        ["chg",  "Anycast DNS edges in UK-South now run RFC 9460 (HTTPS records)"],
        ["fix",  "Slow first-request after sleep on Standard plan · resolved"],
      ],
    },
    {
      v: "2026.02.28", date: "28 FEBRUARY", tag: "FEATURE",
      title: "Host Trust · Apple Maps reviews",
      bullets: [
        ["new",  "Connect Apple Maps · OAuth · daily sync · same widget gallery"],
        ["new",  "Per-source filter on every widget (\"only show 4★ and up\")"],
        ["chg",  "Trust widgets now lazy-load · 1.2KB → 0.8KB initial JS"],
      ],
    },
    {
      v: "2026.02.21", date: "21 FEBRUARY", tag: "SECURITY",
      title: "Per-team passkey enrolment, by default",
      bullets: [
        ["new",  "Passkeys (WebAuthn) supported on every account · TOTP fallback retained"],
        ["sec",  "Session token rotation aligned with NIST SP 800-63B Rev 4"],
        ["fix",  "Phantom \"unknown device\" entries on account audit log · resolved"],
      ],
    },
    {
      v: "2026.02.14", date: "14 FEBRUARY", tag: "PRODUCT",
      title: "Host Notify · Threads support",
      bullets: [
        ["new",  "Threads is now a target in Notify campaigns · OAuth, instant"],
        ["chg",  "Composer auto-suggests channel-specific tone (Threads is friendlier than X)"],
      ],
    },
  ];
  const tagColors = {
    FEATURE: "var(--brand-300)",
    PERFORMANCE: "var(--success-400)",
    SECURITY: "var(--danger-400)",
    PRODUCT: "var(--brand-300)",
    DOCS: "var(--fg-2)",
  };
  const kindColors = {
    new:  "var(--success-400)",
    chg:  "var(--brand-300)",
    fix:  "var(--gold-400)",
    sec:  "var(--danger-400)",
    docs: "var(--fg-3)",
  };
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="changelog" />
      <section style={{ padding: "56px 56px 32px", display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "end", borderBottom: "1px solid var(--line-1)" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 14 }}>
            CHANGELOG · ATOM FEED · GIT TAGS · SEMVER
          </div>
          <h1 style={{ fontSize: 44, letterSpacing: "-0.04em", lineHeight: 1.06 }}>
            What shipped, when. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Boringly so.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 12, maxWidth: 580, lineHeight: 1.6 }}>
            One entry per release. Bullet under <span style={{ fontFamily: "var(--font-mono)", color: "var(--success-400)" }}>new</span> for new behaviour, <span style={{ fontFamily: "var(--font-mono)", color: "var(--brand-300)" }}>chg</span> for changed, <span style={{ fontFamily: "var(--font-mono)", color: "var(--gold-400)" }}>fix</span> for fixes, <span style={{ fontFamily: "var(--font-mono)", color: "var(--danger-400)" }}>sec</span> for security. No marketing words, no spin.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Icon name="rss" size={11} /> RSS / Atom</button>
          <button className="btn btn-ghost btn-sm">Subscribe by email</button>
        </div>
      </section>

      <section style={{ padding: "48px 56px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 36, position: "relative" }}>
          {/* timeline rail */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "sticky", top: 90, fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.08em" }}>
              <div style={{ marginBottom: 12 }}>RELEASES · 5 SHOWN</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {releases.map((r) => (
                  <a key={r.v} style={{ color: "var(--fg-3)", padding: "4px 0" }}>
                    {r.v} <span style={{ color: tagColors[r.tag] || "var(--fg-3)", marginLeft: 6 }}>● {r.tag}</span>
                  </a>
                ))}
              </div>
              <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
                <a style={{ color: "var(--brand-300)" }}>Older releases (47) →</a>
              </div>
            </div>
          </div>
          {/* releases */}
          <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {releases.map((r, i) => (
              <article key={r.v} style={{
                padding: 28, background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 14,
              }}>
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", gap: 14, alignItems: "baseline", marginBottom: 6 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--brand-300)", letterSpacing: "0.04em" }}>v{r.v}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: tagColors[r.tag] || "var(--fg-3)", letterSpacing: "0.06em" }}>● {r.tag}</span>
                    </div>
                    <h2 style={{ fontSize: 22, color: "var(--fg-0)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{r.title}</h2>
                  </div>
                  <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{r.date}</span>
                </header>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {r.bullets.map((b, j) => (
                    <li key={j} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 12, fontSize: 13.5, lineHeight: 1.5 }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em",
                        color: kindColors[b[0]] || "var(--fg-3)",
                        padding: "2px 7px", borderRadius: 4, alignSelf: "flex-start",
                        background: "var(--ink-1)",
                        border: "1px solid var(--line-2)",
                        textAlign: "center", width: "fit-content",
                      }}>{b[0].toUpperCase()}</span>
                      <span style={{ color: "var(--fg-1)" }} dangerouslySetInnerHTML={{ __html: b[1].replace(/"([^"]+)"/g, '<em style="font-style:italic;color:var(--fg-2)">"$1"</em>') }} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}

Object.assign(window, { HelpCentreHome, HelpArticle, HelpSearchResults, BlogIndex, ChangelogPage });
