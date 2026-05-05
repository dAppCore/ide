/* eslint-disable */
// order.host.uk.com — Cart, Checkout (single-page), Confirmation
// Anchored to Vi's warm voice; UK GBP; trust signals foregrounded.

function CartView({ brand = "hostuk" }) {
  const items = [
    { id: "family", name: "Host UK Family", desc: "All six products · 5 seats · 10 GB", price: 24, qty: 1, billing: "monthly" },
    { id: "analytics-bump", name: "Host Analytics — extra domains", desc: "5 additional domains, no cookies", price: 4, qty: 1, billing: "monthly" },
    { id: "addon-storage", name: "Storage top-up", desc: "+50 GB pooled across services", price: 6, qty: 1, billing: "monthly" },
  ];
  const sub = items.reduce((a, b) => a + b.price * b.qty, 0);
  const vat = sub * 0.2;
  const total = sub + vat;

  return (
    <div className="surface" data-brand={brand} style={{ width: 1280, minHeight: 900 }}>
      <OrderTopbar step={1} brand={brand} />
      <div style={{ padding: "40px 56px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <div>
          <div style={{ marginBottom: 24 }}>
            <div className="pill" style={{ marginBottom: 10 }}>Step 1 of 2 · Review</div>
            <h1 style={{ fontSize: 32, letterSpacing: "-0.025em" }}>Your basket</h1>
            <p style={{ fontSize: 14, color: "var(--fg-3)", marginTop: 6 }}>Three lines, monthly billing. Change anything before you continue.</p>
          </div>
          <div className="card" style={{ padding: 0 }}>
            {items.map((it, i) => (
              <div key={it.id} style={{
                padding: "20px 22px", display: "grid", gridTemplateColumns: "44px 1fr auto auto", gap: 18, alignItems: "center",
                borderBottom: i < items.length - 1 ? "1px solid var(--line-1)" : "none",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: "color-mix(in oklch, var(--brand-500) 18%, var(--ink-3))",
                  display: "grid", placeItems: "center",
                  border: "1px solid color-mix(in oklch, var(--brand-500) 30%, transparent)",
                }}>
                  <Icon name={i === 0 ? "boxes-stacked" : i === 1 ? "chart-line" : "database"} size={16} color="var(--brand-200)" />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500, color: "var(--fg-0)" }}>{it.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>{it.desc}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line-2)", borderRadius: 8, height: 32 }}>
                  <button className="btn-ghost" style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: 0, color: "var(--fg-2)" }}><Icon name="minus" size={11} /></button>
                  <div className="tnum" style={{ width: 28, textAlign: "center", fontSize: 13 }}>{it.qty}</div>
                  <button className="btn-ghost" style={{ width: 30, height: 30, borderRadius: 6, background: "transparent", border: 0, color: "var(--fg-2)" }}><Icon name="plus" size={11} /></button>
                </div>
                <div className="tnum" style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-0)", minWidth: 80, textAlign: "right" }}>
                  {gbp(it.price * it.qty)}<span style={{ color: "var(--fg-3)", fontWeight: 400, fontSize: 12 }}> /mo</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cross-sell */}
          <UpsellRow />

          {/* Trust */}
          <div style={{ marginTop: 24, display: "flex", gap: 18, alignItems: "center", padding: "16px 18px", background: "color-mix(in oklch, var(--success-500) 7%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--success-500) 22%, transparent)", borderRadius: 12 }}>
            <Icon name="shield-check" size={20} color="var(--success-400)" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>14-day money back. No questions.</div>
              <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 1 }}>UK consumer rights respected. Cancel from your dashboard, any time.</div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ position: "relative" }}>
          <div className="card-elev" style={{ padding: 24, position: "sticky", top: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", marginBottom: 16 }}>Order summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
              <Row label="Subtotal" value={gbp(sub)} muted />
              <Row label="VAT (20%)" value={gbp(vat)} muted />
              <Row label="Discount" value="—" muted />
              <div className="divider" style={{ margin: "6px 0" }} />
              <Row label="Total · monthly" value={gbp(total)} bold />
            </div>
            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--ink-1)", borderRadius: 8, fontSize: 12, color: "var(--fg-2)", border: "1px solid var(--line-1)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                <Icon name="tag" size={11} color="var(--gold-400)" />
                <span style={{ fontWeight: 500, color: "var(--fg-1)" }}>Bundle saved you {gbp(8)} /mo</span>
              </div>
              <span style={{ color: "var(--fg-3)" }}>Buying these three separately would be {gbp(42)} /mo.</span>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 18 }}>
              Continue to payment <Icon name="arrow-right" size={12} />
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14, fontSize: 11, color: "var(--fg-4)" }}>
              <Icon name="lock" size={11} /> Encrypted · Stripe · 3DS-2 ready
            </div>
          </div>

          {/* Tiny Vi peek */}
          <div style={{ position: "absolute", right: -10, top: -42, transform: "rotate(8deg)" }}>
            <Vi pose="peek-right" size={88} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: muted ? "var(--fg-3)" : "var(--fg-1)" }}>{label}</span>
      <span className="tnum" style={{ color: bold ? "var(--fg-0)" : "var(--fg-1)", fontWeight: bold ? 600 : 400, fontSize: bold ? 16 : 13.5 }}>{value}</span>
    </div>
  );
}

function UpsellRow() {
  const items = [
    { name: "Host Trust", desc: "Add social proof on top of any site", price: 7, icon: "shield-check" },
    { name: "Host Notify", desc: "Push without an email address", price: 6, icon: "bell" },
  ];
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-2)", marginBottom: 10, letterSpacing: "0.02em" }}>OFTEN ADDED · BUNDLE & SAVE 15%</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map(i => (
          <div key={i.name} className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--ink-3)", display: "grid", placeItems: "center", border: "1px solid var(--line-2)" }}>
              <Icon name={i.icon} size={14} color="var(--brand-200)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-0)" }}>{i.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{i.desc}</div>
            </div>
            <button className="btn btn-secondary btn-sm">+ {gbp(i.price)}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderTopbar({ step, brand }) {
  const steps = ["Basket", "Payment", "Done"];
  return (
    <header style={{
      padding: "16px 56px", borderBottom: "1px solid var(--line-1)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--ink-0)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <BrandMark size="sm" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>order.host.uk.com</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="tnum" style={{
                width: 22, height: 22, borderRadius: "50%",
                background: i + 1 <= step ? "var(--brand-500)" : "var(--ink-3)",
                color: i + 1 <= step ? "var(--fg-0)" : "var(--fg-3)",
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 600,
                border: i + 1 === step ? "2px solid color-mix(in oklch, var(--brand-300) 60%, transparent)" : "1px solid var(--line-2)",
              }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: i + 1 === step ? "var(--fg-0)" : "var(--fg-3)", fontWeight: i + 1 === step ? 500 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ width: 24, height: 1, background: "var(--line-2)" }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-3)", display: "flex", gap: 6, alignItems: "center" }}>
        <Icon name="lock" size={11} /> Secure checkout
      </div>
    </header>
  );
}

// ───────── Checkout (single-page, with progressive disclosure) ─────────
function CheckoutView({ brand = "hostuk" }) {
  return (
    <div className="surface" data-brand={brand} style={{ width: 1280, minHeight: 900 }}>
      <OrderTopbar step={2} brand={brand} />
      <div style={{ padding: "32px 56px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h1 style={{ fontSize: 28, letterSpacing: "-0.025em", marginBottom: 4 }}>Almost there.</h1>
          <p style={{ fontSize: 13.5, color: "var(--fg-3)" }}>You can change everything later from your dashboard. We don't store card numbers — Stripe does.</p>

          {/* Account section */}
          <Section icon="circle-user" title="1 · Your account" status="Signed in as alex@littlewavestudio.uk" statusKind="success">
            <div style={{ display: "flex", gap: 14, alignItems: "center", padding: 14, background: "var(--ink-1)", borderRadius: 10, border: "1px solid var(--line-1)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-700)", display: "grid", placeItems: "center", color: "var(--fg-0)", fontSize: 13, fontWeight: 600 }}>AL</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg-0)" }}>Alex Linton · Little Wave Studio</div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>alex@littlewavestudio.uk · VAT GB 4827 11 89</div>
              </div>
              <a style={{ fontSize: 12, color: "var(--brand-200)" }}>Switch account</a>
            </div>
          </Section>

          {/* Billing address */}
          <Section icon="building" title="2 · Billing address" status="Edit" statusKind="muted">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <Field label="Company (optional)" span={12}>
                <input className="input" defaultValue="Little Wave Studio Ltd" />
              </Field>
              <Field label="Address" span={12}>
                <input className="input" defaultValue="Unit 4, The Old Print Works" />
              </Field>
              <Field label="Town / City" span={6}>
                <input className="input" defaultValue="Bristol" />
              </Field>
              <Field label="Postcode" span={3}>
                <input className="input" defaultValue="BS5 9TJ" />
              </Field>
              <Field label="Country" span={3}>
                <select className="input">
                  <option>United Kingdom</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Payment */}
          <Section icon="credit-card" title="3 · Payment method" status="3-D Secure ready" statusKind="success">
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["Card", "Bacs Direct Debit", "PayPal"].map((m, i) => (
                <button key={m} className={i === 0 ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}>{m}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
              <Field label="Card number" span={12}>
                <div style={{ position: "relative" }}>
                  <input className="input tnum" defaultValue="4242 4242 4242 4242" style={{ paddingLeft: 38 }} />
                  <Icon name="credit-card" size={14} color="var(--fg-3)" />
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                    <span style={{ width: 22, height: 14, background: "var(--brand-500)", borderRadius: 3, display: "inline-block" }} />
                  </span>
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>VISA</span>
                </div>
              </Field>
              <Field label="Expiry" span={4}>
                <input className="input tnum" defaultValue="12 / 28" />
              </Field>
              <Field label="CVC" span={4}>
                <input className="input tnum" defaultValue="•••" />
              </Field>
              <Field label="Postcode" span={4}>
                <input className="input" defaultValue="BS5 9TJ" />
              </Field>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, fontSize: 13, color: "var(--fg-2)" }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--brand-500)" }} />
              Save this card for renewals.
            </label>
          </Section>

          <div style={{ fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6, padding: "12px 16px", border: "1px dashed var(--line-2)", borderRadius: 10 }}>
            By continuing you agree to the Host UK <a style={{ color: "var(--brand-200)" }}>Terms</a>, <a style={{ color: "var(--brand-200)" }}>Privacy</a> and <a style={{ color: "var(--brand-200)" }}>DPA</a>. You can cancel any time from <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-1)" }}>order.host.uk.com / account</span>.
          </div>
        </div>

        {/* Sticky summary */}
        <div>
          <div className="card-elev" style={{ padding: 22, position: "sticky", top: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)", marginBottom: 16 }}>Paying today</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                ["Host UK Family", 24],
                ["Analytics — extra domains", 4],
                ["Storage top-up · 50 GB", 6],
              ].map(([n, p]) => (
                <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--fg-1)" }}>{n}</span>
                  <span className="tnum" style={{ color: "var(--fg-1)" }}>{gbp(p)}</span>
                </div>
              ))}
              <div className="divider" />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-3)" }}>
                <span>Subtotal · monthly</span><span className="tnum">{gbp(34)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-3)" }}>
                <span>VAT 20%</span><span className="tnum">{gbp(6.8)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 8, borderTop: "1px solid var(--line-1)" }}>
                <span style={{ color: "var(--fg-0)", fontWeight: 600, fontSize: 14 }}>Charged today</span>
                <span className="tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--fg-0)" }}>{gbp(40.8)}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--fg-3)", textAlign: "right" }}>Then £40.80 / month. Cancel any time.</div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 18 }}>
              <Icon name="lock" size={12} /> Pay {gbp(40.8)} now
            </button>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14, color: "var(--fg-4)", fontSize: 11 }}>
              <Icon name="shield" size={11} /> Stripe · 3DS-2 · GDPR
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, status, statusKind = "muted", children }) {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--ink-3)", display: "grid", placeItems: "center", border: "1px solid var(--line-2)" }}>
            <Icon name={icon} size={13} color="var(--fg-1)" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>{title}</div>
        </div>
        {status && (
          <span className={statusKind === "success" ? "pill pill-success" : "pill"} style={{ fontSize: 11.5 }}>
            {statusKind === "success" && <Icon name="check" size={9} />}
            {status}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ───────── Confirmation ─────────
function ConfirmView({ brand = "hostuk" }) {
  return (
    <div className="surface" data-brand={brand} style={{ width: 1280, minHeight: 900 }}>
      <OrderTopbar step={3} brand={brand} />
      <div style={{ padding: "60px 56px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, alignItems: "start" }}>
        <div>
          <div className="pill pill-success" style={{ marginBottom: 18 }}>
            <Icon name="check" size={9} /> Payment received · {gbp(40.8)}
          </div>
          <h1 style={{ fontSize: 44, letterSpacing: "-0.03em", marginBottom: 14, lineHeight: 1.05 }}>
            <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Welcome to the flock.</span> Right then, let's get you set up.
          </h1>
          <p style={{ fontSize: 16, color: "var(--fg-2)", maxWidth: 560, marginBottom: 28, lineHeight: 1.55 }}>
            Your invoice has gone to <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-0)", fontSize: 14 }}>alex@littlewavestudio.uk</span>. Three products are provisioning now — usually takes about a minute.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {[
              { name: "Host UK Family", state: "ready", domain: "hub.host.uk.com" },
              { name: "Analytics — extra domains", state: "ready", domain: "analytics.host.uk.com" },
              { name: "Storage top-up", state: "provisioning", domain: "—" },
            ].map(p => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 10 }}>
                {p.state === "ready" ? (
                  <Icon name="circle-check" size={16} color="var(--success-400)" />
                ) : (
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--line-3)", borderTopColor: "var(--brand-300)", animation: "spin 1s linear infinite" }} />
                )}
                <div style={{ flex: 1, fontSize: 14, color: "var(--fg-0)" }}>{p.name}</div>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{p.domain}</span>
                <span className={p.state === "ready" ? "pill pill-success" : "pill pill-warn"}>{p.state}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <a className="btn btn-primary btn-lg">
              Go to your dashboard <Icon name="arrow-right" size={12} />
            </a>
            <a className="btn btn-secondary btn-lg">
              <Icon name="receipt" size={13} /> View invoice (PDF)
            </a>
          </div>
        </div>

        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Vi pose="master" size={340} style={{ filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.5))" }} />
          <div className="card-elev" style={{ padding: 18, maxWidth: 320, position: "relative" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-200)", marginBottom: 6 }}>VI · welcome note</div>
            <div style={{ fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
              "I'll be popping up occasionally with tips and the odd bit of corvid wisdom. Your scheduled posts are waiting. Now go do something more interesting — we've got this covered."
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

Object.assign(window, { CartView, CheckoutView, ConfirmView });
