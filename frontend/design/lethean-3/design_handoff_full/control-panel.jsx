/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Vi Control Panel — control.host.uk.com
// Vi is the SPINE of the experience, not a chat widget.
// Left rail: Vi status + ask-anything + traditional nav.
// Main: today's brief (what Vi noticed/did/needs you for) + sites + activity.
// Right rail: optional Vi conversation when expanded.
// ─────────────────────────────────────────────────────────

function ControlPanel({ brand = "hostuk", viOpen = false, viDocked = true }) {
  const products = window.PRODUCTS_BY_BRAND[brand];
  const copy = window.BRAND_COPY[brand];

  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      display: "grid",
      gridTemplateColumns: viOpen && viDocked ? "280px 1fr 380px" : "280px 1fr",
      background: "var(--ink-0)",
    }}>
      <CPLeftRail brand={brand} />
      <CPMain brand={brand} products={products} copy={copy} />
      {viOpen && viDocked && <CPViPanel brand={brand} />}
    </div>
  );
}

// ─── Left rail ────────────────────────────────────────────
function CPLeftRail({ brand }) {
  const navItems = [
    { icon: "house", label: "Today", active: true, count: null },
    { icon: "globe", label: "Sites", count: 3 },
    { icon: "at", label: "Domains", count: 5 },
    { icon: "envelope", label: "Email", count: 12 },
    { icon: "credit-card", label: "Billing", count: null },
    { icon: "wave-pulse", label: "Activity", count: null },
    { icon: "circle-question", label: "Help", count: null },
  ];

  return (
    <aside style={{
      borderRight: "1px solid var(--line-1)",
      background: "var(--ink-1)",
      padding: "20px 16px",
      display: "flex", flexDirection: "column", gap: 20,
      position: "sticky", top: 0, alignSelf: "start",
      minHeight: "100%",
    }}>
      {/* Brand mark */}
      <div style={{ padding: "0 4px" }}>
        <BrandMark size="sm" showSubdomain="control" />
      </div>

      {/* Vi status block — the centerpiece */}
      <div style={{
        background: "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))",
        border: "1px solid color-mix(in oklch, var(--brand-500) 24%, var(--line-1))",
        borderRadius: "var(--r-lg)",
        padding: "14px 14px 12px",
        position: "relative",
      }}>
        {/* live indicator */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--success-400)",
          boxShadow: "0 0 0 3px color-mix(in oklch, var(--success-500) 24%, transparent)",
        }} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2))",
            overflow: "hidden", flexShrink: 0,
            display: "grid", placeItems: "center",
          }}>
            <Vi pose="master" size={56} style={{ marginTop: 6, marginLeft: -2 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>
              Vi · always on
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.45 }}>
              Watching 3 sites. All green. <span style={{ color: "var(--warning-400)" }}>1 thing waits on you.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ask Vi — cmd+K bar */}
      <button style={{
        display: "flex", alignItems: "center", gap: 10,
        height: 38, padding: "0 12px",
        background: "var(--ink-2)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-md)",
        color: "var(--fg-3)",
        fontSize: 13, textAlign: "left",
      }}>
        <Icon name="sparkles" size={13} color="var(--brand-300)" />
        <span style={{ flex: 1 }}>Ask Vi anything…</span>
        <kbd style={{
          fontSize: 10.5, padding: "2px 6px", borderRadius: 4,
          background: "var(--ink-3)", border: "1px solid var(--line-2)",
          color: "var(--fg-3)", fontFamily: "var(--font-mono)",
        }}>⌘K</kbd>
      </button>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 500, color: "var(--fg-4)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "0 8px", marginBottom: 6,
        }}>
          Workspace
        </div>
        {navItems.map((item) => (
          <a key={item.label} style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "8px 10px",
            borderRadius: "var(--r-sm)",
            background: item.active ? "var(--ink-3)" : "transparent",
            color: item.active ? "var(--fg-0)" : "var(--fg-2)",
            fontSize: 13.5, fontWeight: item.active ? 500 : 400,
            position: "relative",
          }}>
            <Icon name={item.icon} size={13} color={item.active ? "var(--brand-300)" : "var(--fg-3)"} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.count != null && (
              <span style={{
                fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}>{item.count}</span>
            )}
          </a>
        ))}
      </nav>

      {/* Account at bottom */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="divider" />
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 8px", borderRadius: "var(--r-sm)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))",
            display: "grid", placeItems: "center",
            fontSize: 11, fontWeight: 600, color: "var(--brand-200)",
            border: "1px solid var(--line-2)",
          }}>SM</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-0)" }}>Sam Mooney</div>
            <div style={{ fontSize: 11, color: "var(--fg-4)" }}>Hookway Limited</div>
          </div>
          <Icon name="ellipsis" size={12} color="var(--fg-4)" />
        </div>
      </div>
    </aside>
  );
}

// ─── Main canvas ──────────────────────────────────────────
function CPMain({ brand, products, copy }) {
  return (
    <main style={{ padding: "32px 36px 48px", display: "flex", flexDirection: "column", gap: 28, minWidth: 0 }}>
      {/* Greeting */}
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            FRIDAY · 4 OCT · 09:14 GMT
          </div>
          <h1 style={{ fontSize: 32, marginTop: 8, letterSpacing: "-0.03em" }}>
            Good morning, Sam.
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 6, maxWidth: 560 }}>
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--fg-1)" }}>Quiet night.</span>{" "}
            One thing needs you, two I handled, four I'm watching. Here's the brief.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm">
            <Icon name="bell" size={12} />
            Quiet hours
          </button>
          <button className="btn btn-secondary btn-sm">
            <Icon name="circle-plus" size={12} />
            New site
          </button>
        </div>
      </header>

      {/* Vi's daily brief */}
      <section>
        <SectionHeader
          eyebrow="VI'S BRIEF"
          title="Overnight, this happened"
          rightSlot={
            <button className="btn btn-ghost btn-sm">
              <Icon name="arrow-rotate-right" size={11} />
              Refresh brief
            </button>
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
          <BriefCard
            tone="warning"
            time="06:42"
            title="lethean.host renews in 6 days"
            body="Auto-renew is off. £18.40 for 12 months at current rate. I won't act unless you say."
            actions={[
              { label: "Renew now", primary: true },
              { label: "Turn auto-renew on" },
              { label: "Let it lapse" },
            ]}
          />
          <BriefCard
            tone="success"
            time="03:11"
            title="SSL renewed on 3 sites"
            body="Cert-bot ran clean for hookway.co.uk, lethean.host, and ofm-staging. New certs valid through Jan 2026."
            actions={[{ label: "View certs" }]}
            done
          />
          <BriefCard
            tone="info"
            time="02:30"
            title="Traffic up 34% on hookway.co.uk"
            body="Spike came from a Hacker News thread. I scaled the worker pool from 2→4. Costs +£0.80/day. Will scale back at quiet."
            actions={[{ label: "See thread" }, { label: "Pin scale" }]}
            done
          />
        </div>
      </section>

      {/* Sites grid */}
      <section>
        <SectionHeader
          eyebrow="SITES"
          title="Three sites, all green"
          rightSlot={<a style={{ fontSize: 13, color: "var(--brand-300)" }}>View all →</a>}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
          <SiteCard
            domain="hookway.co.uk"
            stack="Host UK · Mail · Analytics"
            status="green"
            uptime="99.998"
            response={114}
            sparkData={[80, 60, 90, 70, 85, 95, 65, 75, 88, 92, 70, 85]}
            lastDeploy="2d ago"
          />
          <SiteCard
            domain="lethean.host"
            stack="Lethean Core · Forge"
            status="green"
            uptime="99.94"
            response={203}
            sparkData={[60, 65, 80, 75, 70, 60, 55, 65, 72, 80, 78, 70]}
            lastDeploy="6h ago"
            warn="Renewal in 6 days"
          />
          <SiteCard
            domain="ofm-staging.host.uk.com"
            stack="OFM Studio · staging"
            status="green"
            uptime="99.87"
            response={92}
            sparkData={[40, 50, 45, 60, 55, 70, 65, 60, 55, 50, 60, 55]}
            lastDeploy="14m ago"
          />
        </div>
      </section>

      {/* Activity + Quick actions */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>
        <ActivityFeed />
        <QuickActions brand={brand} />
      </section>
    </main>
  );
}

// ─── Section header ───────────────────────────────────────
function SectionHeader({ eyebrow, title, rightSlot }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
          color: "var(--brand-300)", fontWeight: 500,
        }}>{eyebrow}</div>
        <h2 style={{ fontSize: 19, marginTop: 4, letterSpacing: "-0.02em" }}>{title}</h2>
      </div>
      {rightSlot}
    </div>
  );
}

// ─── Brief card ───────────────────────────────────────────
function BriefCard({ tone, time, title, body, actions = [], done = false }) {
  const toneColor = {
    warning: "var(--warning-400)",
    success: "var(--success-400)",
    info: "var(--info-400)",
  }[tone] || "var(--brand-300)";

  return (
    <article style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: "var(--r-lg)",
      padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* tone strip */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
        background: toneColor, opacity: done ? 0.4 : 1,
      }} />
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: toneColor,
          }} />
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{time}</span>
          {done && (
            <span style={{
              fontSize: 10.5, padding: "1px 6px", borderRadius: 4,
              background: "var(--ink-3)", color: "var(--fg-3)",
              fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
            }}>DONE</span>
          )}
        </div>
      </header>
      <div>
        <h3 style={{ fontSize: 15, lineHeight: 1.3, color: "var(--fg-0)", letterSpacing: "-0.015em" }}>{title}</h3>
        <p style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 6, lineHeight: 1.5 }}>{body}</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: "auto" }}>
        {actions.map((a, i) => (
          <button key={i} className={a.primary ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"} style={{
            fontSize: 12,
            border: a.primary ? undefined : "1px solid var(--line-2)",
          }}>
            {a.label}
          </button>
        ))}
      </div>
    </article>
  );
}

// ─── Site card ────────────────────────────────────────────
function SiteCard({ domain, stack, status, uptime, response, sparkData, lastDeploy, warn }) {
  const max = Math.max(...sparkData);
  const points = sparkData.map((v, i) => {
    const x = (i / (sparkData.length - 1)) * 100;
    const y = 24 - (v / max) * 22;
    return `${x},${y}`;
  }).join(" ");

  return (
    <article style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: "var(--r-lg)",
      padding: 16,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, color: "var(--fg-0)", fontWeight: 500,
            fontFamily: "var(--font-mono)", letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{domain}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 3 }}>{stack}</div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 999,
          background: "color-mix(in oklch, var(--success-500) 18%, var(--ink-3))",
          border: "1px solid color-mix(in oklch, var(--success-500) 28%, transparent)",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success-400)" }} />
          <span style={{ fontSize: 10.5, color: "var(--success-400)", letterSpacing: "0.04em", fontWeight: 500 }}>LIVE</span>
        </div>
      </header>

      {/* sparkline */}
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width: "100%", height: 24 }}>
        <defs>
          <linearGradient id={`spark-${domain}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-400)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke="var(--brand-300)" strokeWidth="1.2" />
        <polygon points={`0,24 ${points} 100,24`} fill={`url(#spark-${domain})`} />
      </svg>

      {/* metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 12 }}>
        <div>
          <div style={{ color: "var(--fg-4)", fontSize: 10.5, letterSpacing: "0.04em" }}>UPTIME</div>
          <div className="num tnum" style={{ color: "var(--fg-0)", fontSize: 15, marginTop: 2 }}>{uptime}<span style={{ color: "var(--fg-3)", fontSize: 11 }}>%</span></div>
        </div>
        <div>
          <div style={{ color: "var(--fg-4)", fontSize: 10.5, letterSpacing: "0.04em" }}>RESPONSE</div>
          <div className="num tnum" style={{ color: "var(--fg-0)", fontSize: 15, marginTop: 2 }}>{response}<span style={{ color: "var(--fg-3)", fontSize: 11 }}>ms</span></div>
        </div>
        <div>
          <div style={{ color: "var(--fg-4)", fontSize: 10.5, letterSpacing: "0.04em" }}>DEPLOY</div>
          <div className="num tnum" style={{ color: "var(--fg-0)", fontSize: 15, marginTop: 2 }}>{lastDeploy}</div>
        </div>
      </div>

      {warn && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 11.5, color: "var(--warning-400)",
          padding: "6px 10px", borderRadius: 6,
          background: "color-mix(in oklch, var(--warning-500) 12%, transparent)",
          border: "1px solid color-mix(in oklch, var(--warning-500) 28%, transparent)",
        }}>
          <Icon name="circle-exclamation" size={11} />
          {warn}
        </div>
      )}
    </article>
  );
}

// ─── Activity feed ────────────────────────────────────────
function ActivityFeed() {
  const items = [
    { who: "vi", time: "09:08", text: "Renewed SSL on hookway.co.uk · valid through 02 Jan 2026", icon: "shield-check", tone: "success" },
    { who: "vi", time: "06:42", text: "Drafted renewal reminder for lethean.host · waiting on you", icon: "clock", tone: "warning" },
    { who: "vi", time: "03:11", text: "Scaled hookway.co.uk worker pool 2→4 · traffic spike", icon: "wave-pulse", tone: "info" },
    { who: "you", time: "Yesterday 17:22", text: "Deployed ofm-staging.host.uk.com from main · 14m ago", icon: "code-branch", tone: "neutral" },
    { who: "vi", time: "Yesterday 09:00", text: "Sent invoice INV-2025-0094 to hello@hookway.co.uk · paid", icon: "envelope", tone: "neutral" },
    { who: "vi", time: "Yesterday 04:00", text: "Backed up 3 sites · 412 MB total · stored 14d", icon: "database", tone: "neutral" },
  ];

  const toneColor = {
    success: "var(--success-400)",
    warning: "var(--warning-400)",
    info: "var(--info-400)",
    neutral: "var(--fg-3)",
  };

  return (
    <div>
      <SectionHeader
        eyebrow="ACTIVITY"
        title="Last 24 hours"
        rightSlot={<a style={{ fontSize: 13, color: "var(--brand-300)" }}>Full log →</a>}
      />
      <div style={{
        marginTop: 14,
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, padding: "12px 16px",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            alignItems: "center",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: item.who === "vi"
                ? "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))"
                : "var(--ink-3)",
              border: "1px solid var(--line-1)",
              display: "grid", placeItems: "center",
              flexShrink: 0,
            }}>
              <Icon name={item.icon} size={11} color={item.who === "vi" ? "var(--brand-200)" : "var(--fg-2)"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.4 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: item.who === "vi" ? "var(--brand-300)" : "var(--fg-3)",
                  marginRight: 8, letterSpacing: "0.04em",
                }}>{item.who === "vi" ? "VI" : "YOU"}</span>
                {item.text}
              </div>
            </div>
            <div style={{
              fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}>{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────
function QuickActions({ brand }) {
  const actions = [
    { icon: "circle-plus", label: "New site", hint: "Domain + hosting in one go" },
    { icon: "envelope-circle-check", label: "Add mailbox", hint: "On any domain you own" },
    { icon: "code-branch", label: "Deploy from Git", hint: "Connect a repo" },
    { icon: "database", label: "Restore backup", hint: "Last 14 days available" },
    { icon: "users", label: "Invite teammate", hint: "Up to 5 on Standard" },
  ];

  return (
    <div>
      <SectionHeader eyebrow="QUICK" title="Common tasks" />
      <div style={{
        marginTop: 14,
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
      }}>
        {actions.map((a, i) => (
          <button key={a.label} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 14px", width: "100%",
            background: "transparent",
            border: "none",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            textAlign: "left",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: "var(--ink-3)",
              border: "1px solid var(--line-1)",
              display: "grid", placeItems: "center",
            }}>
              <Icon name={a.icon} size={12} color="var(--fg-2)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 1 }}>{a.hint}</div>
            </div>
            <Icon name="chevron-right" size={11} color="var(--fg-4)" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Vi conversation panel (right rail when open) ─────────
function CPViPanel({ brand }) {
  return (
    <aside style={{
      borderLeft: "1px solid var(--line-1)",
      background: "var(--ink-1)",
      display: "flex", flexDirection: "column",
      minHeight: "100%",
    }}>
      {/* header */}
      <header style={{
        padding: "16px 18px", borderBottom: "1px solid var(--line-1)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <Vi pose="master" size={36} style={{ marginTop: 4 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>Vi</div>
          <div style={{ fontSize: 11, color: "var(--success-400)" }}>● Listening</div>
        </div>
        <button style={{
          width: 28, height: 28, borderRadius: 6,
          background: "transparent", border: "1px solid var(--line-2)",
          display: "grid", placeItems: "center", color: "var(--fg-3)",
        }}>
          <Icon name="xmark" size={11} />
        </button>
      </header>

      {/* messages */}
      <div style={{
        flex: 1, padding: "20px 18px",
        display: "flex", flexDirection: "column", gap: 16,
        overflow: "auto",
      }}>
        <ViMessage who="you">
          What's slow on hookway.co.uk?
        </ViMessage>

        <ViMessage who="vi">
          <p style={{ marginBottom: 10 }}>
            Two things stand out today:
          </p>
          <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
            <li style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "var(--warning-400)", fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0 }}>1.</span>
              <span><span className="num" style={{ color: "var(--fg-0)" }}>/blog/2024-recap</span> — image payload is 3.4MB. Could be 280KB. I can convert to AVIF and ship it for you.</span>
            </li>
            <li style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "var(--info-400)", fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0 }}>2.</span>
              <span>The <span className="num" style={{ color: "var(--fg-0)" }}>/api/comments</span> endpoint averages 412ms. Database query — needs an index on <span className="num">(post_id, created_at)</span>.</span>
            </li>
          </ul>
          {/* inline action card */}
          <div style={{
            marginTop: 14,
            background: "var(--ink-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 8 }}>I can do both right now:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-primary btn-sm" style={{ justifyContent: "flex-start" }}>
                <Icon name="image" size={11} />
                Convert images on /blog/2024-recap
              </button>
              <button className="btn btn-secondary btn-sm" style={{ justifyContent: "flex-start" }}>
                <Icon name="database" size={11} />
                Add the index (needs ~30s downtime)
              </button>
            </div>
          </div>
        </ViMessage>

        <ViMessage who="you">
          Do the images. Schedule the index for Sunday 03:00.
        </ViMessage>

        <ViMessage who="vi" working>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-2)", fontSize: 13 }}>
            <ViTypingDots />
            Converting 14 images…
          </div>
        </ViMessage>
      </div>

      {/* composer */}
      <div style={{ padding: 14, borderTop: "1px solid var(--line-1)" }}>
        <div style={{
          background: "var(--ink-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <textarea
            placeholder="Ask Vi to do something…"
            rows={2}
            style={{
              width: "100%", background: "transparent", border: "none",
              color: "var(--fg-0)", fontFamily: "inherit", fontSize: 13.5,
              resize: "none", outline: "none",
            }}
            defaultValue=""
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{
                width: 24, height: 24, borderRadius: 5,
                background: "transparent", border: "1px solid var(--line-2)",
                display: "grid", placeItems: "center", color: "var(--fg-3)",
              }}>
                <Icon name="paperclip" size={10} />
              </button>
              <button style={{
                width: 24, height: 24, borderRadius: 5,
                background: "transparent", border: "1px solid var(--line-2)",
                display: "grid", placeItems: "center", color: "var(--fg-3)",
              }}>
                <Icon name="microphone" size={10} />
              </button>
            </div>
            <button className="btn btn-primary btn-sm">
              Send
              <Icon name="arrow-up" size={10} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 6, textAlign: "center", lineHeight: 1.4 }}>
          Vi reads your account data only. She never reads site content unless you ask.
        </div>
      </div>
    </aside>
  );
}

function ViMessage({ who, working, children }) {
  const isVi = who === "vi";
  return (
    <div style={{
      display: "flex", gap: 10,
      flexDirection: isVi ? "row" : "row-reverse",
    }}>
      {isVi ? (
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
          flexShrink: 0,
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <Vi pose="master" size={28} style={{ marginTop: 3 }} />
        </div>
      ) : (
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "var(--ink-3)", border: "1px solid var(--line-2)",
          display: "grid", placeItems: "center",
          fontSize: 9.5, fontWeight: 600, color: "var(--fg-2)", flexShrink: 0,
        }}>SM</div>
      )}
      <div style={{
        maxWidth: "82%",
        background: isVi ? "var(--ink-2)" : "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
        border: isVi ? "1px solid var(--line-1)" : "1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2))",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13, color: "var(--fg-1)", lineHeight: 1.5,
      }}>
        {children}
      </div>
    </div>
  );
}

function ViTypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--brand-300)",
          opacity: 0.4,
          animation: `viDot 1.2s ${i * 0.15}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes viDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

Object.assign(window, { ControlPanel });
