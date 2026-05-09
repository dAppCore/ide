// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { callBridge } from '../../../lib/bridge';

interface ForgeStatus {
  configured: boolean;
  authenticated: boolean;
  as: string;
  base: string;
  hint: string;
}

interface ForgeOrg {
  name: string;
  full_name: string;
  description: string;
}

interface ForgeRepo {
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  fork: boolean;
  stars: number;
  updated_at: string;
  html_url: string;
}

interface ForgeIssue {
  number: number;
  title: string;
  state: string;
  comments: number;
  updated_at: string;
  html_url: string;
  author: string;
}

interface ForgePull {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  draft: boolean;
  updated_at: string;
  html_url: string;
  author: string;
  base: string;
  head: string;
}

interface ForgeNotification {
  id: number;
  unread: boolean;
  pinned: boolean;
  updated_at: string;
  title: string;
  type: string;
  url: string;
  state: string;
  repo: string;
}

interface ForgeRelease {
  kind: string;
  name: string;
  title: string;
  published_at: string;
  html_url: string;
  tarball_url?: string;
  zipball_url?: string;
  target?: string;
  draft?: boolean;
  prerelease?: boolean;
  author?: string;
}

interface ReposResponse {
  repos?: ForgeRepo[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

/**
 * Forge panel — Forgejo dashboard over forge.lthn.sh + forge.lthn.ai.
 * Org list, repo browser, issues / PRs / releases per repo, unread
 * notifications.
 *
 * TODO(snider/wails): swap callBridge('forge_*') for a forgeBridge
 * wails service.
 */
@Component({
  selector: 'dev-forge',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <section class="block frg-block">
      <div class="block-header frg-header">
        <h2 class="block-title">
          Forge
          @if (forgeReposCacheHit() && forgeSelectedOrg()) {
            <span class="cache-pill" [class.cache-stale]="forgeReposCacheAge() > 300" (click)="loadForgeRepos(forgeSelectedOrg(), true)" title="Click to force re-fetch repos">● cached {{ formatCacheAge(forgeReposCacheAge()) }}</span>
          } @else if (forgeRepos().length > 0) {
            <span class="cache-pill cache-fresh" title="Just fetched">● fresh</span>
          }
        </h2>
        <span class="editorial subtitle">
          @if (forgeStatus()?.authenticated) {
            <code>{{ forgeStatus()?.base }}</code> · authenticated as <strong>{{ forgeStatus()?.as }}</strong>
          } @else if (forgeStatus()?.configured) {
            <code>{{ forgeStatus()?.base }}</code> · token rejected — see status hint
          } @else {
            No forge token configured. Set FORGE_TOKEN env or write to ~/.claude/secrets/forge_token.
          }
        </span>
      </div>
      @if (forgeError(); as err) {
        <div class="frg-error">{{ err }}</div>
      }
      @if (forgeStatus()?.hint) {
        <div class="frg-hint">{{ forgeStatus()?.hint }}</div>
      }

      <div class="frg-body">
        <div class="frg-orgs-side">
          <h3>Orgs</h3>
          @for (o of forgeOrgs(); track o.name) {
            <button class="frg-org-row" [class.active]="forgeSelectedOrg() === o.name" (click)="loadForgeRepos(o.name)">
              {{ o.name }}
            </button>
          }
          <h3 style="margin-top: 14px;">Notifications</h3>
          @for (n of forgeNotifications().slice(0, 8); track n.id) {
            <a class="frg-note-row" [class.unread]="n.unread" [href]="n.url" target="_blank">
              <span class="frg-note-type">{{ n.type }}</span>
              <span class="frg-note-title">{{ n.title }}</span>
              <span class="frg-note-repo">{{ n.repo }}</span>
            </a>
          }
          @if (forgeNotifications().length === 0) {
            <div class="frg-empty">No unread notifications.</div>
          }
        </div>

        <div class="frg-main">
          <div class="frg-repos-bar">
            <span class="frg-org-label">{{ forgeSelectedOrg() || '—' }} · {{ forgeRepos().length }} repos</span>
            <select class="frg-repo-picker" [value]="forgeSelectedRepo()" (change)="loadForgeRepo($any($event.target).value)">
              <option value="">(pick a repo)</option>
              @for (r of forgeRepos(); track r.name) {
                <option [value]="r.name">{{ r.name }}</option>
              }
            </select>
          </div>

          @if (forgeSelectedRepo()) {
            <div class="frg-tabs">
              <button class="frg-tab" [class.active]="forgeTab() === 'issues'" (click)="forgeTab.set('issues')">Issues <span class="frg-tab-count">{{ forgeIssues().length }}</span></button>
              <button class="frg-tab" [class.active]="forgeTab() === 'pulls'" (click)="forgeTab.set('pulls')">PRs <span class="frg-tab-count">{{ forgePulls().length }}</span></button>
              <button class="frg-tab" [class.active]="forgeTab() === 'releases'" (click)="forgeTab.set('releases'); loadForgeReleases()">Releases <span class="frg-tab-count">{{ forgeReleases().length }}</span></button>
            </div>

            @if (forgeTab() === 'issues') {
              @if (forgeIssues().length === 0) {
                <div class="frg-empty-pane">No open issues in {{ forgeSelectedOrg() }}/{{ forgeSelectedRepo() }}</div>
              } @else {
                <table class="frg-table">
                  <thead><tr><th>#</th><th>title</th><th>state</th><th>author</th><th>updated</th></tr></thead>
                  <tbody>
                    @for (i of forgeIssues(); track i.number) {
                      <tr>
                        <td><a [href]="i.html_url" target="_blank"><code>#{{ i.number }}</code></a></td>
                        <td class="frg-title">{{ i.title }}</td>
                        <td><span class="frg-state {{ i.state }}">{{ i.state }}</span></td>
                        <td><code>{{ i.author }}</code></td>
                        <td><code>{{ i.updated_at | slice:0:10 }}</code></td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            } @else if (forgeTab() === 'pulls') {
              @if (forgePulls().length === 0) {
                <div class="frg-empty-pane">No open PRs.</div>
              } @else {
                <table class="frg-table">
                  <thead><tr><th>#</th><th>title</th><th>state</th><th>head→base</th><th>author</th><th>updated</th></tr></thead>
                  <tbody>
                    @for (p of forgePulls(); track p.number) {
                      <tr>
                        <td><a [href]="p.html_url" target="_blank"><code>#{{ p.number }}</code></a></td>
                        <td class="frg-title">{{ p.title }}@if (p.draft) { <span class="frg-draft">draft</span> }</td>
                        <td><span class="frg-state {{ p.state }}">{{ p.state }}</span></td>
                        <td><code>{{ p.head }}→{{ p.base }}</code></td>
                        <td><code>{{ p.author }}</code></td>
                        <td><code>{{ p.updated_at | slice:0:10 }}</code></td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            } @else if (forgeTab() === 'releases') {
              @if (forgeReleasesLoading()) {
                <div class="frg-empty-pane">Loading releases…</div>
              } @else if (forgeReleases().length === 0) {
                <div class="frg-empty-pane">No releases or tags for this repo.</div>
              } @else {
                <table class="frg-table">
                  <thead><tr><th>kind</th><th>tag</th><th>title</th><th>published</th><th>archive</th></tr></thead>
                  <tbody>
                    @for (r of forgeReleases(); track r.name) {
                      <tr>
                        <td>
                          <span class="frg-state {{ r.kind }}">{{ r.kind }}</span>
                          @if (r.prerelease) { <span class="frg-draft">pre</span> }
                          @if (r.draft) { <span class="frg-draft">draft</span> }
                        </td>
                        <td><a [href]="r.html_url" target="_blank"><code>{{ r.name }}</code></a></td>
                        <td class="frg-title">{{ r.title }}</td>
                        <td><code>{{ r.published_at | slice:0:10 }}</code></td>
                        <td>
                          @if (r.tarball_url) { <a class="frg-archive-link" [href]="r.tarball_url" target="_blank">tar.gz</a> }
                          @if (r.zipball_url) { · <a class="frg-archive-link" [href]="r.zipball_url" target="_blank">zip</a> }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            }
          } @else {
            <div class="frg-empty-pane">Pick a repo to view its issues + PRs.</div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Forge panel */
    .frg-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .frg-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .frg-header code { font-family: var(--font-mono); color: var(--fg-2); }
    .frg-error, .frg-hint { padding: 8px 18px; font-size: 12px; border-bottom: 1px solid var(--line-1); }
    .frg-error { color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); }
    .frg-hint { color: var(--fg-3); font-style: italic; background: color-mix(in oklch, #fbbf24 6%, transparent); font-family: var(--font-mono); font-size: 11px; word-break: break-all; }
    .frg-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
    .frg-orgs-side { width: 220px; border-right: 1px solid var(--line-1); padding: 14px 12px; overflow-y: auto; flex-shrink: 0; background: var(--ink-2); }
    .frg-orgs-side h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); margin: 0 0 8px; }
    .frg-org-row { display: block; width: 100%; padding: 7px 10px; background: transparent; border: 1px solid transparent; border-radius: 5px; cursor: pointer; text-align: left; font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); margin-bottom: 3px; }
    .frg-org-row:hover { background: color-mix(in oklch, var(--brand-500) 6%, var(--ink-1)); }
    .frg-org-row.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-1)); border-color: var(--brand-400); }
    .frg-note-row { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 4px; text-decoration: none; color: var(--fg-2); margin-bottom: 4px; border: 1px solid transparent; }
    .frg-note-row:hover { background: var(--ink-1); border-color: var(--line-1); }
    .frg-note-row.unread { background: color-mix(in oklch, var(--brand-500) 8%, transparent); }
    .frg-note-type { font-size: 9px; text-transform: uppercase; color: var(--brand-200); letter-spacing: 0.04em; }
    .frg-note-title { font-size: 11px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .frg-note-repo { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); }
    .frg-empty, .frg-empty-pane { font-size: 11px; color: var(--fg-3); font-style: italic; padding: 10px 6px; }
    .frg-empty-pane { padding: 30px; text-align: center; }
    .frg-main { flex: 1; padding: 14px 18px; overflow-y: auto; min-width: 0; }
    .frg-repos-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line-1); }
    .frg-org-label { font-family: var(--font-mono); font-size: 12px; color: var(--fg-2); }
    .frg-repo-picker { background: var(--ink-2); color: var(--fg-1); border: 1px solid var(--line-2); padding: 6px 10px; border-radius: 5px; font-size: 12px; min-width: 240px; }
    .frg-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
    .frg-tab { background: var(--ink-2); border: 1px solid var(--line-2); color: var(--fg-2); padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .frg-tab.active { background: color-mix(in oklch, var(--brand-500) 18%, var(--ink-2)); border-color: var(--brand-400); color: var(--fg-1); }
    .frg-tab-count { font-family: var(--font-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: var(--ink-1); color: var(--fg-3); }
    .frg-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .frg-table th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .frg-table td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .frg-table td code { font-family: var(--font-mono); color: var(--fg-2); font-size: 11px; }
    .frg-table a { color: var(--brand-200); text-decoration: none; }
    .frg-table a:hover { text-decoration: underline; }
    .frg-title { color: var(--fg-1); }
    .frg-draft { font-size: 9px; padding: 1px 6px; border-radius: 3px; background: var(--ink-1); color: var(--fg-3); margin-left: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state { font-family: var(--font-mono); font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .frg-state.open { background: color-mix(in oklch, #34d399 18%, var(--ink-1)); color: #34d399; }
    .frg-state.closed { background: color-mix(in oklch, #f87171 18%, var(--ink-1)); color: #f87171; }
    .frg-state.merged { background: color-mix(in oklch, #a78bfa 18%, var(--ink-1)); color: #a78bfa; }
  `],
})
export class ForgeComponent implements OnInit {
  readonly forgeStatus = signal<ForgeStatus | null>(null);
  readonly forgeOrgs = signal<ForgeOrg[]>([]);
  readonly forgeSelectedOrg = signal<string>('');
  readonly forgeRepos = signal<ForgeRepo[]>([]);
  readonly forgeSelectedRepo = signal<string>('');
  readonly forgeIssues = signal<ForgeIssue[]>([]);
  readonly forgePulls = signal<ForgePull[]>([]);
  readonly forgeNotifications = signal<ForgeNotification[]>([]);
  readonly forgeError = signal<string | null>(null);
  readonly forgeLoading = signal(false);
  readonly forgeTab = signal<'issues' | 'pulls' | 'releases'>('issues');
  readonly forgeReleases = signal<ForgeRelease[]>([]);
  readonly forgeReleasesLoading = signal(false);
  readonly forgeReposCacheHit = signal(false);
  readonly forgeReposCacheAge = signal(0);

  ngOnInit(): void {
    void this.loadForge();
  }

  async loadForge(): Promise<void> {
    this.forgeLoading.set(true);
    this.forgeError.set(null);
    try {
      const [status, orgsRes, notesRes] = await Promise.all([
        callBridge<ForgeStatus>('forge_status', {}),
        callBridge<{ orgs?: ForgeOrg[] }>('forge_orgs', {}),
        callBridge<{ notifications?: ForgeNotification[] }>('forge_notifications', {}),
      ]);
      this.forgeStatus.set(status);
      const orgs = orgsRes?.orgs || [];
      this.forgeOrgs.set(orgs);
      if (orgs.length > 0 && !this.forgeSelectedOrg()) {
        this.forgeSelectedOrg.set(orgs[0].name);
        await this.loadForgeRepos(orgs[0].name);
      }
      this.forgeNotifications.set(notesRes?.notifications || []);
    } catch (e) {
      this.forgeError.set('forge bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      this.forgeLoading.set(false);
    }
  }

  async loadForgeRepos(org: string, force: boolean = false): Promise<void> {
    this.forgeSelectedOrg.set(org);
    this.forgeSelectedRepo.set('');
    this.forgeIssues.set([]);
    this.forgePulls.set([]);
    try {
      const v = await callBridge<ReposResponse>('forge_repos', { org, force });
      this.forgeRepos.set(v?.repos || []);
      this.forgeReposCacheHit.set(!!v?.cache_hit);
      this.forgeReposCacheAge.set(v?.cache_age_s || 0);
    } catch (e) {
      this.forgeError.set('forge_repos failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async loadForgeRepo(repo: string): Promise<void> {
    this.forgeSelectedRepo.set(repo);
    const owner = this.forgeSelectedOrg();
    try {
      const [issues, pulls] = await Promise.all([
        callBridge<{ issues?: ForgeIssue[] }>('forge_issues', { owner, repo }),
        callBridge<{ pulls?: ForgePull[] }>('forge_pulls', { owner, repo }),
      ]);
      this.forgeIssues.set(issues?.issues || []);
      this.forgePulls.set(pulls?.pulls || []);
    } catch (e) {
      this.forgeError.set('forge repo load failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async loadForgeReleases(): Promise<void> {
    const owner = this.forgeSelectedOrg();
    const repo = this.forgeSelectedRepo();
    if (!owner || !repo) return;
    this.forgeReleasesLoading.set(true);
    try {
      const v = await callBridge<{ releases?: ForgeRelease[] }>('forge_releases', { owner, repo, limit: 30 });
      this.forgeReleases.set(v?.releases || []);
    } finally {
      this.forgeReleasesLoading.set(false);
    }
  }

  formatCacheAge(seconds: number): string {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }
}
