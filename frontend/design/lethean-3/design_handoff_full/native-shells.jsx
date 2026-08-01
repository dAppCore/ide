/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Cross-device Account / Settings — proves the system holds.
// One <AccountSettings> body, dropped into:
//   • macOS Wails window  (desktop · Linear-density)
//   • iOS device frame    (touch · safe areas)
//   • Android device      (touch · system back · bespoke)
//   • Browser tab         (web mode for comparison)
//
// `surface` prop drives platform affordances:
//   - "desktop"  → keyboard hints (⌘K), tighter rows, hover states, status bar
//   - "ios"      → larger touch targets, segmented control, no hover
//   - "android"  → larger touch targets, system back, FAB
//   - "web"      → desktop-density but in a browser tab — no native chrome
// ─────────────────────────────────────────────────────────

/* ── Sample data, brand-aware  ─────────────────────────── */
const ACCOUNT_DATA = {
  user: { name: "Ada Patel", email: "ada@northnotes.co.uk", initials: "AP" },
  workspace: "North Notes Ltd",
  plan: "Standard · annual",
  renews: "14 Mar 2027",
  twoFA: true,
  notifications: { email: true, push: false, slack: true },
};

/* ── Body — same on every surface, density-aware ────────── */
function AccountSettings({ surface = "desktop", brand = "hostuk" }) {
  const dense = surface === "desktop" || surface === "web";
  const touch = surface === "ios" || surface === "android";
  const padX = dense ? 28 : 18;
  const rowH = touch ? 56 : 44;
  const fontBody = touch ? 15 : 13.5;

  const sections = [
    {
      tag: "Profile",
      rows: [
        { label: "Name", value: ACCOUNT_DATA.user.name, action: "edit" },
        { label: "Email", value: ACCOUNT_DATA.user.email, action: "edit" },
        { label: "Workspace", value: ACCOUNT_DATA.workspace, action: "switch" },
        { label: "Avatar", value: <div style={{ width: 28, height: 28, borderRadius: 999, background: "var(--brand-500)", color: "var(--fg-0)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 500 }}>{ACCOUNT_DATA.user.initials}</div>, action: "change" },
      ],
    },
    {
      tag: "Security",
      rows: [
        { label: "Two-factor authentication", value: <span className="pill pill-success" style={{ fontSize: 11 }}>On · Authenticator</span>, action: "manage" },
        { label: "Recovery codes", value: <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>10 unused</span>, action: "view" },
        { label: "Active sessions", value: <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>3 devices</span>, action: "review" },
      ],
    },
    {
      tag: "Subscription",
      rows: [
        { label: "Current plan", value: ACCOUNT_DATA.plan, action: "change" },
        { label: "Renews", value: <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>{ACCOUNT_DATA.renews} · £144/yr</span>, action: null },
        { label: "Payment method", value: <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>Visa · 4242</span>, action: "update" },
      ],
    },
    {
      tag: "Notifications",
      rows: [
        { label: "Email alerts", toggle: ACCOUNT_DATA.notifications.email },
        { label: "Push (mobile)", toggle: ACCOUNT_DATA.notifications.push },
        { label: "Slack channel", toggle: ACCOUNT_DATA.notifications.slack },
      ],
    },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--ink-1)",
      width: "100%", height: "100%",
      overflow: "hidden",
    }}>
      {/* Page header */}
      <div style={{
        padding: dense ? "20px 28px 16px" : "16px 18px 12px",
        borderBottom: "1px solid var(--line-1)",
        display: "flex", flexDirection: "column", gap: 4,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 11, fontFamily: "var(--font-mono)",
          color: "var(--fg-4)", letterSpacing: "0.06em",
        }}>
          {dense ? "ACCOUNT · SETTINGS" : "Settings"}
        </div>
        {dense ? (
          <h1 style={{ fontSize: 22, letterSpacing: "-0.02em", color: "var(--fg-0)" }}>Account settings</h1>
        ) : (
          <div style={{ fontSize: 22, color: "var(--fg-0)", fontWeight: 600, letterSpacing: "-0.015em" }}>Settings</div>
        )}
      </div>

      {/* Scroll body */}
      <div style={{ flex: 1, overflow: "auto", padding: dense ? "20px 0 32px" : "12px 0 100px" }}>
        {sections.map((s, idx) => (
          <SettingsSection key={s.tag} tag={s.tag} dense={dense} touch={touch} padX={padX} first={idx === 0}>
            {s.rows.map((r, i) => (
              <SettingsRow
                key={i} {...r}
                rowH={rowH} fontBody={fontBody} surface={surface}
                isLast={i === s.rows.length - 1}
              />
            ))}
          </SettingsSection>
        ))}

        {/* Danger zone */}
        <div style={{ padding: dense ? "16px 28px 0" : "16px 18px 0" }}>
          <div style={{
            background: "color-mix(in oklch, var(--danger-500) 6%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--danger-500) 30%, var(--line-2))",
            borderRadius: dense ? 8 : 12,
            padding: dense ? "14px 16px" : "16px 18px",
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: dense ? 13 : 14.5, color: "var(--fg-0)", fontWeight: 500 }}>Export & close account</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>GDPR-compliant data export. Deletes after 30 days.</div>
            </div>
            <button style={{
              background: "transparent",
              border: "1px solid color-mix(in oklch, var(--danger-500) 50%, var(--line-2))",
              color: "var(--danger-400)",
              padding: dense ? "6px 12px" : "10px 16px",
              borderRadius: dense ? 6 : 10,
              fontSize: dense ? 12.5 : 14, fontWeight: 500, whiteSpace: "nowrap",
            }}>Request export</button>
          </div>
        </div>
      </div>

      {/* Surface-specific footer chrome */}
      {surface === "desktop" && <DesktopStatusBar />}
    </div>
  );
}

function SettingsSection({ tag, children, dense, touch, padX, first }) {
  return (
    <section style={{
      marginTop: first ? 0 : (dense ? 22 : 28),
      padding: dense ? `0 ${padX}px` : 0,
    }}>
      <div style={{
        fontSize: 11, fontFamily: "var(--font-mono)",
        color: "var(--fg-4)", letterSpacing: "0.08em",
        padding: dense ? "0 4px 8px" : `4px ${padX}px 8px`,
      }}>
        {tag.toUpperCase()}
      </div>
      <div style={{
        background: "var(--ink-2)",
        border: dense ? "1px solid var(--line-1)" : "1px solid var(--line-1)",
        borderLeft: touch ? "none" : "1px solid var(--line-1)",
        borderRight: touch ? "none" : "1px solid var(--line-1)",
        borderRadius: touch ? 0 : 10,
        overflow: "hidden",
      }}>
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ label, value, action, toggle, rowH, fontBody, isLast, surface }) {
  const dense = surface === "desktop" || surface === "web";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: dense ? "180px 1fr auto" : "1fr auto",
      alignItems: "center",
      minHeight: rowH,
      padding: dense ? "0 14px" : "0 18px",
      borderBottom: isLast ? "none" : "1px solid var(--line-1)",
      gap: 12,
    }}>
      <div style={{
        fontSize: fontBody,
        color: dense ? "var(--fg-2)" : "var(--fg-0)",
        fontWeight: dense ? 400 : 400,
      }}>{label}</div>

      {dense && (
        <div style={{ fontSize: fontBody, color: "var(--fg-0)", display: "flex", alignItems: "center", gap: 10 }}>
          {toggle === undefined ? value : null}
        </div>
      )}

      {!dense && value !== undefined && toggle === undefined && (
        <div style={{ fontSize: 13.5, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 8 }}>
          {value}
          {action && <Icon name="chevron-right" size={11} color="var(--fg-4)" />}
        </div>
      )}

      {toggle !== undefined && (
        <ToggleSwitch on={toggle} surface={surface} />
      )}

      {dense && action && (
        <button style={{
          background: "transparent",
          border: "1px solid var(--line-2)",
          color: "var(--fg-1)",
          padding: "4px 10px",
          borderRadius: 5,
          fontSize: 12,
        }}>{action}</button>
      )}
    </div>
  );
}

function ToggleSwitch({ on, surface }) {
  const w = surface === "android" ? 46 : 44;
  const h = surface === "android" ? 26 : 24;
  const knob = h - 4;
  return (
    <div style={{
      width: w, height: h, borderRadius: 999,
      background: on ? "var(--brand-500)" : "var(--ink-4)",
      border: "1px solid " + (on ? "var(--brand-400)" : "var(--line-2)"),
      position: "relative",
      transition: "background 120ms ease",
      cursor: "pointer",
    }}>
      <div style={{
        position: "absolute",
        top: 1, left: on ? w - knob - 3 : 1,
        width: knob, height: knob,
        borderRadius: 999,
        background: "var(--fg-0)",
        boxShadow: "0 1px 2px rgba(0,0,0,.3)",
        transition: "left 120ms ease",
      }} />
    </div>
  );
}

/* ── Desktop status bar (Linear-style) ──────────────────── */
function DesktopStatusBar() {
  return (
    <div style={{
      height: 28, flexShrink: 0,
      borderTop: "1px solid var(--line-1)",
      background: "var(--ink-2)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 14px",
      fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)",
    }}>
      <div style={{ display: "flex", gap: 14 }}>
        <span><Icon name="circle-check" size={9} color="var(--success-400)" /> Synced · 14:02</span>
        <span style={{ color: "var(--fg-4)" }}>·</span>
        <span>v0.42.7</span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "var(--fg-4)" }}>Press</span>
        <kbd style={{ padding: "1px 6px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 3, fontSize: 10 }}>⌘K</kbd>
        <span style={{ color: "var(--fg-4)" }}>for Vi</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FRAMES — wrap AccountSettings in macOS / iOS / Android / browser
   ─────────────────────────────────────────────────────── */

/* ── macOS desktop · Wails / Lethean Desktop ─────────────── */
function DesktopAccountFrame({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid var(--line-2)",
      boxShadow: "var(--shadow-3)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Wails titlebar */}
      <div style={{
        height: 38, flexShrink: 0,
        background: "var(--ink-2)",
        borderBottom: "1px solid var(--line-1)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        padding: "0 12px",
        WebkitAppRegion: "drag",
      }}>
        {/* traffic lights */}
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 999, background: "#ff5f57", border: "0.5px solid rgba(0,0,0,0.2)" }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: "#febc2e", border: "0.5px solid rgba(0,0,0,0.2)" }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: "#28c840", border: "0.5px solid rgba(0,0,0,0.2)" }} />
        </div>
        {/* title */}
        <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--fg-2)", letterSpacing: "-0.005em" }}>
          {brand === "hostuk" ? "Host UK" : brand === "lethean" ? "Lethean" : "OFM"} Desktop · Account
        </div>
        {/* command-bar shortcut */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          <kbd style={{ padding: "1px 6px", background: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 3 }}>⌘K</kbd>
          <span>Search</span>
        </div>
      </div>

      {/* Window body — sidebar + content */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr", overflow: "hidden" }}>
        <DesktopSidebar brand={brand} active="account" />
        <AccountSettings surface="desktop" brand={brand} />
      </div>
    </div>
  );
}

function DesktopSidebar({ brand, active }) {
  const groups = [
    {
      title: "Workspace",
      items: [
        { id: "dashboard", label: "Dashboard", icon: "house", k: "G D" },
        { id: "sites", label: "Sites", icon: "globe", k: "G S", count: 3 },
        { id: "domains", label: "Domains", icon: "at", k: "G N", count: 4 },
        { id: "mail", label: "Mailboxes", icon: "envelope", k: "G M", count: 5 },
      ],
    },
    {
      title: "Vi",
      items: [
        { id: "agent", label: "Agent activity", icon: "sparkles", k: "G A" },
        { id: "policies", label: "Policies", icon: "shield-halved", k: "G P" },
        { id: "logs", label: "Audit log", icon: "scroll", k: "G L" },
      ],
    },
    {
      title: "You",
      items: [
        { id: "account", label: "Account", icon: "user", k: "," },
        { id: "billing", label: "Billing", icon: "receipt", k: "G B" },
        { id: "team", label: "Team", icon: "users", k: "G T" },
      ],
    },
  ];

  return (
    <aside style={{
      background: "var(--ink-0)",
      borderRight: "1px solid var(--line-1)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Workspace switcher */}
      <button style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        margin: "8px 8px 4px",
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: 6,
        textAlign: "left",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4,
          background: "var(--brand-500)",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 600, color: "var(--fg-0)",
        }}>NN</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: "var(--fg-0)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>North Notes</div>
          <div style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>Standard · 3 sites</div>
        </div>
        <Icon name="chevron-down" size={9} color="var(--fg-4)" />
      </button>

      <div style={{ flex: 1, overflow: "auto", padding: "8px 4px" }}>
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div style={{
              padding: "6px 12px 4px",
              fontSize: 10.5, fontFamily: "var(--font-mono)",
              color: "var(--fg-4)", letterSpacing: "0.08em",
            }}>{g.title.toUpperCase()}</div>
            {g.items.map((it) => (
              <button key={it.id} style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: "5px 12px",
                background: active === it.id ? "var(--ink-3)" : "transparent",
                color: active === it.id ? "var(--fg-0)" : "var(--fg-2)",
                border: "none",
                borderRadius: 4,
                textAlign: "left",
                margin: "1px 4px",
                fontSize: 12.5,
                fontWeight: active === it.id ? 500 : 400,
              }}>
                <Icon name={it.icon} size={11} color={active === it.id ? "var(--brand-300)" : "var(--fg-3)"} />
                <span>{it.label}</span>
                {it.count !== undefined ? (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>{it.count}</span>
                ) : (
                  <span style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>{it.k}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Vi dock at bottom */}
      <div style={{
        padding: "10px 12px",
        borderTop: "1px solid var(--line-1)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
          overflow: "hidden", position: "relative",
        }}>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", marginTop: 6 }}>
            <Vi pose="master" size={32} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: "var(--fg-1)" }}>Vi · idle</div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>watching 3 sites</div>
        </div>
        <Icon name="circle" size={6} color="var(--success-400)" />
      </div>
    </aside>
  );
}

/* ── iOS account ─────────────────────────────────────── */
function IOSAccountFrame({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", height: "100%", background: "var(--ink-0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* iOS status bar */}
      <div style={{
        height: 47, flexShrink: 0,
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 28px",
        fontSize: 15, fontWeight: 600, color: "var(--fg-0)",
      }}>
        <span style={{ textAlign: "left", fontFamily: '-apple-system, "SF Pro Display", system-ui' }}>9:41</span>
        <span style={{ width: 96, height: 30, background: "#000", borderRadius: 18 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, alignItems: "center" }}>
          <Icon name="signal" size={13} color="var(--fg-0)" />
          <Icon name="wifi" size={13} color="var(--fg-0)" />
          <span style={{ fontSize: 11, color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>87%</span>
          <span style={{ width: 24, height: 11, border: "1.5px solid var(--fg-0)", borderRadius: 3, position: "relative" }}>
            <span style={{ position: "absolute", inset: 1.5, width: "82%", background: "var(--fg-0)", borderRadius: 1 }} />
          </span>
        </div>
      </div>

      {/* Nav bar */}
      <div style={{
        padding: "8px 18px 12px",
        borderBottom: "1px solid var(--line-1)",
        display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 8,
        flexShrink: 0,
      }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "transparent", border: "none",
          color: "var(--brand-300)", fontSize: 16, padding: 0,
        }}>
          <Icon name="chevron-left" size={14} /> Workspace
        </button>
        <span />
        <button style={{ background: "transparent", border: "none", color: "var(--brand-300)", fontSize: 16 }}>Edit</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <AccountSettings surface="ios" brand={brand} />
      </div>

      {/* iOS tab bar */}
      <IOSTabBar active="account" />

      {/* Home indicator */}
      <div style={{ height: 34, flexShrink: 0, background: "var(--ink-0)", display: "grid", placeItems: "center" }}>
        <span style={{ width: 134, height: 5, borderRadius: 3, background: "var(--fg-0)" }} />
      </div>
    </div>
  );
}

function IOSTabBar({ active }) {
  const tabs = [
    { id: "home", label: "Home", icon: "house" },
    { id: "sites", label: "Sites", icon: "globe" },
    { id: "vi", label: "Vi", icon: "sparkles" },
    { id: "inbox", label: "Inbox", icon: "envelope" },
    { id: "account", label: "Account", icon: "user" },
  ];
  return (
    <nav style={{
      flexShrink: 0,
      borderTop: "1px solid var(--line-1)",
      background: "color-mix(in oklch, var(--ink-1) 80%, transparent)",
      backdropFilter: "blur(20px)",
      display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
      padding: "8px 0 4px",
    }}>
      {tabs.map((t) => (
        <button key={t.id} style={{
          background: "transparent", border: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: 4,
          color: active === t.id ? "var(--brand-300)" : "var(--fg-3)",
        }}>
          <Icon name={t.icon} size={20} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ── Android account · bespoke (not Material) ───────────── */
function AndroidAccountFrame({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{ width: "100%", height: "100%", background: "var(--ink-0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* status bar */}
      <div style={{
        height: 32, flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px",
        fontSize: 13, fontFamily: "var(--font-sans)", color: "var(--fg-0)", fontWeight: 500,
      }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Icon name="signal" size={11} color="var(--fg-0)" />
          <Icon name="wifi" size={11} color="var(--fg-0)" />
          <span style={{ width: 22, height: 10, border: "1.5px solid var(--fg-0)", borderRadius: 2, position: "relative" }}>
            <span style={{ position: "absolute", inset: 1, width: "70%", background: "var(--fg-0)" }} />
          </span>
        </div>
      </div>

      {/* App bar */}
      <div style={{
        padding: "12px 16px 14px",
        borderBottom: "1px solid var(--line-1)",
        display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <button style={{ background: "transparent", border: "none", padding: 4 }}>
          <Icon name="arrow-left" size={20} color="var(--fg-0)" />
        </button>
        <span style={{ fontSize: 18, color: "var(--fg-0)", fontWeight: 500 }}>Account</span>
        <button style={{ background: "transparent", border: "none", padding: 4 }}>
          <Icon name="magnifying-glass" size={18} color="var(--fg-0)" />
        </button>
        <button style={{ background: "transparent", border: "none", padding: 4 }}>
          <Icon name="ellipsis-vertical" size={18} color="var(--fg-0)" />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <AccountSettings surface="android" brand={brand} />
      </div>

      {/* Android nav bar (gesture pill, not three-button) */}
      <div style={{
        height: 24, flexShrink: 0, background: "var(--ink-0)",
        display: "grid", placeItems: "center",
      }}>
        <span style={{ width: 104, height: 4, borderRadius: 2, background: "var(--fg-1)" }} />
      </div>
    </div>
  );
}

/* ── Web mode · same screen, in a browser tab ────────────── */
function WebAccountFrame({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      borderRadius: 12, overflow: "hidden",
      border: "1px solid var(--line-2)",
      boxShadow: "var(--shadow-3)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Browser chrome */}
      <div style={{
        background: "var(--ink-2)",
        borderBottom: "1px solid var(--line-1)",
        flexShrink: 0,
      }}>
        {/* tab bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 0" }}>
          <div style={{ display: "flex", gap: 6, marginRight: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: 999, background: "#ff5f57" }} />
            <span style={{ width: 11, height: 11, borderRadius: 999, background: "#febc2e" }} />
            <span style={{ width: 11, height: 11, borderRadius: 999, background: "#28c840" }} />
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px 6px 10px",
            background: "var(--ink-1)",
            borderRadius: "8px 8px 0 0",
            fontSize: 12, color: "var(--fg-0)",
            border: "1px solid var(--line-1)",
            borderBottom: "none",
          }}>
            <span style={{ width: 12, height: 12, background: "var(--brand-500)", borderRadius: 2 }} />
            <span>Account · Host UK</span>
            <Icon name="xmark" size={9} color="var(--fg-4)" />
          </div>
          <div style={{
            padding: "6px 14px",
            fontSize: 12, color: "var(--fg-3)",
          }}>
            + new tab
          </div>
        </div>
        {/* URL bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px 10px" }}>
          <Icon name="chevron-left" size={11} color="var(--fg-3)" />
          <Icon name="chevron-right" size={11} color="var(--fg-4)" />
          <Icon name="rotate-right" size={11} color="var(--fg-3)" />
          <div style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 12px",
            background: "var(--ink-1)",
            border: "1px solid var(--line-1)",
            borderRadius: 999,
            fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-1)",
          }}>
            <Icon name="lock" size={10} color="var(--success-400)" />
            <span style={{ color: "var(--fg-4)" }}>https://</span>
            <span>app.host.uk.com<span style={{ color: "var(--fg-3)" }}>/account/settings</span></span>
          </div>
          <Icon name="bookmark" size={12} color="var(--fg-3)" />
        </div>
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "220px 1fr", overflow: "hidden" }}>
        <DesktopSidebar brand={brand} active="account" />
        <AccountSettings surface="web" brand={brand} />
      </div>
    </div>
  );
}

/* ── Empty state · same body, every surface ──────────────── */
function EmptyAccountState({ surface = "desktop", brand = "hostuk" }) {
  const dense = surface === "desktop" || surface === "web";
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-1)",
      display: "grid", placeItems: "center",
      padding: dense ? "48px 56px" : "32px 24px",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 420 }}>
        <div style={{
          width: dense ? 120 : 100, height: dense ? 120 : 100,
          borderRadius: 16,
          background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2))",
          display: "grid", placeItems: "center",
          overflow: "hidden", position: "relative",
        }}>
          <Vi pose="master" size={dense ? 140 : 120} style={{ marginTop: 16 }} />
        </div>
        <h2 style={{ fontSize: dense ? 22 : 24, letterSpacing: "-0.02em" }}>It's just us in here.</h2>
        <p style={{ fontSize: dense ? 14 : 15, color: "var(--fg-2)", lineHeight: 1.55 }}>
          You haven't added a payment method or a site yet. I'll walk you through it — takes about three minutes,
          and you can stop me at any point.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button className="btn btn-primary btn-lg">Set up with Vi</button>
          <button className="btn btn-secondary btn-lg">I'll do it myself</button>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginTop: 8 }}>
          Same Vi, same words, every device.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AccountSettings,
  DesktopAccountFrame,
  IOSAccountFrame,
  AndroidAccountFrame,
  WebAccountFrame,
  EmptyAccountState,
});
