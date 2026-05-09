// SPDX-Licence-Identifier: EUPL-1.2

import { Routes } from '@angular/router';
import { BlankFrame } from '../frame/blank.frame';
import { ApplicationFrame } from '../frame/application.frame';
import { SystemTrayFrame } from '../frame/system-tray.frame';
import { IdeComponent } from './pages/ide/ide.component';
import { WelcomeComponent } from './pages/dev/welcome/welcome.component';
import { BuildComponent } from './pages/dev/build/build.component';
import { CacheComponent } from './pages/dev/cache/cache.component';
import { LintComponent } from './pages/dev/lint/lint.component';
import { SessionsComponent } from './pages/dev/sessions/sessions.component';
import { StreamComponent } from './pages/dev/stream/stream.component';
import { ContainersComponent } from './pages/dev/containers/containers.component';
import { UpdatesComponent } from './pages/dev/updates/updates.component';
import { MemoryComponent } from './pages/dev/memory/memory.component';
import { MantisComponent } from './pages/dev/mantis/mantis.component';
import { TsComponent } from './pages/dev/ts/ts.component';
import { PhpComponent } from './pages/dev/php/php.component';
import { DevopsComponent } from './pages/dev/devops/devops.component';
import { ProcessComponent } from './pages/dev/process/process.component';
import { TerminalComponent } from './pages/dev/terminal/terminal.component';
import { LocalesComponent } from './pages/dev/locales/locales.component';
import { StoreComponent } from './pages/dev/store/store.component';
import { DataComponent } from './pages/dev/data/data.component';
import { LegacyPanelHost } from './pages/dev/legacy-panel-host';

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
      // /dev is the Developer/advanced frame. Children mount in
      // IdeComponent's <router-outlet>; when no child is active the
      // legacy @switch fallback inside IdeComponent renders the panel.
      // As panels are extracted (Phase 2), each one adds a child route
      // here and removes its @case from IdeComponent.
      {
        path: 'dev',
        component: IdeComponent,
        children: [
          { path: 'welcome', component: WelcomeComponent },
          { path: 'build', component: BuildComponent },
          { path: 'cache', component: CacheComponent },
          { path: 'lint', component: LintComponent },
          { path: 'sessions', component: SessionsComponent },
          { path: 'stream', component: StreamComponent },
          { path: 'containers', component: ContainersComponent },
          { path: 'updates', component: UpdatesComponent },
          { path: 'memory', component: MemoryComponent },
          { path: 'mantis', component: MantisComponent },
          { path: 'ts', component: TsComponent },
          { path: 'php', component: PhpComponent },
          { path: 'devops', component: DevopsComponent },
          { path: 'process', component: ProcessComponent },
          { path: 'terminal', component: TerminalComponent },
          { path: 'locales', component: LocalesComponent },
          { path: 'store', component: StoreComponent },
          { path: 'data', component: DataComponent },
          // Catch-all for panel ids that haven't been extracted yet.
          // Loads an empty host; IdeComponent reads the URL segment and
          // renders the legacy @switch fallback for that panel id. As
          // each panel extracts, replace its slot here with the real
          // component (and delete its @case from IdeComponent).
          { path: ':panel', component: LegacyPanelHost },
        ],
      },
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
