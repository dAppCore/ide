// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { GetAllMessages, Translate } from '../lib/lthn-core-stubs';

/**
 * Mirrored from core-gui/cmd/lthn-desktop/frontend/src/app/services/
 * translation.service.ts. The canonical version reads from
 * @lthn/core/i18n/service Wails bindings in production and ngx-translate
 * in dev. Our `@lthn/core/i18n/service` shim is in lib/lthn-core-stubs.ts —
 * swap the import once the matching Go service ships on our side.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private translations = new Map<string, string>();
  private isLoaded = false;
  private loadingPromise: Promise<void>;

  constructor(private ngxTranslate: TranslateService) {
    this.loadingPromise = this.loadTranslations('en');
  }

  reload(lang: string): Promise<void> {
    this.isLoaded = false;
    this.loadingPromise = this.loadTranslations(lang);
    return this.loadingPromise;
  }

  private async loadTranslations(lang: string): Promise<void> {
    if (isDevMode()) {
      await firstValueFrom(this.ngxTranslate.use(lang));
      this.isLoaded = true;
      return;
    }
    try {
      const all = await GetAllMessages(lang);
      if (!all) return;
      this.translations.clear();
      for (const key in all) {
        if (Object.prototype.hasOwnProperty.call(all, key)) {
          this.translations.set(key, all[key]);
        }
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('TranslationService: Failed to load translations:', err);
      throw err;
    }
  }

  translate(key: string): string {
    if (isDevMode()) return this.ngxTranslate.instant(key);
    if (!this.isLoaded) return key;
    return this.translations.get(key) || key;
  }

  _ = this.translate.bind(this);

  async translateOnDemand(key: string): Promise<string> {
    if (isDevMode()) return firstValueFrom(this.ngxTranslate.get(key));
    try {
      return await Translate(key).then((s) => s || key);
    } catch {
      return key;
    }
  }

  onReady(): Promise<void> {
    return this.loadingPromise;
  }
}
