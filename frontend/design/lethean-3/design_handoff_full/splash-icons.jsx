/* eslint-disable */
// ─────────────────────────────────────────────────────────
// Splash screens + app icons
// • iOS launch screen (full-bleed device frame with brand)
// • Android splash (centred mark · system status bar)
// • macOS dock icon family (3 brands rendered at dock size)
// • Plus a "icon construction" plate — same icon at 16/32/128/512
// ─────────────────────────────────────────────────────────

/* The app mark — geometric, brand-colourable, derived from
   the bird-eye motif (purple square w/ glowing pupil). Looks
   strong at every scale. */
function AppIcon({ size = 128, brand = "hostuk", style = {} }) {
  const r = Math.round(size * 0.234);   // ~iOS 1024 → 240
  return (
    <div data-brand={brand} className="surface" style={{
      width: size, height: size,
      borderRadius: r,
      background: "var(--brand-700)",
      position: "relative",
      overflow: "hidden",
      boxShadow: size >= 64 ? "0 1px 0 0 color-mix(in oklch, var(--fg-0) 12%, transparent) inset, 0 " + Math.round(size * 0.06) + "px " + Math.round(size * 0.12) + "px rgba(0,0,0,.32)" : "none",
      ...style,
    }}>
      {/* radial brand wash */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 30% 30%, var(--brand-500), var(--brand-800) 80%)`,
      }} />
      {/* eye shape */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        width: size * 0.62, height: size * 0.42,
        borderRadius: "50%",
        background: "var(--ink-0)",
        boxShadow: "inset 0 0 0 " + Math.max(1, size * 0.012) + "px color-mix(in oklch, var(--brand-300) 50%, transparent)",
        display: "grid", placeItems: "center",
      }}>
        {/* iris */}
        <div style={{
          width: size * 0.22, height: size * 0.22,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, var(--gold-300), var(--brand-500) 60%, var(--brand-700) 100%)`,
          boxShadow: `0 0 ${size * 0.06}px var(--brand-400)`,
          position: "relative",
        }}>
          {/* highlight */}
          <span style={{
            position: "absolute", top: "18%", left: "22%",
            width: size * 0.05, height: size * 0.05,
            borderRadius: "50%", background: "var(--fg-0)",
          }} />
        </div>
      </div>
      {/* corner ticks (subtle, only at large sizes) */}
      {size >= 96 && (
        <div style={{
          position: "absolute", left: size * 0.1, bottom: size * 0.1,
          fontSize: size * 0.07,
          fontFamily: "var(--font-mono)",
          color: "color-mix(in oklch, var(--fg-0) 36%, transparent)",
          letterSpacing: "0.06em",
        }}>
          {brand === "hostuk" ? "host.uk" : brand === "lethean" ? "lethean" : "ofm"}
        </div>
      )}
    </div>
  );
}

/* ── iOS launch screen ─────────────────────────────────── */
function IOSSplash({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      position: "relative",
      overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* faux status bar */}
      <div style={{
        height: 47, flexShrink: 0,
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center", padding: "0 28px",
        fontSize: 15, fontWeight: 600, color: "var(--fg-0)",
      }}>
        <span style={{ textAlign: "left", fontFamily: '-apple-system, "SF Pro Display", system-ui' }}>9:41</span>
        <span style={{ width: 96, height: 30, background: "#000", borderRadius: 18 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, alignItems: "center" }}>
          <Icon name="signal" size={13} color="var(--fg-0)" />
          <Icon name="wifi" size={13} color="var(--fg-0)" />
          <span style={{ width: 24, height: 11, border: "1.5px solid var(--fg-0)", borderRadius: 3, position: "relative" }}>
            <span style={{ position: "absolute", inset: 1.5, width: "82%", background: "var(--fg-0)", borderRadius: 1 }} />
          </span>
        </div>
      </div>

      {/* glow */}
      <div className="brand-glow" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />

      {/* centred mark + word */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, position: "relative", zIndex: 1 }}>
        <AppIcon size={108} brand={brand} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, color: "var(--fg-0)", fontWeight: 600, letterSpacing: "-0.02em" }}>
            {brand === "hostuk" ? "Host UK" : brand === "lethean" ? "Lethean" : "OFM"}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            {brand === "hostuk" ? "hosting · made calm" : brand === "lethean" ? "open source · ethically built" : "creator agency · confident roster"}
          </div>
        </div>
      </div>

      {/* footer mark */}
      <div style={{
        padding: "16px 0 28px", textAlign: "center",
        fontSize: 11, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
        position: "relative", zIndex: 1,
      }}>
        a lethean studio
      </div>

      {/* home indicator */}
      <div style={{ height: 34, flexShrink: 0, display: "grid", placeItems: "center", position: "relative", zIndex: 1 }}>
        <span style={{ width: 134, height: 5, borderRadius: 3, background: "var(--fg-0)" }} />
      </div>
    </div>
  );
}

/* ── Android splash (no status-bar tinting; system handles it) ── */
function AndroidSplash({ brand = "hostuk" }) {
  return (
    <div data-brand={brand} className="surface" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* status bar */}
      <div style={{
        height: 32, flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px",
        fontSize: 13, color: "var(--fg-0)", fontWeight: 500,
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, position: "relative" }}>
        <div className="brand-glow" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
        <AppIcon size={96} brand={brand} style={{ position: "relative", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 22, color: "var(--fg-0)", fontWeight: 500, letterSpacing: "-0.015em" }}>
            {brand === "hostuk" ? "Host UK" : brand === "lethean" ? "Lethean" : "OFM"}
          </div>
        </div>

        {/* indeterminate progress */}
        <div style={{
          position: "relative", zIndex: 1,
          width: 32, height: 32, marginTop: 16,
          borderRadius: 999,
          border: "2px solid var(--line-2)",
          borderTopColor: "var(--brand-300)",
          animation: "spin 1s linear infinite",
        }} />
      </div>

      <div style={{ height: 24, flexShrink: 0, display: "grid", placeItems: "center" }}>
        <span style={{ width: 104, height: 4, borderRadius: 2, background: "var(--fg-1)" }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Icon family showcase plate ──────────────────────── */
function IconShowcase() {
  return (
    <div className="surface" data-brand="hostuk" style={{
      width: "100%", height: "100%",
      background: "var(--ink-0)",
      padding: 36,
      display: "flex", flexDirection: "column", gap: 28,
    }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.1em" }}>
          APP ICONS · THREE BRANDS · ONE GEOMETRY
        </div>
        <h2 style={{ fontSize: 24, letterSpacing: "-0.02em", marginTop: 6 }}>
          Same eye. <span className="editorial" style={{ fontStyle: "italic", color: "var(--brand-200)" }}>Different cast.</span>
        </h2>
      </div>

      {/* brand row — 3 brands × 4 sizes */}
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr 1fr", gap: 24, alignItems: "center" }}>
        <div />
        {[16, 32, 64, 128].map((s) => (
          <div key={s} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", textAlign: "center" }}>
            {s}px
          </div>
        ))}

        {[
          { brand: "hostuk", label: "Host UK" },
          { brand: "lethean", label: "Lethean" },
          { brand: "ofm", label: "OFM" },
        ].map((b) => (
          <React.Fragment key={b.brand}>
            <div style={{ fontSize: 13, color: "var(--fg-1)", fontWeight: 500 }}>{b.label}</div>
            {[16, 32, 64, 128].map((s) => (
              <div key={s} style={{ display: "grid", placeItems: "center" }}>
                <AppIcon size={s} brand={b.brand} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* macOS dock row */}
      <div style={{
        marginTop: 8,
        padding: "16px 22px",
        background: "color-mix(in oklch, var(--ink-3) 70%, transparent)",
        border: "1px solid var(--line-2)",
        borderRadius: 16,
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", gap: 14, justifyContent: "center",
      }}>
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", marginRight: 10 }}>macOS dock · 64px</div>
        <AppIcon size={56} brand="hostuk" />
        <AppIcon size={56} brand="lethean" />
        <AppIcon size={56} brand="ofm" />
        <span style={{ width: 1, height: 32, background: "var(--line-2)", margin: "0 6px" }} />
        {/* a sample of "other apps" to show contrast */}
        <div style={{ width: 56, height: 56, borderRadius: 13, background: "linear-gradient(135deg, #2af, #06f)", display: "grid", placeItems: "center", color: "#fff", fontSize: 18, fontWeight: 700 }}>S</div>
        <div style={{ width: 56, height: 56, borderRadius: 13, background: "#1a1a1a", display: "grid", placeItems: "center", color: "#fff", fontSize: 18, fontWeight: 700 }}>X</div>
      </div>

      {/* Construction notes */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14,
        fontSize: 12, color: "var(--fg-2)", lineHeight: 1.55,
      }}>
        <Note title="Geometry" body="Squircle (iOS 23.4% radius). Eye occupies central 62% × 42%. Iris is 22% diameter." />
        <Note title="Brand wash" body="Radial gradient brand-500 → brand-800 from top-left. Hue is the only thing that changes between brands." />
        <Note title="Pupil" body="Iris uses gold-300 hot-spot fading to brand-500/700. Same geometry as Vi's eye — the studio mark." />
      </div>
    </div>
  );
}

function Note({ title, body }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: "var(--ink-2)",
      border: "1px solid var(--line-1)",
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--brand-300)", letterSpacing: "0.06em", marginBottom: 4 }}>{title.toUpperCase()}</div>
      <div>{body}</div>
    </div>
  );
}

Object.assign(window, { AppIcon, IOSSplash, AndroidSplash, IconShowcase });
