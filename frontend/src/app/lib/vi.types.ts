/**
 * Vi data model — local type shapes that mirror the wails-generated
 * bindings at frontend/bindings/dappco.re/go/ide/pkg/vi/. We declare the
 * shapes here instead of importing from `@bindings/...` so the types
 * resolve cleanly under tsconfig.app.json's include scope (the bindings
 * tree lives outside src/, so its files don't make it into Angular's
 * compilation graph).
 *
 * If/when the canonical Go service ships and we wire it through Wails,
 * swap these inline declarations for re-exports of the binding types via
 * a relative path import — the runtime loadViData() helper already does
 * the lazy import dance.
 *
 * Vi (Violet) — character: "the chill chick — a raven watching the tower
 * for people, letting them know when the weather is changing or trouble
 * is at the gates." Calm presence, not interruption.
 *
 * Cross-link: plans/project/lthn/desktop/RFC.md §1.3
 * Mascot canon: plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md
 */

export type Tone = 'warning' | 'success' | 'info' | 'neutral' | 'danger';
export type SiteStatus = 'green' | 'amber' | 'red';

export interface BriefAction {
  label: string;
  primary?: boolean;
}

export interface Brief {
  tone: Tone;
  time: string;
  title: string;
  body: string;
  actions: BriefAction[];
  done?: boolean;
  shortcut?: string;
}

export interface Site {
  domain: string;
  stack: string;
  status: SiteStatus;
  /** e.g. "99.998" */
  uptime: string;
  /** ms */
  response: number;
  /** 12 points */
  sparkData: number[];
  /** human relative */
  lastDeploy: string;
  warn?: string;
}

export interface ActivityItem {
  who: 'vi' | 'you' | string;
  time: string;
  text: string;
  icon: string;
  tone: Tone;
}

export interface ViStatus {
  connected: boolean;
  latencyMs: number;
  watching: number;
  pending: number;
}

export const emptyViStatus: ViStatus = {
  connected: false,
  latencyMs: 0,
  watching: 0,
  pending: 0,
};

/**
 * Snapshot returned by loadViData() — the four Vi data slices the GUI
 * surface needs in one round-trip's worth of awaits.
 */
export interface ViSnapshot {
  status: ViStatus;
  briefs: Brief[];
  sites: Site[];
  activity: ActivityItem[];
}

/**
 * Lazy-load the Vi data via the wails-generated bridge. Browser-only —
 * caller must guard with isPlatformBrowser before invoking; SSR would
 * crash on the @wailsio/runtime side-effect import inside vibridge.
 *
 *   if (this.isBrowser) {
 *     const snap = await loadViData();
 *     this.status.set(snap.status);
 *   }
 */
export async function loadViData(): Promise<ViSnapshot> {
  const bridge = await import(
    '../../../bindings/dappco.re/go/ide/pkg/server/vibridge'
  );
  const [status, briefs, sites, activity] = await Promise.all([
    bridge.Status(),
    bridge.Briefs(),
    bridge.Sites(),
    bridge.Activity(),
  ]);
  return {
    status: status as ViStatus,
    briefs: briefs as Brief[],
    sites: sites as Site[],
    activity: activity as ActivityItem[],
  };
}
