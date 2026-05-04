/**
 * Vi data model — types re-exported from the Wails-generated bindings.
 *
 * The Go side at core/ide/go/pkg/vi defines the canonical surface
 * (Brief, Site, ActivityItem, ViStatus) and the bridge methods Status /
 * Briefs / Sites / Activity. Bindings live at @bindings/dappco.re/go/ide/
 * pkg/{vi,server}.
 *
 * Components import types from here for stable paths; the runtime
 * loadViData() helper lazy-imports the @wailsio/runtime + bindings so
 * SSR contexts (main.server.ts) don't try to evaluate Wails code.
 *
 * Vi (Violet) — character: "the chill chick — a raven watching the tower
 * for people, letting them know when the weather is changing or trouble
 * is at the gates." Calm presence, not interruption.
 *
 * Cross-link: plans/project/lthn/desktop/RFC.md §1.3
 * Mascot canon: plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md
 */

import type {
  ActivityItem as BindingActivityItem,
  Brief as BindingBrief,
  BriefAction as BindingBriefAction,
  Site as BindingSite,
  ViStatus as BindingViStatus,
} from '@bindings/dappco.re/go/ide/pkg/vi';

export type Tone = 'warning' | 'success' | 'info' | 'neutral' | 'danger';
export type SiteStatus = 'green' | 'amber' | 'red';

export type BriefAction = BindingBriefAction;
export type Brief = BindingBrief;
export type Site = BindingSite;
export type ActivityItem = BindingActivityItem;
export type ViStatus = BindingViStatus;

/** The empty status used while bindings are still loading or in SSR contexts. */
export const emptyViStatus: ViStatus = {
  connected: false,
  latencyMs: 0,
  watching: 0,
  pending: 0,
} as ViStatus;

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
 * Lazy-load the Vi data via Wails bindings. Browser-only — the caller is
 * responsible for guarding with isPlatformBrowser before invoking; in SSR
 * contexts this would crash on the dynamic @wailsio/runtime import.
 *
 *   if (this.isBrowser) {
 *     const snap = await loadViData();
 *     this.status.set(snap.status);
 *   }
 */
export async function loadViData(): Promise<ViSnapshot> {
  const bridge = await import('@bindings/dappco.re/go/ide/pkg/server/vibridge');
  const [status, briefs, sites, activity] = await Promise.all([
    bridge.Status(),
    bridge.Briefs(),
    bridge.Sites(),
    bridge.Activity(),
  ]);
  return { status, briefs, sites, activity };
}
