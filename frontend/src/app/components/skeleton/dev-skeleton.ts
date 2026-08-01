// SPDX-Licence-Identifier: EUPL-1.2

import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, computed, signal } from '@angular/core';

/**
 * Reusable WebAwesome `<wa-skeleton>` patterns for the IDE's panels.
 * Eliminates the visual jank between component mount and first data
 * resolve — instead of flashing an empty list / "no items" message,
 * the panel renders skeleton placeholders that match the resolved
 * shape.
 *
 * Pair with `cachedBridgeResource.firstLoad()`:
 *
 *   @if (scan.firstLoad()) {
 *     <dev-skeleton kind="rows" [count]="6" />
 *   } @else {
 *     ...real content...
 *   }
 *
 * `firstLoad` is true only on cold-load (loading + no cached value);
 * silent SWR reloads keep prior data on screen so the skeleton never
 * flickers in mid-session.
 *
 * Three patterns cover ~90% of the IDE's data shapes:
 * - rows  → vertical list (sidebars, ticket lists, memory entries)
 * - cards → responsive card grid (repos, marketplace, scripts)
 * - table → tabular data (issues, pulls, store entries, locales matrix)
 */
@Component({
  selector: 'dev-skeleton',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @switch (resolvedKind()) {
      @case ('rows') {
        <div class="dev-sk-rows">
          @for (i of slots(); track i) {
            <div class="dev-sk-row">
              <wa-skeleton effect="sheen"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-meta"></wa-skeleton>
            </div>
          }
        </div>
      }
      @case ('cards') {
        <div class="dev-sk-cards">
          @for (i of slots(); track i) {
            <div class="dev-sk-card">
              <wa-skeleton effect="sheen" class="dev-sk-card-title"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-card-line"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-card-line short"></wa-skeleton>
            </div>
          }
        </div>
      }
      @case ('table') {
        <div class="dev-sk-table">
          @for (i of slots(); track i) {
            <div class="dev-sk-tr">
              <wa-skeleton effect="sheen" class="dev-sk-td narrow"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-td"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-td narrow"></wa-skeleton>
              <wa-skeleton effect="sheen" class="dev-sk-td narrow"></wa-skeleton>
            </div>
          }
        </div>
      }
      @case ('detail') {
        <div class="dev-sk-detail">
          <wa-skeleton effect="sheen" class="dev-sk-detail-title"></wa-skeleton>
          <wa-skeleton effect="sheen" class="dev-sk-detail-sub"></wa-skeleton>
          <wa-skeleton effect="sheen"></wa-skeleton>
          <wa-skeleton effect="sheen"></wa-skeleton>
          <wa-skeleton effect="sheen" class="short"></wa-skeleton>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; padding: 14px 18px; }

    /* All wa-skeleton instances default to a comfy row height. */
    wa-skeleton {
      --border-radius: 4px;
      --color: color-mix(in oklch, var(--ink-1) 60%, var(--ink-2));
      --sheen-color: color-mix(in oklch, var(--brand-200) 12%, transparent);
      height: 14px;
      display: block;
    }

    /* Rows — list of label + small meta line per row. */
    .dev-sk-rows { display: flex; flex-direction: column; gap: 10px; }
    .dev-sk-row { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; }
    .dev-sk-meta { width: 60%; height: 10px; opacity: 0.6; }

    /* Cards — responsive grid of medium-density cards. */
    .dev-sk-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
    .dev-sk-card { padding: 10px 12px; background: var(--ink-2); border: 1px solid var(--line-1); border-radius: 5px; display: flex; flex-direction: column; gap: 6px; }
    .dev-sk-card-title { width: 60%; height: 14px; }
    .dev-sk-card-line { width: 90%; height: 10px; opacity: 0.7; }
    .dev-sk-card-line.short { width: 50%; }

    /* Table — N rows × M cells; first row gets a header tint. */
    .dev-sk-table { display: flex; flex-direction: column; gap: 6px; }
    .dev-sk-tr { display: grid; grid-template-columns: 50px 1fr 80px 80px; gap: 10px; padding: 6px 4px; align-items: center; border-bottom: 1px solid var(--line-1); }
    .dev-sk-td { height: 12px; }
    .dev-sk-td.narrow { height: 10px; }

    /* Detail — header + body lines for selection-detail panes. */
    .dev-sk-detail { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
    .dev-sk-detail-title { width: 40%; height: 18px; }
    .dev-sk-detail-sub { width: 25%; height: 12px; opacity: 0.7; margin-bottom: 12px; }
    .dev-sk-detail .short { width: 60%; }
  `],
})
export class DevSkeleton {
  @Input() set kind(v: 'rows' | 'cards' | 'table' | 'detail') { this._kind.set(v); }
  @Input() set count(v: number) { this._count.set(v); }

  private readonly _kind = signal<'rows' | 'cards' | 'table' | 'detail'>('rows');
  private readonly _count = signal(6);

  readonly resolvedKind = this._kind.asReadonly();
  readonly slots = computed(() => Array.from({ length: this._count() }, (_, i) => i));
}
