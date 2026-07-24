import { Component, Input } from '@angular/core';

@Component({
  selector: 'portal-skeleton',
  standalone: true,
  template: `
    <div
      class="animate-pulse rounded-md bg-muted"
      [style.height.px]="height"
      [style.width]="width"
    ></div>
  `,
})
export class PortalSkeleton {
  @Input() height = 16;
  @Input() width = '100%';
}