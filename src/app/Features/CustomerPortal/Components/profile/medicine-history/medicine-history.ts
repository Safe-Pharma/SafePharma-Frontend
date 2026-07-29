import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../../Services/portal-api.service';
import { Toast } from '../../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../../Shared/utils/get-error-message';
import { CustomerMedicineHistory } from '../../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../../Shared/empty-state';
import { fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse } from '../../../Shared/portal-animations';
import { PortalStatusBadge } from '../../../Shared/status-badge';
import {PortalSectionHeaderComponent  } from '../../../Shared/portal-section-header.component';
import { PortalI18nService } from '../../../Services/portal-i18n.service'; 

@Component({
  selector: 'app-medicine-history-section',
  standalone: true,
  imports: [FormsModule, DatePipe, PortalSkeleton, PortalEmptyStateComponent, PortalStatusBadge, PortalSectionHeaderComponent],
  templateUrl: './medicine-history.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class MedicineHistorySection implements OnChanges {
  private readonly api = inject(PortalApiService);
  private readonly toast = inject(Toast);
  protected readonly i18n = inject(PortalI18nService); // add this
  @Input({ required: true }) customerId = '';

  readonly loading = signal(true);
  readonly history = signal<CustomerMedicineHistory[]>([]);
  readonly search = signal('');

  ngOnChanges(): void {
    if (this.customerId) this.load();
  }

  load(): void {
    this.loading.set(true);
    const request = this.customerId
      ? this.api.getDependentMedicineHistory(this.customerId)
      : this.api.getMedicineHistory();

    request.subscribe({
      next: (history) => {
        this.history.set(
          [...history].sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1)),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load medicine history.'), 'error');
      },
    });
  }

  filtered(): CustomerMedicineHistory[] {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.history();
    return this.history().filter(
      (h) =>
        h.medicineName.toLowerCase().includes(q) || h.scientificName?.toLowerCase().includes(q),
    );
  }
}