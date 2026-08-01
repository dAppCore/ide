// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as LemBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/lemlabbridge';
import type {
  LemAgentStatus,
  LemContainerStatus,
  LemGenerationStats,
  LemModelInfo,
  LemSnapshot,
  LemStackStatus,
  LemTrainingRow,
} from '../../../../../bindings/dappco.re/go/ide/pkg/server/models';

const REFRESH_MS = 10_000;

const ZERO_GENERATION: LemGenerationStats = {
  goldenCompleted: 0,
  goldenTarget: 0,
  goldenPct: 0,
  expansionCompleted: 0,
  expansionTarget: 0,
  expansionPct: 0,
};

const ZERO_AGENT: LemAgentStatus = {
  running: false,
  currentTask: '',
  scored: 0,
  remaining: 0,
  lastScore: '',
};

const ZERO_STACK: LemStackStatus = {
  running: false,
  services: {},
  composeDir: '',
};

/**
 * LEM.Lab training studio — first /lab/* surface.
 *
 * Lifted from LEM/cmd/lem-desktop (the standalone Wails desktop app).
 * UI re-skinned onto Lethean-3 tokens; bridge contract mirrors the
 * original DashboardService/DockerService/AgentRunner shapes so the
 * fixture body can be swapped to real go-mlx + InfluxDB + docker
 * compose backends without changing the FE wire.
 *
 * Five blocks: Training Progress, Generation, Model Scoreboard,
 * Services, Scoring Agent. Auto-refreshes every 10s.
 */
@Component({
  selector: 'lab-lem',
  standalone: true,
  imports: [],
  template: `
    <section class="block lem-block">
      <div class="block-header lem-header">
        <h2 class="block-title">LEM.Lab</h2>
        <span class="editorial subtitle">
          Training studio · scoring agent · stack control
          @if (snapshot(); as s) {
            <span class="lem-meta">· updated {{ formatTime(s.updatedAt) }}</span>
          }
        </span>
      </div>

      <div class="lem-toolbar">
        <button class="btn btn-ghost btn-sm" (click)="refresh()" [disabled]="loading()">
          ↻ Refresh
        </button>
        <button
          class="btn btn-sm"
          [class.btn-primary]="!stackRunning()"
          [class.btn-ghost]="stackRunning()"
          (click)="toggleStack()"
          [disabled]="busy()"
        >
          {{ stackRunning() ? 'Stop services' : 'Start services' }}
        </button>
        <button
          class="btn btn-sm"
          [class.btn-primary]="!agentRunning()"
          [class.btn-ghost]="agentRunning()"
          (click)="toggleAgent()"
          [disabled]="busy()"
        >
          {{ agentRunning() ? 'Stop agent' : 'Start agent' }}
        </button>
        @if (error(); as e) {
          <span class="lem-error">{{ e }}</span>
        }
      </div>

      <div class="lem-grid">
        <!-- Training -->
        <div class="lem-card">
          <h3 class="lem-card-title">Training progress</h3>
          @if (training().length === 0) {
            <div class="lem-empty">No training in flight</div>
          }
          @for (t of training(); track t.runId || t.model) {
            <div class="lem-row">
              <span class="lem-row-label">{{ t.model }}</span>
              <div class="lem-bar">
                <div
                  class="lem-bar-fill"
                  [class]="trainingFillClass(t.status)"
                  [style.width.%]="clampPct(t.iteration, t.totalIters)"
                ></div>
              </div>
              <span class="lem-row-value">
                {{ t.iteration }}/{{ t.totalIters }}
                @if (t.loss > 0) {
                  · loss {{ t.loss.toFixed(3) }}
                }
              </span>
            </div>
          }
        </div>

        <!-- Generation -->
        <div class="lem-card">
          <h3 class="lem-card-title">Generation</h3>
          <div class="lem-row">
            <span class="lem-row-label">Golden set</span>
            <div class="lem-bar">
              <div
                class="lem-bar-fill green"
                [style.width.%]="clampPctRaw(generation().goldenPct)"
              ></div>
            </div>
            <span class="lem-row-value">
              {{ generation().goldenCompleted }}/{{ generation().goldenTarget }}
            </span>
          </div>
          <div class="lem-row">
            <span class="lem-row-label">Expansion</span>
            <div class="lem-bar">
              <div
                class="lem-bar-fill blue"
                [style.width.%]="clampPctRaw(generation().expansionPct)"
              ></div>
            </div>
            <span class="lem-row-value">
              {{ generation().expansionCompleted }}/{{ generation().expansionTarget }}
            </span>
          </div>
        </div>

        <!-- Scoreboard -->
        <div class="lem-card lem-card-wide">
          <h3 class="lem-card-title">Model scoreboard</h3>
          @if (models().length === 0) {
            <div class="lem-empty">No scored models yet</div>
          } @else {
            <table class="lem-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Tag</th>
                  <th>Accuracy</th>
                  <th>Iterations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (m of models(); track m.name + m.tag) {
                  <tr>
                    <td><code>{{ m.name }}</code></td>
                    <td><code>{{ m.tag }}</code></td>
                    <td>
                      <span class="lem-badge" [class]="accuracyTone(m.accuracy)">
                        {{ (m.accuracy * 100).toFixed(1) }}%
                      </span>
                    </td>
                    <td><code>{{ m.iterations }}</code></td>
                    <td><span class="lem-badge tone-info">{{ m.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Services -->
        <div class="lem-card">
          <h3 class="lem-card-title">Services</h3>
          @if (serviceList().length === 0) {
            <div class="lem-empty">No services detected</div>
          }
          <div class="lem-services">
            @for (s of serviceList(); track s.name) {
              <div class="lem-service">
                <div class="lem-service-name">
                  <span class="lem-dot" [class.green]="s.running" [class.red]="!s.running"></span>
                  {{ s.serviceName }}
                </div>
                <div class="lem-service-detail">{{ s.status || 'stopped' }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Agent -->
        <div class="lem-card">
          <h3 class="lem-card-title">Scoring agent</h3>
          <div class="lem-row lem-agent-row">
            <span class="lem-dot" [class.green]="agent().running" [class.red]="!agent().running"></span>
            <span class="lem-agent-state">
              {{ agent().running ? 'Running: ' + (agent().currentTask || 'idle') : 'Stopped' }}
            </span>
          </div>
          <div class="lem-agent-stats">
            <span>Scored: <code>{{ agent().scored }}</code></span>
            <span>Remaining: <code>{{ agent().remaining }}</code></span>
          </div>
          @if (agent().lastScore) {
            <div class="lem-agent-last">Last: {{ agent().lastScore }}</div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .lem-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .lem-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .lem-meta { color: var(--fg-3); font-family: var(--font-mono); font-size: 11px; }
    .lem-toolbar { display: flex; gap: 8px; padding: 10px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; align-items: center; }
    .lem-error { color: #f87171; font-size: 12px; margin-left: auto; }

    .lem-grid {
      flex: 1;
      overflow-y: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      padding: 14px 18px;
      align-content: start;
    }
    .lem-card {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: 8px;
      padding: 14px;
      min-width: 0;
    }
    .lem-card-wide { grid-column: 1 / -1; }
    .lem-card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--fg-3);
      margin: 0 0 10px;
    }

    .lem-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .lem-row-label { min-width: 120px; font-size: 12px; color: var(--fg-2); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lem-row-value { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); min-width: 120px; text-align: right; flex-shrink: 0; }
    .lem-bar { flex: 1; height: 6px; background: var(--ink-1); border-radius: 3px; overflow: hidden; min-width: 60px; }
    .lem-bar-fill { height: 100%; transition: width 0.4s ease; background: var(--brand-400); }
    .lem-bar-fill.green { background: #34d399; }
    .lem-bar-fill.blue { background: var(--brand-400); }
    .lem-bar-fill.amber { background: #fbbf24; }
    .lem-bar-fill.red { background: #f87171; }

    .lem-empty { padding: 16px 4px; color: var(--fg-3); font-size: 12px; text-align: center; }

    .lem-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .lem-table th { text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .lem-table td { padding: 6px 8px; border-bottom: 1px solid var(--line-1); }
    .lem-table code { font-family: var(--font-mono); font-size: 11px; color: var(--fg-2); }

    .lem-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; font-family: var(--font-mono); letter-spacing: 0.04em; }
    .lem-badge.tone-good { background: color-mix(in oklch, #34d399 22%, var(--ink-1)); color: #34d399; }
    .lem-badge.tone-warn { background: color-mix(in oklch, #fbbf24 22%, var(--ink-1)); color: #fbbf24; }
    .lem-badge.tone-bad { background: color-mix(in oklch, #f87171 22%, var(--ink-1)); color: #f87171; }
    .lem-badge.tone-info { background: color-mix(in oklch, var(--brand-400) 18%, var(--ink-1)); color: var(--brand-200); }

    .lem-services { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
    .lem-service { background: var(--ink-1); border: 1px solid var(--line-1); border-radius: 6px; padding: 8px 10px; }
    .lem-service-name { font-size: 12px; font-weight: 500; color: var(--fg-1); display: flex; align-items: center; gap: 6px; }
    .lem-service-detail { font-size: 10px; color: var(--fg-3); margin-top: 2px; font-family: var(--font-mono); }

    .lem-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--fg-3); }
    .lem-dot.green { background: #34d399; }
    .lem-dot.red { background: #f87171; }

    .lem-agent-row { gap: 8px; }
    .lem-agent-state { font-size: 12px; color: var(--fg-1); }
    .lem-agent-stats { display: flex; gap: 16px; font-size: 11px; color: var(--fg-2); margin-top: 8px; }
    .lem-agent-stats code { font-family: var(--font-mono); color: var(--brand-200); }
    .lem-agent-last { margin-top: 8px; font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); }
  `],
})
export class LemComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private timer?: ReturnType<typeof setInterval>;

  readonly snapshot = signal<LemSnapshot | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly training = computed<LemTrainingRow[]>(() => this.snapshot()?.training ?? []);
  readonly generation = computed<LemGenerationStats>(() => this.snapshot()?.generation ?? ZERO_GENERATION);
  readonly models = computed<LemModelInfo[]>(() => this.snapshot()?.models ?? []);
  readonly agent = computed<LemAgentStatus>(() => this.snapshot()?.agent ?? ZERO_AGENT);
  readonly stack = computed<LemStackStatus>(() => this.snapshot()?.stack ?? ZERO_STACK);
  readonly stackRunning = computed(() => this.stack().running);
  readonly agentRunning = computed(() => this.agent().running);

  readonly serviceList = computed(() => {
    const services = this.stack().services ?? {};
    return Object.keys(services)
      .sort()
      .map((name) => ({ serviceName: name, ...(services[name] as LemContainerStatus) }));
  });

  ngOnInit(): void {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async refresh(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const snap = await LemBridge.GetSnapshot();
      this.snapshot.set(snap);
    } catch (e) {
      this.error.set('lemlab bridge: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.loading.set(false);
    }
  }

  async toggleStack(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.stackRunning()) {
        await LemBridge.StopStack();
      } else {
        await LemBridge.StartStack();
      }
      setTimeout(() => void this.refresh(), 500);
    } catch (e) {
      this.error.set('stack toggle: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleAgent(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.agentRunning()) {
        await LemBridge.StopAgent();
      } else {
        await LemBridge.StartAgent();
      }
      setTimeout(() => void this.refresh(), 500);
    } catch (e) {
      this.error.set('agent toggle: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.busy.set(false);
    }
  }

  clampPct(iter: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (iter / total) * 100));
  }

  clampPctRaw(pct: number): number {
    return Math.min(100, Math.max(0, pct));
  }

  trainingFillClass(status: string): string {
    if (status === 'complete') return 'green';
    if (status === 'training') return 'blue';
    if (status === 'error' || status === 'failed') return 'red';
    return 'amber';
  }

  accuracyTone(acc: number): string {
    if (acc >= 0.8) return 'tone-good';
    if (acc >= 0.5) return 'tone-warn';
    return 'tone-bad';
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  }
}
