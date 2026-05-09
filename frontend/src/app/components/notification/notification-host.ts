// SPDX-Licence-Identifier: EUPL-1.2

import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { NotificationService } from '../../services/notification.service';

/**
 * Notification host — placed once in the IDE shell. Renders the
 * single `<wa-toast>` container plus a dynamic `<wa-dialog>` bound
 * to NotificationService.pending() for confirms.
 *
 * Per WebAwesome's docs: "A single toast element is optimal." Place
 * one in the body, dispatch via toast.create() from anywhere via
 * NotificationService.notify().
 *
 * Confirms use `<wa-dialog>` reactively — when service.pending()
 * flips to a non-null PendingConfirm, the dialog opens; user clicks
 * Confirm/Cancel → service resolves the stored promise.
 */
@Component({
  selector: 'dev-notification-host',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <wa-toast #toast></wa-toast>

    @if (notify.pending(); as p) {
      <wa-dialog
        open
        [attr.label]="p.opts.title"
        (wa-after-hide)="onCancel()">
        <p>{{ p.opts.message }}</p>
        <div slot="footer" class="dev-notif-actions">
          <wa-button appearance="outlined" (click)="onCancel()">
            {{ p.opts.cancelLabel || 'Cancel' }}
          </wa-button>
          <wa-button
            appearance="filled"
            [attr.variant]="p.opts.variant || 'brand'"
            (click)="onConfirm()">
            {{ p.opts.confirmLabel || 'Confirm' }}
          </wa-button>
        </div>
      </wa-dialog>
    }
  `,
  styles: [`
    .dev-notif-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  `],
})
export class DevNotificationHost implements AfterViewInit {
  readonly notify = inject(NotificationService);

  @ViewChild('toast', { static: true }) toastRef!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    // Hand the wa-toast element to the service so notify() calls can
    // dispatch through it.
    this.notify.setToastRef(this.toastRef.nativeElement);
  }

  onConfirm(): void {
    this.notify.resolveConfirm(true);
  }

  onCancel(): void {
    this.notify.resolveConfirm(false);
  }
}
