// SPDX-Licence-Identifier: EUPL-1.2

import { Component, EventEmitter, Output, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SettingsStore, CoreSettings } from '../../../services/store/settings.store';
import {
  PluginSettingsField,
  PluginSettingsSection,
  SettingsRegistryService,
} from '../../../services/settings-registry.service';

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

        <div class="settings-group">
          <h3 class="settings-group-title">AI / Chat (restart required)</h3>
          <p class="settings-group-hint">Tells the gui chat service where to find your local LLM. Lemma plugs in here. Default is http://localhost:8090; point at any compatible HTTP endpoint (Ollama on :11434, Vi sidecar, etc.).</p>
          <label class="settings-row stacked">
            <span class="settings-label">Chat API URL <span class="settings-hint">(blank = http://localhost:8090)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().chatApiUrl"
                   placeholder="http://localhost:8090"
                   (input)="updateStr('chatApiUrl', $any($event.target).value)" />
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">Chat store path <span class="settings-hint">(blank = ~/.core/gui/chat.db)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().chatStorePath"
                   placeholder="~/.core/gui/chat.db"
                   (input)="updateStr('chatStorePath', $any($event.target).value)" />
          </label>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">TIM container (restart required)</h3>
          <p class="settings-group-hint">Trusted In-Memory container manager. Image + Name unlock /dev/tim's Start button. Runs via the host runtime detected at /dev/tim (Apple Containers / Docker / Podman).</p>
          <label class="settings-row stacked">
            <span class="settings-label">TIM image</span>
            <input type="text" class="settings-input"
                   [value]="store.settings().timImage"
                   placeholder="alpine:latest"
                   (input)="updateStr('timImage', $any($event.target).value)" />
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">TIM container name</span>
            <input type="text" class="settings-input"
                   [value]="store.settings().timName"
                   placeholder="core-tim"
                   (input)="updateStr('timName', $any($event.target).value)" />
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">TIM data directory <span class="settings-hint">(blank = container default)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().timDataDir"
                   placeholder="/var/lib/tim"
                   (input)="updateStr('timDataDir', $any($event.target).value)" />
          </label>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">P2P (restart required)</h3>
          <p class="settings-group-hint">Peer-to-peer router (TCP driver). Listen address must be set for /dev/p2p's Publish to work. Bootstrap peers (one per line) get dialed at start.</p>
          <label class="settings-row stacked">
            <span class="settings-label">Listen address <span class="settings-hint">(blank = no listener bound)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().p2pListenAddr"
                   placeholder="127.0.0.1:9100"
                   (input)="updateStr('p2pListenAddr', $any($event.target).value)" />
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">Bootstrap peers <span class="settings-hint">(one per line)</span></span>
            <textarea class="settings-input textarea" rows="4"
                      [value]="store.settings().p2pPeerAddrs"
                      placeholder="10.0.0.1:9100&#10;10.0.0.2:9100"
                      (input)="updateStr('p2pPeerAddrs', $any($event.target).value)"></textarea>
          </label>
          <label class="settings-row stacked">
            <span class="settings-label">Node ID <span class="settings-hint">(blank = auto-assigned)</span></span>
            <input type="text" class="settings-input"
                   [value]="store.settings().p2pNodeId"
                   placeholder="(auto)"
                   (input)="updateStr('p2pNodeId', $any($event.target).value)" />
          </label>
        </div>

        <!-- Plugin-contributed settings sections.
             Plugins register via SettingsRegistryService.register(). The
             IDE just renders the slot — plugins own value persistence
             (their own keys, their own backend). Built-in IDE sections
             above stay hardcoded; plugins extend cleanly without IDE
             shell changes. -->
        @for (section of registry.ordered(); track section.id) {
          <div class="settings-group">
            <h3 class="settings-group-title">
              {{ section.label }}
              @if (section.group) {
                <span class="settings-section-tag">{{ section.group }}</span>
              }
            </h3>
            @if (section.hint) {
              <p class="settings-group-hint">{{ section.hint }}</p>
            }
            @for (field of section.fields; track field.key) {
              @switch (field.type) {
                @case ('boolean') {
                  <label class="settings-row checkbox-row">
                    <input type="checkbox" class="settings-checkbox"
                           [checked]="!!field.value()"
                           (change)="onFieldChange(section, field, $any($event.target).checked)" />
                    <span class="settings-label">
                      {{ field.label }}
                      @if (field.hint) {
                        <span class="settings-hint">{{ field.hint }}</span>
                      }
                    </span>
                  </label>
                }
                @case ('select') {
                  <label class="settings-row">
                    <span class="settings-label">
                      {{ field.label }}
                      @if (field.hint) {
                        <span class="settings-hint">{{ field.hint }}</span>
                      }
                    </span>
                    <select class="settings-input"
                            [value]="$any(field.value())"
                            (change)="onFieldChange(section, field, $any($event.target).value)">
                      @for (opt of (field.options || []); track opt.value) {
                        <option [value]="opt.value">{{ opt.label }}</option>
                      }
                    </select>
                  </label>
                }
                @case ('number') {
                  <label class="settings-row">
                    <span class="settings-label">
                      {{ field.label }}
                      @if (field.hint) {
                        <span class="settings-hint">{{ field.hint }}</span>
                      }
                    </span>
                    <input type="number" class="settings-input num"
                           [min]="field.min ?? null"
                           [max]="field.max ?? null"
                           [step]="field.step ?? 1"
                           [value]="$any(field.value())"
                           (input)="onFieldChange(section, field, +$any($event.target).value)" />
                  </label>
                }
                @case ('textarea') {
                  <label class="settings-row stacked">
                    <span class="settings-label">
                      {{ field.label }}
                      @if (field.hint) {
                        <span class="settings-hint">{{ field.hint }}</span>
                      }
                    </span>
                    <textarea class="settings-input textarea" rows="4"
                              [placeholder]="field.placeholder || ''"
                              [value]="$any(field.value())"
                              (input)="onFieldChange(section, field, $any($event.target).value)"></textarea>
                  </label>
                }
                @default {
                  <label class="settings-row stacked">
                    <span class="settings-label">
                      {{ field.label }}
                      @if (field.hint) {
                        <span class="settings-hint">{{ field.hint }}</span>
                      }
                    </span>
                    <input type="text" class="settings-input"
                           [placeholder]="field.placeholder || ''"
                           [value]="$any(field.value())"
                           (input)="onFieldChange(section, field, $any($event.target).value)" />
                  </label>
                }
              }
            }
          </div>
        }

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
    /* Plugin-contributed sections — visual marker so it's clear which
       sections come from the IDE built-ins vs registered extensions. */
    .settings-section-tag {
      font-family: var(--font-mono);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--brand-200);
      background: color-mix(in oklch, var(--brand-500) 14%, var(--ink-1));
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 8px;
      vertical-align: middle;
      font-weight: 500;
    }
    .settings-row.checkbox-row {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .settings-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--brand-500);
    }
  `],
})
export class SettingsComponent {
  readonly store = inject(SettingsStore);
  readonly registry = inject(SettingsRegistryService);

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

  /** Plugin section field-change handler. The registry doesn't dictate
   *  persistence — plugins own their config storage. We just call their
   *  onChange callback per edit. Errors stay on the plugin side. */
  onFieldChange(
    section: PluginSettingsSection,
    field: PluginSettingsField,
    value: unknown,
  ): void {
    if (!section.onChange) return;
    void Promise.resolve(section.onChange(field.key, value)).catch((e) => {
      console.warn('[settings-registry] onChange failed', section.id, field.key, e);
    });
  }

  onSave(): void {
    this.requestSave.emit();
    this.store.markSaved('Saved. Backend settings (marketplace endpoint, SSH port) take effect after restart.');
  }
}
