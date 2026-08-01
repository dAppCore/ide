import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';

const MAC_FONT = unsafeCSS(`-apple-system, BlinkMacSystemFont, "SF Pro", "Helvetica Neue", sans-serif`);

@customElement('mac-traffic-lights')
export class MacTrafficLights extends LitElement {
  static styles = css`
    :host {
      display: inline-flex;
      gap: 9px;
      align-items: center;
      padding: 1px;
    }
    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 0.5px solid rgba(0, 0, 0, 0.1);
    }
    .red { background: #ff736a; }
    .yellow { background: #febc2e; }
    .green { background: #19c332; }
  `;
  render() {
    return html`<div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div>`;
  }
}

@customElement('mac-glass')
export class MacGlass extends LitElement {
  @property({ type: Number }) radius = 296;
  @property({ type: Boolean }) dark = false;

  static styles = css`
    :host {
      display: inline-block;
      position: relative;
      isolation: isolate;
    }
    .layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    :host([dark]) .layer {
      background: rgba(255, 255, 255, 0.08);
      border: 0.5px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
    }
    :host(:not([dark])) .layer {
      background: rgba(255, 255, 255, 0.35);
      border: 0.5px solid rgba(255, 255, 255, 0.6);
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
    }
    .layer {
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
    }
    .content {
      position: relative;
      z-index: 1;
    }
  `;
  render() {
    return html`
      <div class="layer" style="border-radius:${this.radius}px"></div>
      <div class="content"><slot></slot></div>
    `;
  }
}

@customElement('mac-toolbar')
export class MacToolbar extends LitElement {
  @property() title = 'Folder';

  static styles = css`
    :host {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px;
      flex-shrink: 0;
      font-family: ${MAC_FONT};
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.85);
      white-space: nowrap;
      padding-left: 8px;
    }
    .spacer { flex: 1; }
    mac-glass[radius="18"]::part(_) { /* no-op, kept for future part hooks */ }
    .pill {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pill-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #4c4c4c;
      opacity: 0.4;
    }
    .search {
      width: 140px;
      height: 36px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 12px;
      box-sizing: border-box;
    }
    .search-text {
      font-size: 13px;
      font-weight: 500;
      color: #727272;
    }
  `;
  render() {
    return html`
      <div class="title">${this.title}</div>
      <div class="spacer"></div>
      <mac-glass radius="18">
        <div class="pill"><div class="pill-dot"></div></div>
      </mac-glass>
      <mac-glass radius="18">
        <div class="search">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="5.5" r="4" stroke="#727272" stroke-width="1.5"></circle>
            <path d="M8.5 8.5l3 3" stroke="#727272" stroke-width="1.5" stroke-linecap="round"></path>
          </svg>
          <span class="search-text">Search</span>
        </div>
      </mac-glass>
    `;
  }
}

@customElement('mac-sidebar-item')
export class MacSidebarItem extends LitElement {
  @property() label = '';
  @property({ type: Boolean, reflect: true }) selected = false;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 24px;
      padding: 4px 10px 4px 6px;
      margin: 0 10px;
      border-radius: 8px;
      position: relative;
      font-family: ${MAC_FONT};
      font-size: 11px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.85);
      cursor: default;
    }
    :host([selected])::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.11);
      mix-blend-mode: multiply;
    }
    .icon {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      position: relative;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0.5;
    }
    :host([selected]) .icon {
      background: #007aff;
      opacity: 1;
    }
    span {
      position: relative;
    }
  `;
  render() {
    return html`<div class="icon"></div><span>${this.label}</span>`;
  }
}

@customElement('mac-sidebar-header')
export class MacSidebarHeader extends LitElement {
  @property() label = '';
  static styles = css`
    :host {
      display: block;
      padding: 14px 18px 5px;
      font-family: ${MAC_FONT};
      font-size: 11px;
      font-weight: 700;
      color: rgba(0, 0, 0, 0.5);
    }
  `;
  render() {
    return html`${this.label}`;
  }
}

@customElement('mac-window')
export class MacWindow extends LitElement {
  @property({ type: Number }) width = 900;
  @property({ type: Number }) height = 600;
  @property() title = 'Folder';

  static styles = css`
    :host {
      display: block;
      font-family: ${MAC_FONT};
    }
    .window {
      border-radius: 26px;
      overflow: hidden;
      background: #fff;
      box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.23),
        0 16px 48px rgba(0, 0, 0, 0.35);
      display: flex;
      position: relative;
    }
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 8px;
      box-sizing: border-box;
    }
    .sidebar-glass {
      position: absolute;
      inset: 8px;
      border-radius: 18px;
      background: rgba(210, 225, 245, 0.45);
      backdrop-filter: blur(50px) saturate(200%);
      -webkit-backdrop-filter: blur(50px) saturate(200%);
      border: 0.5px solid rgba(255, 255, 255, 0.5);
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.35);
      pointer-events: none;
    }
    .sidebar-content {
      position: relative;
      z-index: 1;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .traffic-row {
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
      margin-bottom: 4px;
    }
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .body {
      flex: 1;
      overflow: auto;
      padding: 4px 8px;
    }
  `;
  render() {
    return html`
      <div class="window" style="width:${this.width}px;height:${this.height}px">
        <aside class="sidebar">
          <div class="sidebar-glass"></div>
          <div class="sidebar-content">
            <div class="traffic-row">
              <mac-traffic-lights></mac-traffic-lights>
            </div>
            <slot name="sidebar"></slot>
          </div>
        </aside>
        <div class="main">
          <mac-toolbar title="${this.title}"></mac-toolbar>
          <div class="body"><slot></slot></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mac-traffic-lights': MacTrafficLights;
    'mac-glass': MacGlass;
    'mac-toolbar': MacToolbar;
    'mac-sidebar-item': MacSidebarItem;
    'mac-sidebar-header': MacSidebarHeader;
    'mac-window': MacWindow;
  }
}
