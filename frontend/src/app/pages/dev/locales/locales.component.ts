// SPDX-Licence-Identifier: EUPL-1.2

import { Component, OnInit, signal } from '@angular/core';
import { callBridge } from '../../../lib/bridge';

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
  packages?: I18nPackage[];
  unique_locales?: string[];
}

interface I18nViewResponse {
  content: any;
}

interface SelectedCell {
  pkg: string;
  locale: string;
  path: string;
}

/**
 * Locales panel — translation coverage matrix across the canon.
 * Surface over core/go-i18n.
 *
 * TODO(snider/wails): swap callBridge('i18n_*') for an i18nBridge
 * wails service.
 */
@Component({
  selector: 'dev-locales',
  standalone: true,
  template: `
    <section class="block i18n-block">
      <div class="block-header i18n-header">
        <h2 class="block-title">Locales</h2>
        <span class="editorial subtitle">Translation coverage across the canon. Surface over <code>core/go-i18n</code>.</span>
      </div>
      <div class="i18n-toolbar">
        <span class="i18n-meta">
          {{ i18nPackages().length }} packages · {{ i18nUniqueLocales().length }} locales seen: {{ i18nUniqueLocales().join(', ') || '—' }}
        </span>
        <button class="btn btn-ghost btn-sm" (click)="scanLocales()" [disabled]="i18nLoading()">
          @if (i18nLoading()) { <span>scanning…</span> } @else { <span>Re-scan</span> }
        </button>
      </div>
      @if (i18nError(); as err) {
        <div class="i18n-error">{{ err }}</div>
      }
      <div class="i18n-body">
        <div class="i18n-matrix">
          <table>
            <thead>
              <tr>
                <th class="i18n-pkg-col">Package</th>
                <th class="i18n-baseline-col">en keys</th>
                @for (loc of i18nUniqueLocales(); track loc) {
                  <th>{{ loc }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (p of i18nPackages(); track p.code) {
                <tr>
                  <td class="i18n-pkg-name">{{ p.code }}</td>
                  <td class="i18n-baseline">{{ p.baseline_keys || '—' }}</td>
                  @for (loc of i18nUniqueLocales(); track loc) {
                    @if (i18nFindLocale(p, loc); as cell) {
                      <td class="i18n-cell present"
                          [class.complete]="cell.missing_vs_en === 0"
                          [class.partial]="cell.missing_vs_en > 0 && cell.keys < p.baseline_keys"
                          [class.over]="cell.keys > p.baseline_keys && p.baseline_keys > 0"
                          [class.active]="i18nSelectedCell()?.pkg === p.code && i18nSelectedCell()?.locale === loc"
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
              @if (i18nPackages().length === 0 && !i18nLoading()) {
                <tr><td [attr.colspan]="2 + i18nUniqueLocales().length" class="i18n-empty">No locales found in workspace.</td></tr>
              }
            </tbody>
          </table>
        </div>

        @if (i18nSelectedCell(); as sel) {
          <div class="i18n-viewer">
            <div class="i18n-viewer-head">
              <span class="i18n-viewer-title">{{ sel.pkg }} · <strong>{{ sel.locale }}</strong></span>
              <code class="i18n-viewer-path">{{ sel.path }}</code>
            </div>
            <pre class="i18n-viewer-body">{{ formatLocaleContent(i18nViewContent()) }}</pre>
          </div>
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
export class LocalesComponent implements OnInit {
  readonly i18nPackages = signal<I18nPackage[]>([]);
  readonly i18nUniqueLocales = signal<string[]>([]);
  readonly i18nLoading = signal(false);
  readonly i18nError = signal<string | null>(null);
  readonly i18nSelectedCell = signal<SelectedCell | null>(null);
  readonly i18nViewContent = signal<any>(null);

  ngOnInit(): void {
    // SWR — render cached, then silently force-refresh.
    void this.scanLocales().then(() => void this.scanLocales(true, true));
  }

  async scanLocales(force: boolean = false, silent: boolean = false): Promise<void> {
    if (this.i18nLoading() && !silent) return;
    if (!silent) this.i18nLoading.set(true);
    this.i18nError.set(null);
    try {
      const v = await callBridge<I18nScanResponse>('i18n_scan', { force });
      this.i18nPackages.set(v?.packages || []);
      this.i18nUniqueLocales.set(v?.unique_locales || []);
    } catch (e) {
      this.i18nError.set('i18n bridge error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (!silent) this.i18nLoading.set(false);
    }
  }

  async openLocaleCell(pkg: string, locale: string, path: string): Promise<void> {
    this.i18nSelectedCell.set({ pkg, locale, path });
    this.i18nViewContent.set('Loading…');
    try {
      const v = await callBridge<I18nViewResponse>('i18n_view', { path });
      this.i18nViewContent.set(v?.content);
    } catch (e) {
      this.i18nViewContent.set('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  formatLocaleContent(content: any): string {
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  }

  i18nFindLocale(pkg: I18nPackage, locale: string): LocaleEntry | null {
    return pkg.locales.find((l) => l.name === locale) || null;
  }
}
