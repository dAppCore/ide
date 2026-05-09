// SPDX-Licence-Identifier: EUPL-1.2

import { Routes } from '@angular/router';
import { BlankFrame } from '../frame/blank.frame';
import { ApplicationFrame } from '../frame/application.frame';
import { SystemTrayFrame } from '../frame/system-tray.frame';
import { IdeComponent } from './pages/ide/ide.component';

/**
 * Routing pattern: blank top-level root → frames stub on as children →
 * secondary layer renders inside whichever frame is mounted.
 *
 * - `''` (BlankFrame)         — pass-through router-outlet so every route
 *                               flows through one consistent root.
 * - `''/ide` (IdeComponent)   — the IDE owns its full window chrome; no
 *                               wrap. The existing IdeComponent visual
 *                               is the canon (darbs co-signed) — don't
 *                               put a frame around it.
 * - `''/system-tray`           — frameless 380x480 panel attached to the
 *   (SystemTrayFrame)            systray icon by core/gui's display.Service.
 * - `''/app/*`                — children of ApplicationFrame, the shared
 *   (ApplicationFrame)            chrome for settings / profile / sub-app
 *                               surfaces once they land.
 */
export const routes: Routes = [
  {
    path: '',
    component: BlankFrame,
    children: [
      { path: '', redirectTo: 'ide', pathMatch: 'full' },
      { path: 'ide', component: IdeComponent },
      { path: 'system-tray', component: SystemTrayFrame },
      {
        path: 'app',
        component: ApplicationFrame,
        children: [
          // Settings / profile / sub-app surfaces mount here.
        ],
      },
    ],
  },
];
