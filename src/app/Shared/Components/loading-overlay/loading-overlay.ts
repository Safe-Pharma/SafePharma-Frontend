import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Spinner } from '../spinner/spinner';
import { I18nService } from '../../../Core/Services/i18n.service';

/** A local, non-destructive loading state for an already-rendered section. */
@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="loading-overlay" role="status" aria-live="polite" [attr.aria-label]="text('common.loading')">
        <div class="loading-overlay__surface">
          <app-spinner size="md" />
          @if (label()) {
            <span>{{ label() }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { position: absolute; inset: 0; z-index: 20; display: block; pointer-events: auto; }
    .loading-overlay {
      position: absolute; inset: 0; display: grid; place-items: center;
      background: color-mix(in srgb, var(--surface, white) 42%, transparent);
      backdrop-filter: blur(1px); animation: loading-fade-in 140ms ease-out both;
    }
    .loading-overlay__surface {
      display: inline-flex; align-items: center; gap: .55rem; padding: .55rem .75rem;
      border: 1px solid color-mix(in srgb, var(--border, #e5e7eb) 80%, transparent);
      border-radius: .75rem; background: color-mix(in srgb, white 78%, transparent);
      color: var(--muted-foreground, #64748b); font-size: .75rem; font-weight: 600;
      box-shadow: 0 6px 18px rgb(15 23 42 / .07);
    }
    @keyframes loading-fade-in { from { opacity: 0 } to { opacity: 1 } }
  `,
})
export class LoadingOverlay {
  private readonly i18n = inject(I18nService);
  readonly visible = input(false);
  readonly label = input('');
  text(key: string): string { return this.i18n.text(key); }
}
