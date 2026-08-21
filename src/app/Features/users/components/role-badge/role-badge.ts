import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-role-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge">{{ i18n.roleLabel(role()) }}</span>`,
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
  protected readonly i18n = inject(I18nService);
  role = input.required<string>();
}
