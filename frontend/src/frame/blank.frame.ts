// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Frame for windows that need no chrome — just the routed component. Used
 * for popup / utility windows where the main ApplicationFrame would be
 * overhead. Mirrored from core-gui/cmd/lthn-desktop/frontend/src/frame/
 * blank.frame.ts.
 */
@Component({
  selector: 'blank-frame',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class BlankFrame {}
