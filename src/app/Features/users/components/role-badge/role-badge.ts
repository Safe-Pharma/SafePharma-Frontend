import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-role-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge">{{ role() }}</span>`,
  styles: [`
    .badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 6px;
      background: #eef2ff;
      color: #4338ca;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
    }
  `],
})
export class RoleBadgeComponent {
  role = input.required<string>();
}