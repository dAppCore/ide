/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Native platform profiles for Host UK / Lethean
// ─────────────────────────────────────────────────────────
// Architecture: one React tree, four surfaces.
//   - The brand tokens (palette, Vi, brand-name) stay constant.
//   - The chrome and type swap by [data-platform="darwin|ios|ipad"]
//     applied at the artboard root.
//   - Each shell exposes the same body slot (Vi Control Panel),
//     but with platform-correct navigation grammar.
//
// Why not just one shell with media queries? Because a Wails app
// rendered through WebView2 / WKWebView is NOT a responsive web
// page. It's a native window. iOS large titles, NSToolbar
// segmented controls, and iPad three-column split view are
// distinct UX patterns that mobile-web cannot fake. We commit.
// ─────────────────────────────────────────────────────────

const VI_STATUS_LINE = "Watching 3 sites · all green · 1 thing waits on you";

// ── Mac vibrancy panel — mimics NSVisualEffectView dark sidebar
function VibrancyPanel({ children, style = {} }) {
  return (
    <div style={{
      position: "relative",
      background: "color-mix(in oklch, var(--ink-1) 78%, transparent)",
      backdropFilter: "blur(40px) saturate(160%)",
      WebkitBackdropFilter: "blur(40px) saturate(160%)",
      borderRight: "1px solid var(--line-1)",
      ...style,
    }}>
      {/* fine top sheen */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "color-mix(in oklch, var(--fg-0) 6%, transparent)",
      }} />
      {children}
    </div>
  );
}

// ── macOS-style segmented control — used in NSToolbar
function MacSegmented({ items, value, onChange = () => {} }) {
  return (
    <div style={{
      display: "inline-flex", height: 24, padding: 2, gap: 1,
      background: "color-mix(in oklch, var(--fg-0) 7%, transparent)",
      borderRadius: 6,
      border: "1px solid var(--line-1)",
    }}>
      {items.map((it) => {
        const active = it === value;
        return (
          <button key={it} onClick={() => onChange(it)} style={{
            height: 20, padding: "0 10px", borderRadius: 4,
            background: active ? "var(--ink-3)" : "transparent",
            border: active ? "1px solid var(--line-2)" : "1px solid transparent",
            color: active ? "var(--fg-0)" : "var(--fg-2)",
            fontSize: 11.5, fontWeight: 500, letterSpacing: "-0.005em",
            boxShadow: active ? "0 1px 0 rgba(0,0,0,.25)" : "none",
          }}>{it}</button>
        );
      })}
    </div>
  );
}

// ── Mac toolbar button (icon-only, glassy)
function MacToolButton({ icon, label, hint }) {
  return (
    <button title={hint || label} style={{
      width: 28, height: 24, borderRadius: 5,
      background: "color-mix(in oklch, var(--fg-0) 4%, transparent)",
      border: "1px solid var(--line-1)",
      display: "grid", placeItems: "center",
      color: "var(--fg-2)",
    }}>
      <Icon name={icon} size={11} />
    </button>
  );
}

// ── Traffic lights, sized for our window radius
function TrafficLights({ inactive = false }) {
  const dot = (color) => (
    <div style={{
      width: 12, height: 12, borderRadius: "50%",
      background: inactive ? "color-mix(in oklch, var(--fg-0) 14%, transparent)" : color,
      border: "0.5px solid rgba(0,0,0,0.18)",
    }} />
  );
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {dot("#ff5f57")}{dot("#febc2e")}{dot("#28c840")}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DARWIN — Vi Control Panel · macOS native
// ─────────────────────────────────────────────────────────
function ControlPanelDarwin({ brand = "hostuk", title = "Control Panel" }) {
  const [section, setSection] = React.useState("Today");
  return (
    <div data-brand={brand} data-platform="darwin" className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      display: "flex", flexDirection: "column",
      fontSize: 13, lineHeight: 1.45,
    }}>
      {/* Title bar — unified toolbar style */}
      <div style={{
        height: 52, flexShrink: 0,
        display: "grid", gridTemplateColumns: "240px 1fr",
        borderBottom: "1px solid var(--line-1)",
        background: "color-mix(in oklch, var(--ink-1) 92%, transparent)",
        backdropFilter: "blur(28px) saturate(160%)",
        WebkitBackdropFilter: "blur(28px) saturate(160%)",
      }}>
        {/* Sidebar half: traffic lights + window title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 14px" }}>
          <TrafficLights />
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "var(--fg-2)", fontSize: 12.5, fontWeight: 500,
          }}>
            <BrandMark size="xs" />
            <span style={{ color: "var(--fg-3)", margin: "0 4px" }}>·</span>
            <span style={{ color: "var(--fg-1)" }}>Sam Mooney</span>
          </div>
        </div>
        {/* Content half: title + segmented + actions */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", gap: 12 }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.015em",
            color: "var(--fg-0)",
          }}>{title}</div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <MacSegmented items={["Today", "Sites", "Activity"]} value={section} onChange={setSection} />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <MacToolButton icon="magnifying-glass" hint="Search (⌘F)" />
            <MacToolButton icon="arrow-rotate-right" hint="Refresh" />
            <MacToolButton icon="bell" hint="Notifications" />
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              height: 24, padding: "0 8px",
              background: "color-mix(in oklch, var(--brand-500) 22%, transparent)",
              border: "1px solid color-mix(in oklch, var(--brand-500) 38%, transparent)",
              borderRadius: 5, color: "var(--brand-200)", fontSize: 11.5, fontWeight: 500,
            }}>
              <Icon name="sparkles" size={10} />
              Ask Vi
              <kbd style={{
                fontFamily: "var(--font-mono)", fontSize: 10,
                color: "var(--brand-200)", opacity: 0.7,
              }}>⌘K</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "240px 1fr", minHeight: 0 }}>
        {/* Vibrancy sidebar */}
        <VibrancyPanel style={{ display: "flex", flexDirection: "column" }}>
          <DarwinSidebar section={section} setSection={setSection} />
        </VibrancyPanel>

        {/* Content */}
        <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--ink-0)" }}>
          <DarwinContentHeader />
          <div style={{ flex: 1, overflow: "auto", padding: "0 22px 22px" }}>
            <DarwinTodayBody />
          </div>
          <DarwinStatusBar />
        </div>
      </div>
    </div>
  );
}

function DarwinSidebar({ section, setSection }) {
  const groups = [
    {
      title: "Workspace",
      items: [
        { label: "Today", icon: "house", count: null },
        { label: "Sites", icon: "globe", count: 3 },
        { label: "Domains", icon: "at", count: 5 },
        { label: "Email", icon: "envelope", count: 12 },
        { label: "Activity", icon: "wave-pulse", count: null },
      ],
    },
    {
      title: "Sites",
      items: [
        { label: "hookway.co.uk", icon: "circle", count: null, dotColor: "var(--success-400)" },
        { label: "lethean.host", icon: "circle", count: null, dotColor: "var(--warning-400)" },
        { label: "ofm-staging", icon: "circle", count: null, dotColor: "var(--success-400)" },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Billing", icon: "credit-card" },
        { label: "Team", icon: "users" },
        { label: "Settings", icon: "sliders" },
      ],
    },
  ];
  return (
    <div style={{ padding: "10px 0 14px", display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      {/* Vi presence card — anchored to brand purple, not generic */}
      <div style={{
        margin: "2px 12px 10px",
        padding: 10,
        background: "color-mix(in oklch, var(--brand-500) 12%, transparent)",
        border: "1px solid color-mix(in oklch, var(--brand-500) 28%, transparent)",
        borderRadius: 8,
        display: "flex", gap: 9, alignItems: "flex-start",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: "color-mix(in oklch, var(--brand-500) 24%, var(--ink-3))",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <Vi pose="master" size={36} style={{ marginTop: 4 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>Vi · always on</div>
          <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.4 }}>{VI_STATUS_LINE}</div>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={g.title} style={{ marginTop: gi === 0 ? 0 : 8 }}>
          <div style={{
            padding: "6px 18px 4px",
            fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em",
            color: "var(--fg-4)", textTransform: "uppercase",
          }}>{g.title}</div>
          {g.items.map((it) => {
            const active = it.label === section;
            return (
              <button key={it.label} onClick={() => setSection(it.label)} style={{
                display: "flex", alignItems: "center", gap: 8,
                margin: "0 8px", padding: "0 10px",
                height: 26, borderRadius: 5,
                background: active ? "color-mix(in oklch, var(--brand-500) 26%, transparent)" : "transparent",
                border: "none", textAlign: "left", width: "calc(100% - 16px)",
                color: active ? "var(--fg-0)" : "var(--fg-1)",
                fontSize: 12.5, fontWeight: active ? 500 : 400,
              }}>
                {it.dotColor ? (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: it.dotColor, marginLeft: 2 }} />
                ) : (
                  <Icon name={it.icon} size={11} color={active ? "var(--fg-0)" : "var(--fg-3)"} />
                )}
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.count != null && (
                  <span style={{ fontSize: 11, color: active ? "var(--fg-2)" : "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{it.count}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: "auto" }} />
    </div>
  );
}

function DarwinContentHeader() {
  return (
    <div style={{
      padding: "16px 22px 12px",
      borderBottom: "1px solid var(--line-1)",
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
          FRIDAY · 4 OCT · 09:14 GMT
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 22, marginTop: 4, fontWeight: 600,
          letterSpacing: "-0.025em", color: "var(--fg-0)",
        }}>
          Good morning, Sam.
        </h1>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Sort by</span>
        <MacSegmented items={["Time", "Priority"]} value="Time" />
      </div>
    </div>
  );
}

function DarwinTodayBody() {
  const briefs = [
    {
      tone: "warning", time: "06:42",
      title: "lethean.host renews in 6 days",
      body: "Auto-renew is off. £18.40 for 12 months at the current rate.",
      actions: [{ label: "Renew now", primary: true }, { label: "Auto-renew" }, { label: "Let lapse" }],
      shortcut: "⌘1",
    },
    {
      tone: "success", time: "03:11",
      title: "SSL renewed on 3 sites · cert-bot ran clean",
      body: "hookway.co.uk · lethean.host · ofm-staging — valid through 02 Jan 2026.",
      actions: [{ label: "View certs" }],
      done: true,
    },
    {
      tone: "info", time: "02:30",
      title: "Traffic up 34% on hookway.co.uk",
      body: "Spike from a Hacker News thread. I scaled workers 2→4 (+£0.80/day). Will scale back at quiet.",
      actions: [{ label: "See thread" }, { label: "Pin scale" }],
      done: true,
    },
  ];
  return (
    <div style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
      <DarwinBriefSection briefs={briefs} />
      <DarwinSitesTable />
      <DarwinActivity />
    </div>
  );
}

function DarwinBriefSection({ briefs }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: 13, fontWeight: 600, color: "var(--fg-0)",
          letterSpacing: "-0.005em",
        }}>Vi's brief</h2>
        <span style={{ fontSize: 11, color: "var(--fg-4)" }}>· last 12 hours</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {briefs.map((b, i) => (
          <DarwinBriefCard key={i} {...b} />
        ))}
      </div>
    </section>
  );
}

function DarwinBriefCard({ tone, time, title, body, actions, done, shortcut }) {
  const toneColor = {
    warning: "var(--warning-400)",
    success: "var(--success-400)",
    info: "var(--info-400)",
  }[tone] || "var(--brand-300)";
  return (
    <article style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: 6,
      padding: "10px 12px 11px",
      display: "flex", flexDirection: "column", gap: 8,
      position: "relative",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
        background: toneColor, opacity: done ? 0.4 : 1,
        borderRadius: "6px 0 0 6px",
      }} />
      <header style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: toneColor }} />
        <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{time}</span>
        {done && (
          <span style={{
            fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
            background: "var(--ink-3)", color: "var(--fg-3)",
            fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
          }}>DONE</span>
        )}
        {shortcut && (
          <kbd style={{
            marginLeft: "auto",
            fontSize: 10, fontFamily: "var(--font-mono)",
            color: "var(--fg-4)", padding: "1px 4px",
            border: "1px solid var(--line-1)", borderRadius: 3,
          }}>{shortcut}</kbd>
        )}
      </header>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-0)", letterSpacing: "-0.01em", lineHeight: 1.35 }}>{title}</div>
        <p style={{ fontSize: 11.5, color: "var(--fg-2)", marginTop: 4, lineHeight: 1.45 }}>{body}</p>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: "auto", flexWrap: "wrap" }}>
        {actions.map((a, i) => (
          <button key={i} style={{
            height: 22, padding: "0 8px", fontSize: 11, borderRadius: 4,
            background: a.primary ? "var(--brand-500)" : "var(--ink-3)",
            color: a.primary ? "var(--fg-0)" : "var(--fg-1)",
            border: a.primary ? "1px solid var(--brand-400)" : "1px solid var(--line-1)",
            fontWeight: 500,
          }}>{a.label}</button>
        ))}
      </div>
    </article>
  );
}

function DarwinSitesTable() {
  const sites = [
    { domain: "hookway.co.uk", stack: "Host UK · Mail · Analytics", uptime: "99.998", response: "114ms", deploy: "2d ago", status: "green" },
    { domain: "lethean.host", stack: "Lethean Core · Forge", uptime: "99.94", response: "203ms", deploy: "6h ago", status: "green", warn: "Renewal in 6d" },
    { domain: "ofm-staging.host.uk.com", stack: "OFM Studio · staging", uptime: "99.87", response: "92ms", deploy: "14m ago", status: "green" },
  ];
  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{
          fontFamily: "var(--font-display)",
          fontSize: 13, fontWeight: 600, color: "var(--fg-0)",
          letterSpacing: "-0.005em",
        }}>Sites</h2>
        <a style={{ fontSize: 11.5, color: "var(--brand-300)" }}>View all (3)</a>
      </div>
      <div style={{
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: 6,
        overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.4fr 1.6fr 70px 70px 80px 90px",
          fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
          color: "var(--fg-4)", padding: "7px 12px",
          borderBottom: "1px solid var(--line-1)", background: "var(--ink-1)",
        }}>
          <div>DOMAIN</div><div>STACK</div><div>UPTIME</div><div>RESP.</div><div>DEPLOY</div><div></div>
        </div>
        {sites.map((s, i) => (
          <div key={s.domain} style={{
            display: "grid", gridTemplateColumns: "1.4fr 1.6fr 70px 70px 80px 90px",
            fontSize: 12, padding: "8px 12px", alignItems: "center",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success-400)" }} />
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-0)" }}>{s.domain}</span>
            </div>
            <div style={{ color: "var(--fg-2)" }}>{s.stack}</div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{s.uptime}<span style={{ color: "var(--fg-4)" }}>%</span></div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>{s.response}</div>
            <div style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>{s.deploy}</div>
            <div>
              {s.warn && (
                <span style={{
                  fontSize: 10.5, padding: "2px 7px", borderRadius: 3,
                  background: "color-mix(in oklch, var(--warning-500) 18%, transparent)",
                  color: "var(--warning-400)",
                  border: "1px solid color-mix(in oklch, var(--warning-500) 30%, transparent)",
                }}>{s.warn}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DarwinActivity() {
  const items = [
    { who: "Vi", time: "09:08", text: "Renewed SSL on hookway.co.uk · valid through 02 Jan 2026" },
    { who: "Vi", time: "06:42", text: "Drafted renewal reminder for lethean.host · waiting on you" },
    { who: "Vi", time: "03:11", text: "Scaled hookway.co.uk worker pool 2→4 · traffic spike" },
    { who: "You", time: "Yesterday 17:22", text: "Deployed ofm-staging.host.uk.com from main" },
    { who: "Vi", time: "Yesterday 09:00", text: "Sent invoice INV-2025-0094 · paid" },
  ];
  return (
    <section>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 13, fontWeight: 600, color: "var(--fg-0)",
        marginBottom: 8, letterSpacing: "-0.005em",
      }}>Activity · last 24h</h2>
      <div style={{
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: 6, overflow: "hidden",
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 12px",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            fontSize: 12,
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: it.who === "Vi" ? "var(--brand-300)" : "var(--fg-3)",
              padding: "1px 6px", borderRadius: 3,
              background: it.who === "Vi" ? "color-mix(in oklch, var(--brand-500) 14%, transparent)" : "var(--ink-3)",
              border: "1px solid " + (it.who === "Vi" ? "color-mix(in oklch, var(--brand-500) 28%, transparent)" : "var(--line-1)"),
              letterSpacing: "0.04em", flexShrink: 0,
            }}>{it.who.toUpperCase()}</span>
            <span style={{ color: "var(--fg-1)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.text}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-4)", flexShrink: 0 }}>{it.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DarwinStatusBar() {
  return (
    <div style={{
      height: 22, flexShrink: 0,
      borderTop: "1px solid var(--line-1)",
      background: "color-mix(in oklch, var(--ink-1) 92%, transparent)",
      display: "flex", alignItems: "center",
      padding: "0 12px", gap: 12,
      fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success-400)" }} />
        Vi connected · 12ms
      </div>
      <span style={{ color: "var(--fg-4)" }}>·</span>
      <span>3 sites watched</span>
      <span style={{ color: "var(--fg-4)" }}>·</span>
      <span>£14.40 used this month</span>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <span>v2.4.1</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span>WebView2 · 124.0</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// iOS — Vi Control Panel · iPhone native
// ─────────────────────────────────────────────────────────
function ControlPanelIOS({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} data-platform="ios" className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      display: "flex", flexDirection: "column",
      fontSize: 17, lineHeight: 1.4,
      position: "relative", overflow: "hidden",
    }}>
      {/* iOS status bar */}
      <div style={{
        height: 54, padding: "16px 28px 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17,
        color: "var(--fg-0)",
      }}>
        <div>9:41</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="signal" size={14} color="var(--fg-0)" />
          <Icon name="wifi" size={14} color="var(--fg-0)" />
          <div style={{
            width: 24, height: 11, borderRadius: 3, position: "relative",
            border: "1.4px solid var(--fg-0)", padding: 1.2,
          }}>
            <div style={{ width: "78%", height: "100%", borderRadius: 1, background: "var(--fg-0)" }} />
            <div style={{
              position: "absolute", right: -3, top: 3, bottom: 3,
              width: 1.5, borderRadius: 1, background: "var(--fg-0)",
            }} />
          </div>
        </div>
      </div>

      {/* Large title nav */}
      <div style={{ padding: "8px 18px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 4, color: "var(--brand-300)",
            fontSize: 17, fontWeight: 400, background: "none", border: "none", padding: 0,
          }}>
            <Icon name="chevron-left" size={16} />
            Back
          </button>
          <div style={{ display: "flex", gap: 14 }}>
            <button style={{ background: "none", border: "none", padding: 0 }}>
              <Icon name="magnifying-glass" size={17} color="var(--brand-300)" />
            </button>
            <button style={{ background: "none", border: "none", padding: 0 }}>
              <Icon name="ellipsis-vertical" size={17} color="var(--brand-300)" />
            </button>
          </div>
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em",
          color: "var(--fg-0)", margin: 0,
        }}>Today</h1>
        <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
          FRIDAY · 4 OCT
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 18px 100px" }}>
        {/* Vi card — pinned at top */}
        <IOSViCard />

        {/* Section: Vi's brief */}
        <IOSSectionHeader title="Vi's brief" trailing="3 items" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <IOSBriefCard
            tone="warning"
            title="lethean.host renews in 6 days"
            body="Auto-renew is off. £18.40 for 12 months at the current rate."
            primary="Renew now"
          />
          <IOSBriefCard
            tone="success" done
            title="SSL renewed on 3 sites"
            body="cert-bot ran clean. Valid through 02 Jan 2026."
            primary="View certs"
          />
          <IOSBriefCard
            tone="info" done
            title="Traffic up 34% on hookway.co.uk"
            body="HN spike. Scaled workers 2→4 (+£0.80/day). Will scale back at quiet."
            primary="See thread"
          />
        </div>

        {/* Section: Sites — grouped inset table */}
        <IOSSectionHeader title="Sites" trailing="3 watched" />
        <div className="native-list">
          <IOSListRow domain="hookway.co.uk" stack="Host UK · Mail" status="green" response="114ms" />
          <IOSListRow domain="lethean.host" stack="Lethean Core" status="green" response="203ms" warn />
          <IOSListRow domain="ofm-staging.host.uk.com" stack="OFM · staging" status="green" response="92ms" />
        </div>

        {/* Section: Account */}
        <IOSSectionHeader title="Account" />
        <div className="native-list">
          <IOSAccountRow icon="credit-card" label="Billing" value="£14.40 this month" />
          <IOSAccountRow icon="users" label="Team" value="2 of 5" />
          <IOSAccountRow icon="bell" label="Notifications" value="On" />
          <IOSAccountRow icon="sliders" label="Settings" value="" chevron />
        </div>
      </div>

      {/* Tab bar */}
      <IOSTabBar />

      {/* Home indicator */}
      <div style={{
        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
        width: 134, height: 5, borderRadius: 999,
        background: "var(--fg-0)",
      }} />
    </div>
  );
}

function IOSViCard() {
  return (
    <div style={{
      background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
      border: "1px solid color-mix(in oklch, var(--brand-500) 32%, var(--line-1))",
      borderRadius: 14, padding: 14, marginBottom: 22,
      display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: "color-mix(in oklch, var(--brand-500) 26%, var(--ink-3))",
        display: "grid", placeItems: "center", overflow: "hidden",
      }}>
        <Vi pose="master" size={56} style={{ marginTop: 6 }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.01em" }}>
          Vi · always on
        </div>
        <div style={{ fontSize: 13.5, color: "var(--fg-2)", marginTop: 2, lineHeight: 1.4 }}>
          {VI_STATUS_LINE}.
        </div>
        <button style={{
          marginTop: 9,
          height: 32, padding: "0 12px",
          background: "color-mix(in oklch, var(--brand-500) 30%, transparent)",
          border: "1px solid color-mix(in oklch, var(--brand-500) 50%, transparent)",
          borderRadius: 8, color: "var(--brand-100)",
          fontSize: 13, fontWeight: 500,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <Icon name="sparkles" size={11} />
          Ask Vi anything
        </button>
      </div>
    </div>
  );
}

function IOSSectionHeader({ title, trailing }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      padding: "20px 4px 8px",
    }}>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 13, fontWeight: 600, letterSpacing: "0.02em",
        color: "var(--fg-3)", textTransform: "uppercase",
      }}>{title}</div>
      {trailing && (
        <div style={{ fontSize: 12, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>{trailing}</div>
      )}
    </div>
  );
}

function IOSBriefCard({ tone, title, body, primary, done }) {
  const toneColor = {
    warning: "var(--warning-400)",
    success: "var(--success-400)",
    info: "var(--info-400)",
  }[tone] || "var(--brand-300)";
  return (
    <div style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: 14, padding: 14,
      display: "flex", flexDirection: "column", gap: 10,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: toneColor, opacity: done ? 0.35 : 1,
      }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: toneColor }} />
        {done && (
          <span style={{
            fontSize: 11, padding: "2px 7px", borderRadius: 6,
            background: "var(--ink-3)", color: "var(--fg-3)",
            fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
          }}>DONE</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.015em", lineHeight: 1.3 }}>{title}</div>
        <p style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 5, lineHeight: 1.4 }}>{body}</p>
      </div>
      {primary && !done && (
        <button style={{
          alignSelf: "flex-start",
          height: 36, padding: "0 14px",
          background: "var(--brand-500)", color: "var(--fg-0)",
          border: "none", borderRadius: 10,
          fontSize: 14, fontWeight: 500,
        }}>{primary}</button>
      )}
      {primary && done && (
        <button style={{
          alignSelf: "flex-start",
          height: 32, padding: "0 12px",
          background: "transparent", color: "var(--brand-300)",
          border: "none", borderRadius: 10,
          fontSize: 13.5, fontWeight: 500,
        }}>{primary} →</button>
      )}
    </div>
  );
}

function IOSListRow({ domain, stack, status, response, warn }) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success-400)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: "var(--fg-0)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domain}</div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 1 }}>{stack}{warn && <span style={{ color: "var(--warning-400)", marginLeft: 8 }}>· renews 6d</span>}</div>
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-2)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{response}</div>
      <Icon name="chevron-right" size={11} color="var(--fg-4)" />
    </div>
  );
}

function IOSAccountRow({ icon, label, value, chevron }) {
  return (
    <div className="row">
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: "var(--ink-3)", border: "1px solid var(--line-1)",
        display: "grid", placeItems: "center",
      }}>
        <Icon name={icon} size={12} color="var(--fg-2)" />
      </div>
      <span style={{ fontSize: 15, color: "var(--fg-0)" }}>{label}</span>
      {value && <span style={{ marginLeft: "auto", fontSize: 14, color: "var(--fg-3)" }}>{value}</span>}
      {chevron && <Icon name="chevron-right" size={11} color="var(--fg-4)" />}
    </div>
  );
}

function IOSTabBar() {
  const tabs = [
    { icon: "house", label: "Today", active: true },
    { icon: "globe", label: "Sites" },
    { icon: "wave-pulse", label: "Activity" },
    { icon: "user", label: "Account" },
  ];
  return (
    <div style={{
      flexShrink: 0,
      padding: "8px 12px 30px",
      borderTop: "1px solid var(--line-1)",
      background: "color-mix(in oklch, var(--ink-1) 92%, transparent)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    }}>
      {tabs.map((t) => (
        <button key={t.label} style={{
          background: "none", border: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          color: t.active ? "var(--brand-300)" : "var(--fg-3)",
          fontSize: 10, padding: "4px 0",
        }}>
          <Icon name={t.icon} size={20} color={t.active ? "var(--brand-300)" : "var(--fg-3)"} />
          <span style={{ fontWeight: 500 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// iPadOS — Vi Control Panel · 3-column split view
// ─────────────────────────────────────────────────────────
function ControlPanelIPad({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} data-platform="ipad" className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      display: "flex", flexDirection: "column",
      fontSize: 15, lineHeight: 1.45,
      position: "relative", overflow: "hidden",
    }}>
      {/* Status bar — minimal */}
      <div style={{
        height: 28, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 22px",
        fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
        color: "var(--fg-0)",
      }}>
        <span>9:41 Fri 4 Oct</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="signal" size={12} color="var(--fg-0)" />
          <Icon name="wifi" size={12} color="var(--fg-0)" />
          <span style={{ fontSize: 13 }}>78%</span>
          <div style={{ width: 22, height: 10, borderRadius: 3, border: "1.4px solid var(--fg-0)", padding: 1 }}>
            <div style={{ width: "78%", height: "100%", background: "var(--fg-0)" }} />
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "240px 320px 1fr",
        minHeight: 0,
      }}>
        {/* Primary sidebar */}
        <IPadPrimary />

        {/* Secondary list */}
        <IPadSecondary />

        {/* Detail */}
        <IPadDetail />
      </div>

      {/* Home indicator */}
      <div style={{
        position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
        width: 220, height: 5, borderRadius: 999,
        background: "color-mix(in oklch, var(--fg-0) 60%, transparent)",
      }} />
    </div>
  );
}

function IPadPrimary() {
  const sections = [
    { title: "Workspace", items: [
      { icon: "house", label: "Today", count: 3, active: true },
      { icon: "globe", label: "Sites", count: 3 },
      { icon: "at", label: "Domains", count: 5 },
      { icon: "envelope", label: "Email", count: 12 },
      { icon: "wave-pulse", label: "Activity" },
    ]},
    { title: "Sites", items: [
      { dot: "var(--success-400)", label: "hookway.co.uk" },
      { dot: "var(--warning-400)", label: "lethean.host" },
      { dot: "var(--success-400)", label: "ofm-staging" },
    ]},
    { title: "Account", items: [
      { icon: "credit-card", label: "Billing" },
      { icon: "users", label: "Team" },
      { icon: "sliders", label: "Settings" },
    ]},
  ];
  return (
    <div style={{
      borderRight: "1px solid var(--line-1)",
      background: "var(--ink-1)",
      padding: "12px 0",
      display: "flex", flexDirection: "column", gap: 6,
      overflow: "auto",
    }}>
      <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 8 }}>
        <BrandMark size="sm" />
      </div>
      <div style={{
        margin: "0 12px 6px",
        padding: 10,
        background: "color-mix(in oklch, var(--brand-500) 12%, transparent)",
        border: "1px solid color-mix(in oklch, var(--brand-500) 28%, transparent)",
        borderRadius: 10,
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: "color-mix(in oklch, var(--brand-500) 24%, var(--ink-3))",
          display: "grid", placeItems: "center", overflow: "hidden",
        }}>
          <Vi pose="master" size={40} style={{ marginTop: 4 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)" }}>Vi</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.4, marginTop: 1 }}>1 thing waits on you</div>
        </div>
      </div>
      {sections.map((sec, si) => (
        <div key={sec.title} style={{ marginTop: si === 0 ? 4 : 8 }}>
          <div style={{
            padding: "6px 18px 4px",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
            color: "var(--fg-4)", textTransform: "uppercase",
          }}>{sec.title}</div>
          {sec.items.map((it) => (
            <div key={it.label} style={{
              display: "flex", alignItems: "center", gap: 9,
              margin: "0 8px", padding: "0 12px",
              height: 32, borderRadius: 7,
              background: it.active ? "color-mix(in oklch, var(--brand-500) 24%, transparent)" : "transparent",
              color: it.active ? "var(--fg-0)" : "var(--fg-1)",
              fontSize: 14, fontWeight: it.active ? 500 : 400,
            }}>
              {it.dot ? (
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: it.dot }} />
              ) : (
                <Icon name={it.icon} size={13} color={it.active ? "var(--fg-0)" : "var(--fg-3)"} />
              )}
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.count != null && (
                <span style={{ fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{it.count}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function IPadSecondary() {
  const briefs = [
    { tone: "warning", time: "06:42", title: "lethean.host renews in 6 days", subtitle: "£18.40 · auto-renew off", active: true },
    { tone: "success", time: "03:11", title: "SSL renewed on 3 sites", subtitle: "Valid through 02 Jan 2026", done: true },
    { tone: "info", time: "02:30", title: "Traffic up 34% on hookway.co.uk", subtitle: "Scaled workers 2→4", done: true },
    { tone: "neutral", time: "Yesterday", title: "Invoice INV-2025-0094 paid", subtitle: "£144.00 · Visa 4242", done: true },
    { tone: "neutral", time: "Yesterday", title: "Backed up 3 sites · 412 MB", subtitle: "Stored 14 days", done: true },
  ];
  return (
    <div style={{
      borderRight: "1px solid var(--line-1)",
      background: "var(--ink-0)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px 10px",
        borderBottom: "1px solid var(--line-1)",
        background: "var(--ink-1)",
      }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 19, fontWeight: 700, color: "var(--fg-0)", letterSpacing: "-0.02em",
        }}>Today</div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>FRIDAY · 4 OCT · 09:14 GMT</div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {briefs.map((b, i) => {
          const toneColor = { warning: "var(--warning-400)", success: "var(--success-400)", info: "var(--info-400)" }[b.tone] || "var(--fg-4)";
          return (
            <div key={i} style={{
              padding: "12px 16px",
              borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
              background: b.active ? "color-mix(in oklch, var(--brand-500) 14%, transparent)" : "transparent",
              borderLeft: b.active ? "3px solid var(--brand-400)" : "3px solid transparent",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor, opacity: b.done ? 0.45 : 1 }} />
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{b.time}</span>
                {b.done && <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)", marginLeft: 2 }}>DONE</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-0)", letterSpacing: "-0.01em", lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-2)" }}>{b.subtitle}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IPadDetail() {
  return (
    <div style={{
      background: "var(--ink-0)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Detail header — toolbar with split-view affordances */}
      <div style={{
        height: 44, flexShrink: 0,
        borderBottom: "1px solid var(--line-1)",
        display: "flex", alignItems: "center", padding: "0 18px", gap: 10,
        background: "color-mix(in oklch, var(--ink-1) 92%, transparent)",
      }}>
        <button style={{ background: "none", border: "none", padding: 4, color: "var(--fg-2)" }}>
          <Icon name="sidebar" size={14} />
        </button>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)",
        }}>lethean.host</div>
        <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>· renewal due in 6 days</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>⌘1 Renew · ⌘2 Auto · ⌘⌫ Lapse</span>
        </div>
      </div>

      {/* Detail body */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em",
            color: "var(--fg-0)", margin: 0,
          }}>
            lethean.host renews in 6 days
          </h1>
          <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 8, maxWidth: 560 }}>
            Auto-renew is off, so I won't act unless you say. Current rate is £18.40 for another 12 months.
            If you let it lapse, I'll hold the domain for the 30-day grace period — after that it goes back to the registry.
          </p>
        </div>

        {/* Action grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Renew now", sub: "£18.40 · 12 months", primary: true, key: "⌘1" },
            { label: "Turn auto-renew on", sub: "I'll handle this every year", key: "⌘2" },
            { label: "Let it lapse", sub: "I'll hold the domain 30d", key: "⌘⌫" },
          ].map((a, i) => (
            <button key={i} style={{
              padding: "12px 14px", textAlign: "left", borderRadius: 10,
              background: a.primary ? "var(--brand-500)" : "var(--ink-2)",
              border: "1px solid " + (a.primary ? "var(--brand-400)" : "var(--line-1)"),
              color: a.primary ? "var(--fg-0)" : "var(--fg-1)",
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.label}</span>
                <kbd style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.7 }}>{a.key}</kbd>
              </div>
              <span style={{ fontSize: 12, opacity: 0.85 }}>{a.sub}</span>
            </button>
          ))}
        </div>

        {/* Vi reasoning */}
        <div style={{
          padding: 14,
          background: "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 22%, var(--line-1))",
          borderRadius: 10,
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: "color-mix(in oklch, var(--brand-500) 26%, var(--ink-3))",
            display: "grid", placeItems: "center", overflow: "hidden",
          }}>
            <Vi pose="master" size={36} style={{ marginTop: 4 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--brand-200)", letterSpacing: "0.02em" }}>VI'S NOTE</div>
            <p style={{ fontSize: 13.5, color: "var(--fg-1)", marginTop: 4, lineHeight: 1.5 }}>
              You've held this for three years. Average use is steady at 30k requests/day, no recent complaints in inbox.
              I think renewal is the right call, but it's your shout. <span className="editorial" style={{ fontStyle: "italic", color: "var(--fg-2)" }}>I'm here either way.</span>
            </p>
          </div>
        </div>

        {/* Recent on this domain */}
        <div>
          <h3 style={{
            fontFamily: "var(--font-display)",
            fontSize: 13, fontWeight: 600, color: "var(--fg-0)",
            marginBottom: 8, letterSpacing: "0.02em", textTransform: "uppercase",
          }}>Recent on this domain</h3>
          <div className="native-list">
            {[
              ["09:08", "SSL renewed · cert valid through 02 Jan 2026"],
              ["Yesterday", "Forge build #482 succeeded · 4m 12s"],
              ["3 days ago", "DNS A record updated · 185.243.55.12"],
              ["Last week", "Backup snapshot stored · 138 MB"],
            ].map(([time, text], i) => (
              <div key={i} className="row" style={{ height: 36 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)", flexShrink: 0, width: 86 }}>{time}</span>
                <span style={{ fontSize: 13.5, color: "var(--fg-1)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Native typography & chrome reference page
// Side-by-side: Web · Darwin · iOS — same atoms, different
// platform expression. The "this is the rule" surface.
// ─────────────────────────────────────────────────────────
function NativeProfilesReference({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", padding: 32, background: "var(--ink-0)",
      display: "flex", flexDirection: "column", gap: 28,
    }}>
      <header style={{ maxWidth: 760 }}>
        <div style={{ fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>
          NATIVE PROFILES · v0.1
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 700, letterSpacing: "-0.025em",
          color: "var(--fg-0)", margin: 0, lineHeight: 1.05,
        }}>
          Same brand, four platforms. <span className="editorial" style={{ fontStyle: "italic", fontWeight: 400, color: "var(--fg-2)" }}>The chrome changes; Vi doesn't.</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 12, lineHeight: 1.55, maxWidth: 640 }}>
          Our apps ship as native binaries — Wails on macOS/Windows, real native shells on iOS/iPadOS — not Electron, not a PWA.
          The brand palette and Vi's voice stay constant. Type, density, and chrome swap to feel native on each platform.
        </p>
      </header>

      {/* The token-swap table */}
      <ProfilesTokenTable />

      {/* Type ladder side-by-side */}
      <ProfilesTypeLadder />

      {/* Density / chrome rules */}
      <ProfilesChromeRules />

      {/* Component contrast */}
      <ProfilesComponentContrast />

      <footer style={{
        marginTop: 8, padding: "16px 0 0",
        borderTop: "1px solid var(--line-1)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)",
      }}>
        <span>tokens.css · [data-platform="…"] applied at the artboard root</span>
        <span>handoff for Claude Code · week of 11 Oct</span>
      </footer>
    </div>
  );
}

function ProfilesTokenTable() {
  const rows = [
    ["sans", '"Geist"', "SF Pro Text", "SF Pro Text", "SF Pro Text"],
    ["mono", '"Geist Mono"', "SF Mono", "SF Mono", "SF Mono"],
    ["display", '"Geist" 600', "SF Pro Display", "SF Pro Display", "SF Pro Display"],
    ["body size", "14px", "13px", "17pt", "15pt"],
    ["base radius (--r-md)", "8px", "6px", "10px", "10px"],
    ["row height", "44px", "30px", "50px", "44px"],
    ["min hit target", "32px", "22px", "44pt", "44pt"],
    ["chrome", "browser nav", "NSToolbar + traffic lights + status bar", "Large title + tab bar + sheets", "3-column split + sidebar"],
  ];
  return (
    <section>
      <SectionTitle eyebrow="TOKENS" title="What changes per platform" />
      <div style={{
        marginTop: 14, background: "var(--ink-2)",
        border: "1px solid var(--line-1)", borderRadius: 8, overflow: "hidden",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "180px 1fr 1.2fr 1fr 1fr",
          padding: "10px 16px", background: "var(--ink-1)",
          borderBottom: "1px solid var(--line-1)",
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
          color: "var(--fg-3)", textTransform: "uppercase",
        }}>
          <div>TOKEN</div><div>WEB · DEFAULT</div><div>DARWIN</div><div>iOS</div><div>iPADOS</div>
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "180px 1fr 1.2fr 1fr 1fr",
            padding: "10px 16px", borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            fontSize: 13, alignItems: "center",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>{r[0]}</div>
            <div style={{ color: "var(--fg-1)" }}>{r[1]}</div>
            <div style={{ color: "var(--fg-1)" }}>{r[2]}</div>
            <div style={{ color: "var(--fg-1)" }}>{r[3]}</div>
            <div style={{ color: "var(--fg-1)" }}>{r[4]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilesTypeLadder() {
  const samples = [
    { plat: "Web · default", platTag: null, fontFamily: "var(--font-sans)", display: "Geist 600 · 32 / -2.5%", body: "Geist 400 · 14 / 1.55" },
    { plat: "Darwin", platTag: "darwin", fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: "SF Pro Display · 22 / -2.5%", body: "SF Pro Text · 13 / 1.45" },
    { plat: "iOS", platTag: "ios", fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: "SF Pro Display · 34 / -2%", body: "SF Pro Text · 17 / 1.4" },
    { plat: "iPadOS", platTag: "ipad", fontFamily: '-apple-system, "SF Pro Text", sans-serif', display: "SF Pro Display · 26 / -2.5%", body: "SF Pro Text · 15 / 1.45" },
  ];
  return (
    <section>
      <SectionTitle eyebrow="TYPE" title="The same words, four times" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 14 }}>
        {samples.map((s) => (
          <div key={s.plat} {...(s.platTag ? { "data-platform": s.platTag } : {})} style={{
            padding: 18, background: "var(--ink-2)",
            border: "1px solid var(--line-1)", borderRadius: 8,
            fontFamily: s.fontFamily,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{
              fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
              color: "var(--brand-300)", textTransform: "uppercase",
            }}>{s.plat}</div>
            <div style={{
              fontFamily: s.platTag ? "var(--font-display)" : s.fontFamily,
              fontSize: s.platTag === "ios" ? 28 : s.platTag === "ipad" ? 22 : s.platTag === "darwin" ? 19 : 26,
              fontWeight: 700, letterSpacing: "-0.025em",
              color: "var(--fg-0)", lineHeight: 1.05,
            }}>
              Good morning, Sam.
            </div>
            <p style={{
              fontSize: s.platTag === "ios" ? 15 : s.platTag === "ipad" ? 13.5 : s.platTag === "darwin" ? 12 : 13.5,
              lineHeight: s.platTag === "darwin" ? 1.45 : 1.5,
              color: "var(--fg-2)", margin: 0,
            }}>
              <span className="editorial" style={{ fontStyle: "italic", color: "var(--fg-1)" }}>Quiet night.</span>{" "}
              One thing needs you, two I handled, four I'm watching. Here's the brief.
            </p>
            <div style={{
              fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)",
              marginTop: "auto", paddingTop: 6, borderTop: "1px solid var(--line-1)",
            }}>
              <div>display · {s.display}</div>
              <div>body · {s.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilesChromeRules() {
  const rules = [
    {
      plat: "Darwin",
      body: "Unified toolbar with traffic lights and segmented control. NSVisualEffectView vibrancy on the sidebar. ⌘-key shortcuts visible on hover. 30px row height. Status bar at the bottom shows version + Vi connection.",
      forbid: "No big rounded buttons. No bottom tab bar. No large titles.",
    },
    {
      plat: "iOS",
      body: "Large title navigation bar. Grouped-inset tables (14px radius). Tab bar pinned to bottom with 4 destinations. Sheets for detail. 44pt minimum hit targets. Home indicator preserved.",
      forbid: "No sidebar. No keyboard shortcuts. No menu bars.",
    },
    {
      plat: "iPadOS",
      body: "Three-column split view: primary sidebar, secondary list, detail. Toolbar shows ⌘-shortcuts because external keyboards are common. Density between Darwin and iOS — comfortable for both touch and trackpad.",
      forbid: "No tab bar. No native iPhone-style navigation.",
    },
  ];
  return (
    <section>
      <SectionTitle eyebrow="CHROME" title="Platform grammar — what each surface owes the user" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {rules.map((r) => (
          <div key={r.plat} style={{
            padding: 18, background: "var(--ink-2)",
            border: "1px solid var(--line-1)", borderRadius: 8,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 16, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.015em",
            }}>{r.plat}</div>
            <p style={{ fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.5, margin: 0 }}>{r.body}</p>
            <div style={{
              fontSize: 12, color: "var(--warning-400)",
              padding: "8px 10px", borderRadius: 6,
              background: "color-mix(in oklch, var(--warning-500) 10%, transparent)",
              border: "1px solid color-mix(in oklch, var(--warning-500) 22%, transparent)",
              lineHeight: 1.45,
            }}>
              <strong style={{ fontWeight: 600 }}>Don't:</strong> {r.forbid}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfilesComponentContrast() {
  // Same logical "Renew now / Cancel" pair, three platforms.
  return (
    <section>
      <SectionTitle eyebrow="COMPONENTS" title="Same intent, native expression" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
        {/* Web */}
        <ContrastFrame label="Web · default">
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary">Renew now</button>
            <button className="btn btn-ghost">Cancel</button>
          </div>
        </ContrastFrame>

        {/* Darwin */}
        <ContrastFrame label="Darwin · NSToolbar action" platTag="darwin">
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{
              height: 22, padding: "0 10px", fontSize: 11.5, borderRadius: 4,
              background: "var(--brand-500)", color: "var(--fg-0)",
              border: "1px solid var(--brand-400)", fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>Renew now <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.7 }}>⌘1</kbd></button>
            <button style={{
              height: 22, padding: "0 10px", fontSize: 11.5, borderRadius: 4,
              background: "var(--ink-3)", color: "var(--fg-1)",
              border: "1px solid var(--line-1)",
            }}>Cancel <kbd style={{ fontFamily: "var(--font-mono)", fontSize: 10, opacity: 0.7, marginLeft: 4 }}>⎋</kbd></button>
          </div>
        </ContrastFrame>

        {/* iOS */}
        <ContrastFrame label="iOS · sheet primary action" platTag="ios">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <button style={{
              height: 50, borderRadius: 12,
              background: "var(--brand-500)", color: "var(--fg-0)",
              border: "none", fontSize: 17, fontWeight: 600,
            }}>Renew now</button>
            <button style={{
              height: 50, borderRadius: 12,
              background: "var(--ink-3)", color: "var(--brand-300)",
              border: "none", fontSize: 17, fontWeight: 500,
            }}>Cancel</button>
          </div>
        </ContrastFrame>
      </div>
    </section>
  );
}

function ContrastFrame({ label, platTag, children }) {
  return (
    <div {...(platTag ? { "data-platform": platTag } : {})} style={{
      padding: 22,
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)", borderRadius: 8,
      display: "flex", flexDirection: "column", gap: 14,
      minHeight: 160,
    }}>
      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
        color: "var(--brand-300)", textTransform: "uppercase",
      }}>{label}</div>
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--ink-1)", borderRadius: 6,
        border: "1px solid var(--line-1)", padding: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {eyebrow}
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 600, letterSpacing: "-0.022em",
        color: "var(--fg-0)", marginTop: 4,
      }}>{title}</h2>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Native window frames — minimal device chrome wrappers.
// We deliberately don't reuse macos-window.jsx's Tahoe glass
// here because that was for a real macOS Tahoe sample —
// this is OUR app, in OUR brand, in a Wails-style window.
// ─────────────────────────────────────────────────────────
function DarwinWindowFrame({ width = 1280, height = 820, children }) {
  return (
    <div style={{
      width, height,
      borderRadius: 12,
      overflow: "hidden",
      background: "var(--ink-0)",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 24px 60px rgba(0,0,0,0.45)",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {children}
    </div>
  );
}

function IOSDeviceFrame({ width = 402, height = 874, children }) {
  // Bezel-less; relies on the artboard scale. Mostly for the
  // status bar + home indicator handled inside ControlPanelIOS.
  return (
    <div style={{
      width, height,
      borderRadius: 50,
      overflow: "hidden",
      background: "#000",
      padding: 11,
      boxShadow: "0 0 0 1.5px #2a2a2e, 0 24px 60px rgba(0,0,0,0.55)",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 40, overflow: "hidden",
        background: "var(--ink-0)", position: "relative",
      }}>
        {/* Dynamic Island */}
        <div style={{
          position: "absolute", top: 11, left: "50%", transform: "translateX(-50%)",
          width: 124, height: 36, borderRadius: 999, background: "#000", zIndex: 30,
        }} />
        {children}
      </div>
    </div>
  );
}

function IPadDeviceFrame({ width = 1180, height = 820, children }) {
  return (
    <div style={{
      width, height,
      borderRadius: 24,
      overflow: "hidden",
      background: "#1a1a1f",
      padding: 10,
      boxShadow: "0 0 0 1.5px #2a2a2e, 0 24px 60px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 16, overflow: "hidden",
        background: "var(--ink-0)", position: "relative",
      }}>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  ControlPanelDarwin, ControlPanelIOS, ControlPanelIPad,
  NativeProfilesReference,
  DarwinWindowFrame, IOSDeviceFrame, IPadDeviceFrame,
});
