import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalOverlayDirective } from '../../../Shared/Components/modal-overlay/modal-overlay';

@Component({
  selector: 'portal-confirm-dialog',
  standalone: true,
  imports: [ModalOverlayDirective],
  template: `
    @if (open) {
      <div appModalOverlay class="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4" (click)="cancel.emit()">
        <div
          class="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-sm font-semibold text-foreground">{{ title }}</h3>
          <p class="mt-1.5 text-sm text-muted-foreground">{{ message }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-muted"
              (click)="cancel.emit()"
            >
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="rounded-lg bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
              (click)="confirm.emit()"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PortalConfirmDialog {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Remove';
  @Input() cancelLabel = 'Cancel';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
