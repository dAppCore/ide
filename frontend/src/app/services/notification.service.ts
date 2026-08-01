// SPDX-Licence-Identifier: EUPL-1.2

import { Injectable, signal } from '@angular/core';

/** WebAwesome toast variants. */
export type ToastVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Font Awesome icon name (e.g. 'check', 'triangle-exclamation'). */
  icon?: string;
  /** Auto-dismiss timeout in ms. Default 5000. Pass 0 to keep open until dismissed. */
  duration?: number;
}

export interface ConfirmOptions {
  /** Header text. */
  title: string;
  /** Body message — what's being confirmed. */
  message: string;
  /** Label for the confirm button. Default 'Confirm'. */
  confirmLabel?: string;
  /** Label for the cancel button. Default 'Cancel'. */
  cancelLabel?: string;
  /** Confirm button variant — 'danger' for destructive actions. Default 'brand'. */
  variant?: 'brand' | 'danger' | 'warning';
}

/**
 * Pending confirm dialog state — bound by NotificationHost in the
 * IDE shell. When `pending()` is non-null the host renders the
 * `<wa-dialog>` open; the user's choice resolves the stored promise.
 */
interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/**
 * App-wide notification surface. Replaces the native `alert()` /
 * `confirm()` calls with WebAwesome `<wa-toast>` (non-blocking) and
 * `<wa-dialog>` (blocking yes/no).
 *
 * Two surfaces:
 *
 *   notify({ message, variant }) — fire-and-forget toast.
 *   confirm({ title, message }): Promise<boolean> — awaitable yes/no.
 *
 * Both render into the single `<dev-notification-host>` in the IDE
 * shell. Components inject this service and call the methods directly.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  /**
   * Bound to a `<wa-toast>` element by NotificationHost via setToastRef.
   * The host calls toast.create() per WebAwesome's API; we expose
   * notify() as the public surface so consumers don't depend on the
   * element directly.
   */
  private toastEl: HTMLElement & {
    create(message: string, opts?: { variant?: string; icon?: string; duration?: number }): void;
  } | null = null;

  /** Current pending confirm dialog — null when no dialog is open. */
  readonly pending = signal<PendingConfirm | null>(null);

  /** NotificationHost wires this on init. */
  setToastRef(el: HTMLElement | null): void {
    this.toastEl = el as any;
  }

  /** Fire a non-blocking toast. */
  notify(opts: ToastOptions): void {
    if (!this.toastEl) {
      // Fallback for early-boot / SSR — just log so we don't drop messages.
      console.info(`[notify ${opts.variant || 'info'}] ${opts.message}`);
      return;
    }
    this.toastEl.create(opts.message, {
      variant: opts.variant || 'neutral',
      icon: opts.icon,
      duration: opts.duration ?? 5000,
    });
  }

  /** Show a blocking confirm dialog; resolves with the user's choice. */
  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // If a confirm is already pending, resolve it false (user gets the
      // newer one — keeps the queue at most 1 deep).
      const prev = this.pending();
      if (prev) prev.resolve(false);
      this.pending.set({ opts, resolve });
    });
  }

  /** Called by NotificationHost when the user resolves the dialog. */
  resolveConfirm(ok: boolean): void {
    const p = this.pending();
    if (!p) return;
    this.pending.set(null);
    p.resolve(ok);
  }
}
