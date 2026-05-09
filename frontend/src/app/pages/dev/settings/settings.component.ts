// SPDX-Licence-Identifier: EUPL-1.2

import { Component, EventEmitter, Output, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsStore, CoreSettings } from '../../../services/store/settings.store';

/**
 * Settings panel — tunes the IDE. Reads + writes via SettingsStore;
 * the actual /internal/ui-state HTTP save is owned by IdeComponent's
 * flushUIState() so settings round-trip alongside chat-visible/route/
 * open-files in one POST.
 *
 * On Save, we emit `requestSave` — IdeComponent listens at the
 * router-outlet level and calls flushUIState(). Reset stays
 * client-only until the user hits Save again.
 */
@Component({
  selector: 'dev-settings',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block settings-block">
      <div class="block-header settings-header">
        <h2 class="block-title">Settings</h2>
        <span class="editorial subtitle">Tune the IDE to how you actually work. Changes save to <code>~/.core/config.yaml</code>.</span>
      </div>
      <div class="settings-toolbar">
        <button class="btn btn-primary btn-sm" (click)="onSave()" [disabled]="!store.dirty()">
          Save changes
        </button>
        <button class="btn btn-ghost btn-sm" (click)="store.reset()">
          Reset to defaults
        </button>
        @if (store.saveMessage(); as msg) {
          <span class="settings-saved">{{ msg }}</span>
        }
      </div>

      <div class="settings-body">

        <div class="settings-group">
          <h3 class="settings-group-title">Appearance</h3>
          <p class="settings-group-hint">Theme switches WebAwesome's component styling. The IDE stays dark — light mode isn't part of the canon.</p>
          <label class="settings-row">
            <span class="settings-label">Theme</span>
            <select class="settings-input"
                    [value]="store.settings().theme"
                    (change)="updateStr('theme', $any($event.target).value)">
              <option value="lethean">Lethean (canon — Vi purple)</option>
              <option value="default">WebAwesome Default</option>
              <option value="awesome">Awesome (bright)</option>
              <option value="shoelace">Shoelace (classic)</option>
              <option value="premium">Premium Pro (cyan)</option>
              <option value="matter">Matter Pro (purple)</option>
            </select>
          </label>
          <label class="settings-row">
            <span class="settings-label">{{ 'settings.appearance.language' | translate }}</span>
            <select class="settings-input"
                    [value]="store.settings().language"
                    (change)="updateStr('language', $any($event.target).value)">
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="ru">Русский</option>
              <option value="zh">中文</option>
              <option value="fa">فارسی</option>
            </select>
          </label>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">Editor</h3>
          <p class="settings-group-hint">Live-applied to Monaco. No restart needed.</p>
          <label class="settings-row">
            <span class="settings-label">Font size</span>
            <input type="number" min="8" max="32" step="0.5" class="settings-input num"
                   [value]="store.settings().editorFontSize"
                   (input)="updateNum('editorFontSize', $any($event.target).value)" />
          </label>
          <label class="settings-row">
            <span class="settings-label">Tab size</span>
            <input type="number" min="1" max="8" class="settings-input num"
                   [value]="store.settings().editorTabSize"
                   (input)="updateNum('editorTabSize', $any($event.target).value)" />
          </label>
          <label class="settings-row toggle">
            <input type="checkbox"
                   [checked]="store.settings().editorWordWrap"
                   (change)="updateBool('editorWordWrap', $any($event.target).checked)" />
            <span class="settings-label">Word wrap</span>
          </label>
          <label class="settings-row toggle">
            <input type="checkbox"
                   [checked]="store.settings().editorLineNumbers"
                   (change)="updateBool('editorLineNumbers', $any($event.target).checked)" />
            <span class="settings-label">Line numbers</span>
          </label>
          <label class="settings-row toggle">
            <input type="checkbox"
                   [checked]="store.settings().editorMinimap"
                   (change)="updateBool('editorMinimap', $any($event.target).checked)" />
            <span class="settings-label">Minimap</span>
          </label>
          <label class="settings-row">
            <span class="settings-label">Render whitespace</span>
            <select class="settings-input"
                    [value]="store.settings().editorRenderWhitespace"
                    (change)="updateStr('editorRenderWhitespace', $any($event.target).value)">
              <option value="none">none</option>
              <option value="boundary">boundary</option>
              <option value="selection">selection</option>
              <option value="trailing">trailing</option>
              <option value="all">all</option>
            </select>
          </label>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">Workspace &amp; launch</h3>
          <p class="settings-group-hint">Where the IDE starts when you open it.</p>
          <label class="settings-row stacked">
            <span class="settings-label">Workspace root</span>
            <input type="text" class="settings-input"
                   [value]="store.settings().workspaceRoot"
                   (input)="updateStr('workspaceRoot', $any($event.target).value)" />
          </label>
          <label class="settings-row">
            <span class="settings-label">Default route on launch</span>
            <select class="settings-input"
                    [value]="store.settings().defaultRoute"
                    (change)="updateStr('defaultRoute', $any($event.target).value)">
              <option value="dashboard">Control Panel</option>
              <option value="explorer">Explorer</option>
              <option value="search">Search</option>
              <option value="git">Source Control</option>
              <option value="terminal">Terminal</option>
              <option value="repos">Repos</option>
              <option value="marketplace">Marketplace</option>
            </select>
          </label>
          <label class="settings-row toggle">
            <input type="checkbox"
                   [checked]="store.settings().chatVisibleOnLaunch"
                   (change)="updateBool('chatVisibleOnLaunch', $any($event.target).checked)" />
            <span class="settings-label">Show Vi chat panel on launch</span>
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">Repo scan roots <span class="settings-hint">(one per line — re-scan triggers next time you open Repos)</span></span>
            <textarea class="settings-input textarea" rows="6"
                      [value]="store.settings().reposRoots"
                      (input)="updateStr('reposRoots', $any($event.target).value)"></textarea>
          </label>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">Backend (restart required)</h3>
          <p class="settings-group-hint">These settings affect the Go side and only take effect after restarting the IDE.</p>
          <label class="settings-row stacked">
            <span class="settings-label">Marketplace endpoint <span class="settings-hint">(blank = built-in fixture)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().marketplaceEndpoint"
                   placeholder="https://api.lthn.sh"
                   (input)="updateStr('marketplaceEndpoint', $any($event.target).value)" />
          </label>
          <label class="settings-row">
            <span class="settings-label">Terminal SSH port</span>
            <input type="number" min="1024" max="65535" class="settings-input num"
                   [value]="store.settings().terminalSshPort"
                   (input)="updateNum('terminalSshPort', $any($event.target).value)" />
          </label>
        </div>

      </div>
    </section>
  `,
  styles: [`
    /* Settings */
    .settings-block { padding: 0; min-height: 0; flex: 1; display: flex; flex-direction: column; }
    .settings-header { padding: 14px 18px; border-bottom: 1px solid var(--line-1); flex-shrink: 0; }
    .settings-toolbar {
      display: flex;
      gap: 10px;
      padding: 10px 18px;
      align-items: center;
      border-bottom: 1px solid var(--line-1);
      flex-shrink: 0;
    }
    .settings-saved {
      font-size: 12px;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 10%, var(--ink-2));
      padding: 4px 10px;
      border-radius: var(--r-sm);
    }
    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .settings-group {
      background: var(--ink-2);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .settings-group-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--fg-1);
      margin: 0;
      letter-spacing: 0.02em;
    }
    .settings-group-hint {
      font-size: 11px;
      color: var(--fg-3);
      margin: -4px 0 4px;
      font-style: italic;
    }
    .settings-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--fg-2);
    }
    .settings-row.stacked {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
    .settings-row.toggle {
      cursor: pointer;
    }
    .settings-row.toggle input[type="checkbox"] {
      width: 14px;
      height: 14px;
      accent-color: var(--brand-500);
    }
    .settings-label {
      flex: 1;
      color: var(--fg-1);
    }
    .settings-hint {
      color: var(--fg-3);
      font-weight: 400;
      font-style: italic;
      font-size: 11px;
      margin-left: 6px;
    }
    .settings-input {
      background: var(--ink-1);
      border: 1px solid var(--line-2);
      color: var(--fg-1);
      padding: 6px 10px;
      border-radius: var(--r-sm);
      font-size: 13px;
      font-family: var(--font-sans);
    }
    .settings-input:focus { border-color: var(--brand-400); outline: none; }
    .settings-input.num { width: 80px; font-family: var(--font-mono); }
    .settings-input.textarea {
      font-family: var(--font-mono);
      font-size: 12px;
      resize: vertical;
      min-height: 80px;
    }
    .settings-row select.settings-input { width: 200px; }
    .settings-row.stacked input.settings-input,
    .settings-row.stacked textarea.settings-input { width: 100%; }
  `],
})
export class SettingsComponent {
  readonly store = inject(SettingsStore);

  /** Emitted on Save click; IdeComponent picks up via (activate) on outlet → flushUIState. */
  @Output() requestSave = new EventEmitter<void>();

  updateNum<K extends keyof CoreSettings>(key: K, raw: string): void {
    this.store.update(key, +raw as CoreSettings[K]);
  }
  updateBool<K extends keyof CoreSettings>(key: K, raw: boolean): void {
    this.store.update(key, raw as CoreSettings[K]);
  }
  updateStr<K extends keyof CoreSettings>(key: K, raw: string): void {
    this.store.update(key, raw as CoreSettings[K]);
  }

  onSave(): void {
    this.requestSave.emit();
    this.store.markSaved('Saved. Backend settings (marketplace endpoint, SSH port) take effect after restart.');
  }
}
