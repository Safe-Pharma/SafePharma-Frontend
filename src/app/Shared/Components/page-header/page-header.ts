import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type PageHeaderIcon =
  | 'dashboard'
  | 'medicine'
  | 'inventory'
  | 'suppliers'
  | 'sales'
  | 'purchases'
  | 'taxes'
  | 'customers'
  | 'reports'
  | 'users'
  | 'settings'
  | 'history'
  | 'payment';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeaderComponent {
  readonly icon = input<PageHeaderIcon>('dashboard');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
