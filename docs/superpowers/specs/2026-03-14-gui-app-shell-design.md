# GUI App Shell — Framework-Level Application Frame

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Service Provider Framework, Runtime Provider Loading
**Source:** Port from core-gui/cmd/lthn-desktop/frontend

## Problem

core/ide has a bare Angular frontend with placeholder routes. The real app
shell exists in the archived `core-gui/cmd/lthn-desktop/frontend` with
HLCRF layout, Web Awesome components, sidebar navigation, feature flags,
i18n, and custom element support. It needs to live in `core/gui/ui/` as a
framework component that any Wails app can import.

## Solution

Port the application frame from lthn-desktop into `core/gui/ui/` as a
reusable Angular library. Add a `ProviderDiscoveryService` that dynamically
populates navigation and loads custom elements from registered providers.

## Architecture

```
core/gui/ui/                          <- framework (npm package)
  src/
    frame/
      application-frame.ts            <- HLCRF shell (header, sidebar, content, footer)
      application-frame.html          <- wa-page template with slots
      system-tray-frame.ts            <- tray panel (380x480 frameless)
    services/
      provider-discovery.ts           <- fetch providers, load custom elements
      websocket.ts                    <- WS connection with reconnect
      api-config.ts                   <- API base URL configuration
      i18n.ts                         <- translation service
    components/
      provider-host.ts               <- wrapper that hosts a custom element
      provider-nav.ts                <- dynamic sidebar from providers
      status-bar.ts                  <- footer with provider status
    index.ts                         <- public API exports
  package.json
  tsconfig.json

core/ide/frontend/                    <- application (imports framework)
  src/
    app/
      app.routes.ts                  <- routes using framework components
      app.config.ts                  <- provider registrations
    main.ts
  angular.json
```

## Provider Discovery Service

The core service that makes everything dynamic:

```typescript
@Injectable({ providedIn: 'root' })
export class ProviderDiscoveryService {
  private providers = signal<ProviderInfo[]>([]);
  readonly providers$ = this.providers.asReadonly();

  constructor(private apiConfig: ApiConfigService) {}

  async discover(): Promise<void> {
    const res = await fetch(`${this.apiConfig.baseUrl}/api/v1/providers`);
    const data = await res.json();
    this.providers.set(data.providers);

    // Load custom elements for Renderable providers
    for (const p of data.providers) {
      if (p.element?.tag && p.element?.source) {
        await this.loadElement(p.element.tag, p.element.source);
      }
    }
  }

  private async loadElement(tag: string, source: string): Promise<void> {
    if (customElements.get(tag)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = source;
    document.head.appendChild(script);
    await customElements.whenDefined(tag);
  }
}

interface ProviderInfo {
  name: string;
  basePath: string;
  status?: string;
  element?: { tag: string; source: string };
  channels?: string[];
}
```

## Application Frame

Ported from lthn-desktop with these changes:

1. **Navigation is dynamic** — populated from ProviderDiscoveryService
2. **Content area hosts custom elements** — ProviderHostComponent wraps any custom element
3. **Feature flags from config** — reads from core/config API
4. **Web Awesome** — keeps wa-page, wa-button design system
5. **Font Awesome Pro** — keeps icon system
6. **i18n** — keeps translation service
7. **HLCRF slots** — header, navigation, main, footer map to wa-page slots

### Dynamic Navigation

```typescript
// In application-frame.ts
async ngOnInit() {
  await this.providerService.discover();

  this.navigation = this.providerService.providers$()
    .filter(p => p.element)
    .map(p => ({
      name: p.name,
      href: p.name.toLowerCase(),
      icon: 'fa-regular fa-puzzle-piece',
      element: p.element
    }));
}
```

### Provider Host Component

Renders any custom element by tag name using Angular's Renderer2 for safe DOM manipulation:

```typescript
@Component({
  selector: 'provider-host',
  template: '<div #container></div>',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ProviderHostComponent implements OnChanges {
  @Input() tag!: string;
  @Input() apiUrl = '';
  @ViewChild('container') container!: ElementRef;

  constructor(private renderer: Renderer2) {}

  ngOnChanges() {
    const native = this.container.nativeElement;
    // Clear previous element safely
    while (native.firstChild) {
      this.renderer.removeChild(native, native.firstChild);
    }
    // Create and append custom element
    const el = this.renderer.createElement(this.tag);
    if (this.apiUrl) this.renderer.setAttribute(el, 'api-url', this.apiUrl);
    this.renderer.appendChild(native, el);
  }
}
```

### Routes

```typescript
export const routes: Routes = [
  { path: 'tray', component: SystemTrayFrame },
  {
    path: '',
    component: ApplicationFrame,
    children: [
      { path: ':provider', component: ProviderHostComponent },
      { path: '', redirectTo: 'process', pathMatch: 'full' }
    ]
  }
];
```

## System Tray Frame

380x480 frameless panel showing:
- Provider status cards (from discovery service)
- Quick stats from Streamable providers (via WS)
- Brain connection status
- MCP server status

## What to Port from lthn-desktop

| Source | Target | Changes |
|--------|--------|---------|
| frame/application.frame.ts | core/gui/ui/src/frame/ | Dynamic nav from providers |
| frame/application.frame.html | core/gui/ui/src/frame/ | Keep wa-page template |
| frame/system-tray.frame.ts | core/gui/ui/src/frame/ | Add provider status cards |
| services/translation.service.ts | core/gui/ui/src/services/ | Keep as-is |
| services/i18n.service.ts | core/gui/ui/src/services/ | Keep as-is |

## What NOT to Port

- blockchain/ — that is a provider, not framework
- mining/ — that is a provider (already has its own elements)
- developer/ — that is a provider
- system/setup* — future setup wizard provider
- Wails bindings (@lthn/core/*) — replaced by REST API calls

## Dependencies

### core/gui/ui (npm)
- @angular/core, @angular/router, @angular/common
- @awesome.me/webawesome (design system)
- @fortawesome/fontawesome-pro (icons)

### core/ide/frontend (npm)
- core/gui/ui (local dependency)
- Angular 20+

## Build

```bash
# Build framework
cd core/gui/ui && npm run build

# Build IDE app (imports framework)
cd core/ide/frontend && npm run build
```

## Not In Scope

- Setup wizard (future provider)
- Monaco editor integration (future provider)
- Blockchain dashboard (future provider)
- Theming system (future — Web Awesome handles dark mode)
