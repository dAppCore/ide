// SPDX-Licence-Identifier: EUPL-1.2

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Wails serves static assets from the embedded bundle — there is no SSR, so
// client hydration is meaningless and Angular logs NG0505 if it's enabled.
// If we ever add an SSR variant for the web build, restore provideClientHydration.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
  ],
};
