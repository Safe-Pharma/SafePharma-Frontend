import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.css',
})
export class ModalShellComponent {
  title = input.required<string>();
  subtitle = input('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  close = output<void>();
}
