import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PortalApiService } from '../../../Services/portal-api.service';
import { PortalI18nService } from '../../../Services/portal-i18n.service';
import { Toast } from '../../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../../Shared/utils/get-error-message';
import { CatalogItem, CustomerChronicCondition } from '../../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../../Shared/skeleton';
import { PortalEmptyState } from '../../../Shared/empty-state';
import { PortalConfirmDialog } from '../../../Shared/confirm-dialog';

@Component({
  selector: 'app-chronic-conditions-section',
  standalone: true,
  imports: [PortalSkeleton, PortalEmptyState, PortalConfirmDialog],
  templateUrl: './chronic-conditions.html',
})
export class ChronicConditionsSection implements OnChanges {
  private readonly api = inject(PortalApiService);
  private readonly toast = inject(Toast);
  readonly i18n = inject(PortalI18nService);

  @Input({ required: true }) customerId = '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly catalog = signal<CatalogItem[]>([]);
  readonly assigned = signal<CustomerChronicCondition[]>([]);
  readonly pickerOpen = signal(false);
  readonly pendingRemoveId = signal<string | null>(null);

  ngOnChanges(): void {
    if (this.customerId) this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      catalog: this.api.getChronicConditionCatalog(),
      assigned: this.api.getChronicConditions(this.customerId),
    }).subscribe({
      next: ({ catalog, assigned }) => {
        this.catalog.set(catalog);
        this.assigned.set(assigned);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load chronic conditions.'), 'error');
      },
    });
  }

  availableToAdd(): CatalogItem[] {
    const assignedIds = new Set(this.assigned().map((a) => a.chronicConditionId));
    return this.catalog().filter((c) => !assignedIds.has(c.id));
  }

  add(item: CatalogItem): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.assignChronicCondition(this.customerId, { chronicConditionId: item.id }).subscribe({
      next: () => {
        this.assigned.update((list) => [
          ...list,
          { chronicConditionId: item.id, nameEn: item.nameEn, nameAr: item.nameAr },
        ]);
        this.saving.set(false);
        this.pickerOpen.set(false);
        this.toast.show('Condition added.', 'success');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(getErrorMessage(err, 'Could not add condition.'), 'error');
      },
    });
  }

  confirmRemove(id: string): void {
    this.pendingRemoveId.set(id);
  }

  cancelRemove(): void {
    this.pendingRemoveId.set(null);
  }

  removeConfirmed(): void {
    const id = this.pendingRemoveId();
    if (!id) return;
    this.api.removeChronicCondition(this.customerId, id).subscribe({
      next: () => {
        this.assigned.update((list) => list.filter((a) => a.chronicConditionId !== id));
        this.pendingRemoveId.set(null);
        this.toast.show('Condition removed.', 'success');
      },
      error: (err) => {
        this.pendingRemoveId.set(null);
        this.toast.show(getErrorMessage(err, 'Could not remove condition.'), 'error');
      },
    });
  }
}