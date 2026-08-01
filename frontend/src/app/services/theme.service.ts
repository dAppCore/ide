// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, computed, effect, inject } from '@angular/core';
import { SettingsStore, ThemeName } from './store/settings.store';

/**
 * Theme service — applies the user's WebAwesome theme preference to
 * `<html>`.
 *
 * The IDE's design system is dark-only (`wa-dark` is always set;
 * see feedback_dark_only_design_system memory). Theme switching
 * picks between WebAwesome's built-in themes for users who want to
 * taste alternatives. The polished canon is `lethean` (warm-purple
 * ink + Vi #663399); other themes are stock WA appearance.
 *
 * To add a new theme to the menu:
 *   1. Add an `@import` for its CSS file in `src/styles.scss`
 *   2. Add the name to `ThemeName` in settings.store.ts
 *   3. Add the option in the /dev/settings select
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly settings = inject(SettingsStore);

  readonly current = computed<ThemeName>(() => this.settings.settings().theme);

  constructor() {
    // Apply on every change to the theme. The effect runs in the
    // injection context; computed signals memoize so the DOM write
    // only fires when current() actually changes.
    effect(() => {
      const theme = this.current();
      if (typeof document === 'undefined') return;
      const html = document.documentElement;

      // Remove any existing wa-theme-* class, then set the new one.
      // wa-dark stays put — we don't expose a light mode.
      const existing = Array.from(html.classList).filter((c) => c.startsWith('wa-theme-'));
      for (const c of existing) html.classList.remove(c);
      html.classList.add(`wa-theme-${theme}`);
      html.classList.add('wa-dark');
      html.classList.remove('wa-light');
    });
  }
}
