/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Lethean landing — lthn.ai
// Confident-technical. Type-led. Terminal motif. Instrument
// Serif italic for the manifesto pull-quote. Vi appears as
// the studio mascot — same character, calmer pose.
// Dark by default; pass mode="light" to flip the same layout.
// ─────────────────────────────────────────────────────────

function LetheanLanding({ mode = "dark" }) {
  return (
    <div data-brand="lethean" data-mode={mode} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: 0,
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans)",
    }}>
      <LetheanNav mode={mode} />
      <LetheanHero mode={mode} />
      <LetheanProofStrip />
      <LetheanArchitecture />
      <LetheanManifesto />
      <LetheanProductGrid />
      <LetheanCTA />
      <LetheanFooter mode={mode} />
    </div>
  );
}

/* ── nav ─────────────────────────────────────────────── */
function LetheanNav({ mode }) {
  return (
    <header style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "20px 56px",
      borderBottom: "1px solid var(--line-1)",
      position: "sticky", top: 0, zIndex: 10,
      background: mode === "light"
        ? "color-mix(in oklch, var(--ink-0) 85%, transparent)"
        : "color-mix(in oklch, var(--ink-0) 80%, transparent)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <LetheanWordmark />
        <nav style={{ display: "flex", gap: 22, fontSize: 13, color: "var(--fg-2)" }}>
          <a>Agent</a>
          <a>Infrastructure</a>
          <a>Open source</a>
          <a>Docs</a>
          <a>Pricing</a>
          <a>Company</a>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <a style={{ fontSize: 12.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="fa-brands fa-github" style={{ fontSize: 12 }} /> github.com/lethean
        </a>
        <button className="btn btn-ghost btn-sm">Sign in</button>
        <button className="btn btn-primary btn-sm">Start hosted trial</button>
      </div>
    </header>
  );
}

function LetheanWordmark() {
  // mark = a small filled square + "lethean" lowercase, mono-ish weight
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 18, height: 18,
        background: "var(--brand-500)",
        borderRadius: 4,
        position: "relative",
        boxShadow: "inset 0 1px 0 var(--line-2)",
      }}>
        <div style={{
          position: "absolute", inset: 4,
          background: "var(--ink-0)",
          borderRadius: 1,
        }} />
        <div style={{
          position: "absolute", left: 7, top: 7, width: 4, height: 4,
          background: "var(--brand-300)",
          borderRadius: 1,
        }} />
      </div>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 15,
        color: "var(--fg-0)",
        letterSpacing: "-0.02em",
        fontWeight: 500,
      }}>lethean</span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-4)",
        marginLeft: -4,
      }}>.ai</span>
    </div>
  );
}

/* ── hero ────────────────────────────────────────────── */
function LetheanHero({ mode }) {
  return (
    <section style={{
      padding: "72px 56px 40px",
      display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 64,
      alignItems: "center",
      position: "relative",
    }}>
      {/* Left — type-led */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 12px",
          background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
          borderRadius: "var(--r-pill)",
          fontSize: 11.5,
          color: "var(--brand-200)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.04em",
          alignSelf: "flex-start",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--brand-300)", boxShadow: "0 0 8px var(--brand-400)" }} />
          EUPL-1.2 · core/agent v0.42
        </div>

        <h1 style={{
          fontSize: 64,
          letterSpacing: "-0.04em",
          lineHeight: 1.02,
          color: "var(--fg-0)",
        }}>
          Open source AI<br />
          infrastructure,{" "}
          <span className="editorial" style={{
            fontStyle: "italic",
            color: "var(--brand-200)",
            fontSize: 66,
            letterSpacing: "-0.025em",
          }}>built ethically.</span>
        </h1>

        <p style={{
          fontSize: 18,
          color: "var(--fg-2)",
          lineHeight: 1.5,
          maxWidth: 540,
        }}>
          The agent runtime, observability stack, and tenant model
          we use to run Host UK — released as open source under EUPL-1.2.
          Self-host the lot, or pay us to run it for you.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <button className="btn btn-primary btn-lg">
            <Icon name="terminal" size={13} />
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 13.5 }}>brew install lethean</code>
          </button>
          <button className="btn btn-secondary btn-lg">
            Read the architecture
            <Icon name="arrow-right" size={11} />
          </button>
        </div>

        <div style={{
          display: "flex", gap: 22, marginTop: 8,
          fontSize: 12, color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
        }}>
          <span><Icon name="circle-check" size={11} color="var(--success-400)" /> EUPL-1.2</span>
          <span><Icon name="circle-check" size={11} color="var(--success-400)" /> No CLA</span>
          <span><Icon name="circle-check" size={11} color="var(--success-400)" /> UK / EU sovereign hosting</span>
        </div>
      </div>

      {/* Right — terminal motif */}
      <LetheanTerminal />
    </section>
  );
}

function LetheanTerminal() {
  return (
    <div style={{
      background: "var(--ink-1)",
      border: "1px solid var(--line-2)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--shadow-3)",
      position: "relative",
    }}>
      {/* terminal header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px",
        background: "var(--ink-2)",
        borderBottom: "1px solid var(--line-1)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 11, height: 11, borderRadius: 999, background: "color-mix(in oklch, var(--danger-500) 70%, var(--ink-3))" }} />
          <span style={{ width: 11, height: 11, borderRadius: 999, background: "color-mix(in oklch, var(--warning-500) 70%, var(--ink-3))" }} />
          <span style={{ width: 11, height: 11, borderRadius: 999, background: "color-mix(in oklch, var(--success-500) 70%, var(--ink-3))" }} />
        </div>
        <div style={{ flex: 1, textAlign: "center", fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
          ~/lethean-agent — zsh — 92×24
        </div>
      </div>
      {/* terminal body */}
      <div style={{
        padding: "18px 20px",
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        lineHeight: 1.65,
        color: "var(--fg-1)",
        background: "var(--ink-1)",
      }}>
        <TermLine prompt user="ada" host="vivian">
          <span style={{ color: "var(--fg-1)" }}>lethean agent run --tenant=acme --policy=strict</span>
        </TermLine>
        <TermLine>
          <span style={{ color: "var(--brand-200)" }}>→</span> loading core/agent v0.42 <span style={{ color: "var(--fg-4)" }}>(EUPL-1.2)</span>
        </TermLine>
        <TermLine>
          <span style={{ color: "var(--brand-200)" }}>→</span> tenant <span style={{ color: "var(--gold-400)" }}>acme</span> · workspace boundary verified
        </TermLine>
        <TermLine>
          <span style={{ color: "var(--brand-200)" }}>→</span> policy <span style={{ color: "var(--gold-400)" }}>strict</span> · 14 capabilities allow-listed
        </TermLine>
        <TermLine>
          <span style={{ color: "var(--success-400)" }}>✓</span> agent ready · <span style={{ color: "var(--fg-3)" }}>listening on tenant socket</span>
        </TermLine>
        <div style={{ height: 10 }} />
        <TermLine prompt user="ada" host="vivian">
          <span>lethean trace --last 5m</span>
        </TermLine>
        <div style={{
          marginTop: 6, padding: "10px 12px",
          background: "var(--ink-0)",
          border: "1px solid var(--line-1)",
          borderRadius: 6,
          fontSize: 11.5,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", color: "var(--fg-4)", marginBottom: 6 }}>
            <span>TIME</span><span>CALL</span><span style={{ textAlign: "right" }}>MS</span>
          </div>
          {[
            ["09:42:18", "agent.plan() → policy.check(write_dns)", "12"],
            ["09:42:18", "tools.dns.create(zone=acme.host.uk.com)", "184"],
            ["09:42:19", "agent.observe() → cert.issued", "31"],
            ["09:42:19", "tenant.audit_log.append(actor=vi)", "8"],
            ["09:42:20", "agent.report() → 'site live · ready'", "14"],
          ].map(([t, c, ms], i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", color: "var(--fg-2)", padding: "2px 0" }}>
              <span style={{ color: "var(--fg-4)" }}>{t}</span>
              <span style={{ color: i === 4 ? "var(--success-400)" : "var(--fg-1)" }}>{c}</span>
              <span style={{ textAlign: "right", color: "var(--fg-3)" }}>{ms}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 8 }} />
        <TermLine prompt user="ada" host="vivian">
          <span style={{ display: "inline-block", width: 8, height: 14, background: "var(--brand-300)", marginLeft: 4, verticalAlign: "middle" }} />
        </TermLine>
      </div>
    </div>
  );
}

function TermLine({ children, prompt, user = "you", host = "host" }) {
  return (
    <div style={{ whiteSpace: "pre" }}>
      {prompt && (
        <span style={{ color: "var(--fg-4)" }}>
          <span style={{ color: "var(--brand-300)" }}>{user}</span>
          <span>@</span>
          <span style={{ color: "var(--gold-400)" }}>{host}</span>
          <span> $ </span>
        </span>
      )}
      {children}
    </div>
  );
}

/* ── proof strip ─────────────────────────────────────── */
function LetheanProofStrip() {
  return (
    <section style={{
      padding: "32px 56px",
      borderTop: "1px solid var(--line-1)",
      borderBottom: "1px solid var(--line-1)",
      background: "var(--ink-1)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 32, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-3)",
      }}>
        <span style={{ color: "var(--fg-4)" }}>RUNNING IN PRODUCTION AT</span>
        {["host.uk.com", "team.lthn.ai", "wiki.lthn.sh", "tasks.lthn.sh", "forge.lthn.ai"].map((d) => (
          <span key={d} style={{ color: "var(--fg-1)" }}>{d}</span>
        ))}
      </div>
    </section>
  );
}

/* ── architecture ────────────────────────────────────── */
function LetheanArchitecture() {
  return (
    <section style={{ padding: "80px 56px 48px" }}>
      <div style={{ maxWidth: 640, marginBottom: 48 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          THE ARCHITECTURE
        </div>
        <h2 style={{ fontSize: 38, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
          Three layers. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Same shape</span> as our hosted service.
        </h2>
        <p style={{ fontSize: 15, color: "var(--fg-2)", marginTop: 14, lineHeight: 1.6 }}>
          You can run the lot yourself, swap in your own substrates, or pay us to operate it.
          The line between "open source" and "managed service" is exactly the operational glue — never the product itself.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {[
          {
            tag: "L1 · core/agent",
            title: "The agent runtime",
            desc: "Plan → act → observe loop with policy gates and tenant scoping. Pluggable models (OpenAI, Anthropic, local).",
            rows: ["LLM provider · pluggable", "Policy engine · OPA-compatible", "Trace stream · OpenTelemetry"],
          },
          {
            tag: "L2 · core/tenant",
            title: "The multi-tenancy spine",
            desc: "BelongsToWorkspace trait, domain-routed boot, per-tenant keys + audit log. The thing that makes one server safely serve many customers.",
            rows: ["Workspace isolation", "Domain → tenant mapping", "Per-tenant audit log"],
          },
          {
            tag: "L3 · core/uptelligence",
            title: "The observability layer",
            desc: "Uptime, traces, billing-grade event log. What you'd build if you were also responsible for invoicing customers.",
            rows: ["Uptime probes · 30s", "Distributed traces", "Billable event log"],
          },
        ].map((l, i) => (
          <article key={i} style={{
            background: "var(--ink-2)",
            border: "1px solid var(--line-1)",
            borderRadius: 12,
            padding: 24,
            display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.06em" }}>{l.tag}</div>
            <h3 style={{ fontSize: 19, letterSpacing: "-0.02em" }}>{l.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>{l.desc}</p>
            <div className="divider" />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {l.rows.map((r) => (
                <li key={r} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                  <Icon name="circle" size={5} color="var(--brand-400)" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── manifesto ───────────────────────────────────────── */
function LetheanManifesto() {
  return (
    <section style={{
      padding: "96px 56px",
      background: "var(--ink-1)",
      borderTop: "1px solid var(--line-1)",
      borderBottom: "1px solid var(--line-1)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="brand-glow" style={{ position: "absolute", inset: 0, opacity: 0.5, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
        <div style={{
          width: 140, height: 140,
          borderRadius: 16,
          background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2))",
          display: "grid", placeItems: "center",
          overflow: "hidden",
          position: "relative",
        }}>
          <Vi pose="master" size={170} style={{ marginTop: 18 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 16 }}>
            VI · STUDIO MASCOT · OUR POSITION
          </div>
          <blockquote className="editorial" style={{
            fontStyle: "italic",
            fontSize: 36,
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            color: "var(--fg-0)",
            margin: 0,
          }}>
            "We don't think AI infrastructure should require handing the keys to your business
            to a frontier lab. So we wrote our own — and gave it away. The hosted service is for
            people who'd rather not run servers."
          </blockquote>
          <div style={{ marginTop: 18, fontSize: 13, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            — vi · the lethean agent · maintainer since v0.1
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── product grid ────────────────────────────────────── */
function LetheanProductGrid() {
  return (
    <section style={{ padding: "80px 56px 48px" }}>
      <div style={{ maxWidth: 640, marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em", marginBottom: 12 }}>
          WHAT YOU CAN RUN
        </div>
        <h2 style={{ fontSize: 32, letterSpacing: "-0.03em" }}>
          Use what you need. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Ignore the rest.</span>
        </h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {[
          { tag: "lthn.ai/agent", name: "Agent runtime", desc: "Self-host the same agent that runs Vi. Bring your own model.", cta: "Read agent docs" },
          { tag: "team.lthn.ai", name: "Branded chat", desc: "Mattermost, themed for your studio. Federated with the agent.", cta: "Open team.lthn.ai" },
          { tag: "wiki.lthn.sh", name: "Internal wiki", desc: "BookStack with our shell. Where we keep the runbooks.", cta: "Browse the wiki" },
          { tag: "forge.lthn.ai", name: "Source forge", desc: "Forgejo for the open-source code. PRs welcome.", cta: "Open the forge" },
        ].map((p, i) => (
          <article key={i} style={{
            background: "var(--ink-2)",
            border: "1px solid var(--line-1)",
            borderRadius: 12,
            padding: 22,
            display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", marginBottom: 6 }}>{p.tag}</div>
              <h3 style={{ fontSize: 16, letterSpacing: "-0.015em" }}>{p.name}</h3>
              <p style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4, lineHeight: 1.5 }}>{p.desc}</p>
            </div>
            <button className="btn btn-secondary btn-sm">
              {p.cta} <Icon name="arrow-right" size={10} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── CTA ─────────────────────────────────────────────── */
function LetheanCTA() {
  return (
    <section style={{ padding: "64px 56px" }}>
      <div style={{
        background: "var(--ink-2)",
        border: "1px solid var(--line-2)",
        borderRadius: 18,
        padding: 36,
        display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="brand-glow" style={{ position: "absolute", inset: 0, opacity: 0.7, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: 28, letterSpacing: "-0.025em", maxWidth: 520, lineHeight: 1.15 }}>
            Run it yourself. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Or let us run it for you.</span>
          </h2>
          <p style={{ fontSize: 14, color: "var(--fg-2)", marginTop: 8, maxWidth: 520, lineHeight: 1.55 }}>
            Hosted service starts at £180/month — UK or EU sovereign infrastructure, 24/7 on-call, 4-hour SLA. Or take the source and roll your own.
          </p>
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 10 }}>
          <button className="btn btn-primary btn-lg">Talk to us</button>
          <button className="btn btn-secondary btn-lg">
            <i className="fa-brands fa-github" style={{ fontSize: 13 }} /> View source
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── footer ──────────────────────────────────────────── */
function LetheanFooter({ mode }) {
  return (
    <footer style={{
      padding: "48px 56px 32px",
      borderTop: "1px solid var(--line-1)",
      background: "var(--ink-0)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
        <div>
          <LetheanWordmark />
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 14, lineHeight: 1.55, maxWidth: 280 }}>
            Open source AI infrastructure. EUPL-1.2 licensed. Built in the UK, hosted in the UK + EU.
          </p>
        </div>
        {[
          ["Agent", ["Runtime", "Policies", "Tracing", "Models"]],
          ["Hosted", ["Plans", "SLAs", "Migration", "Status"]],
          ["Source", ["github", "Forge", "Roadmap", "Releases"]],
          ["Studio", ["Host UK", "OFM", "About", "Contact"]],
        ].map(([h, items]) => (
          <div key={h}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: "0.06em", marginBottom: 12 }}>{h.toUpperCase()}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
              {items.map((i) => <li key={i} style={{ fontSize: 13, color: "var(--fg-2)" }}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 20, borderTop: "1px solid var(--line-1)",
        fontSize: 11.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
      }}>
        <span>© Lethean Studio 2026 · EUPL-1.2 · UK Ltd. 14982737</span>
        <span>{mode === "light" ? "light mode" : "dark mode"} · system aware</span>
      </div>
    </footer>
  );
}

Object.assign(window, { LetheanLanding });
