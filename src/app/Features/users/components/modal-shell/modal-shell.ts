import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.css',
})
export class ModalShellComponent {
  protected readonly i18n = inject(I18nService);
  title = input.required<string>();
  subtitle = input('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  close = output<void>();
}
