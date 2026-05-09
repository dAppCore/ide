// SPDX-Licence-Identifier: EUPL-1.2

import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { I18nService } from './services/i18n.service';
import { ManifestService } from './services/manifest.service';
import { builtinPanels } from './lib/builtin-panels';

/**
 * App config mirrors core-gui/cmd/lthn-desktop/frontend/src/app/app.config.ts
 * — hash-location routing (Wails-friendly + matches the Go menu handlers
 * that build URLs like /#/dev/edit), ngx-translate with the HTTP loader
 * pulling locale JSONs from /assets/i18n/, and an early-load I18nService.
 *
 * Things the canonical config wires that we don't (yet): Monaco module
 * (we use the AMD loader pattern instead — see lethean-monaco.ts) and
 * Highcharts (no chart surfaces in core/ide today). StyleManagerService
 * + APP_INITIALIZER will land when WebAwesome is wired.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({ fallbackLang: 'en' }),
    ),
    I18nService,
    ManifestService,
    provideAppInitializer(() => {
      // Seed the panel registry with the built-in developer + account
      // panels so the sidebar has its nav at first paint. Plugins
      // contribute additional panels later via ManifestService.register().
      inject(ManifestService).seed(builtinPanels);
    }),
    ...(isDevMode()
      ? [
          provideTranslateHttpLoader({
            prefix: './assets/i18n/',
            suffix: '.json',
          }),
        ]
      : []),
  ],
};
