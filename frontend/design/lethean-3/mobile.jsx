/* eslint-disable */
// Mobile checkout flow — same brand inside iOS frame
// Demonstrates touch-density adaptation of order.host.uk.com checkout

function MobileCheckout({ brand = "hostuk" }) {
  return (
    <div className="surface" data-brand={brand} style={{ width: "100%", height: "100%", background: "var(--ink-0)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Mobile top bar */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--line-1)" }}>
        <button style={{ width: 32, height: 32, borderRadius: 8, background: "var(--ink-2)", border: "1px solid var(--line-1)", display: "grid", placeItems: "center", color: "var(--fg-1)" }}>
          <Icon name="chevron-left" size={13} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <RavenGlyph size={12} color="var(--brand-300)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Checkout</span>
        </div>
        <button style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", border: 0, color: "var(--fg-2)" }}>
          <Icon name="lock" size={12} />
        </button>
      </div>

      {/* Step pill */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= 2 ? "var(--brand-400)" : "var(--ink-3)" }} />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>STEP 2 OF 3 · PAYMENT</div>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px" }}>
        <h1 style={{ fontSize: 22, letterSpacing: "-0.02em", marginBottom: 4 }}>Almost there.</h1>
        <p style={{ fontSize: 12.5, color: "var(--fg-3)", marginBottom: 18 }}>You can change everything later from your dashboard.</p>

        {/* Summary card collapsed */}
        <div style={{ background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-1)" }}>3 items · monthly</div>
            <span className="tnum" style={{ fontSize: 17, fontWeight: 600, color: "var(--fg-0)" }}>£40.80</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Family · Analytics extra · Storage 50 GB</div>
        </div>

        {/* Apple Pay */}
        <button style={{ width: "100%", height: 48, background: "var(--fg-0)", color: "var(--ink-0)", borderRadius: 10, border: 0, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
          <Icon name="apple" iconStyle="solid" size={16} /> Pay
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-4)", margin: "0 auto 14px", justifyContent: "center" }}>
          <div style={{ flex: 1, height: 1, background: "var(--line-1)" }} /> or pay by card <div style={{ flex: 1, height: 1, background: "var(--line-1)" }} />
        </div>

        {/* Card form mobile */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="label">Card number</label>
            <div style={{ position: "relative" }}>
              <input className="input tnum" defaultValue="4242 4242 4242 4242" style={{ height: 48, fontSize: 15, paddingRight: 50 }} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>VISA</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Expiry</label>
              <input className="input tnum" defaultValue="12 / 28" style={{ height: 48, fontSize: 15 }} />
            </div>
            <div>
              <label className="label">CVC</label>
              <input className="input tnum" defaultValue="•••" style={{ height: 48, fontSize: 15 }} />
            </div>
          </div>
          <div>
            <label className="label">Postcode</label>
            <input className="input" defaultValue="BS5 9TJ" style={{ height: 48, fontSize: 15 }} />
          </div>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, fontSize: 12.5, color: "var(--fg-2)", lineHeight: 1.4 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: "var(--brand-500)", marginTop: 2 }} />
          Save this card for renewals.
        </label>

        <div style={{ marginTop: 18, padding: 12, background: "color-mix(in oklch, var(--success-500) 7%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--success-500) 22%, transparent)", borderRadius: 10, fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.5, display: "flex", gap: 10 }}>
          <Icon name="shield-check" size={14} color="var(--success-400)" style={{ marginTop: 1 }} />
          14-day money back. Cancel any time. UK consumer rights respected.
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line-1)", background: "var(--ink-1)" }}>
        <button className="btn btn-primary" style={{ width: "100%", height: 50, fontSize: 15, borderRadius: 12 }}>
          <Icon name="lock" size={12} /> Pay £40.80 now
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { MobileCheckout });
