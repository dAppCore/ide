/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Status & error states.
// All use the same Vi-narration pattern as provisioning —
// honest, calm, plain-English. Never just a code.
// ─────────────────────────────────────────────────────────

// ─── Public status page · status.host.uk.com ──────────────
function StatusPage({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: "32px 48px 60px",
      display: "flex", flexDirection: "column", gap: 28,
    }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark size="sm" showSubdomain="status" />
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Subscribe to updates</span>
          <button className="btn btn-secondary btn-sm">
            <Icon name="rss" size={11} />
            RSS
          </button>
        </div>
      </header>

      {/* Big calm headline */}
      <section style={{
        background: "var(--ink-2)",
        border: "1px solid color-mix(in oklch, var(--warning-500) 30%, var(--line-2))",
        borderRadius: 16,
        padding: "28px 32px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, right: 0, width: 320, height: "100%",
          background: "radial-gradient(ellipse 60% 80% at 80% 50%, color-mix(in oklch, var(--warning-500) 18%, transparent), transparent)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: "color-mix(in oklch, var(--warning-500) 18%, var(--ink-3))",
            border: "1px solid color-mix(in oklch, var(--warning-500) 32%, transparent)",
            display: "grid", placeItems: "center", overflow: "hidden",
          }}>
            <Vi pose="peek-left" size={88} style={{ marginTop: 10 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--warning-400)", letterSpacing: "0.08em" }}>
              ELEVATED LATENCY · MAIL EU-WEST · 14:02 UTC
            </div>
            <h1 style={{ fontSize: 32, marginTop: 6, letterSpacing: "-0.025em", color: "var(--fg-0)" }}>
              <span className="editorial" style={{ fontStyle: "italic" }}>Mail is slow in EU-West.</span> Everything else is fine.
            </h1>
            <p style={{ fontSize: 14.5, color: "var(--fg-2)", marginTop: 8, lineHeight: 1.55, maxWidth: 720 }}>
              <span style={{ color: "var(--fg-1)" }}>Vi:</span> SMTP delivery is taking up to 90 seconds — normal is &lt;5. The fix is mid-rollout. I'll update this page every 10 minutes until we're back to green.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--fg-4)", letterSpacing: "0.04em" }}>NEXT UPDATE</div>
            <div className="num tnum" style={{ fontSize: 22, color: "var(--fg-0)", marginTop: 2 }}>14:32</div>
          </div>
        </div>
      </section>

      {/* Components grid */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, letterSpacing: "-0.015em" }}>All systems</h2>
          <span style={{ fontSize: 12, color: "var(--fg-4)" }}>Updated 30s ago · auto-refresh on</span>
        </div>
        <div style={{
          background: "var(--ink-2)",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {[
            { name: "host.uk.com (marketing)", state: "ok", uptime: "100.00", note: "—" },
            { name: "control panel · API", state: "ok", uptime: "99.998", note: "—" },
            { name: "Hosting · UK-South", state: "ok", uptime: "99.994", note: "—" },
            { name: "Hosting · EU-West", state: "ok", uptime: "99.987", note: "—" },
            { name: "Mail · UK-South", state: "ok", uptime: "99.998", note: "—" },
            { name: "Mail · EU-West", state: "warn", uptime: "99.91", note: "Elevated latency · investigating" },
            { name: "DNS · global anycast", state: "ok", uptime: "100.00", note: "—" },
            { name: "Object storage", state: "ok", uptime: "99.999", note: "—" },
            { name: "Stripe payments", state: "ok", uptime: "100.00", note: "third-party" },
          ].map((c, i) => (
            <div key={c.name} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto auto",
              gap: 16, alignItems: "center",
              padding: "12px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            }}>
              <StatusDot state={c.state} />
              <div>
                <div style={{ fontSize: 13.5, color: "var(--fg-0)" }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: c.state === "warn" ? "var(--warning-400)" : "var(--fg-4)", marginTop: 2 }}>{c.note}</div>
              </div>
              {/* 90-day strip */}
              <UptimeStrip state={c.state} />
              <div className="num tnum" style={{ fontSize: 12, color: "var(--fg-2)", textAlign: "right", minWidth: 60 }}>
                {c.uptime}<span style={{ color: "var(--fg-4)" }}>%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Incident timeline */}
      <section>
        <h2 style={{ fontSize: 18, letterSpacing: "-0.015em", marginBottom: 14 }}>Today's incident · ongoing</h2>
        <div style={{
          background: "var(--ink-2)",
          border: "1px solid var(--line-1)",
          borderRadius: 12,
          padding: "0 22px",
        }}>
          {[
            { at: "14:22", who: "Vi", state: "investigating", body: "Rollout is at 65%. The slowest queue is draining — average is now 42s, down from 90s peak. Will keep going." },
            { at: "14:12", who: "Vi", state: "identified", body: "I traced it to a misconfigured SPF batch in the new outbound worker. We're rolling back that worker now. Mail will catch up in waves." },
            { at: "14:02", who: "Vi", state: "investigating", body: "I noticed SMTP delivery times in EU-West climbed past my alert threshold. Looking now. UK-South is unaffected." },
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 110px 1fr", gap: 16, padding: "16px 0", borderTop: i === 0 ? "none" : "1px solid var(--line-1)" }}>
              <div className="num" style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{row.at}</div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5, alignSelf: "flex-start",
                padding: "2px 8px", borderRadius: 999, fontSize: 10.5, letterSpacing: "0.04em", fontWeight: 500,
                background: row.state === "identified" ? "color-mix(in oklch, var(--info-500) 18%, var(--ink-3))" : "color-mix(in oklch, var(--warning-500) 18%, var(--ink-3))",
                color: row.state === "identified" ? "var(--info-400)" : "var(--warning-400)",
                border: `1px solid ${row.state === "identified" ? "color-mix(in oklch, var(--info-500) 30%, transparent)" : "color-mix(in oklch, var(--warning-500) 30%, transparent)"}`,
                width: "fit-content",
              }}>
                {row.state.toUpperCase()}
              </span>
              <div style={{ fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
                <span style={{ color: "var(--brand-300)", fontWeight: 500 }}>{row.who}:</span> {row.body}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <p style={{ fontSize: 12.5, color: "var(--fg-3)", textAlign: "center", lineHeight: 1.55, maxWidth: 640, margin: "0 auto" }}>
        <span className="editorial" style={{ fontStyle: "italic" }}>We post-mortem every incident.</span> If this affected you and you'd like a credit, <a style={{ color: "var(--brand-300)" }}>tell us</a>. We'll get to it.
      </p>
    </div>
  );
}

function StatusDot({ state }) {
  const m = {
    ok: { bg: "var(--success-400)", glow: "var(--success-500)" },
    warn: { bg: "var(--warning-400)", glow: "var(--warning-500)" },
    err: { bg: "var(--danger-400)", glow: "var(--danger-500)" },
  }[state];
  return (
    <div style={{
      width: 10, height: 10, borderRadius: "50%",
      background: m.bg,
      boxShadow: `0 0 0 3px color-mix(in oklch, ${m.glow} 22%, transparent)`,
    }} />
  );
}

function UptimeStrip({ state }) {
  // 90 ticks, mostly green; if warn, last few flicker amber
  return (
    <div style={{ display: "flex", gap: 1.5, alignItems: "center" }}>
      {Array.from({ length: 60 }).map((_, i) => {
        const isRecentWarn = state === "warn" && i > 56;
        return (
          <div key={i} style={{
            width: 3, height: 18, borderRadius: 1,
            background: isRecentWarn ? "var(--warning-500)" : "color-mix(in oklch, var(--success-500) 70%, var(--ink-3))",
            opacity: isRecentWarn ? 1 : 0.85,
          }} />
        );
      })}
    </div>
  );
}

// ─── Error state grid (4 in one artboard) ─────────────────
function ErrorStatesGrid({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: 28,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gridTemplateRows: "1fr 1fr",
      gap: 20,
    }}>
      <ErrorCard
        code="404"
        eyebrow="NOT FOUND"
        title={<>This page <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>flew off</span>.</>}
        body="The link's broken or the page moved. Vi can search for what you meant."
        actions={[
          { primary: true, label: "Search the docs", icon: "magnifying-glass" },
          { label: "Back to control panel" },
        ]}
        viPose="peek-right"
      />
      <ErrorCard
        code="500"
        eyebrow="OUR FAULT"
        title={<>Something <span className="editorial" style={{ fontStyle: "italic", color: "var(--danger-400)" }}>broke our end</span>.</>}
        body="I've already filed an incident — ID INC-2025-0411. The team will see it in seconds. Try again in a minute."
        actions={[
          { primary: true, label: "Try again", icon: "arrow-rotate-right" },
          { label: "Check status page", icon: "wave-pulse" },
        ]}
        viPose="master"
        tone="danger"
        meta="INC-2025-0411 · auto-filed 14:31"
      />
      <ErrorCard
        code="402"
        eyebrow="PAYMENT FAILED"
        title={<>Card declined.</>}
        body="Your bank refused the £24.40 charge for the renewal. They didn't say why. Try another card or contact them — I'll keep your sites running for 7 days."
        actions={[
          { primary: true, label: "Update card", icon: "credit-card" },
          { label: "Pay another way" },
        ]}
        viPose="peek-left"
        tone="warning"
        meta="Sites stay live for 7 days · then read-only"
      />
      <ErrorCard
        code="↓"
        eyebrow="SITE DOWN"
        title={<><span className="num">hookway.co.uk</span> isn't responding.</>}
        body="I noticed at 14:02 — first failed health check 3 minutes ago. I'm restarting the worker. If that doesn't fix it within 60s I'll fail over to the cold standby."
        actions={[
          { primary: true, label: "Watch live log", icon: "wave-pulse" },
          { label: "Force failover now", icon: "arrow-right-arrow-left" },
        ]}
        viPose="master"
        tone="danger"
        meta="3rd outage this quarter · SLA: 99.9% (you're at 99.94)"
      />
    </div>
  );
}

function ErrorCard({ code, eyebrow, title, body, actions, viPose, tone = "neutral", meta }) {
  const toneColor = {
    danger: "var(--danger-400)",
    warning: "var(--warning-400)",
    neutral: "var(--brand-300)",
  }[tone];
  const toneBorder = {
    danger: "color-mix(in oklch, var(--danger-500) 25%, var(--line-2))",
    warning: "color-mix(in oklch, var(--warning-500) 25%, var(--line-2))",
    neutral: "var(--line-2)",
  }[tone];

  return (
    <article style={{
      background: "var(--ink-1)",
      border: `1px solid ${toneBorder}`,
      borderRadius: 16,
      padding: "26px 28px",
      display: "flex", gap: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* tone glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 50% 80% at 90% 0%, color-mix(in oklch, ${toneColor} 14%, transparent), transparent 60%)`,
      }} />

      {/* code */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: 64, fontWeight: 500,
          color: toneColor,
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          opacity: 0.9,
        }}>{code}</div>
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: toneColor, letterSpacing: "0.08em" }}>
          {eyebrow}
        </div>
        <h2 style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: "-0.02em", color: "var(--fg-0)" }}>
          {title}
        </h2>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2))",
            display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0, marginTop: 2,
          }}>
            <Vi pose={viPose} size={32} style={{ marginTop: 3 }} />
          </div>
          <p style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55, flex: 1 }}>
            {body}
          </p>
        </div>
        {meta && (
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{meta}</div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "auto", paddingTop: 6 }}>
          {actions.map((a, i) => (
            <button key={i} className={a.primary ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} style={{
              border: a.primary ? undefined : "1px solid var(--line-2)",
            }}>
              {a.icon && <Icon name={a.icon} size={11} />}
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

Object.assign(window, { StatusPage, ErrorStatesGrid });
