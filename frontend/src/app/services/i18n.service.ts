// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, effect, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslationService } from './translation.service';
import { SettingsStore } from './store/settings.store';

/**
 * Active language broker. Reads / writes the active i18n language;
 * components subscribe to `currentLanguage$` to react.
 *
 * v1: ngx-translate end-to-end (dev + prod). The canonical
 * lthn-core/go-i18n Wails binding will swap into the loader path
 * here when it ships — same public API, different transport.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translation = inject(TranslationService);
  private readonly settings = inject(SettingsStore);

  private readonly currentLanguageSubject = new BehaviorSubject<string>('en');
  readonly currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor() {
    // Bridge SettingsStore.language → setLanguage. Effect re-runs
    // whenever the user picks a new language in /dev/settings.
    effect(() => {
      const lang = this.settings.settings().language;
      void this.setLanguage(lang);
    });
  }

  async setLanguage(lang: string): Promise<void> {
    if (lang === this.currentLanguageSubject.value) return;
    await this.translation.reload(lang);
    this.currentLanguageSubject.next(lang);
  }

  getAvailableLanguages(): string[] {
    return ['en', 'de', 'ru', 'zh', 'fa'];
  }

  onReady(): Promise<void> {
    return this.translation.onReady();
  }

  /** Current value (synchronous) — for boot-time reads. */
  current(): string {
    return this.currentLanguageSubject.value;
  }
}
