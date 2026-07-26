import { Component, Input } from '@angular/core';
import { SafeHtmlPipe } from '../../../Shared/Pipes/safe-html.pipe';

@Component({
  selector: 'portal-stat-card',
  standalone: true,
  imports: [SafeHtmlPipe],
  template: `
    <div
      class="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        class="grid h-11 w-11 shrink-0 place-items-center rounded-lg"
        [style.background]="'var(--' + tint + '-soft)'"
        [style.color]="'var(--' + tint + ')'"
        [innerHTML]="icon | safeHtml"
      ></div>
      <div class="min-w-0">
        <div class="truncate text-xs font-medium text-muted-foreground">{{ label }}</div>
        <div class="text-xl font-semibold tracking-tight text-foreground">{{ value }}</div>
      </div>
    </div>
  `,
})
export class PortalStatCard {
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() icon = '';
  @Input() tint: 'primary' | 'success' | 'warning' | 'destructive' = 'primary';
}