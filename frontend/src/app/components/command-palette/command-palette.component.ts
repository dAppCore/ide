// SPDX-Licence-Identifier: EUPL-1.2

import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Signal,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CommandRecord, CommandRegistryService } from '../../services/command-registry.service';

/**
 * Command palette overlay — fuzzy-search over registered commands.
 * Triggered by `cmd+Shift+P` (mac) / `ctrl+Shift+P` (others) wired in
 * IdeComponent. Esc closes; up/down navigate; enter runs.
 *
 * Renders inside the IDE shell as a fixed overlay rather than a
 * wa-dialog because it needs precise focus + keyboard control + dim
 * backdrop without the wa-dialog header chrome.
 *
 * Plugins extend the palette by injecting CommandRegistryService and
 * calling `register()` — no palette code change required for new
 * plugin actions.
 */
@Component({
  selector: 'command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [TranslatePipe],
  template: `
    @if (visible()) {
      <div class="cmd-backdrop" (click)="close()"></div>
      <div class="cmd-shell" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cmd-search-row">
          <span class="cmd-prompt">›</span>
          <input
            #searchInput
            class="cmd-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            [placeholder]="'palette.placeholder' | translate"
            [value]="query()"
            (input)="onQuery($any($event.target).value)"
            (keydown)="onInputKey($event)"
          />
          <span class="cmd-hint">{{ 'palette.hint.keys' | translate }}</span>
        </div>
        <div class="cmd-list" #list>
          @if (matches().length === 0) {
            <div class="cmd-empty">{{ 'palette.empty.no-match' | translate }}</div>
          } @else {
            @for (rec of matches(); track rec.id; let i = $index) {
              <button
                class="cmd-item"
                [class.active]="i === activeIndex()"
                (click)="run(rec)"
                (mouseenter)="activeIndex.set(i)"
              >
                <span class="cmd-label">{{ rec.label }}</span>
                @if (rec.group) {
                  <span class="cmd-group">{{ rec.group }}</span>
                }
                @if (rec.hint) {
                  <span class="cmd-kbd">{{ rec.hint }}</span>
                }
              </button>
            }
          }
        </div>
        <div class="cmd-footer">
          <span class="cmd-count">{{ matches().length }} / {{ totalCount() }}</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .cmd-backdrop {
      position: fixed;
      inset: 0;
      background: color-mix(in oklch, #000 50%, transparent);
      backdrop-filter: blur(2px);
      z-index: 9000;
    }
    .cmd-shell {
      position: fixed;
      top: 96px;
      left: 50%;
      transform: translateX(-50%);
      width: min(620px, calc(100vw - 32px));
      max-height: calc(100vh - 192px);
      background: var(--ink-2);
      border: 1px solid var(--line-2);
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9001;
    }
    .cmd-search-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .cmd-prompt {
      font-family: var(--font-mono);
      color: var(--brand-200);
      font-size: 16px;
      width: 14px;
      text-align: center;
    }
    .cmd-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--fg-1);
      font-size: 14px;
      font-family: inherit;
    }
    .cmd-input::placeholder { color: var(--fg-3); }
    .cmd-hint {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--fg-3);
      letter-spacing: 0.05em;
    }
    .cmd-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }
    .cmd-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 8px 14px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      color: var(--fg-1);
      font: inherit;
    }
    .cmd-item.active {
      background: color-mix(in oklch, var(--brand-500) 18%, transparent);
    }
    .cmd-label { flex: 1; font-size: 13px; }
    .cmd-group {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
    }
    .cmd-kbd {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--fg-3);
      background: var(--ink-1);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .cmd-empty {
      padding: 30px 14px;
      text-align: center;
      color: var(--fg-3);
      font-size: 12px;
      font-style: italic;
    }
    .cmd-footer {
      padding: 6px 14px;
      border-top: 1px solid var(--line-1);
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--fg-3);
      text-align: right;
      flex-shrink: 0;
    }
  `],
})
export class CommandPaletteComponent implements AfterViewInit {
  private readonly registry = inject(CommandRegistryService);
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('list') listRef?: ElementRef<HTMLDivElement>;

  readonly visible = signal(false);
  readonly query = signal('');
  readonly activeIndex = signal(0);

  readonly matches: Signal<CommandRecord[]> = computed(() => this.registry.find(this.query()));
  readonly totalCount = computed(() => this.registry.enabled().length);

  ngAfterViewInit(): void {
    // No-op: we focus on open() instead.
  }

  open(): void {
    this.visible.set(true);
    this.query.set('');
    this.activeIndex.set(0);
    queueMicrotask(() => this.searchInputRef?.nativeElement.focus());
  }

  close(): void {
    this.visible.set(false);
  }

  toggle(): void {
    if (this.visible()) this.close();
    else this.open();
  }

  onQuery(v: string): void {
    this.query.set(v);
    this.activeIndex.set(0);
  }

  onInputKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.move(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.move(-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const list = this.matches();
      const rec = list[this.activeIndex()];
      if (rec) void this.run(rec);
      return;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (!this.visible()) return;
    // Esc on document (e.g. focus drifted) still closes the palette.
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
    }
  }

  async run(rec: CommandRecord): Promise<void> {
    this.close();
    try {
      await rec.run();
    } catch (e) {
      // Surface failures via console; commands own their own UX
      // (notifications, toasts, navigations). The palette never blocks.
      console.warn('[command-palette] run failed:', rec.id, e);
    }
  }

  private move(delta: number): void {
    const total = this.matches().length;
    if (total === 0) return;
    const next = (this.activeIndex() + delta + total) % total;
    this.activeIndex.set(next);
    queueMicrotask(() => this.scrollActiveIntoView());
  }

  private scrollActiveIntoView(): void {
    const list = this.listRef?.nativeElement;
    if (!list) return;
    const el = list.querySelector<HTMLElement>('.cmd-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  }
}
