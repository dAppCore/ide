/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Provisioning moment — animated post-purchase theatre.
// User just bought hookway.co.uk + Host Mail. Instead of a
// static "✓ Provisioned" checklist, watch it happen live with
// Vi narrating each step.
//
// 12s loop:
//   0.0–2.5  Domain register (whois lookup → claim)
//   2.5–5.0  DNS records writing (MX, A, TXT)
//   5.0–7.5  SSL minting (Let's Encrypt handshake)
//   7.5–10.0 Mailboxes provisioning
//   10.0–12.0 Vi: "all done — try sending yourself a test"
// ─────────────────────────────────────────────────────────

function Provisioning({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      padding: "32px 40px",
      display: "flex", flexDirection: "column", gap: 24,
    }}>
      {/* header strip */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size="sm" showSubdomain="order" />
          <span style={{ color: "var(--fg-4)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>order #2025-0413</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
          Loop preview · scrub timeline below
        </div>
      </header>

      {/* The animated stage */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Stage width={1100} height={620} duration={12} loop autoplay scaleToFit>
          <ProvisioningScene />
        </Stage>
      </div>
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────
function ProvisioningScene() {
  const t = useTime();

  // Step boundaries
  const steps = [
    { id: "domain", label: "Domain registered", start: 0.0, end: 2.5, icon: "globe" },
    { id: "dns",    label: "DNS records written", start: 2.3, end: 5.0, icon: "diagram-project" },
    { id: "ssl",    label: "SSL certificate minted", start: 4.8, end: 7.5, icon: "shield-check" },
    { id: "mail",   label: "Mailboxes provisioned", start: 7.3, end: 10.0, icon: "envelope" },
  ];

  const allDone = t > 10.2;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--ink-1)",
      borderRadius: 18,
      border: "1px solid var(--line-2)",
      padding: 36,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 36,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Soft brand glow that pulses through the sequence */}
      <ProvGlow t={t} />

      {/* Left: Vi + narration */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em" }}>
          PROVISIONING · LIVE
        </div>
        <h1 style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: "-0.03em", color: "var(--fg-0)" }}>
          {allDone ? "All set, Sam." : "Hookway.co.uk is going live."}
        </h1>
        <p style={{ fontSize: 16, color: "var(--fg-2)", lineHeight: 1.55, maxWidth: 440 }}>
          {allDone
            ? <><span className="editorial" style={{ fontStyle: "italic", color: "var(--fg-1)" }}>That's everything.</span> Your domain, mail, and certificates are live. Try sending yourself a test from sam@hookway.co.uk.</>
            : <>I'm setting up your domain, mailbox, and certificate. Stay if you like — this takes about a minute. I'll email you when it's done.</>}
        </p>

        {/* Vi sprite */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: "auto" }}>
          <div style={{
            width: 140, height: 140, borderRadius: 18,
            background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-2))",
            border: "1px solid color-mix(in oklch, var(--brand-500) 28%, var(--line-2))",
            display: "grid", placeItems: "center",
            overflow: "hidden",
            transform: `scale(${1 + Math.sin(t * 1.6) * 0.012})`,
          }}>
            <Vi pose="master" size={170} style={{ marginTop: 12 }} />
          </div>
          <div style={{
            background: "var(--ink-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
            padding: "10px 14px",
            position: "relative",
            maxWidth: 280,
          }}>
            {/* speech tail */}
            <div style={{
              position: "absolute", left: -7, bottom: 14,
              width: 0, height: 0,
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              borderRight: "7px solid var(--line-2)",
            }} />
            <ViNarration t={t} allDone={allDone} />
          </div>
        </div>

        {/* CTA when done */}
        {allDone && (
          <div style={{ display: "flex", gap: 10, opacity: clamp((t - 10.2) / 0.6, 0, 1) }}>
            <button className="btn btn-primary btn-lg">
              <Icon name="envelope" size={13} />
              Open inbox
            </button>
            <button className="btn btn-secondary btn-lg">
              <Icon name="globe" size={13} />
              Visit site
            </button>
          </div>
        )}
      </div>

      {/* Right: step visualisation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative", zIndex: 1 }}>
        {steps.map((s, i) => (
          <ProvStep key={s.id} step={s} t={t} index={i} />
        ))}

        {/* progress strip */}
        <div style={{
          marginTop: "auto",
          height: 3, borderRadius: 999,
          background: "var(--ink-3)",
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0,
            width: `${clamp(t / 10, 0, 1) * 100}%`,
            background: "linear-gradient(90deg, var(--brand-500), var(--brand-300))",
            transition: "width 60ms linear",
            boxShadow: "0 0 12px color-mix(in oklch, var(--brand-400) 60%, transparent)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
          <span>{Math.min(10, t).toFixed(1)}s elapsed</span>
          <span>{allDone ? "complete" : `~${Math.max(0, 10 - t).toFixed(0)}s remaining`}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Glow that pulses with the sequence ───────────────────
function ProvGlow({ t }) {
  // Glow intensifies at each step boundary
  const intensity = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.65));
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `radial-gradient(ellipse 60% 80% at 75% 30%, color-mix(in oklch, var(--brand-500) ${24 * intensity}%, transparent), transparent 60%),
                   radial-gradient(ellipse 50% 70% at 20% 90%, color-mix(in oklch, var(--brand-700) ${18 * intensity}%, transparent), transparent 60%)`,
    }} />
  );
}

// ─── Vi narration that swaps lines ────────────────────────
function ViNarration({ t, allDone }) {
  let line, sub;
  if (t < 2.5) {
    line = "Claiming the domain…";
    sub = "ICANN whois — clean";
  } else if (t < 5.0) {
    line = "Pointing DNS records.";
    sub = "MX, A, TXT — propagating";
  } else if (t < 7.5) {
    line = "Minting your certificate.";
    sub = "Let's Encrypt · ACME challenge";
  } else if (t < 10.0) {
    line = "Spinning up your mailbox.";
    sub = "sam@hookway.co.uk · 5 GB";
  } else {
    line = "All four systems green.";
    sub = "Took 9.4 seconds. Faster than a kettle.";
  }

  return (
    <>
      <div style={{
        fontSize: 14, fontWeight: 500, color: "var(--fg-0)",
        letterSpacing: "-0.01em", lineHeight: 1.35,
      }}>
        {line}
      </div>
      <div style={{
        fontSize: 11.5, color: "var(--fg-3)", marginTop: 3,
        fontFamily: "var(--font-mono)",
      }}>
        {sub}
      </div>
    </>
  );
}

// ─── Step row with state-aware visuals ────────────────────
function ProvStep({ step, t, index }) {
  const before = t < step.start;
  const during = t >= step.start && t < step.end;
  const done = t >= step.end;
  const localT = during ? (t - step.start) / (step.end - step.start) : (done ? 1 : 0);

  // Stagger entry
  const entryDelay = index * 0.15;
  const entryT = clamp((t - entryDelay) / 0.4, 0, 1);

  return (
    <div style={{
      background: "var(--ink-2)",
      border: `1px solid ${during ? "color-mix(in oklch, var(--brand-500) 40%, var(--line-2))" : "var(--line-2)"}`,
      borderRadius: 12,
      padding: 16,
      display: "flex", flexDirection: "column", gap: 12,
      transition: "border-color 200ms ease",
      opacity: 0.3 + entryT * 0.7,
      transform: `translateY(${(1 - entryT) * 8}px)`,
      boxShadow: during ? "0 0 0 1px color-mix(in oklch, var(--brand-400) 40%, transparent), 0 8px 24px color-mix(in oklch, var(--brand-700) 18%, transparent)" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ProvStepIcon step={step} during={during} done={done} localT={localT} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 500,
            color: before ? "var(--fg-3)" : "var(--fg-0)",
            letterSpacing: "-0.01em",
          }}>
            {step.label}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-4)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            {step.id === "domain" && "hookway.co.uk · 12 month registration"}
            {step.id === "dns" && "5 records · 60s TTL"}
            {step.id === "ssl" && "Let's Encrypt · 90 day cert"}
            {step.id === "mail" && "1 mailbox · IMAP/SMTP/JMAP"}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {done ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 999,
              background: "color-mix(in oklch, var(--success-500) 18%, var(--ink-3))",
              border: "1px solid color-mix(in oklch, var(--success-500) 30%, transparent)",
              color: "var(--success-400)",
              fontSize: 10.5, fontWeight: 500, letterSpacing: "0.04em",
            }}>
              <Icon name="check" size={9} /> DONE
            </span>
          ) : during ? (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 999,
              background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
              border: "1px solid color-mix(in oklch, var(--brand-500) 35%, transparent)",
              color: "var(--brand-200)",
              fontSize: 10.5, fontWeight: 500, letterSpacing: "0.04em",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--brand-300)", animation: "provPulse 0.8s infinite" }} />
              WORKING
            </span>
          ) : (
            <span style={{
              fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}>QUEUED</span>
          )}
        </div>
      </div>

      {/* In-progress detail strip */}
      {(during || done) && <ProvStepDetail step={step} during={during} done={done} localT={localT} t={t} />}

      <style>{`
        @keyframes provPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes provBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}

function ProvStepIcon({ step, during, done, localT }) {
  const bg = done
    ? "color-mix(in oklch, var(--success-500) 22%, var(--ink-3))"
    : during
      ? "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))"
      : "var(--ink-3)";
  const color = done ? "var(--success-400)" : during ? "var(--brand-200)" : "var(--fg-4)";

  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: bg,
      border: `1px solid ${done ? "color-mix(in oklch, var(--success-500) 30%, transparent)" : during ? "color-mix(in oklch, var(--brand-500) 35%, transparent)" : "var(--line-1)"}`,
      display: "grid", placeItems: "center",
      flexShrink: 0,
      position: "relative",
    }}>
      <Icon name={step.icon} size={14} color={color} />
      {during && (
        <div style={{
          position: "absolute", inset: -3,
          borderRadius: 11,
          border: "1px solid color-mix(in oklch, var(--brand-400) 50%, transparent)",
          opacity: Math.sin(localT * Math.PI * 4) * 0.5 + 0.5,
        }} />
      )}
    </div>
  );
}

// ─── Step-specific live detail ────────────────────────────
function ProvStepDetail({ step, during, done, localT, t }) {
  if (step.id === "domain") return <DomainDetail localT={during ? localT : 1} done={done} />;
  if (step.id === "dns")    return <DnsDetail    localT={during ? localT : 1} done={done} />;
  if (step.id === "ssl")    return <SslDetail    localT={during ? localT : 1} done={done} t={t} />;
  if (step.id === "mail")   return <MailDetail   localT={during ? localT : 1} done={done} />;
  return null;
}

// Domain — terminal-style whois lookup
function DomainDetail({ localT, done }) {
  const lines = [
    { at: 0.0, text: "› whois hookway.co.uk", style: "muted" },
    { at: 0.2, text: "  status: AVAILABLE", style: "ok" },
    { at: 0.45, text: "› register --years=1 --owner=hookway-ltd", style: "muted" },
    { at: 0.75, text: "  ✓ claimed by Host UK · expires 04 Oct 2026", style: "ok" },
  ];
  const visible = lines.filter((l) => localT >= l.at);

  return (
    <div style={{
      background: "var(--ink-0)",
      borderRadius: 6,
      padding: "8px 12px",
      fontFamily: "var(--font-mono)", fontSize: 11,
      color: "var(--fg-2)",
      lineHeight: 1.55,
      minHeight: 70,
    }}>
      {visible.map((l, i) => (
        <div key={i} style={{
          color: l.style === "ok" ? "var(--success-400)" : "var(--fg-3)",
        }}>
          {l.text}
        </div>
      ))}
      {!done && (
        <span style={{
          display: "inline-block", width: 7, height: 12,
          background: "var(--brand-300)", verticalAlign: "middle",
          animation: "provBlink 1s infinite",
        }} />
      )}
    </div>
  );
}

// DNS — records typing into a table
function DnsDetail({ localT, done }) {
  const records = [
    { type: "A",     name: "@",    value: "185.199.108.153", at: 0.10 },
    { type: "A",     name: "www",  value: "185.199.108.153", at: 0.30 },
    { type: "MX",    name: "@",    value: "10 mail.host.uk.com", at: 0.50 },
    { type: "TXT",   name: "@",    value: "v=spf1 include:_spf.host.uk.com ~all", at: 0.70 },
    { type: "TXT",   name: "_dmarc", value: "v=DMARC1; p=quarantine", at: 0.88 },
  ];

  return (
    <div style={{
      background: "var(--ink-0)",
      borderRadius: 6,
      overflow: "hidden",
      border: "1px solid var(--line-1)",
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: "60px 80px 1fr",
        padding: "6px 12px",
        background: "var(--ink-2)",
        borderBottom: "1px solid var(--line-1)",
        fontSize: 9.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)",
        letterSpacing: "0.06em",
      }}>
        <span>TYPE</span><span>NAME</span><span>VALUE</span>
      </div>
      {records.map((r, i) => {
        const visible = localT >= r.at;
        const charT = clamp((localT - r.at) / 0.08, 0, 1);
        const fullText = r.value;
        const shownText = visible ? fullText.slice(0, Math.ceil(fullText.length * charT)) : "";
        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "60px 80px 1fr",
            padding: "5px 12px",
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: visible ? "var(--fg-1)" : "transparent",
            borderTop: i === 0 ? "none" : "1px solid var(--line-1)",
            transition: "color 200ms",
          }}>
            <span style={{ color: visible ? "var(--brand-300)" : "transparent", fontWeight: 500 }}>{r.type}</span>
            <span style={{ color: visible ? "var(--fg-2)" : "transparent" }}>{r.name}</span>
            <span style={{ color: visible ? "var(--fg-1)" : "transparent" }}>
              {shownText}
              {visible && charT < 1 && <span style={{ color: "var(--brand-300)", animation: "provBlink 0.8s infinite" }}>▎</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// SSL — handshake visualisation
function SslDetail({ localT, done, t }) {
  const phases = [
    { at: 0.0, label: "ACME challenge requested" },
    { at: 0.25, label: "DNS-01 token written" },
    { at: 0.5, label: "Let's Encrypt validating…" },
    { at: 0.75, label: "Certificate signed · 4096-bit RSA" },
  ];

  return (
    <div style={{
      background: "var(--ink-0)",
      borderRadius: 6,
      padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 6,
      minHeight: 90,
    }}>
      {phases.map((p, i) => {
        const visible = localT >= p.at;
        const isCurrent = localT >= p.at && localT < (phases[i + 1]?.at ?? 1);
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, fontFamily: "var(--font-mono)",
            color: visible ? (isCurrent && !done ? "var(--brand-200)" : "var(--success-400)") : "var(--fg-4)",
            opacity: visible ? 1 : 0.3,
          }}>
            <span style={{ width: 10 }}>
              {visible ? (isCurrent && !done ? "●" : "✓") : "○"}
            </span>
            {p.label}
          </div>
        );
      })}
      {done && (
        <div style={{
          marginTop: 4, padding: "4px 8px",
          background: "color-mix(in oklch, var(--success-500) 12%, transparent)",
          border: "1px solid color-mix(in oklch, var(--success-500) 28%, transparent)",
          borderRadius: 4,
          fontSize: 10.5, color: "var(--success-400)", fontFamily: "var(--font-mono)",
        }}>
          fingerprint: 4f:7a:91:c2:e3:8b:5d:a1…
        </div>
      )}
    </div>
  );
}

// Mail — mailbox materialising
function MailDetail({ localT, done }) {
  return (
    <div style={{
      background: "var(--ink-0)",
      borderRadius: 6,
      padding: "10px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      minHeight: 60,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "color-mix(in oklch, var(--brand-500) 14%, var(--ink-3))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 30%, var(--line-2))",
          display: "grid", placeItems: "center",
          transform: `scale(${0.9 + localT * 0.1})`,
          transition: "transform 100ms",
        }}>
          <Icon name="envelope" size={14} color="var(--brand-200)" />
        </div>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--fg-0)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
            sam@hookway.co.uk
          </div>
          <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            5 GB · IMAP/SMTP/JMAP · UK datacentre
          </div>
        </div>
      </div>
      {/* protocols lighting up */}
      <div style={{ display: "flex", gap: 4 }}>
        {["IMAP", "SMTP", "JMAP"].map((p, i) => {
          const at = 0.3 + i * 0.2;
          const lit = localT >= at;
          return (
            <div key={p} style={{
              padding: "2px 7px", borderRadius: 999,
              fontSize: 9.5, fontFamily: "var(--font-mono)",
              fontWeight: 500, letterSpacing: "0.04em",
              background: lit ? "color-mix(in oklch, var(--success-500) 18%, var(--ink-3))" : "var(--ink-3)",
              border: `1px solid ${lit ? "color-mix(in oklch, var(--success-500) 32%, transparent)" : "var(--line-1)"}`,
              color: lit ? "var(--success-400)" : "var(--fg-4)",
              transition: "all 200ms",
            }}>
              {p}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Provisioning });
