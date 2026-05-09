// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, isDevMode, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { TranslationService } from './translation.service';
import { SetLanguage, AvailableLanguages } from '../lib/lthn-core-stubs';

/**
 * Mirrored from core-gui/cmd/lthn-desktop/frontend/src/app/services/
 * i18n.service.ts. Reads / writes the active language; emits changes via
 * currentLanguage$ for components to react. The canonical Go binding lives
 * at @lthn/core/i18n/service; we use the lib/lthn-core-stubs shim today.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private currentLanguageSubject = new BehaviorSubject<string>('en');
  currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(
    private translationService: TranslationService,
    @Optional() private ngxTranslate?: TranslateService,
  ) {
    if (isDevMode() && this.ngxTranslate) {
      this.ngxTranslate.setDefaultLang('en');
    }
  }

  async setLanguage(lang: string): Promise<void> {
    if (isDevMode() && this.ngxTranslate) {
      await this.translationService.reload(lang);
      this.currentLanguageSubject.next(lang);
      return;
    }
    try {
      await SetLanguage(lang);
      this.currentLanguageSubject.next(lang);
      await this.translationService.reload(lang);
    } catch (err) {
      console.error(`I18nService: Failed to set language to "${lang}":`, err);
      throw err;
    }
  }

  async getAvailableLanguages(): Promise<string[]> {
    if (isDevMode()) return ['en', 'de', 'ru', 'zh', 'fa'];
    const langs = await AvailableLanguages();
    return langs && langs.length > 0 ? langs : ['en'];
  }

  onReady(): Promise<void> {
    return this.translationService.onReady();
  }
}
