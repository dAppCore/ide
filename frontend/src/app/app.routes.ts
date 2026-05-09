// SPDX-Licence-Identifier: EUPL-1.2

import { Routes } from '@angular/router';
import { ApplicationFrame } from '../frame/application.frame';
import { SystemTrayFrame } from '../frame/system-tray.frame';
import { IdeComponent } from './pages/ide/ide.component';

/**
 * Routes mirror core-gui/cmd/lthn-desktop/frontend/src/app/app.routes.ts.
 * Frames sit at the OUTER level; routes that need the chrome live as
 * children of the empty path mounted on ApplicationFrame. The systray
 * window points at /system-tray (frameless, hidden, attached to the tray
 * icon by pkg/display/tray.go on the canonical core-gui side).
 */
export const routes: Routes = [
  // Systray panel — frameless 380x480, no application chrome.
  { path: 'system-tray', component: SystemTrayFrame },

  // Main shell. Children inherit header / sidebar / footer.
  {
    path: '',
    component: ApplicationFrame,
    children: [
      // Land on the IDE shell as the default route inside the frame.
      { path: 'ide', component: IdeComponent },
      { path: '', redirectTo: 'ide', pathMatch: 'full' },
    ],
  },
];
