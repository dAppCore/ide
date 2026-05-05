/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Ask Vi — fullscreen command surface (cmd+K on steroids).
// Triggered from anywhere in the panel. Vi listens, queries
// data, answers with prose AND inline UI (a domain WHOIS
// table, a renewal action card, a comparison chart, etc.)
// ─────────────────────────────────────────────────────────

function AskVi({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", minHeight: "100%",
      background: "var(--ink-0)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Dimmed canvas behind, suggesting context */}
      <AskViBackdrop />

      {/* Ask-Vi panel */}
      <div style={{
        position: "relative",
        zIndex: 2,
        maxWidth: 760,
        margin: "60px auto 0",
        background: "var(--ink-1)",
        border: "1px solid var(--line-2)",
        borderRadius: 18,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in oklch, var(--brand-500) 18%, transparent)",
        overflow: "hidden",
      }}>
        {/* Composer */}
        <AskViComposer />

        {/* Streaming answer */}
        <div style={{
          padding: "20px 24px 24px",
          borderTop: "1px solid var(--line-1)",
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <AskViAnswer />
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--line-1)",
          background: "var(--ink-0)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11, color: "var(--fg-4)",
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span><kbd style={kbdStyle}>↑↓</kbd> Navigate</span>
            <span><kbd style={kbdStyle}>↵</kbd> Run</span>
            <span><kbd style={kbdStyle}>esc</kbd> Close</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success-400)" }} />
            <span>Vi is reading account · not site content</span>
          </div>
        </div>
      </div>

      {/* Suggestion chips below panel */}
      <div style={{
        maxWidth: 760, margin: "16px auto 0",
        display: "flex", flexWrap: "wrap", gap: 8,
        padding: "0 4px",
        position: "relative", zIndex: 2,
      }}>
        <div style={{ fontSize: 11, color: "var(--fg-4)", letterSpacing: "0.05em", marginRight: 4, alignSelf: "center", fontFamily: "var(--font-mono)" }}>
          TRY ASKING:
        </div>
        {[
          "renew lethean.host",
          "what's slow on hookway.co.uk",
          "spin up staging from main",
          "what did you do overnight",
          "show last month's bill",
          "is my mail working",
        ].map((q) => (
          <button key={q} style={{
            padding: "5px 11px", borderRadius: 999,
            background: "var(--ink-2)",
            border: "1px solid var(--line-2)",
            color: "var(--fg-2)",
            fontSize: 12, fontFamily: "var(--font-sans)",
          }}>{q}</button>
        ))}
      </div>
    </div>
  );
}

const kbdStyle = {
  display: "inline-block",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
  padding: "1px 6px",
  borderRadius: 4,
  background: "var(--ink-3)",
  border: "1px solid var(--line-2)",
  color: "var(--fg-2)",
  marginRight: 4,
};

function AskViBackdrop() {
  return (
    <>
      {/* faint dot grid hint at the panel below */}
      <div className="dot-grid" style={{
        position: "absolute", inset: 0,
        opacity: 0.4,
      }} />
      {/* brand glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 50% 60% at 50% 30%, color-mix(in oklch, var(--brand-500) 18%, transparent), transparent 60%)",
        pointerEvents: "none",
      }} />
    </>
  );
}

function AskViComposer() {
  return (
    <div style={{ padding: "20px 24px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-2))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 38%, var(--line-2))",
          display: "grid", placeItems: "center", overflow: "hidden",
          flexShrink: 0,
        }}>
          <Vi pose="master" size={42} style={{ marginTop: 4 }} />
        </div>
        <div style={{
          flex: 1,
          fontSize: 22, color: "var(--fg-0)",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}>
          renew lethean.host
          <span style={{
            display: "inline-block",
            width: 2, height: 22, marginLeft: 3,
            background: "var(--brand-300)",
            verticalAlign: "middle",
            animation: "askViBlink 1s infinite",
          }} />
        </div>
        <div style={{
          fontSize: 11, color: "var(--fg-4)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
          flexShrink: 0,
        }}>
          ⌘K
        </div>
      </div>
      <style>{`@keyframes askViBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
    </div>
  );
}

function AskViAnswer() {
  return (
    <>
      {/* Vi's prose answer */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: "color-mix(in oklch, var(--brand-500) 22%, var(--ink-3))",
          border: "1px solid color-mix(in oklch, var(--brand-500) 35%, var(--line-2))",
          display: "grid", placeItems: "center", overflow: "hidden",
          flexShrink: 0, marginTop: 2,
        }}>
          <Vi pose="master" size={26} style={{ marginTop: 3 }} />
        </div>
        <div style={{ fontSize: 14, color: "var(--fg-1)", lineHeight: 1.55, flex: 1 }}>
          <p>
            <span className="num" style={{ color: "var(--fg-0)" }}>lethean.host</span> renews on{" "}
            <span style={{ color: "var(--fg-0)", fontWeight: 500 }}>10 October</span> — that's 6 days. Auto-renew is off.
          </p>
          <p style={{ marginTop: 8 }}>
            Renewing for 12 months at today's price is <span className="num" style={{ color: "var(--fg-0)" }}>£18.40</span>. I'll charge the Mastercard ending <span className="num">·· 4421</span>. Confirm and I'll do it now.
          </p>
        </div>
      </div>

      {/* Inline action card — the renewal */}
      <div style={{
        marginLeft: 34,
        background: "var(--ink-2)",
        border: "1px solid var(--line-2)",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 16px",
          display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
        }}>
          <div>
            <div style={{
              fontSize: 11, color: "var(--brand-300)",
              fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 4,
            }}>
              RENEWAL · 12 MONTHS
            </div>
            <div style={{ fontSize: 18, color: "var(--fg-0)", letterSpacing: "-0.02em", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
              lethean.host
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>
              Expires 10 Oct 2025 → <span style={{ color: "var(--fg-1)" }}>10 Oct 2026</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num tnum" style={{ fontSize: 24, color: "var(--fg-0)", letterSpacing: "-0.02em" }}>
              £18.40
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 2 }}>
              inc. VAT
            </div>
          </div>
        </div>
        <div style={{
          borderTop: "1px solid var(--line-1)",
          background: "var(--ink-1)",
          padding: "10px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: 12, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="credit-card" size={11} /> Mastercard ·· 4421
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ border: "1px solid var(--line-2)" }}>
              Set auto-renew
            </button>
            <button className="btn btn-primary btn-sm">
              Confirm & renew
              <Icon name="arrow-right" size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Vi follow-up */}
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        <div style={{ width: 22, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.55, flex: 1 }}>
          <span className="editorial" style={{ fontStyle: "italic", color: "var(--fg-2)" }}>One more thing —</span>{" "}
          your Lethean Core subscription on this domain renews 14 days later. Bundle them and save{" "}
          <span style={{ color: "var(--success-400)", fontWeight: 500 }}>£3.80/year</span>?{" "}
          <button style={{
            background: "none", border: "none", padding: 0,
            color: "var(--brand-300)", fontSize: 13, cursor: "pointer",
            textDecoration: "underline", textDecorationStyle: "dotted",
            textUnderlineOffset: 3,
          }}>Show me the bundle</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AskVi });
