// SPDX-Licence-Identifier: EUPL-1.2

/**
 * Stub shims for the @lthn/core/* and @lthn/docs/* Wails-generated bindings
 * the canonical lthn-desktop frames import. Our Go side doesn't ship these
 * exact bindings yet — these stubs let the canonical frames compile and
 * render. Each function logs once and returns a sensible no-op default.
 *
 * When Snider wires the matching Go services on our side, swap the imports
 * back to the real generated bindings (see core-gui/pkg/{display,docs,
 * config,i18n}/service.go for the canonical surface).
 */

const warned = new Set<string>();
function once(name: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  console.warn(`[lthn-core-stubs] ${name}() called — Go binding not wired yet.`);
}

// @lthn/core/display/service ---------------------------------------------
export async function ShowEnvironmentDialog(): Promise<void> {
  once('ShowEnvironmentDialog');
}

// @lthn/docs/service -----------------------------------------------------
export async function OpenDocsWindow(_path: string): Promise<void> {
  once('OpenDocsWindow');
}

// @lthn/core/config/service ----------------------------------------------
export async function IsFeatureEnabled(_key: string): Promise<boolean> {
  once('IsFeatureEnabled');
  return true;
}

export async function EnableFeature(_key: string): Promise<void> {
  once('EnableFeature');
}

// @lthn/core/i18n/service ------------------------------------------------
export async function GetAllMessages(_lang: string): Promise<Record<string, string> | null> {
  once('GetAllMessages');
  return null;
}

export async function Translate(key: string): Promise<string> {
  once('Translate');
  return key;
}

export async function SetLanguage(_lang: string): Promise<void> {
  once('SetLanguage');
}

export async function AvailableLanguages(): Promise<string[]> {
  once('AvailableLanguages');
  return ['en', 'de', 'ru', 'zh', 'fa'];
}
