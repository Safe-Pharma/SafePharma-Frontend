import { Component, input } from '@angular/core';

export type PortalSectionTone = 'primary' | 'destructive' | 'warning' | 'success' | 'muted';

/**
 * Standard header used at the top of every medical/portal section:
 * icon + title + short "why this matters" description + optional primary action.
 *
 * Usage:
 * <portal-section-header
 *   [title]="i18n.t('allergies.title')"
 *   [description]="i18n.t('allergies.description')"
 *   tone="destructive"
 * >
 *   <span slot="icon" [innerHTML]="icons.allergy"></span>
 *   <button slot="action" type="button" (click)="openAdd()">{{ i18n.t('allergies.add') }}</button>
 * </portal-section-header>
 */
@Component({
  selector: 'portal-section-header',
  standalone: true,
  template: `
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex gap-3">
        <span
          class="grid h-10 w-10 shrink-0 place-items-center rounded-lg [&_svg]:h-5 [&_svg]:w-5"
          [class]="iconToneClass()"
          aria-hidden="true"
        >
          <ng-content select="[slot=icon]" />
        </span>
        <div>
          <h3 class="text-sm font-semibold text-foreground">{{ title() }}</h3>
          <p class="mt-0.5 max-w-md text-xs text-muted-foreground">{{ description() }}</p>
        </div>
      </div>
      <div class="shrink-0">
        <ng-content select="[slot=action]" />
      </div>
    </div>
  `,
})
export class PortalSectionHeaderComponent {
  title = input.required<string>();
  description = input.required<string>();
  tone = input<PortalSectionTone>('primary');

  private static readonly TONE_CLASSES: Record<PortalSectionTone, string> = {
    primary: 'bg-primary-soft text-primary',
    destructive: 'bg-destructive-soft text-destructive',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
    muted: 'bg-muted text-muted-foreground',
  };

  iconToneClass(): string {
    return PortalSectionHeaderComponent.TONE_CLASSES[this.tone()];
  }
}