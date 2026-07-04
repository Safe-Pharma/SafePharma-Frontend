import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.css',
})
export class ModalShellComponent {
  title = input.required<string>();
  subtitle = input('');

  close = output<void>();
}