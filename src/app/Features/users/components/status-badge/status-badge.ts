import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class.is-active]="isActive()" [class.pill]="variant() === 'pill'">
      <span class="dot"></span>{{ isActive() ? 'Active' : 'Inactive' }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
    }
    .badge.is-active { color: #059669; }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #9ca3af;
    }
    .badge.is-active .dot { background: #059669; }
    .badge.pill {
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
    }
  `],
})
export class StatusBadgeComponent {
  isActive = input.required<boolean>();
  variant  = input<'text' | 'pill'>('text');
}