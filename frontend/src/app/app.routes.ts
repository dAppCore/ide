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
 *
 * All /dev/<panel> children are lazy-loaded via loadComponent so each
 * panel's TS + CSS only ships when the user navigates to it. The shell
 * (IdeComponent + sidebar + status bar + chat) is the only initial-bundle
 * cost; ~25 lazy chunks stream in on demand.
 */
export const routes: Routes = [
  {
    path: '',
    component: BlankFrame,
    children: [
      { path: '', redirectTo: 'dev', pathMatch: 'full' },
      // /dev is the Developer/advanced frame. All 27 panels are routed
      // children mounted in IdeComponent's <router-outlet>. Bare /dev
      // redirects to /dev/control-panel; an unknown panel id (stale
      // persisted ui.route, hand-typed URL, …) also lands there so
      // the user always gets a real surface instead of empty chrome.
      {
        path: 'dev',
        component: IdeComponent,
        children: [
          { path: '', redirectTo: 'control-panel', pathMatch: 'full' },
          { path: 'welcome',       loadComponent: () => import('./pages/dev/welcome/welcome.component').then(m => m.WelcomeComponent) },
          { path: 'build',         loadComponent: () => import('./pages/dev/build/build.component').then(m => m.BuildComponent) },
          { path: 'cache',         loadComponent: () => import('./pages/dev/cache/cache.component').then(m => m.CacheComponent) },
          { path: 'lint',          loadComponent: () => import('./pages/dev/lint/lint.component').then(m => m.LintComponent) },
          { path: 'sessions',      loadComponent: () => import('./pages/dev/sessions/sessions.component').then(m => m.SessionsComponent) },
          { path: 'stream',        loadComponent: () => import('./pages/dev/stream/stream.component').then(m => m.StreamComponent) },
          { path: 'containers',    loadComponent: () => import('./pages/dev/containers/containers.component').then(m => m.ContainersComponent) },
          { path: 'updates',       loadComponent: () => import('./pages/dev/updates/updates.component').then(m => m.UpdatesComponent) },
          { path: 'memory',        loadComponent: () => import('./pages/dev/memory/memory.component').then(m => m.MemoryComponent) },
          { path: 'mantis',        loadComponent: () => import('./pages/dev/mantis/mantis.component').then(m => m.MantisComponent) },
          { path: 'ts',            loadComponent: () => import('./pages/dev/ts/ts.component').then(m => m.TsComponent) },
          { path: 'php',           loadComponent: () => import('./pages/dev/php/php.component').then(m => m.PhpComponent) },
          { path: 'devops',        loadComponent: () => import('./pages/dev/devops/devops.component').then(m => m.DevopsComponent) },
          { path: 'process',       loadComponent: () => import('./pages/dev/process/process.component').then(m => m.ProcessComponent) },
          { path: 'terminal',      loadComponent: () => import('./pages/dev/terminal/terminal.component').then(m => m.TerminalComponent) },
          { path: 'locales',       loadComponent: () => import('./pages/dev/locales/locales.component').then(m => m.LocalesComponent) },
          { path: 'store',         loadComponent: () => import('./pages/dev/store/store.component').then(m => m.StoreComponent) },
          { path: 'data',          loadComponent: () => import('./pages/dev/data/data.component').then(m => m.DataComponent) },
          // Sidebar id 'dashboard' was the legacy currentRoute label
          // for the control panel; keep both so old persisted state
          // restores cleanly to the new component.
          { path: 'control-panel', loadComponent: () => import('./pages/dev/control-panel/control-panel.component').then(m => m.ControlPanelComponent) },
          { path: 'dashboard',     loadComponent: () => import('./pages/dev/control-panel/control-panel.component').then(m => m.ControlPanelComponent) },
          { path: 'git',           loadComponent: () => import('./pages/dev/git/git.component').then(m => m.GitComponent) },
          { path: 'search',        loadComponent: () => import('./pages/dev/search/search.component').then(m => m.SearchComponent) },
          { path: 'explorer',      loadComponent: () => import('./pages/dev/explorer/explorer.component').then(m => m.ExplorerComponent) },
          { path: 'forge',         loadComponent: () => import('./pages/dev/forge/forge.component').then(m => m.ForgeComponent) },
          { path: 'tenant',        loadComponent: () => import('./pages/dev/tenant/tenant.component').then(m => m.TenantComponent) },
          { path: 'settings',      loadComponent: () => import('./pages/dev/settings/settings.component').then(m => m.SettingsComponent) },
          // Plugin route — :code is the installed plugin code, :sub
          // is an optional sub-page (replaces the legacy "plugin:vi:ask"
          // colon-string scheme with real Angular params).
          { path: 'plugin/:code/:sub', loadComponent: () => import('./pages/dev/plugin/plugin.component').then(m => m.PluginComponent) },
          { path: 'plugin/:code',      loadComponent: () => import('./pages/dev/plugin/plugin.component').then(m => m.PluginComponent) },
          { path: 'repos',         loadComponent: () => import('./pages/dev/repos/repos.component').then(m => m.ReposComponent) },
          { path: 'marketplace',   loadComponent: () => import('./pages/dev/marketplace/marketplace.component').then(m => m.MarketplaceComponent) },
          // Site detail — placeholder until the ops dashboard ships,
          // see RFC.ops-dashboard.md. Sidebar's Sites group routes here.
          { path: 'site/:domain',  loadComponent: () => import('./pages/dev/site/site.component').then(m => m.SiteComponent) },
          // Catch-all — any unknown panel id (stale persisted ui.route,
          // typo, removed plugin sub-page, …) redirects to control-panel
          // so the user always lands on a real surface instead of empty
          // chrome.
          { path: '**', redirectTo: 'control-panel' },
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
