// SPDX-Licence-Identifier: EUPL-1.2

import { Routes } from '@angular/router';
import {
  ApplicationFrameComponent,
  ProviderHostComponent,
  SystemTrayFrameComponent,
} from '@core/gui-ui';
import { IdeComponent } from './pages/ide/ide.component';

export const routes: Routes = [
  // System tray panel — standalone compact UI (380x480 frameless)
  { path: 'tray', component: SystemTrayFrameComponent },

  // Full IDE layout with sidebar, dashboard, explorer, and terminal panes
  { path: 'ide', component: IdeComponent },

  // Main application frame with HLCRF layout
  {
    path: '',
    component: ApplicationFrameComponent,
    children: [
      // Dynamic provider rendering via route parameter
      { path: ':provider', component: ProviderHostComponent },

      // Default to process provider (first registered)
      { path: '', redirectTo: 'process', pathMatch: 'full' },
    ],
  },
];
