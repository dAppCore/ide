// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, Signal, signal } from '@angular/core';

/**
 * Cross-cutting workspace state — the path the IDE is "looking at"
 * (used by Build, Explorer, Source Control, Terminal, Lint and any
 * future panel that operates on a directory).
 *
 * Lives as a singleton service so panels share one source of truth;
 * changing it via setRoot() updates every consumer reactively.
 *
 * Default points at the core/ide repo as a sensible dev fallback;
 * Settings panel persists user changes back to ~/.core/config.yaml
 * which gets re-read on next boot.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly _root = signal('/Users/snider/Code/core/ide');

  /** Current workspace root path. */
  readonly root: Signal<string> = this._root.asReadonly();

  /** Update the workspace root. Components observing root() re-render. */
  setRoot(path: string): void {
    if (!path) return;
    this._root.set(path);
  }
}
