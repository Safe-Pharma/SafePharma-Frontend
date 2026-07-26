import { Component, Input } from '@angular/core';

@Component({
  selector: 'portal-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
      <div class="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
        </svg>
      </div>
      <div class="text-sm font-medium text-foreground">{{ title }}</div>
      @if (description) {
        <div class="max-w-sm text-xs text-muted-foreground">{{ description }}</div>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class PortalEmptyState {
  @Input() title = 'Nothing here yet';
  @Input() description = '';
}