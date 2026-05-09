// SPDX-Licence-Identifier: EUPL-1.2

import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Terminal panel — placeholder stub. Real backend lives at
 * 127.0.0.1:9876 (charmbracelet/ssh) per
 * feedback_ssh_terminal_canonical_pattern.md. xterm.js frontend parked
 * pending auth/multi-session decisions.
 */
@Component({
  selector: 'dev-terminal',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="block">
      <h2 class="block-title">{{ 'terminal.title' | translate }}</h2>
      <div class="terminal-output">
        <pre>$ core dev health
18 repos │ clean │ synced

$ _</pre>
      </div>
    </section>
  `,
  styles: [`
    /* Terminal placeholder (existing surface, tokenised) */
    .terminal-output {
      background: var(--ink-0);
      border: 1px solid var(--line-1);
      border-radius: var(--r-md);
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--success-400);
    }
    .terminal-output pre {
      margin: 0;
    }
  `],
})
export class TerminalComponent {}
