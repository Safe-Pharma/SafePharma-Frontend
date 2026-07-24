import { Component, Input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'destructive' | 'muted';

@Component({
  selector: 'portal-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      [style.background]="bg()"
      [style.color]="fg()"
    >
      <span class="h-1.5 w-1.5 rounded-full" [style.background]="fg()"></span>
      {{ label }}
    </span>
  `,
})
export class PortalStatusBadge {
  @Input() tone: BadgeTone = 'muted';
  @Input() label = '';

  bg(): string {
    return this.tone === 'muted' ? 'var(--muted)' : `var(--${this.tone}-soft)`;
  }

  fg(): string {
    return this.tone === 'muted' ? 'var(--muted-foreground)' : `var(--${this.tone})`;
  }
}