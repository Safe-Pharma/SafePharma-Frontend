import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-detail-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field">
      <span class="label">{{ label() }}</span>
      <span class="value">{{ value() }}</span>
    </div>
  `,
  styles: [`
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #9ca3af;
    }
    .value {
      font-size: 14px;
      font-weight: 500;
      color: #111827;
    }
  `],
})
export class DetailFieldComponent {
  label = input.required<string>();
  value = input.required<string>();
}