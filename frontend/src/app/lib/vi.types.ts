/**
 * Vi data model — Brief / Site / Activity / ViStatus.
 *
 * Canonical definition: plans/ops/hostuk/website/_design/lethean-3/design_handoff_native_profiles/README.md
 * Cross-link: plans/project/lthn/desktop/RFC.md §1.3 (Vi Control Panel as desktop shell)
 *
 * Fixtures here are inline placeholders for early dev. The native handoff says:
 * "expect it to come from the Go side via Wails bindings (or local JSON RPC for iOS/iPad)".
 * When the backend Vi service ships in core/ide/go/pkg/vi/ (TBD), these fixtures
 * get replaced with bindings calls.
 *
 * Vi (Violet) — character: "the chill chick — a raven watching the tower for
 * people, letting them know when the weather is changing or trouble is at the
 * gates." Calm presence, not interruption. Surfaces what matters.
 * See plans/.../mascot-raven.md for full canon.
 */

export type Tone = 'warning' | 'success' | 'info' | 'neutral' | 'danger';

export interface BriefAction {
  label: string;
  primary?: boolean;
}

export interface Brief {
  tone: Tone;
  time: string;            // ISO or human ("06:42", "Yesterday")
  title: string;
  body: string;
  actions: BriefAction[];
  done?: boolean;
  shortcut?: string;       // Darwin/iPad only ("⌘1")
}

export type SiteStatus = 'green' | 'amber' | 'red';

export interface Site {
  domain: string;
  stack: string;           // e.g. "Host UK · Mail · Analytics"
  status: SiteStatus;
  uptime: string;          // e.g. "99.998"
  response: number;        // ms
  sparkData: number[];     // 12 points
  lastDeploy: string;      // human relative
  warn?: string;
}

export interface ActivityItem {
  who: 'vi' | 'you';
  time: string;
  text: string;
  icon: string;            // e.g. "wave-pulse", "shield-check"
  tone: Tone;
}

export interface ViStatus {
  connected: boolean;
  latencyMs: number;
  watching: number;        // site count
  pending: number;         // things waiting on user input
}

/**
 * Fixture data — replaces with Wails bindings once core/ide/go/pkg/vi/ ships.
 * Voice + tone of the briefs follows the chill-chick-raven character canon.
 */
export const viFixtures = {
  status: {
    connected: true,
    latencyMs: 12,
    watching: 4,
    pending: 1,
  } satisfies ViStatus,

  briefs: [
    {
      tone: 'warning',
      time: '06:42',
      title: 'TLS cert renews in 8 days · forge.lthn.sh',
      body: 'ZeroSSL wildcard. The auto-renew job last ran 71 days ago; worth a manual nudge before the window narrows.',
      actions: [{ label: 'Renew now', primary: true }, { label: 'Snooze 24h' }],
      shortcut: '⌘1',
    },
    {
      tone: 'success',
      time: 'Yesterday',
      title: 'Mattermost on de1 — quiet for 18h',
      body: 'No PG slot exhaustion since the conn-pool cap landed. Healthcheck green.',
      actions: [{ label: 'View status' }],
      done: true,
    },
    {
      tone: 'info',
      time: '2d ago',
      title: 'Lethean-3 design drop landed in plans tree',
      body: 'Tokens, native profiles, Vi Control Panel pattern. Worth a read before next frontend touch.',
      actions: [{ label: 'Open plans' }, { label: 'Mark read' }],
    },
  ] satisfies Brief[],

  sites: [
    {
      domain: 'lthn.ai',
      stack: 'Lethean · EaaS · Authentik',
      status: 'green',
      uptime: '99.998',
      response: 142,
      sparkData: [120, 135, 128, 140, 138, 145, 142, 139, 144, 138, 141, 142],
      lastDeploy: '2d ago',
    },
    {
      domain: 'team.lthn.ai',
      stack: 'Mattermost · PG · Mailcow',
      status: 'green',
      uptime: '99.96',
      response: 88,
      sparkData: [92, 85, 90, 88, 86, 84, 87, 88, 90, 87, 88, 88],
      lastDeploy: 'today',
    },
    {
      domain: 'forge.lthn.sh',
      stack: 'Forgejo · PG · S3',
      status: 'amber',
      uptime: '99.92',
      response: 167,
      sparkData: [150, 155, 160, 165, 170, 168, 172, 169, 165, 167, 167, 167],
      lastDeploy: '11d ago',
      warn: 'TLS cert renews in 8 days',
    },
    {
      domain: 'tasks.lthn.sh',
      stack: 'Mantis · PG',
      status: 'green',
      uptime: '99.99',
      response: 95,
      sparkData: [90, 92, 95, 93, 94, 95, 96, 95, 94, 95, 95, 95],
      lastDeploy: '5d ago',
    },
  ] satisfies Site[],

  activity: [
    { who: 'vi', time: '14:08', text: 'Healthcheck for team.lthn.ai green for 18h.', icon: 'wave-pulse', tone: 'success' },
    { who: 'you', time: '13:42', text: 'Closed Mantis #1341 — core.Result cascade.', icon: 'shield-check', tone: 'info' },
    { who: 'vi', time: '12:05', text: 'forge.lthn.sh response time crept above 160ms.', icon: 'circle-exclamation', tone: 'warning' },
    { who: 'you', time: '11:30', text: 'Pushed plans submodule pointer (lthn website plumbing).', icon: 'code-branch', tone: 'neutral' },
    { who: 'vi', time: '10:14', text: 'Mailcow inbox quiet — no new tickets overnight.', icon: 'envelope-circle-check', tone: 'neutral' },
  ] satisfies ActivityItem[],
};
