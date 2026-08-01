// SPDX-Licence-Identifier: EUPL-1.2

// Lethean-3 design system, local copy.
//
// This tree is owned by core/ide. The shared Lethean-3 React canon at
// /Users/snider/Downloads/Lethean-3 is the cross-surface source-of-truth;
// elements are copied here so core/ide can diverge as we invent
// operator-specific UI without polluting the shared design system.
//
// Each element self-registers via @customElement(...) — importing the file
// is enough to make the tag available in Angular templates (with
// CUSTOM_ELEMENTS_SCHEMA on the consuming component).

import './atoms/lethean-button';
import './atoms/lethean-vi';
import './shell/lethean-vi-message';
import './shell/lethean-vi-panel';
import './editor/lethean-monaco';

// Plugin elements — bundled today; v2 will load from each package's own
// ui/ build at /plugin/<code>/element.js via dynamic ESM import.
import './plugin/lethean-vi-plugin';
