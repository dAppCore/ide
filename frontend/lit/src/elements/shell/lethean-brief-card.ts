import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Tone = 'warning' | 'success' | 'info' | 'brand';

interface BriefAction {
  label: string;
  primary?: boolean;
}

@customElement('lethean-brief-card')
export class LetheanBriefCard extends LitElement {
  @property() tone: Tone = 'brand';
  @property() time = '';
  @property() heading = '';
  @property() body = '';
  @property() shortcut = '';
  @property({ type: Boolean }) done = false;
  @property({ attribute: false }) actions: BriefAction[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  private toneColor(): string {
    switch (this.tone) {
      case 'warning':
        return 'var(--warning-400)';
      case 'success':
        return 'var(--success-400)';
      case 'info':
        return 'var(--info-400)';
      default:
        return 'var(--brand-300)';
    }
  }

  render() {
    const tc = this.toneColor();
    return html`
      <article
        style="
          background: var(--ink-2);
          border: 1px solid var(--line-1);
          border-radius: 6px;
          padding: 10px 12px 11px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        "
      >
        <span
          aria-hidden="true"
          style="
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 2px;
            background: ${tc};
            opacity: ${this.done ? 0.4 : 1};
            border-radius: 6px 0 0 6px;
          "
        ></span>

        <header style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: ${tc};"></span>
          <span style="font-size: 10.5px; font-family: var(--font-mono); color: var(--fg-3);">${this.time}</span>
          ${this.done
            ? html`<span
                style="
                  font-size: 9.5px;
                  padding: 1px 5px;
                  border-radius: 3px;
                  background: var(--ink-3);
                  color: var(--fg-3);
                  font-family: var(--font-mono);
                  letter-spacing: 0.04em;
                "
              >DONE</span>`
            : html``}
          ${this.shortcut
            ? html`<kbd
                style="
                  margin-left: auto;
                  font-size: 10px;
                  font-family: var(--font-mono);
                  color: var(--fg-4);
                  padding: 1px 4px;
                  border: 1px solid var(--line-1);
                  border-radius: 3px;
                "
              >${this.shortcut}</kbd>`
            : html``}
        </header>

        <div>
          <div
            style="
              font-size: 12.5px;
              font-weight: 500;
              color: var(--fg-0);
              letter-spacing: -0.01em;
              line-height: 1.35;
            "
          >${this.heading}</div>
          <p style="font-size: 11.5px; color: var(--fg-2); margin: 4px 0 0; line-height: 1.45;">${this.body}</p>
        </div>

        <div style="display: flex; gap: 5px; margin-top: auto; flex-wrap: wrap;">
          ${this.actions.map(
            (a) => html`
              <button
                type="button"
                style="
                  height: 22px;
                  padding: 0 8px;
                  font-size: 11px;
                  border-radius: 4px;
                  background: ${a.primary ? 'var(--brand-500)' : 'var(--ink-3)'};
                  color: ${a.primary ? 'var(--fg-0)' : 'var(--fg-1)'};
                  border: 1px solid ${a.primary ? 'var(--brand-400)' : 'var(--line-1)'};
                  font-weight: 500;
                  cursor: pointer;
                  font-family: inherit;
                "
              >${a.label}</button>
            `
          )}
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lethean-brief-card': LetheanBriefCard;
  }
}
