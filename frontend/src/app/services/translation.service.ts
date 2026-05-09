// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/**
 * Translation loader. v1 routes everything through ngx-translate's
 * HTTP loader (assets/i18n/{lang}.json). When the canonical
 * lthn-core/go-i18n Wails binding ships, the loadTranslations path
 * can branch on transport without changing the public API.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly ngx = inject(TranslateService);
  private isLoaded = false;
  private loadingPromise: Promise<void>;

  constructor() {
    this.loadingPromise = this.loadTranslations('en');
  }

  reload(lang: string): Promise<void> {
    this.isLoaded = false;
    this.loadingPromise = this.loadTranslations(lang);
    return this.loadingPromise;
  }

  private async loadTranslations(lang: string): Promise<void> {
    await firstValueFrom(this.ngx.use(lang));
    this.isLoaded = true;
  }

  translate(key: string): string {
    return this.ngx.instant(key);
  }

  /** Bound alias — `_('foo.bar')` reads cleaner than `.translate('foo.bar')`. */
  readonly _ = this.translate.bind(this);

  async translateOnDemand(key: string): Promise<string> {
    return firstValueFrom(this.ngx.get(key));
  }

  onReady(): Promise<void> {
    return this.loadingPromise;
  }
}
