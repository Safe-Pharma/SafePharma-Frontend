import { Component, input } from '@angular/core';

/**
 * Friendly empty state with an icon slot. Anything projected without a
 * `slot` attribute (e.g. an "Add" button) renders below the description.
 *
 * <portal-empty-state [title]="..." [description]="...">
 *   <span slot="icon" [innerHTML]="icons.allergy"></span>
 *   <button (click)="openAdd()">{{ i18n.t('allergies.add') }}</button>
 * </portal-empty-state>
 */
@Component({
  selector: 'portal-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-2 rounded-lg py-10 text-center" role="status">
      <span
        class="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:h-6 [&_svg]:w-6"
        aria-hidden="true"
      >
        <ng-content select="[slot=icon]" />
      </span>
      <p class="text-sm font-medium text-foreground">{{ title() }}</p>
      @if (description()) {
        <p class="max-w-xs text-xs text-muted-foreground">{{ description() }}</p>
      }
      <div class="mt-1">
        <ng-content />
      </div>
    </div>
  `,
})
export class PortalEmptyStateComponent {
  title = input.required<string>();
  description = input<string>('');
}