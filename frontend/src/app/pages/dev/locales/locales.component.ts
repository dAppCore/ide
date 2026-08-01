// SPDX-Licence-Identifier: EUPL-1.2

import { Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { cachedBridgeResource } from '../../../lib/cached-bridge-resource';
import * as LocalesBridge from '../../../../../bindings/dappco.re/go/ide/pkg/server/localesbridge';
import { DevSkeleton } from '../../../components/skeleton/dev-skeleton';

interface LocaleEntry {
  name: string;
  path: string;
  keys: number;
  missing_vs_en: number;
}

interface I18nPackage {
  code: string;
  path: string;
  has_english: boolean;
  baseline_keys: number;
  locales: LocaleEntry[];
}

interface I18nScanResponse {
  packages: I18nPackage[];
  unique_locales: string[];
  cache_hit?: boolean;
  cache_age_s?: number;
}

interface I18nViewResponse {
  content: any;
}

interface SelectedCell {
  pkg: string;
  locale: string;
  path: string;
}

const EMPTY_SCAN: I18nScanResponse = { packages: [], unique_locales: [] };

/**
 * Locales panel — translation coverage matrix across the canon.
 * Surface over core/go-i18n.
 *
 * Pilot for the resource() + linkedSignal SWR pattern via
 * `cachedBridgeResource()` (see lib/cached-bridge-resource.ts and
 * plans/code/core/ide/RFC.swr-resource-migration.md). Replaces the
 * imperative `loadX().then(loadX(true,true))` chain with Angular's
 * canonical reactive primitives.
 *
 * Migrated 2026-05-10 to typed LocalesBridge wails binding for the
 * i18n_scan / i18n_view methods.
 */
@Component({
  selector: 'dev-locales',
  standalone: true,
  imports: [DevSkeleton, TranslatePipe],
  template: `
    <section class="block i18n-block">
      <div class="block-header i18n-header">
        <h2 class="block-title">{{ 'locales.title' | translate }}</h2>
        <span class="editorial subtitle">{{ 'locales.subtitle.prefix' | translate }} <code>core/go-i18n</code>.</span>
      </div>
      <div class="i18n-toolbar">
        <span class="i18n-meta">
          {{ scan.stable().packages.length }} {{ 'locales.label.packages' | translate }} · {{ scan.stable().unique_locales.length }} {{ 'locales.label.locales-seen' | translate }} {{ scan.stable().unique_locales.join(', ') || '—' }}
        </span>
        <button class="btn btn-ghost btn-sm" (click)="scan.refresh()" [disabled]="scan.loading()">
          @if (scan.loading()) { <span>{{ 'locales.status.scanning' | translate }}</span> } @else { <span>{{ 'locales.button.rescan' | translate }}</span> }
        </button>
      </div>
      @if (scan.error(); as err) {
        <div class="i18n-error">{{ err }}</div>
      }
      <div class="i18n-body">
        @if (scan.firstLoad()) {
          <dev-skeleton kind="table" [count]="8" />
        } @else {
        <div class="i18n-matrix">
          <table>
            <thead>
              <tr>
                <th class="i18n-pkg-col">{{ 'locales.column.package' | translate }}</th>
                <th class="i18n-baseline-col">{{ 'locales.column.en-keys' | translate }}</th>
                @for (loc of scan.stable().unique_locales; track loc) {
                  <th>{{ loc }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (p of scan.stable().packages; track p.code) {
                <tr>
                  <td class="i18n-pkg-name">{{ p.code }}</td>
                  <td class="i18n-baseline">{{ p.baseline_keys || '—' }}</td>
                  @for (loc of scan.stable().unique_locales; track loc) {
                    @if (findLocale(p, loc); as cell) {
                      <td class="i18n-cell present"
                          [class.complete]="cell.missing_vs_en === 0"
                          [class.partial]="cell.missing_vs_en > 0 && cell.keys < p.baseline_keys"
                          [class.over]="cell.keys > p.baseline_keys && p.baseline_keys > 0"
                          [class.active]="selectedCell()?.pkg === p.code && selectedCell()?.locale === loc"
                          (click)="openLocaleCell(p.code, loc, cell.path)">
                        <span class="i18n-cell-keys">{{ cell.keys }}</span>
                        @if (cell.missing_vs_en > 0) {
                          <span class="i18n-cell-gap">−{{ cell.missing_vs_en }}</span>
                        } @else if (p.baseline_keys > 0 && cell.keys > p.baseline_keys) {
                          <span class="i18n-cell-extra">+{{ cell.keys - p.baseline_keys }}</span>
                        }
                      </td>
                    } @else {
                      <td class="i18n-cell missing">—</td>
                    }
                  }
                </tr>
              }
              @if (scan.stable().packages.length === 0 && !scan.loading()) {
                <tr><td [attr.colspan]="2 + scan.stable().unique_locales.length" class="i18n-empty">{{ 'locales.empty.none' | translate }}</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (selectedCell(); as sel) {
          <div class="i18n-viewer">
            <div class="i18n-viewer-head">
              <span class="i18n-viewer-title">{{ sel.pkg }} · <strong>{{ sel.locale }}</strong></span>
              <code class="i18n-viewer-path">{{ sel.path }}</code>
            </div>
            <pre class="i18n-viewer-body">{{ formatLocaleContent(viewContent()) }}</pre>
          </div>
        }
        }
      </div>
    </section>
  `,
  styles: [`
    /* Locales panel */
    .i18n-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .i18n-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-toolbar { display: flex; gap: 12px; padding: 10px 18px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .i18n-meta { font-size: 12px; color: var(--fg-3); }
    .i18n-error { padding: 10px 18px; color: #f87171; background: color-mix(in oklch, #f87171 8%, var(--ink-2)); border-bottom: 1px solid var(--line-1); font-size: 13px; }
    .i18n-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 18px; }
    .i18n-matrix table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .i18n-matrix th { text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-3); border-bottom: 1px solid var(--line-1); }
    .i18n-matrix td { padding: 7px 10px; border-bottom: 1px solid var(--line-1); }
    .i18n-pkg-col { min-width: 160px; }
    .i18n-baseline-col, .i18n-matrix th:not(.i18n-pkg-col):not(.i18n-baseline-col) { text-align: center; min-width: 70px; }
    .i18n-pkg-name { font-family: var(--font-mono); font-size: 12px; color: var(--fg-1); font-weight: 500; }
    .i18n-baseline { font-family: var(--font-mono); color: var(--fg-2); text-align: center; }
    .i18n-cell { font-family: var(--font-mono); text-align: center; cursor: pointer; transition: background 0.15s; }
    .i18n-cell.present { color: var(--fg-2); }
    .i18n-cell.present:hover { background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2)); }
    .i18n-cell.complete { background: color-mix(in oklch, #34d399 8%, transparent); }
    .i18n-cell.partial { background: color-mix(in oklch, #fbbf24 8%, transparent); }
    .i18n-cell.over { background: color-mix(in oklch, #93c5fd 8%, transparent); }
    .i18n-cell.active { background: color-mix(in oklch, var(--brand-500) 22%, var(--ink-2)) !important; outline: 1px solid var(--brand-400); }
    .i18n-cell.missing { color: var(--fg-3); cursor: default; opacity: 0.4; }
    .i18n-cell-keys { font-weight: 500; }
    .i18n-cell-gap { font-size: 10px; color: #fbbf24; margin-left: 4px; }
    .i18n-cell-extra { font-size: 10px; color: #93c5fd; margin-left: 4px; }
    .i18n-empty { text-align: center; color: var(--fg-3); padding: 32px; font-style: italic; }
    .i18n-viewer { background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 8px; }
    .i18n-viewer-head { padding: 10px 14px; border-bottom: 1px solid var(--line-1); display: flex; gap: 10px; align-items: center; }
    .i18n-viewer-title { font-size: 13px; color: var(--fg-1); }
    .i18n-viewer-path { font-family: var(--font-mono); font-size: 10px; color: var(--fg-3); margin-left: auto; }
    .i18n-viewer-body { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; padding: 14px 16px; margin: 0; max-height: 400px; overflow-y: auto; color: var(--fg-2); white-space: pre-wrap; }
  `],
})
export class LocalesComponent {
  readonly scan = cachedBridgeResource<I18nScanResponse>({
    loader: () =>
      LocalesBridge.Scan().then((v) => ({
        packages: (v.packages || []).map((p) => ({
          code: p.code,
          path: p.path,
          has_english: p.has_english,
          baseline_keys: p.baseline_keys,
          locales: (p.locales || []).map((l) => ({
            name: l.name,
            path: l.path,
            keys: l.keys,
            missing_vs_en: l.missing_vs_en,
          })),
        })),
        unique_locales: v.unique_locales || [],
        cache_hit: v.cache_hit,
        cache_age_s: v.cache_age_s,
      })),
    emptyValue: EMPTY_SCAN,
    isEmpty: (v) => v.packages.length === 0,
  });

  // Drill-down state (i18n_view per-cell) is fire-and-forget — not
  // worth the resource() ceremony for a single-shot fetch.
  readonly selectedCell = signal<SelectedCell | null>(null);
  readonly viewContent = signal<any>(null);

  async openLocaleCell(pkg: string, locale: string, path: string): Promise<void> {
    this.selectedCell.set({ pkg, locale, path });
    this.viewContent.set('Loading…');
    try {
      const v = await LocalesBridge.View({ path });
      this.viewContent.set(v.content);
    } catch (e) {
      this.viewContent.set('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  formatLocaleContent(content: any): string {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }

  findLocale(pkg: I18nPackage, locale: string): LocaleEntry | null {
    return pkg.locales.find((l) => l.name === locale) || null;
  }
}
