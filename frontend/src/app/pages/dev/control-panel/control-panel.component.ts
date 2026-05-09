// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ActivityItem, Brief, Site, ViStatus, emptyViStatus, loadViData } from '../../../lib/vi.types';

/**
 * Control Panel — the dashboard. Vi briefs + sites + activity.
 *
 * TODO(snider/wails): swap loadViData() (which reads JSON fixtures) for
 * a viBridge wails service that streams snapshot updates.
 */
@Component({
  selector: 'dev-control-panel',
  standalone: true,
  imports: [UpperCasePipe, TranslatePipe],
  template: `
    <!-- Brief grid -->
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">{{ 'control-panel.section.briefs' | translate }}</h2>
        <span class="editorial subtitle">{{ briefSubtitle() }}</span>
      </div>
      <div class="brief-grid">
        @for (brief of briefs(); track $index) {
          <article class="brief-card" [attr.data-tone]="brief.tone" [class.done]="brief.done">
            <span class="tone-strip"></span>
            <div class="brief-body">
              <div class="brief-meta">
                <span class="tone-dot"></span>
                <span class="brief-time">{{ brief.time }}</span>
                @if (brief.done) {
                  <span class="brief-done">{{ 'control-panel.status.done' | translate }}</span>
                }
              </div>
              <h3 class="brief-title">{{ brief.title }}</h3>
              <p class="brief-text">{{ brief.body }}</p>
              <div class="brief-actions">
                @for (action of brief.actions; track action.label) {
                  <button class="btn btn-sm" [class.btn-primary]="action.primary && !brief.done" [class.btn-secondary]="!action.primary && !brief.done" [class.btn-ghost]="brief.done">
                    {{ action.label }}
                    @if (brief.shortcut && action.primary) {
                      <span class="kbd">{{ brief.shortcut }}</span>
                    }
                  </button>
                }
              </div>
            </div>
          </article>
        }
      </div>
    </section>

    <!-- Sites table -->
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">{{ 'control-panel.section.sites' | translate }}</h2>
        <span class="editorial subtitle">{{ vi().watching }} {{ 'control-panel.label.watched' | translate }} · {{ greenCount() }} {{ 'control-panel.label.green' | translate }}</span>
      </div>
      <div class="sites-table">
        <div class="sites-row sites-head">
          <span>{{ 'control-panel.column.domain' | translate }}</span>
          <span>{{ 'control-panel.column.stack' | translate }}</span>
          <span>{{ 'control-panel.column.uptime' | translate }}</span>
          <span>{{ 'control-panel.column.response' | translate }}</span>
          <span>{{ 'control-panel.column.deploy' | translate }}</span>
        </div>
        @for (site of sites(); track site.domain) {
          <div class="sites-row">
            <span class="sites-domain">
              <span class="status-dot" [attr.data-status]="site.status"></span>
              <span class="num">{{ site.domain }}</span>
            </span>
            <span class="sites-stack">{{ site.stack }}</span>
            <span class="num tnum">{{ site.uptime }}%</span>
            <span class="num tnum">{{ site.response }}ms</span>
            <span class="sites-deploy">
              {{ site.lastDeploy }}
              @if (site.warn) {
                <span class="pill pill-warn">{{ site.warn }}</span>
              }
            </span>
          </div>
        }
      </div>
    </section>

    <!-- Activity stream -->
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">{{ 'control-panel.section.activity' | translate }}</h2>
        <span class="editorial subtitle">{{ 'control-panel.subtitle.last-hours' | translate }}</span>
      </div>
      <div class="activity-list">
        @for (item of activity(); track $index) {
          <div class="activity-row" [attr.data-tone]="item.tone">
            <span class="who-badge num">{{ item.who | uppercase }}</span>
            <span class="activity-text">{{ item.text }}</span>
            <span class="num activity-time">{{ item.time }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* Brief grid (per native handoff: 3-col, 10px gap, 6px radius cards, 2px tone strip) */
    .brief-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .brief-card {
      position: relative;
      display: flex;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-sm);
      overflow: hidden;
      transition: background 100ms ease, border-color 100ms ease;
    }
    .brief-card:hover {
      background: var(--ink-3);
      border-color: var(--line-2);
    }
    .tone-strip {
      width: 2px;
      flex-shrink: 0;
      background: var(--ink-5);
    }
    .brief-card[data-tone="warning"] .tone-strip { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-strip { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-strip { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-strip { background: var(--danger-500); }
    .brief-card[data-tone="neutral"] .tone-strip { background: var(--ink-5); }
    .brief-body {
      flex: 1;
      padding: 10px 12px 11px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .brief-meta {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tone-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--ink-5);
    }
    .brief-card[data-tone="warning"] .tone-dot { background: var(--warning-500); }
    .brief-card[data-tone="success"] .tone-dot { background: var(--success-500); }
    .brief-card[data-tone="info"] .tone-dot { background: var(--info-500); }
    .brief-card[data-tone="danger"] .tone-dot { background: var(--danger-500); }
    .brief-time {
      font-family: var(--font-mono);
      font-size: 10.5px;
      color: var(--fg-3);
    }
    .brief-done {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 10px;
      letter-spacing: 0.05em;
      color: var(--success-400);
      padding: 1px 5px;
      border: 1px solid color-mix(in oklch, var(--success-500) 35%, transparent);
      border-radius: 3px;
    }
    .brief-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-0);
      letter-spacing: -0.005em;
      margin: 0;
      line-height: 1.3;
    }
    .brief-text {
      font-size: 12px;
      color: var(--fg-2);
      line-height: 1.45;
      margin: 0;
    }
    .brief-actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 4px;
    }
    .brief-card.done {
      opacity: 0.7;
    }
    /* Sites data-table */
    .sites-table {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }
    .sites-row {
      display: grid;
      grid-template-columns: 2fr 2fr 1fr 1fr 2fr;
      align-items: center;
      gap: 12px;
      padding: 8px 14px;
      font-size: 12.5px;
      border-top: 1px solid var(--line-1);
      color: var(--fg-1);
    }
    .sites-row:first-child {
      border-top: none;
    }
    .sites-head {
      font-family: var(--font-mono);
      font-size: 10.5px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fg-4);
      padding-top: 9px;
      padding-bottom: 9px;
      background: color-mix(in oklch, var(--ink-1) 50%, transparent);
    }
    .sites-domain {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .sites-stack {
      color: var(--fg-3);
      font-size: 12px;
    }
    .sites-deploy {
      color: var(--fg-2);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    /* Activity list */
    .activity-list {
      display: flex;
      flex-direction: column;
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      overflow: hidden;
    }
    .activity-row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 14px;
      padding: 8px 14px;
      border-top: 1px solid var(--line-1);
      font-size: 12.5px;
    }
    .activity-row:first-child {
      border-top: none;
    }
    .who-badge {
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 3px;
      background: var(--ink-3);
      color: var(--fg-3);
    }
    .activity-row[data-tone="success"] .who-badge {
      background: color-mix(in oklch, var(--success-500) 18%, var(--ink-3));
      color: var(--success-400);
    }
    .activity-row[data-tone="warning"] .who-badge {
      background: color-mix(in oklch, var(--warning-500) 18%, var(--ink-3));
      color: var(--warning-400);
    }
    .activity-text {
      color: var(--fg-1);
    }
    .activity-time {
      font-size: 11px;
      color: var(--fg-3);
    }
  `],
})
export class ControlPanelComponent implements OnInit {
  readonly vi = signal<ViStatus>(emptyViStatus);
  readonly briefs = signal<Brief[]>([]);
  readonly sites = signal<Site[]>([]);
  readonly activity = signal<ActivityItem[]>([]);

  readonly greenCount = computed(() => this.sites().filter((s) => s.status === 'green').length);

  readonly briefSubtitle = computed(() => {
    const all = this.briefs();
    const open = all.filter((b) => !b.done).length;
    if (all.length === 0) return 'loading…';
    return open === 0 ? 'all caught up' : `${open} open · ${all.length - open} closed today`;
  });

  ngOnInit(): void {
    loadViData()
      .then((snap) => {
        this.vi.set(snap.status);
        this.briefs.set(snap.briefs);
        this.sites.set(snap.sites);
        this.activity.set(snap.activity);
      })
      .catch((err) => console.warn('[control-panel] loadViData failed:', err));
  }
}
