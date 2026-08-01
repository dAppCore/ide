// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';

/**
 * 380x480 frameless panel attached to the systray icon. Mirrored from
 * core-gui/cmd/lthn-desktop/frontend/src/frame/system-tray.frame.ts.
 *
 * Wails opens a Frameless+Hidden window pointed at the `/system-tray`
 * Angular route; clicking the systray icon shows it via
 * `tray.AttachWindow(window).WindowOffset(5)`. See pkg/display/tray.go on
 * the canonical core-gui side for the Go binding pattern.
 */
@Component({
  selector: 'system-tray-frame',
  standalone: true,
  template: `
    <div class="flex flex-col h-screen overflow-hidden rounded-md bg-white shadow-sm dark:bg-gray-800/50 dark:shadow-none dark:outline dark:-outline-offset-0 dark:outline-white/10">
      <div class="flex items-center justify-between px-4 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-white/10">
        <div class="flex h-8 shrink-0 items-center">
          <span class="text-sm font-semibold text-gray-900 dark:text-white">core-ide</span>
        </div>
        <div class="relative">
          <button (click)="settingsMenuOpen = !settingsMenuOpen" class="relative flex items-center">
            <span class="absolute -inset-1.5"></span>
            <span class="sr-only">Open settings menu</span>
            <i class="fa-regular fa-gear text-gray-400 dark:text-gray-500"></i>
          </button>
          @if (settingsMenuOpen) {
            <div class="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg outline outline-gray-900/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10">
              @for (item of settingsNavigation; track item.name) {
                <a [href]="item.href" class="block px-3 py-1 text-sm/6 text-gray-900 focus:bg-gray-50 focus:outline-hidden dark:text-white dark:focus:bg-white/5">
                  {{ item.name }}
                </a>
              }
            </div>
          }
        </div>
      </div>
      <div class="flex-grow bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <ul role="list" class="divide-y divide-gray-200 dark:divide-white/10">
          <li class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Status: Connected</li>
          <li class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">IP: 127.0.0.1</li>
          <li class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">Uptime: 00:00:00</li>
        </ul>
      </div>
      <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-white/10">
        <button class="text-sm text-red-600 dark:text-red-400">Quit</button>
      </div>
    </div>
  `,
})
export class SystemTrayFrame {
  settingsMenuOpen = false;
  settingsNavigation = [
    { name: 'Settings', href: '#' },
    { name: 'Quit', href: '#' },
  ];
}
