import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortalApiService } from '../../../Services/portal-api.service';
import { PortalI18nService } from '../../../Services/portal-i18n.service';
import { Toast } from '../../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../../Shared/utils/get-error-message';
import { CatalogItem, CustomerAllergy } from '../../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../../Shared/empty-state';
import { PortalConfirmDialog } from '../../../Shared/confirm-dialog';
import { PortalSectionHeaderComponent } from '../../../Shared/portal-section-header.component';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../../Shared/portal-animations';

@Component({
  selector: 'app-allergies-section',
  standalone: true,
  imports: [
    PortalSkeleton,
    PortalEmptyStateComponent,
    PortalConfirmDialog,
    PortalSectionHeaderComponent, // was missing — this is why <portal-section-header> broke
  ],
  templateUrl: './allergies.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class AllergiesSection implements OnChanges {
  private readonly api = inject(PortalApiService);
  private readonly toast = inject(Toast);
  readonly i18n = inject(PortalI18nService);

  @Input({ required: true }) customerId = '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly catalog = signal<CatalogItem[]>([]);
  readonly assigned = signal<CustomerAllergy[]>([]);
  readonly pickerOpen = signal(false);
  readonly pendingRemoveId = signal<string | null>(null);

  ngOnChanges(): void {
    if (this.customerId) this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      catalog: this.api.getAllergyCatalog(),
      assigned: this.api.getAllergies(),
    }).subscribe({
      next: ({ catalog, assigned }) => {
        this.catalog.set(catalog);
        this.assigned.set(assigned);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load allergies.'), 'error');
      },
    });
  }

  availableToAdd(): CatalogItem[] {
    const assignedIds = new Set(this.assigned().map((a) => a.allergyId));
    return this.catalog().filter((c) => !assignedIds.has(c.id));
  }

  add(item: CatalogItem): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.assignAllergy({ allergyId: item.id }).subscribe({
      next: () => {
        this.assigned.update((list) => [
          ...list,
          { allergyId: item.id, nameEn: item.nameEn, nameAr: item.nameAr },
        ]);
        this.saving.set(false);
        this.pickerOpen.set(false);
        this.toast.show('Allergy added.', 'success');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(getErrorMessage(err, 'Could not add allergy.'), 'error');
      },
    });
  }

  confirmRemove(allergyId: string): void {
    this.pendingRemoveId.set(allergyId);
  }

  cancelRemove(): void {
    this.pendingRemoveId.set(null);
  }

  removeConfirmed(): void {
    const id = this.pendingRemoveId();
    if (!id) return;
    this.api.removeAllergy(id).subscribe({
      next: () => {
        this.assigned.update((list) => list.filter((a) => a.allergyId !== id));
        this.pendingRemoveId.set(null);
        this.toast.show('Allergy removed.', 'success');
      },
      error: (err) => {
        this.pendingRemoveId.set(null);
        this.toast.show(getErrorMessage(err, 'Could not remove allergy.'), 'error');
      },
    });
  }
}