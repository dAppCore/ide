// SPDX-Licence-Identifier: EUPL-1.2

import { Routes } from '@angular/router';
import {
  ApplicationFrameComponent,
  ProviderHostComponent,
  SystemTrayFrameComponent,
} from '@core/gui-ui';
import { IdeComponent } from './pages/ide/ide.component';

export const routes: Routes = [
  // Land on the IDE shell at boot. The gui-ui ApplicationFrame still needs
  // /api/v1/{i18n,providers} + /events backends — wire those before flipping
  // the default back to ApplicationFrameComponent.
  { path: '', redirectTo: '/ide', pathMatch: 'full' },

  // System tray panel — standalone compact UI (380x480 frameless)
  { path: 'tray', component: SystemTrayFrameComponent },

  // Full IDE layout with sidebar, dashboard, explorer, and terminal panes
  { path: 'ide', component: IdeComponent },

  // Main application frame with HLCRF layout — kept for /:provider routes.
  {
    path: '',
    component: ApplicationFrameComponent,
    children: [
      // Dynamic provider rendering via route parameter
      { path: ':provider', component: ProviderHostComponent },
    ],
  },
];
