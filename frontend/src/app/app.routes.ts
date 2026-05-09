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
 * Frame variants (one per persona, mounted at /<persona>):
 *
 * - /dev (IdeComponent)          — Developer / advanced view. Current
 *                                  full-feature IDE — Source Control,
 *                                  Terminal, Marketplace, Containers,
 *                                  Repos, etc. The canon (darbs co-signed)
 *                                  — owns its full window chrome.
 * - /ide  → /dev (alias)         — Reserved: a future lighter IDE for
 *                                  non-developer personas will mount
 *                                  here, displacing the alias.
 * - /system-tray                 — 380x480 frameless panel attached to
 *   (SystemTrayFrame)              the systray icon by display.Service.
 * - /app/* (ApplicationFrame)    — Shared chrome for settings / profile
 *                                  / sub-app surfaces once they land.
 *
 * Future frames (one per persona):
 *
 * - /inf  (InferenceFrame)       — AI-trainer persona
 * - /kw   (KnowledgeWorkerFrame) — memory / notes / docs persona
 * - /ops  (DevOpsFrame)          — infra-operator persona
 *
 * Persona-driven onboarding (project_core_agent_orchestration_doorway.md)
 * picks which frame to mount based on the user's calibration answers.
 */
export const routes: Routes = [
  {
    path: '',
    component: BlankFrame,
    children: [
      { path: '', redirectTo: 'dev', pathMatch: 'full' },
      { path: 'dev', component: IdeComponent },
      { path: 'ide', redirectTo: 'dev', pathMatch: 'full' },
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
