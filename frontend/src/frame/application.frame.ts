// SPDX-Licence-Identifier: EUPL-1.2

import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { TranslationService } from '../app/services/translation.service';
import { I18nService } from '../app/services/i18n.service';
import {
  EnableFeature,
  IsFeatureEnabled,
  OpenDocsWindow,
  ShowEnvironmentDialog,
} from '../app/lib/lthn-core-stubs';

/**
 * Mirrored from core-gui/cmd/lthn-desktop/frontend/src/frame/
 * application.frame.ts. Outer shell — header (search + role + user menu),
 * sidebar nav, main RouterOutlet, footer with version + clock + env dialog.
 *
 * Template uses <wa-page> + <wa-button> from @awesome.me/webawesome — those
 * tags need WebAwesome installed and the custom-elements schema declared
 * (already done via CUSTOM_ELEMENTS_SCHEMA below) to render properly. Until
 * WebAwesome is wired the page degrades to unstyled regions but the routing
 * + i18n + feature-gating logic is live.
 *
 * @lthn/core/* service calls go through lib/lthn-core-stubs.ts — swap to
 * the real Wails-generated bindings once the Go side ships them.
 */
@Component({
  selector: 'application-frame',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe],
  templateUrl: './application.frame.html',
})
export class ApplicationFrame implements OnInit, OnDestroy {
  sidebarOpen = false;
  userMenuOpen = false;
  currentRole = 'Developer';
  time = '';
  private intervalId: number | undefined;
  private langChangeSubscription: Subscription | undefined;

  featureKey: string | null = null;
  isFeatureEnabled = true;
  userNavigation: { name: string; href: string; icon: string }[] = [];
  navigation: { name: string; href: string; icon: string }[] = [];
  roleNavigation: { name: string; href: string }[] = [];

  constructor(
    private router: Router,
    public t: TranslationService,
    private i18nService: I18nService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateTime();
    this.intervalId = window.setInterval(() => this.updateTime(), 1000);

    await this.t.onReady();
    this.initializeUserNavigation();

    this.langChangeSubscription = this.i18nService.currentLanguage$.subscribe(
      async () => {
        await this.t.onReady();
        this.initializeUserNavigation();
      },
    );

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.extractFeatureKeyAndCheckStatus(event.urlAfterRedirects);
      }
    });

    this.navigation = [
      { name: this.t._('menu.dashboard'), href: 'dashboard', icon: 'fa-chart-network fa-regular fa-2xl shrink-0' },
      { name: this.t._('menu.developer'), href: 'dev/edit', icon: 'fa-code fa-regular fa-2xl shrink-0' },
      { name: this.t._('menu.claude'), href: 'dev/claude', icon: 'fa-robot fa-regular fa-2xl shrink-0' },
    ];

    this.roleNavigation = [
      { name: this.t._('menu.hub-client'), href: '/config/client-hub' },
      { name: this.t._('menu.hub-server'), href: '/config/server-hub' },
      { name: this.t._('menu.hub-developer'), href: '/config/developer-hub' },
      { name: this.t._('menu.hub-gateway'), href: '/config/gateway-hub' },
      { name: this.t._('menu.hub-admin'), href: '/config/admin-hub' },
    ];

    await this.extractFeatureKeyAndCheckStatus(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.langChangeSubscription?.unsubscribe();
  }

  initializeUserNavigation(): void {
    this.userNavigation = [
      { name: this.t._('menu.your-profile'), href: '#', icon: 'fa-id-card fa-regular' },
      { name: this.t._('menu.logout'), href: '#', icon: 'fa-right-from-bracket fa-regular' },
    ];
  }

  updateTime(): void {
    this.time = new Date().toLocaleTimeString();
  }

  async extractFeatureKeyAndCheckStatus(url: string): Promise<void> {
    const trimmed = url.startsWith('/') ? url.substring(1) : url;
    const parts = trimmed.split('/');
    if (parts.length > 0 && parts[0] !== '') {
      this.featureKey = parts[0];
      await this.checkFeatureStatus();
    } else {
      this.featureKey = null;
      this.isFeatureEnabled = true;
    }
  }

  async checkFeatureStatus(): Promise<void> {
    if (!this.featureKey) {
      this.isFeatureEnabled = true;
      return;
    }
    try {
      this.isFeatureEnabled = await IsFeatureEnabled(this.featureKey);
    } catch (error) {
      console.error(`Error checking feature ${this.featureKey}:`, error);
      this.isFeatureEnabled = false;
    }
  }

  async activateFeature(): Promise<void> {
    if (!this.featureKey) return;
    try {
      await EnableFeature(this.featureKey);
      await this.checkFeatureStatus();
    } catch (error) {
      console.error(`Error activating feature ${this.featureKey}:`, error);
    }
  }

  showTestDialog(): void {
    alert('Test Dialog Triggered!');
  }

  openDocs() {
    return OpenDocsWindow('getting-started/chain#using-the-cli');
  }

  switchRole(roleName: string) {
    if (roleName.endsWith(' Hub')) {
      this.currentRole = roleName.replace(' Hub', '');
    }
    this.userMenuOpen = false;
  }

  protected readonly ShowEnvironmentDialog = ShowEnvironmentDialog;
}
