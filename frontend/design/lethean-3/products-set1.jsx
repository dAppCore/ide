/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Product pages — set 1: Hosting · Link · Analytics
// Each has a unique structural angle, all wrapped by the
// shared MarketingNav + MarketingFooter.
// ─────────────────────────────────────────────────────────

/* ═════════════════════════════════════════════════════════
   1 · host.uk.com/hosting — SPEC-SHEET LED
   The "no-nonsense, here's what you get" page.
   Hero · spec table · runtime grid · migration story · proof
   ═════════════════════════════════════════════════════════ */
function ProductHosting({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <MktHero
        eyebrow="HOSTING · UK-SOUTH + EU-WEST"
        title="Hosting that just"
        italics="behaves itself."
        body="WordPress, Ghost, Node, Python, static. UK-South Manchester by default, automatic EU-West failover. Vi watches the lot. We'll move you in for free."
        primary="Start 30-day trial"
        secondary="Read the spec sheet"
        viProduct="hosting"
        proof={["UK + EU sovereign", "Free migration", "99.99% uptime, 12 months running"]}
      />
      <HostingSpecSheet />
      <HostingRuntimes />
      <HostingMigration />
      <HostingProofStrip />
      <MktCTA
        title={<>Move in this weekend. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>We'll do the boxes.</span></>}
        body="Free migration on every plan. Vi runs it overnight; you wake up to a working site."
        primary="Start migration"
      />
      <MarketingFooter />
    </div>
  );
}

function HostingSpecSheet() {
  const rows = [
    { area: "Compute", spec: [
      ["Runtime", "PHP 8.3, Node 20, Python 3.12, static"],
      ["RAM per site", "1 → 8 GB (plan-dependent)"],
      ["CPU", "Shared dedicated cores · vCPU 1 → 4"],
      ["Process model", "FrankenPHP / Octane workers"],
    ]},
    { area: "Storage", spec: [
      ["Hosting disk", "5 → 100 GB NVMe SSD"],
      ["Bandwidth", "100 GB → 2 TB / month"],
      ["File system", "Per-site chroot, no shared /tmp"],
      ["Backups", "7/14/30 day rolling, point-in-time restore"],
    ]},
    { area: "Network", spec: [
      ["Primary region", "UK-South · Manchester (Hetzner UK1)"],
      ["Failover", "EU-West · Amsterdam (Hetzner FSN1)"],
      ["DNS", "Per-site Anycast, free .uk.com subdomain"],
      ["TLS", "Let's Encrypt + ECDSA, auto-renew"],
    ]},
    { area: "Operations", spec: [
      ["Vi monitoring", "30-second probes, status page included"],
      ["Deploy", "Git push or Vi (\"deploy preview to staging\")"],
      ["SSH", "Yes, per-site key, audit log"],
      ["Support response", "4h Standard · 1h Studio"],
    ]},
  ];
  return (
    <section style={{ padding: "64px 56px" }}>
      <div style={{ maxWidth: 640, marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          THE SPEC SHEET
        </div>
        <h2 style={{ fontSize: 32, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          The numbers, written down. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>No asterisks.</span>
        </h2>
      </div>
      <div style={{
        background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12,
        overflow: "hidden",
      }}>
        {rows.map((r, i) => (
          <div key={r.area} style={{
            display: "grid", gridTemplateColumns: "180px 1fr",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
          }}>
            <div style={{
              padding: "18px 22px",
              fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)",
              letterSpacing: "0.08em", borderRight: "1px solid var(--line-1)",
              background: "var(--ink-1)",
            }}>{r.area.toUpperCase()}</div>
            <div>
              {r.spec.map(([k, v], j) => (
                <div key={k} style={{
                  display: "grid", gridTemplateColumns: "200px 1fr",
                  padding: "11px 22px", fontSize: 13.5,
                  borderTop: j === 0 ? "none" : "1px solid var(--line-1)",
                }}>
                  <span style={{ color: "var(--fg-3)" }}>{k}</span>
                  <span style={{ color: "var(--fg-0)", fontFamily: /\d/.test(v) ? "var(--font-mono)" : "inherit", fontSize: /\d/.test(v) ? 13 : 13.5 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HostingRuntimes() {
  const runtimes = [
    { name: "WordPress", v: "6.5+", icon: "wordpress", note: "Managed core + auto-update toggle" },
    { name: "Ghost", v: "5+", icon: "ghost", note: "Custom theme, MySQL or SQLite" },
    { name: "Node", v: "18 / 20 / 22", icon: "node-js", note: "PM2 / direct, persistent processes" },
    { name: "Python", v: "3.10 / 3.11 / 3.12", icon: "python", note: "Gunicorn / uvicorn, requirements.txt" },
    { name: "Laravel", v: "10 / 11", icon: "laravel", note: "FrankenPHP + Octane out of the box" },
    { name: "Static", v: "any", icon: "code", note: "Drop a folder, get a CDN" },
  ];
  return (
    <MktSection
      eyebrow="WHAT YOU CAN RUN"
      title="Six runtimes, no surprises."
      body="If your stack isn't here, ask Vi — she'll tell you honestly whether it'll work."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {runtimes.map((r) => (
          <div key={r.name} style={{
            padding: 22, borderRadius: 12,
            background: "var(--ink-2)", border: "1px solid var(--line-1)",
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "center",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: "var(--ink-3)", border: "1px solid var(--line-2)",
              display: "grid", placeItems: "center",
            }}>
              <i className={`fa-brands fa-${r.icon}`} style={{ fontSize: 18, color: "var(--brand-200)" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, color: "var(--fg-0)", fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 3 }}>{r.note}</div>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.04em" }}>{r.v}</div>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

function HostingMigration() {
  return (
    <section style={{ padding: "80px 56px" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 56, alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
            FREE MIGRATION
          </div>
          <h2 style={{ fontSize: 36, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            We move you in. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>You sleep through it.</span>
          </h2>
          <p style={{ fontSize: 15.5, color: "var(--fg-2)", marginTop: 14, lineHeight: 1.6, maxWidth: 480 }}>
            Tell Vi where you're hosted now. She'll inspect, propose a plan, do the move overnight, and email you the comparison the next morning. If it's worse on Host UK, we won't switch your DNS.
          </p>
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "WordPress · including custom themes & plugins",
              "Ghost · including members & subscriptions",
              "cPanel sites · email + databases included",
              "Squarespace exports · we rebuild against your domain",
              "Custom Node/Python apps · case-by-case, free assessment",
            ].map((t) => (
              <div key={t} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--fg-1)" }}>
                <Icon name="circle-check" size={12} color="var(--success-400)" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Migration sequence */}
        <div style={{
          background: "var(--ink-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 14, padding: 24,
          fontFamily: "var(--font-mono)", fontSize: 13,
          boxShadow: "var(--shadow-2)",
        }}>
          <div style={{ fontSize: 11, color: "var(--fg-4)", letterSpacing: "0.08em", marginBottom: 14 }}>
            MIGRATION RUN · Tue 17 Mar · 23:00 → 03:42 UK
          </div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["23:00", "snapshot.create(source=ada-old.com)", "ok", "184ms"],
              ["23:01", "files.transfer · 4.2 GB · 12 min", "ok", "12m 04s"],
              ["23:14", "db.export → db.import · 84 MB", "ok", "47s"],
              ["23:15", "config.normalise · wp-config.php", "ok", "12ms"],
              ["23:16", "ssl.issue · ECDSA · LE", "ok", "8s"],
              ["23:17", "smoke-tests · 47 URLs · 200 OK", "ok", "1m 22s"],
              ["23:19", "dns.cutover · TTL=60 · pre-staged", "ok", "0s"],
              ["03:42", "vi.email(\"compared, here are the numbers\")", "ok", "2s"],
            ].map(([t, c, s, ms], i) => (
              <li key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 50px 60px", gap: 10, alignItems: "center" }}>
                <span style={{ color: "var(--fg-4)" }}>{t}</span>
                <span style={{ color: "var(--fg-1)" }}>{c}</span>
                <span style={{ color: "var(--success-400)", fontSize: 11 }}>● {s.toUpperCase()}</span>
                <span style={{ color: "var(--fg-3)", textAlign: "right", fontSize: 11.5 }}>{ms}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function HostingProofStrip() {
  return (
    <section style={{ padding: "48px 56px", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)", background: "var(--ink-1)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, textAlign: "center" }}>
        {[
          ["99.99%", "uptime · 12 mo rolling"],
          ["£0", "migration · all plans"],
          ["28 ms", "TTFB · UK-South median"],
          ["4h", "support response · Standard"],
        ].map(([n, l], i) => (
          <div key={i}>
            <div className="num tnum" style={{ fontSize: 38, color: "var(--fg-0)", letterSpacing: "-0.03em", fontWeight: 600 }}>{n}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 6, fontFamily: "var(--font-mono)" }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════
   2 · link.host.uk.com — LIVE PREVIEW LED
   Bio-link page. The hero IS the product mock.
   ═════════════════════════════════════════════════════════ */
function ProductLink({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <LinkHero />
      <LinkUseCases />
      <LinkLoginBridge />
      <LinkAnalyticsTeaser />
      <MktCTA
        title={<>Your link, <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>your name above the door.</span></>}
        body="Free .uk.com subdomain on every plan. Custom domain on Standard and up."
        primary="Claim your link"
      />
      <MarketingFooter />
    </div>
  );
}

function LinkHero() {
  return (
    <section style={{ padding: "72px 56px 56px", display: "grid", gridTemplateColumns: "1fr 420px", gap: 56, alignItems: "center" }}>
      {/* Left: copy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))", fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)", alignSelf: "flex-start", letterSpacing: "0.04em" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)" }} />
          HOST LINK · LOGIN BRIDGE FOR THE FAMILY
        </div>
        <h1 style={{ fontSize: 56, letterSpacing: "-0.04em", lineHeight: 1.04 }}>
          One link.<br />
          <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)", fontSize: 58 }}>Everything you do.</span>
        </h1>
        <p style={{ fontSize: 17.5, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 520 }}>
          The bio link that doubles as your sign-in. Drop it in your Insta bio,
          your CV, your email signature. It's the door to your whole Host UK family.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
          <input
            placeholder="ada"
            style={{ width: 140, height: 48, padding: "0 14px", background: "var(--ink-2)", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontSize: 14 }}
          />
          <span style={{ fontSize: 14, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>.host.uk.com</span>
          <button className="btn btn-primary btn-lg">Claim it</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          ✓ 2 379 names taken this month · Vi will check yours in real time
        </div>
      </div>
      {/* Right: live preview — phone-shaped mock of the link page */}
      <LinkPagePreview />
    </section>
  );
}

function LinkPagePreview() {
  return (
    <div style={{
      width: 320, height: 600, borderRadius: 32, padding: 12,
      background: "var(--ink-2)", border: "8px solid var(--ink-3)",
      boxShadow: "var(--shadow-3)", margin: "0 auto",
      position: "relative",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 22,
        background: "var(--ink-0)",
        padding: "32px 18px 18px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        overflow: "hidden",
      }}>
        {/* avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: 999,
          background: "linear-gradient(135deg, var(--brand-400), var(--brand-700))",
          display: "grid", placeItems: "center",
          fontSize: 26, fontWeight: 600, color: "var(--fg-0)",
          border: "2px solid var(--brand-300)",
        }}>AP</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "var(--fg-0)", fontWeight: 600 }}>Ada Patel</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>ada.host.uk.com</div>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", textAlign: "center", lineHeight: 1.4, padding: "0 8px" }}>
          Independent journalist · UK-based · investigations into housing
        </div>
        {/* link buttons */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          {[
            { label: "Latest investigation · The Guardian", icon: "newspaper" },
            { label: "Subscribe to my newsletter", icon: "envelope-open" },
            { label: "Book a 15-min source call", icon: "calendar" },
            { label: "Mastodon · @ada@social.host.uk.com", icon: "at" },
          ].map((l, i) => (
            <div key={i} style={{
              padding: "10px 12px",
              background: "var(--ink-2)", border: "1px solid var(--line-1)",
              borderRadius: 8,
              display: "flex", gap: 10, alignItems: "center",
              fontSize: 12.5, color: "var(--fg-1)",
            }}>
              <Icon name={l.icon} size={11} color="var(--brand-300)" />
              <span style={{ flex: 1 }}>{l.label}</span>
              <Icon name="arrow-up-right-from-square" size={9} color="var(--fg-4)" />
            </div>
          ))}
        </div>
        {/* footer mark */}
        <div style={{ marginTop: "auto", fontSize: 9.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          built on host.uk.com
        </div>
      </div>
    </div>
  );
}

function LinkUseCases() {
  const cases = [
    { who: "Independent journalists", what: "Pin investigations, paywalled or not. Subscribers find the next thing in one tap." },
    { who: "Small charities", what: "Donate · volunteer · trustees · annual report. The four buttons that actually matter." },
    { who: "Indie restaurants", what: "Booking · menu · Instagram · today's specials. Updateable from your phone." },
    { who: "Agencies", what: "Case studies · contact · careers. Per-client subdomains under one master account." },
  ];
  return (
    <MktSection
      eyebrow="WHO USES IT"
      title="Four kinds of people, mostly."
      body="Host Link replaces the mess of three or four hosted services with one link, one login, and one bill."
      style={{ background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {cases.map((c) => (
          <article key={c.who} style={{
            padding: 22, borderRadius: 12, background: "var(--ink-2)", border: "1px solid var(--line-1)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: "var(--fg-0)", letterSpacing: "-0.015em" }}>{c.who}</div>
            <p style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 8, lineHeight: 1.55 }}>{c.what}</p>
          </article>
        ))}
      </div>
    </MktSection>
  );
}

function LinkLoginBridge() {
  return (
    <section style={{ padding: "80px 56px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
            THE LOGIN BRIDGE
          </div>
          <h2 style={{ fontSize: 34, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Sign in once. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Land anywhere.</span>
          </h2>
          <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 14, lineHeight: 1.6, maxWidth: 460 }}>
            Click <code style={{ fontFamily: "var(--font-mono)", color: "var(--brand-200)", background: "var(--ink-2)", padding: "2px 6px", borderRadius: 4 }}>Analytics</code> on your link page, you're signed into analytics.host.uk.com — no second password, no detour. The token expires in 60 seconds; one-time-use, audit-logged.
          </p>
          <div style={{ marginTop: 18, fontSize: 12, color: "var(--fg-4)", fontFamily: "var(--font-mono)", lineHeight: 1.6 }}>
            POST /auth/bridge · {`{ token: ottoken_x4f2k, dest: "analytics" }`} → 302 https://analytics.host.uk.com/?session=…
          </div>
        </div>
        {/* mock bridge animation */}
        <div style={{
          background: "var(--ink-2)", border: "1px solid var(--line-2)",
          borderRadius: 14, padding: 22,
          display: "flex", flexDirection: "column", gap: 14, alignItems: "center",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" }}>
            {["link", "analytics", "social"].map((s, i) => (
              <div key={s} style={{
                padding: "14px 10px", borderRadius: 8,
                background: i === 0 ? "color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))" : "var(--ink-3)",
                border: "1px solid " + (i === 0 ? "color-mix(in oklch, var(--brand-500) 35%, var(--line-2))" : "var(--line-1)"),
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <Icon name={s === "link" ? "link" : s === "analytics" ? "chart-line" : "calendar-days"} size={14} color={i === 0 ? "var(--brand-200)" : "var(--fg-3)"} />
                <span style={{ fontSize: 11, color: i === 0 ? "var(--fg-0)" : "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>signed in via link · 60s token</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <Icon name="circle-check" size={11} color="var(--success-400)" />
            <span style={{ fontSize: 11.5, color: "var(--fg-2)" }}>3 surfaces unlocked, no second password</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LinkAnalyticsTeaser() {
  return (
    <MktSection
      eyebrow="ANALYTICS, BUILT IN"
      title="Who clicked. Where they went. Nothing more."
      body="Cookieless, no fingerprinting, no third-party scripts. Click counts and referrers, broken down by link. Export to CSV."
    >
      <div style={{
        background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12,
        padding: 24,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 80px", padding: "10px 14px", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line-1)" }}>
          <span>LINK</span><span>CLICKS · 7D</span><span>UNIQUE</span><span>TOP REFERRER</span><span style={{ textAlign: "right" }}>CTR</span>
        </div>
        {[
          ["Latest investigation · The Guardian", 1284, 982, "instagram.com", "12.4%"],
          ["Subscribe to my newsletter", 432, 421, "guardian.co.uk", "8.1%"],
          ["Book a 15-min source call", 87, 84, "linkedin.com", "1.6%"],
          ["Mastodon · @ada@social.host.uk.com", 246, 198, "twitter.com", "4.6%"],
        ].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 80px", padding: "11px 14px", fontSize: 13, borderTop: "1px solid var(--line-1)" }}>
            <span style={{ color: "var(--fg-1)" }}>{r[0]}</span>
            <span className="num tnum" style={{ color: "var(--fg-0)" }}>{r[1].toLocaleString()}</span>
            <span className="num tnum" style={{ color: "var(--fg-1)" }}>{r[2].toLocaleString()}</span>
            <span style={{ color: "var(--fg-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r[3]}</span>
            <span className="num tnum" style={{ color: "var(--fg-1)", textAlign: "right" }}>{r[4]}</span>
          </div>
        ))}
      </div>
    </MktSection>
  );
}

/* ═════════════════════════════════════════════════════════
   3 · analytics.host.uk.com — CHARTS-LED, RESTRAINT
   Plausible-style "trust by what we don't do".
   ═════════════════════════════════════════════════════════ */
function ProductAnalytics({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", minHeight: "100%", background: "var(--ink-0)" }}>
      <MarketingNav active="products" />
      <AnalyticsHero />
      <AnalyticsRestraint />
      <AnalyticsLiveDashboard />
      <AnalyticsCompare />
      <MktCTA
        title={<>Privacy-first. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Future-proof.</span></>}
        body="GDPR by construction, not by cookie banner. Move your numbers in from Google Analytics in 60 seconds."
        primary="Try it on your site"
        secondary="Read the GDPR brief"
      />
      <MarketingFooter />
    </div>
  );
}

function AnalyticsHero() {
  return (
    <section style={{ padding: "72px 56px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "5px 12px", borderRadius: 999, background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))", fontSize: 11.5, color: "var(--brand-200)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", gap: 8, alignItems: "center" }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)" }} />
          HOST ANALYTICS · COOKIELESS · GDPR BY CONSTRUCTION
        </div>
        <h1 style={{ fontSize: 54, letterSpacing: "-0.04em", lineHeight: 1.04 }}>
          The numbers you actually need.<br />
          <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)", fontSize: 56 }}>And nothing else.</span>
        </h1>
        <p style={{ fontSize: 17, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 520 }}>
          Visits, sources, what they read, what made them leave. No cookie banners,
          no fingerprinting, no <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>_ga_*</span>,
          no Meta pixel. Charts your accountant can read, your DPO will sign off.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary btn-lg">Try free for 30 days</button>
          <button className="btn btn-secondary btn-lg">View live demo<Icon name="arrow-right" size={11} /></button>
        </div>
      </div>
      <AnalyticsHeroChart />
    </section>
  );
}

function AnalyticsHeroChart() {
  return (
    <div style={{
      background: "var(--ink-2)", border: "1px solid var(--line-2)",
      borderRadius: 14, padding: 22, boxShadow: "var(--shadow-2)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>ada.host.uk.com</div>
          <div className="num tnum" style={{ fontSize: 36, color: "var(--fg-0)", letterSpacing: "-0.025em", fontWeight: 600, marginTop: 4 }}>
            12,847 <span style={{ fontSize: 14, color: "var(--success-400)", letterSpacing: "0", fontWeight: 400 }}>+18%</span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginTop: 2 }}>visits · last 30 days</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["24h", "7d", "30d", "All"].map((p, i) => (
            <span key={p} style={{
              padding: "5px 10px", fontSize: 11.5, fontFamily: "var(--font-mono)",
              background: i === 2 ? "var(--ink-3)" : "transparent",
              color: i === 2 ? "var(--fg-0)" : "var(--fg-3)",
              borderRadius: 5, border: "1px solid " + (i === 2 ? "var(--line-2)" : "transparent"),
            }}>{p}</span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 400 140" style={{ width: "100%", display: "block" }}>
        {/* gridlines */}
        {[0, 35, 70, 105, 140].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="var(--line-1)" strokeWidth="0.5" />
        ))}
        {/* chart line */}
        <path
          d="M 0 110 L 30 95 L 60 105 L 90 78 L 120 84 L 150 64 L 180 70 L 210 50 L 240 56 L 270 38 L 300 42 L 330 30 L 360 22 L 400 18"
          stroke="oklch(0.72 0.115 305)" strokeWidth="2" fill="none"
        />
        <path
          d="M 0 110 L 30 95 L 60 105 L 90 78 L 120 84 L 150 64 L 180 70 L 210 50 L 240 56 L 270 38 L 300 42 L 330 30 L 360 22 L 400 18 L 400 140 L 0 140 Z"
          fill="url(#g1)" opacity="0.4"
        />
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.115 305)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="oklch(0.72 0.115 305)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* date markers */}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
        {["1 Mar", "8 Mar", "15 Mar", "22 Mar", "29 Mar"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div style={{
        marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line-1)",
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16,
      }}>
        {[
          ["Top page", "/housing-deep-dive", null],
          ["Top source", "guardian.co.uk", null],
          ["Avg. on-page", "4m 12s", "+22s"],
          ["Bounce", "31%", "-4pp"],
        ].map(([k, v, d]) => (
          <div key={k}>
            <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-0)", marginTop: 4, fontFamily: /[a-z\.]/.test(v) && !v.includes(" ") ? "var(--font-mono)" : "inherit" }}>{v}</div>
            {d && <div style={{ fontSize: 11, color: "var(--success-400)", marginTop: 2 }}>{d}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsRestraint() {
  return (
    <section style={{ padding: "80px 56px", background: "var(--ink-1)", borderTop: "1px solid var(--line-1)", borderBottom: "1px solid var(--line-1)" }}>
      <div style={{ maxWidth: 720, marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          WHAT WE DON'T DO
        </div>
        <h2 style={{ fontSize: 34, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          We don't track. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>That's the feature.</span>
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { off: "No cookies", on: "Stateless. Visit counted, no jar." },
          { off: "No fingerprinting", on: "Browser/OS/screen — discarded after geolocating to country." },
          { off: "No third-party scripts", on: "One JS file. 1.2 KB. Loaded from your domain." },
          { off: "No data sales", on: "Your visitors are not the product." },
          { off: "No cross-site tracking", on: "We can't, even if we wanted to. There's no identifier." },
          { off: "No cookie banner needed", on: "ICO-confirmed. Ship it without consent UI." },
        ].map((r, i) => (
          <div key={i} style={{
            padding: "18px 22px", borderRadius: 10,
            background: "var(--ink-2)", border: "1px solid var(--line-1)",
            display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "start",
          }}>
            <div style={{
              padding: "3px 9px", fontSize: 10.5, fontFamily: "var(--font-mono)",
              color: "var(--danger-400)", background: "color-mix(in oklch, var(--danger-500) 12%, var(--ink-2))",
              border: "1px solid color-mix(in oklch, var(--danger-500) 28%, var(--line-2))",
              borderRadius: 999, letterSpacing: "0.04em", whiteSpace: "nowrap",
            }}>{r.off}</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.5 }}>{r.on}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalyticsLiveDashboard() {
  return (
    <MktSection
      eyebrow="THE DASHBOARD"
      title="Built for skim-reading."
      body="One screen. Five blocks. The numbers your investor or your line manager actually asks about."
    >
      <div style={{
        background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 14,
        padding: 24,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { title: "Top sources", rows: [["guardian.co.uk", 4218, "33%"], ["instagram.com", 2849, "22%"], ["Direct", 1672, "13%"], ["mastodon.social", 1024, "8%"], ["t.co", 802, "6%"]] },
            { title: "Top pages", rows: [["/housing-deep-dive", 3214, "25%"], ["/", 2849, "22%"], ["/about", 1284, "10%"], ["/subscribe", 982, "8%"], ["/archive", 612, "5%"]] },
            { title: "Country", rows: [["🇬🇧 United Kingdom", 7842, "61%"], ["🇮🇪 Ireland", 1284, "10%"], ["🇺🇸 United States", 982, "8%"], ["🇩🇪 Germany", 642, "5%"], ["🇫🇷 France", 412, "3%"]] },
            { title: "Browser", rows: [["Safari", 4824, "38%"], ["Chrome", 4012, "31%"], ["Firefox", 1842, "14%"], ["Edge", 824, "6%"], ["Other", 1345, "11%"]] },
          ].map((b) => (
            <div key={b.title} style={{ background: "var(--ink-1)", border: "1px solid var(--line-1)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", borderBottom: "1px solid var(--line-1)" }}>{b.title.toUpperCase()}</div>
              {b.rows.map((r, i) => (
                <div key={i} style={{ position: "relative", padding: "8px 16px", fontSize: 13, borderTop: i === 0 ? "none" : "1px solid var(--line-1)", display: "grid", gridTemplateColumns: "1fr 70px 50px", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: r[2], background: "color-mix(in oklch, var(--brand-500) 12%, transparent)", zIndex: 0 }} />
                  <span style={{ color: "var(--fg-1)", position: "relative", zIndex: 1 }}>{r[0]}</span>
                  <span className="num tnum" style={{ color: "var(--fg-2)", textAlign: "right", position: "relative", zIndex: 1 }}>{r[1].toLocaleString()}</span>
                  <span style={{ color: "var(--fg-3)", fontSize: 11.5, fontFamily: "var(--font-mono)", textAlign: "right", position: "relative", zIndex: 1 }}>{r[2]}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </MktSection>
  );
}

function AnalyticsCompare() {
  return (
    <section style={{ padding: "64px 56px" }}>
      <div style={{ maxWidth: 720, marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          VS. THE INDUSTRY
        </div>
        <h2 style={{ fontSize: 30, letterSpacing: "-0.03em" }}>
          The honest comparison table.
        </h2>
      </div>
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 22px", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", background: "var(--ink-1)", borderBottom: "1px solid var(--line-1)" }}>
          <span>FEATURE</span><span style={{ textAlign: "center", color: "var(--brand-300)" }}>HOST ANALYTICS</span><span style={{ textAlign: "center" }}>GA4</span><span style={{ textAlign: "center" }}>FATHOM</span>
        </div>
        {[
          ["Cookieless", "✓", "—", "✓"],
          ["GDPR by construction", "✓", "Banner required", "✓"],
          ["Hosted in UK", "✓ Manchester", "US (Google)", "US"],
          ["Page weight", "1.2 KB", "45 KB", "1.5 KB"],
          ["Data ownership", "You · CSV export", "Google", "You"],
          ["Price", "From £9 / mo", "Free + ads", "From $14 / mo"],
          ["Sells your data", "—", "Aggregated", "—"],
        ].map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "11px 22px", fontSize: 13, borderTop: i === 0 ? "none" : "1px solid var(--line-1)" }}>
            <span style={{ color: "var(--fg-1)" }}>{r[0]}</span>
            {r.slice(1).map((c, j) => (
              <span key={j} style={{
                textAlign: "center",
                color: c === "✓" ? (j === 0 ? "var(--brand-300)" : "var(--success-400)") : c === "—" ? "var(--fg-4)" : "var(--fg-1)",
                fontFamily: c === "✓" || c === "—" || /\d/.test(c) ? "var(--font-mono)" : "inherit",
                fontSize: c === "✓" || c === "—" ? 14 : 12.5,
              }}>{c}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { ProductHosting, ProductLink, ProductAnalytics });
