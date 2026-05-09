// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';

/**
 * Empty component that exists purely so Angular can match the
 * `:panel` catch-all route under /dev. Without a matching route, the
 * router would complain on /dev/<id> for any panel id that hasn't
 * been extracted yet.
 *
 * IdeComponent inspects ActivatedRoute.firstChild.routeConfig?.path
 * — if it's the catch-all (`:panel`), it sets currentRoute from the
 * URL segment and renders the legacy @switch. If it's a real
 * extracted route (build, welcome, etc.), it renders the
 * <router-outlet>.
 *
 * Removed once every panel is extracted.
 */
@Component({
  selector: 'dev-legacy-host',
  standalone: true,
  template: '',
})
export class LegacyPanelHost {}
