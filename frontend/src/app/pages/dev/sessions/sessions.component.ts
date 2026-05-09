// SPDX-Licence-Identifier: EUPL-1.2

import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { callBridge } from '../../../lib/bridge';
import { FileEditorStore } from '../../../services/store/file-editor.store';

interface SessionProject {
  name: string;
  display_path: string;
  path: string;
  session_count: number;
  latest_at?: string;
}

interface SessionSummary {
  id: string;
  path: string;
  start_time?: string;
  end_time?: string;
  event_count: number;
  size_bytes: number;
}

interface ActiveSession {
  id: string;
  path: string;
  project: string;
  project_path: string;
  size_bytes: number;
  modified: string;
  age_seconds: number;
}

interface SearchHit {
  session_id: string;
  timestamp: string;
  tool: string;
  match: string;
}

interface LiveEvent {
  timestamp: string;
  type?: string;
  role?: string;
  tool?: string;
  input?: string;
}

interface SessionAnalytics {
  duration_seconds?: number;
  active_seconds?: number;
  event_count?: number;
  estimated_input_tokens?: number;
  estimated_output_tokens?: number;
  success_rate?: number;
  tool_counts?: Record<string, number>;
  avg_latency_ms?: Record<string, number>;
}

interface InspectedSession {
  id: string;
  path: string;
  start: string;
  end: string;
  total_events: number;
  tail_offset: number;
  event_tail: { timestamp: string; type: string; tool?: string; duration_ms: number; input: string; success?: boolean }[];
  analytics?: SessionAnalytics;
}

const SESSION_LIVE_CAP = 500;

/**
 * Sessions panel — Claude Code transcript inspector with browse / active
 * / search tabs and live-tailing for the selected session.
 *
 * TODO(snider/wails): swap callBridge('session_*') for a sessionBridge
 * wails service. Sessions polling especially benefits from line-speed
 * goroutine access.
 *
 * TODO: openSessionEventFile no-ops today (logs only). The IdeComponent
 * legacy version routes through openSearchResult to open the file in
 * Monaco at the offending line. Move to a shared FileEditorService when
 * Search is extracted.
 */
@Component({
  selector: 'dev-sessions',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <section class="block sess-block">
      <div class="block-header sess-header">
        <h2 class="block-title">Sessions</h2>
        <span class="editorial subtitle">Claude Code transcript inspector · {{ sessionProjects().length }} projects.</span>
      </div>
      <div class="sess-tabs">
        <button class="sess-tab" [class.active]="sessionTab() === 'browse'" (click)="sessionTab.set('browse')">Browse</button>
        <button class="sess-tab" [class.active]="sessionTab() === 'active'" (click)="sessionTab.set('active'); loadActiveSessions()">
          Active
          @if (sessionActive().length > 0) { <span class="sess-tab-count">{{ sessionActive().length }}</span> }
        </button>
        <button class="sess-tab" [class.active]="sessionTab() === 'search'" (click)="sessionTab.set('search')">Search</button>
      </div>

      @if (sessionTab() === 'browse') {
        <div class="sess-toolbar">
          <input class="input sess-filter" placeholder="filter projects…" [value]="sessionFilter()" (input)="sessionFilter.set($any($event.target).value)" />
          <button class="btn btn-ghost btn-sm" (click)="loadSessionProjects()" [disabled]="sessionLoading()">↻ refresh</button>
        </div>
      }
      @if (sessionTab() === 'active') {
        <div class="sess-toolbar">
          <select class="input sess-filter" [value]="sessionActiveSinceMinutes()" (change)="sessionActiveSinceMinutes.set(+$any($event.target).value); loadActiveSessions()">
            <option [value]="15">last 15 min</option>
            <option [value]="60">last hour</option>
            <option [value]="240">last 4 hours</option>
            <option [value]="1440">last 24 hours</option>
          </select>
          <button class="btn btn-ghost btn-sm" (click)="loadActiveSessions()" [disabled]="sessionActiveLoading()">↻ refresh</button>
        </div>
      }
      @if (sessionTab() === 'search') {
        <div class="sess-toolbar">
          <input class="input sess-filter" placeholder="search across sessions… (Enter)" [value]="sessionSearchQuery()" (input)="sessionSearchQuery.set($any($event.target).value)" (keyup.enter)="runSessionSearch()" />
          <select class="input sess-filter" style="flex: 0 0 160px" [value]="sessionSearchScope()" (change)="sessionSearchScope.set($any($event.target).value)">
            <option value="current">current project</option>
            <option value="all">all projects</option>
          </select>
          <button class="btn btn-primary btn-sm" (click)="runSessionSearch()" [disabled]="sessionSearchLoading()">
            @if (sessionSearchLoading()) { <span>searching…</span> } @else { <span>Search</span> }
          </button>
        </div>
      }

      <div class="sess-body" [class.sess-active-mode]="sessionTab() === 'active' || sessionTab() === 'search'">
        @if (sessionTab() === 'search') {
          <aside class="sess-search-list">
            <div class="sess-list-title">
              Cross-session hits
              @if (sessionSearchLoading()) { <span class="sess-spin">…</span> }
            </div>
            @if (sessionSearchHits().length === 0 && !sessionSearchLoading()) {
              <div class="sess-empty">Type a query above and press Enter.</div>
            }
            @for (h of sessionSearchHits(); track $index) {
              <button class="sess-search-hit" (click)="openSessionSearchHit(h)" [title]="'Open session ' + h.session_id">
                <div class="sess-search-head">
                  <code class="sess-active-id">{{ h.session_id.slice(0, 8) }}</code>
                  <span class="sess-search-when">{{ h.timestamp.slice(0, 19).replace('T', ' ') }}</span>
                  @if (h.tool) { <span class="sess-search-tool">{{ h.tool }}</span> }
                </div>
                <pre class="sess-search-match">{{ h.match }}</pre>
              </button>
            }
          </aside>
        } @else if (sessionTab() === 'active') {
          <aside class="sess-active-list">
            <div class="sess-list-title">
              Active sessions ({{ sessionActive().length }})
              @if (sessionActiveLoading()) { <span class="sess-spin">…</span> }
            </div>
            @if (sessionActive().length === 0 && !sessionActiveLoading()) {
              <div class="sess-empty">No sessions modified in the last {{ sessionActiveSinceMinutes() }}min.</div>
            }
            @for (a of sessionActive(); track a.path) {
              <button class="sess-active-row" [class.active]="sessionSelected()?.path === a.path" (click)="openActiveSession(a)">
                <div class="sess-active-head">
                  <code class="sess-active-id">{{ a.id.slice(0, 8) }}</code>
                  <span class="sess-active-age" [class.sess-active-fresh]="a.age_seconds < 60">{{ formatAge(a.age_seconds) }} ago</span>
                </div>
                <div class="sess-active-proj">{{ a.project_path }}</div>
                <div class="sess-active-meta">
                  {{ a.size_bytes > 1024*1024 ? (a.size_bytes / 1048576 | number:'1.0-1') + 'M' : (a.size_bytes / 1024 | number:'1.0-0') + 'k' }}
                </div>
              </button>
            }
          </aside>
        } @else {
          <aside class="sess-projects">
            <div class="sess-list-title">Projects ({{ sessionVisible().length }})</div>
            @for (p of sessionVisible(); track p.name) {
              <button class="sess-project-row" [class.active]="sessionSelectedProject() === p.path" (click)="selectSessionProject(p.path)">
                <div class="sess-project-name" [title]="p.display_path">{{ p.display_path }}</div>
                <div class="sess-project-meta">
                  <span>{{ p.session_count }} sess</span>
                  @if (p.latest_at) { <span>· {{ p.latest_at.slice(0, 10) }}</span> }
                </div>
              </button>
            }
          </aside>
          <aside class="sess-list">
            <div class="sess-list-title">
              Sessions
              @if (sessionLoading()) { <span class="sess-spin">…</span> }
            </div>
            @if (!sessionSelectedProject()) {
              <div class="sess-empty">Pick a project to list its sessions.</div>
            } @else if (sessions().length === 0 && !sessionLoading()) {
              <div class="sess-empty">No sessions in this project.</div>
            } @else {
              @for (s of sessions(); track s.id) {
                <button class="sess-row" [class.active]="sessionSelected()?.path === s.path" (click)="inspectSession(s.path)">
                  <div class="sess-row-id"><code>{{ s.id.slice(0, 8) }}</code></div>
                  <div class="sess-row-meta">
                    @if (s.start_time) { <span>{{ s.start_time.slice(5, 19).replace('T', ' ') }}</span> }
                    <span class="sess-row-size">{{ formatSessionSize(s.size_bytes) }}</span>
                  </div>
                </button>
              }
            }
          </aside>
        }

        <main class="sess-detail">
          @if (!sessionSelected() && !sessionInspectLoading()) {
            <div class="sess-empty">Pick a session to inspect.</div>
          }
          @if (sessionInspectLoading()) {
            <div class="sess-empty">Parsing transcript…</div>
          }
          @if (sessionSelected(); as sel) {
            <div class="sess-detail-head">
              <div class="sess-detail-title">
                <code>{{ sel.id }}</code>
              </div>
              <div class="sess-detail-sub">
                {{ sel.start.slice(0, 19).replace('T', ' ') }} → {{ sel.end.slice(0, 19).replace('T', ' ') }}
                · {{ sel.total_events }} events · duration {{ formatSessionDuration(sel.analytics?.duration_seconds || 0) }}
                · {{ ((sel.analytics?.success_rate || 0) * 100).toFixed(1) }}% success
              </div>
            </div>
            <div class="sess-stats-grid">
              <div class="sess-stat">
                <div class="sess-stat-label">events</div>
                <div class="sess-stat-value">{{ sel.analytics?.event_count }}</div>
              </div>
              <div class="sess-stat">
                <div class="sess-stat-label">active time</div>
                <div class="sess-stat-value">{{ formatSessionDuration(sel.analytics?.active_seconds || 0) }}</div>
              </div>
              <div class="sess-stat">
                <div class="sess-stat-label">in tokens</div>
                <div class="sess-stat-value">{{ sel.analytics?.estimated_input_tokens?.toLocaleString() }}</div>
              </div>
              <div class="sess-stat">
                <div class="sess-stat-label">out tokens</div>
                <div class="sess-stat-value">{{ sel.analytics?.estimated_output_tokens?.toLocaleString() }}</div>
              </div>
            </div>
            <div class="sess-tools-section">
              <div class="sess-section-title">Tool counts</div>
              <div class="sess-tools-grid">
                @for (t of sessionToolEntries(sel.analytics?.tool_counts); track t.name) {
                  <div class="sess-tool-pill" [title]="(sel.analytics?.avg_latency_ms?.[t.name] || 0) + 'ms avg'">
                    <span class="sess-tool-name">{{ t.name }}</span>
                    <span class="sess-tool-count">{{ t.count }}</span>
                  </div>
                }
              </div>
            </div>
            <div class="sess-events-section">
              <div class="sess-section-title">
                Recent events
                @if (sel.tail_offset > 0) { <span class="sess-tail-note">(showing last {{ sel.event_tail.length }} of {{ sel.total_events }})</span> }
                <button class="btn btn-ghost btn-sm sess-live-toggle" [class.sess-live-active]="sessionLiveActive()" (click)="toggleSessionLive()" [title]="sessionLiveActive() ? 'Stop live polling' : 'Start polling for new events every 3s'">
                  @if (sessionLiveActive()) {
                    <span class="sess-live-pulse" [attr.data-tick]="sessionLiveHeartbeat() % 2"></span>
                    <span>live</span>
                  } @else {
                    <span>○ live</span>
                  }
                </button>
                @if (sessionLiveEvents().length > 0) {
                  <span class="sess-live-count">+{{ sessionLiveEvents().length }} new</span>
                }
                @if (sessionLiveDropped() > 0) {
                  <span class="sess-live-dropped" [title]="'Older events dropped to keep buffer at 500'">−{{ sessionLiveDropped() }} dropped</span>
                }
              </div>
              <div class="sess-events-list">
                @for (e of sel.event_tail; track $index) {
                  @let evPath = sessionEventPath(e);
                  <div class="sess-event" [class.sess-event-error]="!e.success && e.type === 'tool_use'" [class.sess-event-jumpable]="evPath !== null" (click)="evPath ? openSessionEventFile(e) : null" [title]="evPath ? 'Open ' + evPath + ' in editor' : ''">
                    <span class="sess-event-time">{{ e.timestamp.slice(11, 19) }}</span>
                    <span class="sess-event-type">{{ e.type }}</span>
                    @if (e.tool) { <span class="sess-event-tool">{{ e.tool }}</span> }
                    @if (e.duration_ms > 0) { <span class="sess-event-dur">{{ e.duration_ms }}ms</span> }
                    <span class="sess-event-input">{{ e.input }}</span>
                  </div>
                }
                @if (sessionLiveEvents().length > 0) {
                  <div class="sess-live-divider">live tail · {{ sessionLiveEvents().length }} events since toggle</div>
                  @for (e of sessionLiveEvents(); track $index) {
                    <div class="sess-event sess-event-live">
                      <span class="sess-event-time">{{ e.timestamp.slice(11, 19) }}</span>
                      <span class="sess-event-type">{{ e.type || (e.role || '') }}</span>
                      @if (e.tool) { <span class="sess-event-tool">{{ e.tool }}</span> } @else { <span class="sess-event-tool"></span> }
                      <span class="sess-event-dur"></span>
                      <span class="sess-event-input">{{ e.input }}</span>
                    </div>
                  }
                }
              </div>
            </div>
          }
        </main>
      </div>
    </section>
  `,
})
export class SessionsComponent implements OnInit {
  private readonly fileEditor = inject(FileEditorStore);
  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  readonly sessionProjects = signal<SessionProject[]>([]);
  readonly sessionSelectedProject = signal<string | null>(null);
  readonly sessions = signal<SessionSummary[]>([]);
  readonly sessionSelected = signal<InspectedSession | null>(null);
  readonly sessionLoading = signal(false);
  readonly sessionInspectLoading = signal(false);
  readonly sessionFilter = signal('');
  readonly sessionTab = signal<'browse' | 'active' | 'search'>('browse');
  readonly sessionSearchQuery = signal('');
  readonly sessionSearchHits = signal<SearchHit[]>([]);
  readonly sessionSearchLoading = signal(false);
  readonly sessionSearchScope = signal<'current' | 'all'>('current');
  readonly sessionActive = signal<ActiveSession[]>([]);
  readonly sessionActiveLoading = signal(false);
  readonly sessionActiveSinceMinutes = signal(60);

  readonly sessionLiveActive = signal(false);
  private readonly sessionLiveOffset = signal(0);
  readonly sessionLiveEvents = signal<LiveEvent[]>([]);
  readonly sessionLiveDropped = signal(0);
  readonly sessionLiveHeartbeat = signal(0);
  private sessionLiveTimer: ReturnType<typeof setInterval> | null = null;

  readonly sessionVisible = computed(() => {
    const f = this.sessionFilter().trim().toLowerCase();
    if (!f) return this.sessionProjects();
    return this.sessionProjects().filter(
      (p) => p.display_path.toLowerCase().includes(f) || p.name.toLowerCase().includes(f),
    );
  });

  ngOnInit(): void {
    void this.loadSessionProjects();
    this.destroyRef.onDestroy(() => this.stopSessionLive());
  }

  async loadSessionProjects(): Promise<void> {
    this.sessionLoading.set(true);
    try {
      const v = await callBridge<{ projects?: SessionProject[] }>('session_projects_list', {});
      this.sessionProjects.set(v?.projects || []);
    } catch {
      // tolerate
    } finally {
      this.sessionLoading.set(false);
    }
  }

  async selectSessionProject(projectPath: string): Promise<void> {
    this.sessionSelectedProject.set(projectPath);
    this.sessions.set([]);
    this.sessionSelected.set(null);
    this.sessionLoading.set(true);
    try {
      const v = await callBridge<{ sessions?: SessionSummary[] }>('session_list', { project_dir: projectPath });
      this.sessions.set(v?.sessions || []);
    } finally {
      this.sessionLoading.set(false);
    }
  }

  async inspectSession(path: string): Promise<void> {
    this.stopSessionLive();
    this.sessionLiveEvents.set([]);
    this.sessionLiveDropped.set(0);
    this.sessionLiveHeartbeat.set(0);
    this.sessionInspectLoading.set(true);
    try {
      const v = await callBridge<InspectedSession>('session_inspect', { path, limit: 200 });
      this.sessionSelected.set(v);
      const size = this.sessions().find((s) => s.path === path)?.size_bytes || 0;
      this.sessionLiveOffset.set(size);
    } finally {
      this.sessionInspectLoading.set(false);
    }
  }

  async loadActiveSessions(): Promise<void> {
    this.sessionActiveLoading.set(true);
    try {
      const v = await callBridge<{ active?: ActiveSession[] }>('session_active_list', {
        since_minutes: this.sessionActiveSinceMinutes(),
      });
      this.sessionActive.set(v?.active || []);
    } finally {
      this.sessionActiveLoading.set(false);
    }
  }

  async openActiveSession(entry: ActiveSession): Promise<void> {
    this.stopSessionLive();
    this.sessionLiveEvents.set([]);
    this.sessionLiveDropped.set(0);
    this.sessionLiveHeartbeat.set(0);
    this.sessionInspectLoading.set(true);
    try {
      const v = await callBridge<InspectedSession>('session_inspect', { path: entry.path, limit: 200 });
      this.sessionSelected.set(v);
      const active = this.sessionActive().find((a) => a.path === entry.path);
      this.sessionLiveOffset.set(active?.size_bytes || 0);
    } finally {
      this.sessionInspectLoading.set(false);
    }
  }

  async runSessionSearch(): Promise<void> {
    const q = this.sessionSearchQuery().trim();
    if (q.length < 2) {
      this.sessionSearchHits.set([]);
      return;
    }
    let projects: string[] = [];
    if (this.sessionSearchScope() === 'all') {
      projects = this.sessionProjects().map((p) => p.path);
    } else {
      const current = this.sessionSelectedProject();
      if (current) projects = [current];
      else if (this.sessionProjects().length > 0) projects = [this.sessionProjects()[0].path];
    }
    if (projects.length === 0) return;
    this.sessionSearchLoading.set(true);
    try {
      const allHits: SearchHit[] = [];
      for (const project_dir of projects) {
        try {
          const v = await callBridge<{ hits?: SearchHit[] }>('session_search', { project_dir, query: q });
          if (v?.hits) allHits.push(...v.hits);
        } catch {
          // skip per-project errors
        }
      }
      allHits.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      this.sessionSearchHits.set(allHits);
    } finally {
      this.sessionSearchLoading.set(false);
    }
  }

  async openSessionSearchHit(hit: SearchHit): Promise<void> {
    const direct = this.sessions().find((s) => s.id === hit.session_id);
    if (direct) {
      this.sessionTab.set('browse');
      void this.inspectSession(direct.path);
      return;
    }
    for (const proj of this.sessionProjects()) {
      try {
        const v = await callBridge<{ sessions?: SessionSummary[] }>('session_list', { project_dir: proj.path });
        const match = (v?.sessions || []).find((s) => s.id === hit.session_id);
        if (match) {
          this.sessionTab.set('browse');
          await this.selectSessionProject(proj.path);
          void this.inspectSession(match.path);
          return;
        }
      } catch {
        // try next project
      }
    }
  }

  toggleSessionLive(): void {
    if (this.sessionLiveActive()) this.stopSessionLive();
    else this.startSessionLive();
  }

  private startSessionLive(): void {
    const sel = this.sessionSelected();
    if (!sel?.path) return;
    this.sessionLiveActive.set(true);
    void this.pollSessionLive();
    this.sessionLiveTimer = setInterval(() => void this.pollSessionLive(), 3000);
  }

  private stopSessionLive(): void {
    if (this.sessionLiveTimer) {
      clearInterval(this.sessionLiveTimer);
      this.sessionLiveTimer = null;
    }
    this.sessionLiveActive.set(false);
  }

  private async pollSessionLive(): Promise<void> {
    const sel = this.sessionSelected();
    if (!sel?.path) return;
    let v: { events?: LiveEvent[]; next_offset?: number };
    try {
      v = await callBridge<{ events?: LiveEvent[]; next_offset?: number }>('session_tail', {
        path: sel.path,
        since_offset: this.sessionLiveOffset(),
        limit: 200,
      });
    } catch {
      return;
    }
    this.sessionLiveHeartbeat.update((n) => (n + 1) % 1000);
    const events = (v?.events || []).filter((e) => !!e.timestamp);
    if (events.length > 0) {
      const wasAtBottom = this.isLiveTailAtBottom();
      let combined = [...this.sessionLiveEvents(), ...events];
      if (combined.length > SESSION_LIVE_CAP) {
        const drop = combined.length - SESSION_LIVE_CAP;
        this.sessionLiveDropped.update((n) => n + drop);
        combined = combined.slice(drop);
      }
      this.sessionLiveEvents.set(combined);
      if (wasAtBottom) {
        setTimeout(() => this.scrollLiveTailToBottom(), 0);
      }
    }
    if (typeof v?.next_offset === 'number') this.sessionLiveOffset.set(v.next_offset);
  }

  private isLiveTailAtBottom(): boolean {
    const list = document.querySelector('.sess-events-list') as HTMLElement | null;
    if (!list) return true;
    return list.scrollTop + list.clientHeight >= list.scrollHeight - 40;
  }

  private scrollLiveTailToBottom(): void {
    const list = document.querySelector('.sess-events-list') as HTMLElement | null;
    if (list) list.scrollTop = list.scrollHeight;
  }

  formatAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }

  formatSessionSize(b: number): string {
    if (b < 1024) return `${b}B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}k`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)}M`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)}G`;
  }

  formatSessionDuration(seconds: number): string {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}m${s}s`;
    return `${s}s`;
  }

  sessionToolEntries(counts: Record<string, number> | undefined): { name: string; count: number }[] {
    if (!counts) return [];
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  sessionEventPath(e: { tool?: string; input?: string }): string | null {
    if (!e?.tool || !e?.input) return null;
    if (e.tool !== 'Read' && e.tool !== 'Edit' && e.tool !== 'Write') return null;
    const m = e.input.match(/^(\/[^\s]+)/);
    return m ? m[1] : null;
  }

  async openSessionEventFile(e: { tool?: string; input?: string }): Promise<void> {
    const path = this.sessionEventPath(e);
    if (!path) return;
    await this.fileEditor.openFile(path);
    void this.router.navigate(['/dev/explorer']);
  }
}
