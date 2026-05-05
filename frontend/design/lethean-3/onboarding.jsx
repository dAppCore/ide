/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Onboarding — first 5 minutes for a new customer.
//
// Three artboards / states:
//   1. EmptyControlPanel — Vi greets the empty workspace
//   2. OnboardingChat    — Vi-led first site setup (conversation, not wizard)
//   3. FirstWin          — site is up, Vi celebrates briefly, suggests next
// ─────────────────────────────────────────────────────────

// ─── 1. Empty control panel ───────────────────────────────
function EmptyControlPanel({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      display: "grid",
      gridTemplateColumns: "280px 1fr",
      background: "var(--ink-0)",
    }}>
      {/* Reuse the left rail in its empty/quiet state */}
      <EmptyLeftRail />

      <main style={{
        padding: "0",
        display: "flex", flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* faint dot grid */}
        <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
        {/* brand glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 70% at 50% 30%, color-mix(in oklch, var(--brand-500) 14%, transparent), transparent 60%)",
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          flex: 1,
          display: "grid", placeItems: "center",
          padding: "60px 40px",
        }}>
          <div style={{ maxWidth: 640, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            {/* Vi sprite — bigger here, this is her moment */}
            <div style={{
              width: 200, height: 200, borderRadius: 28,
              background: "color-mix(in oklch, var(--brand-500) 12%, var(--ink-2))",
              border: "1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2))",
              display: "grid", placeItems: "center", overflow: "hidden",
              boxShadow: "0 24px 60px color-mix(in oklch, var(--brand-700) 30%, transparent)",
            }}>
              <Vi pose="master" size={240} style={{ marginTop: 24 }} />
            </div>

            <div style={{
              fontSize: 11, color: "var(--brand-300)",
              fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
            }}>
              VI · 09:14
            </div>

            <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--fg-0)" }}>
              <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>It's just us.</span>{" "}
              Welcome in, Sam.
            </h1>
            <p style={{ fontSize: 17, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 520 }}>
              Tell me what you're trying to build and I'll set it up — domain, hosting, mail, the lot. Or poke around first; I'll be here.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button className="btn btn-primary btn-lg">
                <Icon name="comments" size={13} />
                Set up my first site
              </button>
              <button className="btn btn-secondary btn-lg">
                I'll explore
              </button>
            </div>

            {/* Suggested first moves */}
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 480 }}>
              {[
                { icon: "globe", label: "Bring an existing domain" },
                { icon: "envelope", label: "Just need email" },
                { icon: "code-branch", label: "Deploy from Git" },
                { icon: "file-import", label: "Move from another host" },
              ].map((s) => (
                <button key={s.label} style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 13px", borderRadius: 999,
                  background: "var(--ink-2)",
                  border: "1px solid var(--line-2)",
                  color: "var(--fg-2)",
                  fontSize: 12.5,
                }}>
                  <Icon name={s.icon} size={11} color="var(--fg-3)" />
                  {s.label}
                </button>
              ))}
            </div>

            {/* gentle setup checklist — corner card style */}
            <div style={{
              marginTop: 36,
              alignSelf: "stretch",
              maxWidth: 520, marginLeft: "auto", marginRight: "auto",
              background: "var(--ink-2)",
              border: "1px solid var(--line-1)",
              borderRadius: "var(--r-lg)",
              padding: 18,
              textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="list-check" size={12} color="var(--brand-300)" />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-1)", letterSpacing: "0.02em" }}>
                    Account setup · 1 of 4
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--fg-4)" }}>Skip</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <ChecklistItem checked label="Account created" detail="hello@hookway.co.uk · verified" />
                <ChecklistItem label="Add a payment method" detail="So Vi can act when you're not around" current />
                <ChecklistItem label="Set up your first site" detail="Or skip — Vi will help when you're ready" />
                <ChecklistItem label="Invite your team" detail="Up to 5 on Standard" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyLeftRail() {
  // Same shape as control panel's left rail, but with empty counts
  return (
    <aside style={{
      borderRight: "1px solid var(--line-1)",
      background: "var(--ink-1)",
      padding: "20px 16px",
      display: "flex", flexDirection: "column", gap: 20,
      minHeight: "100%",
    }}>
      <div style={{ padding: "0 4px" }}>
        <BrandMark size="sm" showSubdomain="control" />
      </div>

      {/* Vi block */}
      <div style={{
        background: "color-mix(in oklch, var(--brand-500) 8%, var(--ink-2))",
        border: "1px solid color-mix(in oklch, var(--brand-500) 24%, var(--line-1))",
        borderRadius: "var(--r-lg)",
        padding: "14px 14px 12px",
        position: "relative",
      }}>
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
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)" }}>
              Vi · ready
            </div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.45 }}>
              Nothing watching yet. Whenever you are.
            </div>
          </div>
        </div>
      </div>

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

      <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ fontSize: 10.5, color: "var(--fg-4)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>
          Workspace
        </div>
        {[
          { icon: "house", label: "Today", active: true },
          { icon: "globe", label: "Sites" },
          { icon: "at", label: "Domains" },
          { icon: "envelope", label: "Email" },
          { icon: "credit-card", label: "Billing" },
          { icon: "wave-pulse", label: "Activity" },
        ].map((item) => (
          <a key={item.label} style={{
            display: "flex", alignItems: "center", gap: 11,
            padding: "8px 10px", borderRadius: "var(--r-sm)",
            background: item.active ? "var(--ink-3)" : "transparent",
            color: item.active ? "var(--fg-0)" : "var(--fg-3)",
            fontSize: 13.5,
          }}>
            <Icon name={item.icon} size={13} color={item.active ? "var(--brand-300)" : "var(--fg-4)"} />
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>—</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

function ChecklistItem({ checked, current, label, detail }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "8px 0",
      borderTop: "1px solid var(--line-1)",
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 999,
        border: `1px solid ${checked ? "var(--success-500)" : current ? "var(--brand-400)" : "var(--line-3)"}`,
        background: checked ? "color-mix(in oklch, var(--success-500) 80%, transparent)" : "transparent",
        display: "grid", placeItems: "center",
        flexShrink: 0,
        marginTop: 2,
      }}>
        {checked && <Icon name="check" size={9} color="var(--ink-0)" />}
        {current && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand-300)" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: checked ? "var(--fg-3)" : "var(--fg-0)", fontWeight: current ? 500 : 400, textDecoration: checked ? "line-through" : "none" }}>
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2 }}>{detail}</div>
      </div>
      {current && (
        <button className="btn btn-primary btn-sm" style={{ height: 26, padding: "0 10px", fontSize: 11.5 }}>
          Add now
        </button>
      )}
    </div>
  );
}

// ─── 2. Onboarding chat — Vi-led first site setup ─────────
function OnboardingChat({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: "32px 40px",
      display: "flex", flexDirection: "column", gap: 20,
    }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size="sm" showSubdomain="control" />
          <span style={{ color: "var(--fg-4)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>First site</span>
        </div>
        <button style={{ background: "transparent", border: "none", color: "var(--fg-3)", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="xmark" size={11} />
          Close · resume later
        </button>
      </header>

      {/* Conversation */}
      <div style={{
        flex: 1,
        maxWidth: 720, margin: "8px auto 0", width: "100%",
        display: "flex", flexDirection: "column", gap: 18,
      }}>
        <ChatVi>
          <p>Right. Let's get your first site live.</p>
          <p style={{ marginTop: 8, color: "var(--fg-2)", fontSize: 13.5 }}>
            <span className="editorial" style={{ fontStyle: "italic" }}>Three quick questions</span> and I'll have it up in a minute.
          </p>
        </ChatVi>

        <ChatVi>
          <p>What domain do you want? Type it however you say it — <span className="num" style={{ color: "var(--fg-0)" }}>hookway.co.uk</span> or <span className="num" style={{ color: "var(--fg-0)" }}>hookway</span>, I'll figure it out.</p>
        </ChatVi>

        <ChatYou>hookway.co.uk</ChatYou>

        <ChatVi>
          {/* Inline domain availability card */}
          <div style={{
            background: "var(--ink-1)",
            border: "1px solid color-mix(in oklch, var(--success-500) 30%, var(--line-2))",
            borderRadius: 10,
            padding: 12,
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "color-mix(in oklch, var(--success-500) 18%, var(--ink-3))",
              border: "1px solid color-mix(in oklch, var(--success-500) 30%, transparent)",
              display: "grid", placeItems: "center",
              flexShrink: 0,
            }}>
              <Icon name="check" size={12} color="var(--success-400)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                hookway.co.uk
              </div>
              <div style={{ fontSize: 11.5, color: "var(--success-400)", marginTop: 2 }}>
                Available · £8.40/yr after first year (£0 first year on Standard)
              </div>
            </div>
            <span className="pill pill-success">CLAIMABLE</span>
          </div>
          <p>Yours, free for the first year. What's it for?</p>
        </ChatVi>

        <ChatYou>Personal site + a small blog. Need email too.</ChatYou>

        <ChatVi>
          <p>
            Got it. I'll spin up <span className="num" style={{ color: "var(--fg-0)" }}>Standard</span> — that's hosting, one mailbox, analytics, and the bio-link page. <span className="num">£12/mo</span> after the 30-day trial.
          </p>
          <div style={{
            marginTop: 12,
            background: "var(--ink-1)",
            border: "1px solid var(--line-2)",
            borderRadius: 10,
            padding: 14,
          }}>
            <div style={{ fontSize: 11, color: "var(--brand-300)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>
              YOUR FIRST SITE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { icon: "globe", label: "hookway.co.uk", detail: "Domain · 12 months" },
                { icon: "server", label: "Standard hosting", detail: "20 GB · UK" },
                { icon: "envelope", label: "sam@hookway.co.uk", detail: "Mailbox · 5 GB" },
                { icon: "chart-line", label: "Host Analytics", detail: "Privacy-first · cookieless" },
                { icon: "link", label: "Host Link", detail: "One link, your everything" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                  <Icon name={row.icon} size={11} color="var(--brand-300)" />
                  <span style={{ fontSize: 12.5, color: "var(--fg-0)", fontFamily: "var(--font-mono)" }}>{row.label}</span>
                  <span style={{ fontSize: 11.5, color: "var(--fg-4)", marginLeft: "auto" }}>{row.detail}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--line-1)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--fg-4)" }}>30-day trial · then</div>
                <div className="num tnum" style={{ fontSize: 18, color: "var(--fg-0)", letterSpacing: "-0.02em" }}>£12.00<span style={{ fontSize: 11, color: "var(--fg-3)" }}>/mo</span></div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--line-2)" }}>Adjust</button>
                <button className="btn btn-primary btn-sm">
                  Start trial & provision
                  <Icon name="arrow-right" size={10} />
                </button>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 8, lineHeight: 1.5 }}>
            <span className="editorial" style={{ fontStyle: "italic" }}>No card today.</span> I'll ask 5 days before the trial ends. You can change anything before then.
          </p>
        </ChatVi>

        {/* composer */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            background: "var(--ink-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon name="sparkles" size={13} color="var(--brand-300)" />
            <span style={{ fontSize: 13.5, color: "var(--fg-3)", flex: 1 }}>Reply or just say "go"…</span>
            <kbd style={{
              fontSize: 10.5, padding: "2px 6px", borderRadius: 4,
              background: "var(--ink-3)", border: "1px solid var(--line-2)",
              color: "var(--fg-3)", fontFamily: "var(--font-mono)",
            }}>↵</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatVi({ children }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
        border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
        display: "grid", placeItems: "center", overflow: "hidden",
        flexShrink: 0,
      }}>
        <Vi pose="master" size={36} style={{ marginTop: 4 }} />
      </div>
      <div style={{
        flex: 1,
        background: "var(--ink-2)",
        border: "1px solid var(--line-1)",
        borderRadius: 12,
        padding: "14px 16px",
        fontSize: 14, color: "var(--fg-1)", lineHeight: 1.55,
      }}>
        {children}
      </div>
    </div>
  );
}

function ChatYou({ children }) {
  return (
    <div style={{ display: "flex", gap: 12, flexDirection: "row-reverse" }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: "var(--ink-3)", border: "1px solid var(--line-2)",
        display: "grid", placeItems: "center",
        fontSize: 11, fontWeight: 600, color: "var(--fg-2)", flexShrink: 0,
      }}>SM</div>
      <div style={{
        background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
        border: "1px solid color-mix(in oklch, var(--brand-500) 25%, var(--line-2))",
        borderRadius: 12,
        padding: "12px 16px",
        fontSize: 14, color: "var(--fg-0)", lineHeight: 1.5,
        maxWidth: "80%",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── 3. First win moment ──────────────────────────────────
function FirstWin({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      position: "relative",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* hero glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 60% at 50% 30%, color-mix(in oklch, var(--success-500) 15%, transparent), transparent 65%), radial-gradient(ellipse 50% 50% at 50% 80%, color-mix(in oklch, var(--brand-500) 18%, transparent), transparent 60%)",
      }} />

      {/* header */}
      <header style={{ position: "relative", zIndex: 1, padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark size="sm" showSubdomain="control" />
        <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--line-2)" }}>
          Skip <Icon name="arrow-right" size={10} />
        </button>
      </header>

      <div style={{ position: "relative", zIndex: 1, flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, alignItems: "center", padding: "0 60px" }}>
        {/* Left — Vi celebrating */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingRight: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
            padding: "5px 12px", borderRadius: 999,
            background: "color-mix(in oklch, var(--success-500) 18%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--success-500) 35%, transparent)",
            color: "var(--success-400)",
            fontSize: 11.5, letterSpacing: "0.04em", fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success-400)" }} />
            LIVE · 9.4 SECONDS
          </div>

          <h1 style={{ fontSize: 56, lineHeight: 1.0, letterSpacing: "-0.035em", color: "var(--fg-0)" }}>
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>And we're up.</span>
          </h1>

          <p style={{ fontSize: 17, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 480 }}>
            <span className="num" style={{ color: "var(--fg-0)" }}>hookway.co.uk</span> is live, your mailbox is ready, and analytics started ticking 30 seconds ago. Three real visitors already.
          </p>

          {/* live tickers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, maxWidth: 460 }}>
            <FirstWinStat label="VISITORS" value="3" detail="last 5 min" />
            <FirstWinStat label="UPTIME" value="100" suffix="%" detail="since launch" />
            <FirstWinStat label="RESPONSE" value="89" suffix="ms" detail="avg" />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary btn-lg">
              <Icon name="arrow-up-right-from-square" size={13} />
              Open hookway.co.uk
            </button>
            <button className="btn btn-secondary btn-lg">
              <Icon name="envelope" size={13} />
              Send a test email
            </button>
          </div>

          {/* Vi's whisper for what's next */}
          <div style={{
            marginTop: 16, padding: "14px 16px",
            background: "var(--ink-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            display: "flex", gap: 12, alignItems: "flex-start",
            maxWidth: 460,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
              border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
              display: "grid", placeItems: "center", overflow: "hidden",
              flexShrink: 0,
            }}>
              <Vi pose="master" size={32} style={{ marginTop: 3 }} />
            </div>
            <div style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.55 }}>
              When you're ready: I can <a style={{ color: "var(--brand-300)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>connect a Git repo</a> for auto-deploys, or <a style={{ color: "var(--brand-300)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>set up your bio-link page</a>. No rush.
            </div>
          </div>
        </div>

        {/* Right — site preview floating */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          {/* fake browser preview */}
          <div style={{
            width: "100%", maxWidth: 480,
            background: "var(--ink-2)",
            borderRadius: 14,
            border: "1px solid var(--line-2)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in oklch, var(--brand-500) 16%, transparent)",
            overflow: "hidden",
            transform: "rotate(-1.5deg) translateY(-12px)",
          }}>
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--line-1)",
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--ink-1)",
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.5 }} />
                ))}
              </div>
              <div style={{
                flex: 1,
                padding: "4px 10px",
                background: "var(--ink-3)",
                borderRadius: 6,
                fontSize: 11, color: "var(--fg-2)",
                fontFamily: "var(--font-mono)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Icon name="lock" size={9} color="var(--success-400)" />
                hookway.co.uk
              </div>
            </div>
            <div className="img-placeholder" style={{ height: 240, borderRadius: 0, border: "none", borderBottom: "1px solid var(--line-1)" }}>
              hookway.co.uk · default theme
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 22, color: "var(--fg-0)", letterSpacing: "-0.02em", fontWeight: 600 }}>Hookway.</div>
              <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 6 }}>Things I'm making, in public.</div>
              <div className="divider" style={{ margin: "14px 0" }} />
              <div className="img-placeholder" style={{ height: 60, fontSize: 10 }}>placeholder block</div>
            </div>
          </div>

          {/* Vi peek over the corner */}
          <div style={{
            position: "absolute", top: -20, right: 32,
            width: 120, height: 120, borderRadius: 16,
            background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
            display: "grid", placeItems: "center", overflow: "hidden",
            transform: "rotate(6deg)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
          }}>
            <Vi pose="peek-right" size={150} style={{ marginTop: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FirstWinStat({ label, value, suffix, detail }) {
  return (
    <div style={{
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: 10,
      padding: "10px 12px",
    }}>
      <div style={{ fontSize: 10, color: "var(--fg-4)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>{label}</div>
      <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 2 }}>
        <span className="num tnum" style={{ fontSize: 22, color: "var(--fg-0)", letterSpacing: "-0.02em" }}>{value}</span>
        {suffix && <span style={{ fontSize: 12, color: "var(--fg-3)" }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>{detail}</div>
    </div>
  );
}

Object.assign(window, { EmptyControlPanel, OnboardingChat, FirstWin });
