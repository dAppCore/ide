/* eslint-disable */
// order.host.uk.com — Customer account dashboard
// Active subscriptions, invoices, payment methods, usage. Dense but breathable.

function AccountDashboard({ brand = "hostuk" }) {
  return (
    <div className="surface" data-brand={brand} style={{ width: 1280, minHeight: 900, display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <DashSidebar />
      <div style={{ padding: "28px 36px", overflow: "hidden" }}>
        <DashHeader />
        <BillingSummaryRow />
        <SubscriptionsTable />
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginTop: 24 }}>
          <InvoicesPanel />
          <PaymentMethodsPanel />
        </div>
      </div>
    </div>
  );
}

function DashSidebar() {
  const items = [
    { icon: "house", label: "Overview", active: true },
    { icon: "boxes-stacked", label: "Subscriptions" },
    { icon: "receipt", label: "Invoices" },
    { icon: "credit-card", label: "Payment methods" },
    { icon: "chart-pie", label: "Usage" },
    { icon: "users", label: "Team" },
    { icon: "shield-halved", label: "Security" },
    { icon: "circle-question", label: "Help & support" },
  ];
  return (
    <aside style={{ background: "var(--ink-0)", borderRight: "1px solid var(--line-1)", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ padding: "0 8px 18px", borderBottom: "1px solid var(--line-1)", marginBottom: 14 }}>
        <BrandMark size="sm" />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-4)", marginTop: 6 }}>order.host.uk.com</div>
      </div>
      {items.map((it, i) => (
        <a key={i} style={{
          display: "flex", alignItems: "center", gap: 11, padding: "8px 10px", borderRadius: 7,
          fontSize: 13.5, color: it.active ? "var(--fg-0)" : "var(--fg-2)",
          background: it.active ? "var(--ink-3)" : "transparent",
          border: it.active ? "1px solid var(--line-1)" : "1px solid transparent",
        }}>
          <Icon name={it.icon} size={13} color={it.active ? "var(--brand-200)" : "var(--fg-3)"} />
          {it.label}
        </a>
      ))}
      <div style={{ marginTop: "auto", padding: "12px 10px", background: "var(--ink-2)", border: "1px solid var(--line-1)", borderRadius: 10, fontSize: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <Vi pose="peek-left" size={36} />
          <div style={{ fontWeight: 500, color: "var(--fg-1)" }}>Need a hand?</div>
        </div>
        <div style={{ color: "var(--fg-3)", lineHeight: 1.4 }}>I'll find a real human in under 4 hours, 9–5 UK.</div>
      </div>
    </aside>
  );
}

function DashHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div>
        <div className="pill" style={{ marginBottom: 8 }}><Icon name="circle" size={7} color="var(--success-400)" /> Active · monthly billing</div>
        <h1 style={{ fontSize: 28, letterSpacing: "-0.025em" }}>Account · Little Wave Studio</h1>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-sm"><Icon name="download" size={11} /> Export data (GDPR)</button>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={11} /> Add a product</button>
      </div>
    </div>
  );
}

function BillingSummaryRow() {
  const cards = [
    { label: "Next charge", v: gbp(40.8), s: "12 May 2026 · in 8 days", icon: "calendar-check" },
    { label: "This month", v: gbp(40.8), s: "1 invoice · paid", icon: "receipt" },
    { label: "Storage used", v: "6.4 GB", s: "of 10 GB · 64%", icon: "database", showBar: 64 },
    { label: "Seats", v: "3 / 5", s: "2 invitations pending", icon: "users" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
      {cards.map((c, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, color: "var(--fg-3)", letterSpacing: "0.02em", textTransform: "uppercase" }}>{c.label}</span>
            <Icon name={c.icon} size={12} color="var(--fg-4)" />
          </div>
          <div className="tnum" style={{ fontSize: 24, fontWeight: 600, color: "var(--fg-0)", letterSpacing: "-0.02em", marginBottom: 4 }}>{c.v}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{c.s}</div>
          {c.showBar !== undefined && (
            <div style={{ marginTop: 10, height: 4, background: "var(--ink-3)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${c.showBar}%`, height: "100%", background: "var(--brand-400)" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubscriptionsTable() {
  const rows = [
    { name: "Host UK Family", icon: "boxes-stacked", state: "Active", price: 24, next: "12 May", since: "Jan 2026" },
    { name: "Analytics — extra domains", icon: "chart-line", state: "Active", price: 4, next: "12 May", since: "Mar 2026" },
    { name: "Storage top-up · 50 GB", icon: "database", state: "Provisioning", price: 6, next: "12 May", since: "Today" },
    { name: "Host Trust", icon: "shield-check", state: "Trial · 9 days left", price: 0, next: "—", since: "—" },
  ];
  return (
    <div className="card" style={{ overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>Active subscriptions</div>
        <a style={{ fontSize: 12, color: "var(--brand-200)" }}>Manage all</a>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--ink-1)" }}>
            {["Product", "Status", "Price", "Next charge", "Started", ""].map((h, i) => (
              <th key={i} style={{ textAlign: i === 2 ? "right" : "left", padding: "10px 20px", fontSize: 11, fontWeight: 500, color: "var(--fg-3)", letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: "1px solid var(--line-1)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--line-1)" : "none" }}>
              <td style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: "var(--ink-3)", display: "grid", placeItems: "center", border: "1px solid var(--line-2)" }}>
                    <Icon name={r.icon} size={12} color="var(--brand-200)" />
                  </div>
                  <span style={{ fontSize: 13.5, color: "var(--fg-0)", fontWeight: 500 }}>{r.name}</span>
                </div>
              </td>
              <td style={{ padding: "14px 20px" }}>
                <span className={
                  r.state === "Active" ? "pill pill-success" :
                  r.state === "Provisioning" ? "pill pill-warn" :
                  "pill"
                }>{r.state}</span>
              </td>
              <td className="tnum" style={{ padding: "14px 20px", fontSize: 13.5, color: "var(--fg-0)", textAlign: "right" }}>
                {r.price === 0 ? <span style={{ color: "var(--fg-3)" }}>Free trial</span> : <>{gbp(r.price)}<span style={{ color: "var(--fg-3)", fontSize: 12 }}> /mo</span></>}
              </td>
              <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--fg-1)" }}>{r.next}</td>
              <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--fg-3)" }}>{r.since}</td>
              <td style={{ padding: "14px 20px", textAlign: "right" }}>
                <button className="btn btn-ghost btn-sm"><Icon name="ellipsis" size={11} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoicesPanel() {
  const rows = [
    { id: "INV-2026-0412", date: "12 Apr 2026", amount: 40.80, state: "Paid" },
    { id: "INV-2026-0312", date: "12 Mar 2026", amount: 34.80, state: "Paid" },
    { id: "INV-2026-0212", date: "12 Feb 2026", amount: 28.80, state: "Paid" },
    { id: "INV-2026-0112", date: "12 Jan 2026", amount: 28.80, state: "Paid" },
  ];
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>Recent invoices</div>
        <a style={{ fontSize: 12, color: "var(--brand-200)" }}>See all 12</a>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 14, alignItems: "center", borderBottom: i < rows.length - 1 ? "1px solid var(--line-1)" : "none" }}>
          <Icon name="file-pdf" size={14} color="var(--fg-3)" />
          <div>
            <div className="tnum" style={{ fontSize: 13, color: "var(--fg-0)" }}>{r.id}</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{r.date}</div>
          </div>
          <span className="pill pill-success" style={{ fontSize: 10.5 }}>{r.state}</span>
          <span className="tnum" style={{ fontSize: 13, color: "var(--fg-0)" }}>{gbp(r.amount)}</span>
          <button className="btn btn-ghost btn-sm" style={{ width: 28, padding: 0 }}><Icon name="download" size={11} /></button>
        </div>
      ))}
    </div>
  );
}

function PaymentMethodsPanel() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>Payment methods</div>
        <button className="btn btn-secondary btn-sm"><Icon name="plus" size={10} /> Add</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ padding: 14, background: "var(--ink-1)", borderRadius: 10, border: "1px solid var(--line-2)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 38, height: 26, borderRadius: 4, background: "linear-gradient(135deg, var(--brand-700), var(--brand-500))", display: "grid", placeItems: "center", color: "white", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>VISA</div>
          <div style={{ flex: 1 }}>
            <div className="tnum" style={{ fontSize: 13.5, color: "var(--fg-0)" }}>•••• •••• •••• 4242</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Alex Linton · expires 12 / 28</div>
          </div>
          <span className="pill pill-brand">Default</span>
        </div>
        <div style={{ padding: 14, background: "var(--ink-1)", borderRadius: 10, border: "1px solid var(--line-1)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 38, height: 26, borderRadius: 4, background: "var(--ink-3)", display: "grid", placeItems: "center", color: "var(--fg-2)", fontSize: 11 }}><Icon name="building-columns" size={12} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, color: "var(--fg-0)" }}>Bacs Direct Debit</div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Lloyds · ••55-91 · A LINTON</div>
          </div>
          <button className="btn btn-ghost btn-sm">Make default</button>
        </div>
      </div>
      <div style={{ marginTop: 18, padding: 12, background: "color-mix(in oklch, var(--info-500) 7%, var(--ink-2))", border: "1px solid color-mix(in oklch, var(--info-500) 22%, transparent)", borderRadius: 8, fontSize: 12, color: "var(--fg-2)", display: "flex", gap: 10 }}>
        <Icon name="circle-info" size={12} color="var(--info-400)" style={{ marginTop: 2 }} />
        <div>Cards are stored by Stripe. We never see the number — your bank handles 3-D Secure when needed.</div>
      </div>
    </div>
  );
}

Object.assign(window, { AccountDashboard });
