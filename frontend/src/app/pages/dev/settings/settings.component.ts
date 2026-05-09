// SPDX-Licence-Identifier: EUPL-1.2

import { Component, EventEmitter, Output, inject } from '@angular/core';
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
