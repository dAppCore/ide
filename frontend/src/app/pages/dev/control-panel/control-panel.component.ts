// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, computed, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
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
  imports: [UpperCasePipe],
  template: `
    <!-- Brief grid -->
    <section class="block">
      <div class="block-header">
        <h2 class="block-title">Briefs</h2>
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
                  <span class="brief-done">DONE</span>
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
        <h2 class="block-title">Sites</h2>
        <span class="editorial subtitle">{{ vi().watching }} watched · {{ greenCount() }} green</span>
      </div>
      <div class="sites-table">
        <div class="sites-row sites-head">
          <span>Domain</span>
          <span>Stack</span>
          <span>Uptime</span>
          <span>Response</span>
          <span>Deploy</span>
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
        <h2 class="block-title">Activity</h2>
        <span class="editorial subtitle">last few hours</span>
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
