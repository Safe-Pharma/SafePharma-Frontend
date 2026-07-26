import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PortalApiService } from '../../../Services/portal-api.service';
import { PortalI18nService } from '../../../Services/portal-i18n.service';
import { Toast } from '../../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../../Shared/utils/get-error-message';
import { CatalogItem, CustomerOrganFunction } from '../../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../../Shared/skeleton';
import { PortalEmptyStateComponent } from '../../../Shared/empty-state';
import { dialogOverlay, dialogPanel, fadeSlideIn, listItem, staggerList, successPulse } from '../../../Shared/portal-animations';
import {PortalSectionHeaderComponent  } from '../../../Shared/portal-section-header.component';

@Component({
  selector: 'app-organ-functions-section',
  standalone: true,
  imports: [DatePipe, FormsModule, PortalSkeleton, PortalEmptyStateComponent, PortalSectionHeaderComponent],
  templateUrl: './organ-functions.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class OrganFunctionsSection implements OnChanges {
  private readonly api = inject(PortalApiService);
  private readonly toast = inject(Toast);
  readonly i18n = inject(PortalI18nService);

  @Input({ required: true }) customerId = '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly organs = signal<CatalogItem[]>([]);
  readonly impairmentLevels = signal<CatalogItem[]>([]);
  readonly organFunctions = signal<CustomerOrganFunction[]>([]);

  // Edit dialog state
  readonly editorOpen = signal(false);
  readonly editingOrganId = signal<string | null>(null); // null when adding a brand-new organ
  readonly selectedOrganId = signal('');
  readonly selectedLevelId = signal('');

  ngOnChanges(): void {
    if (this.customerId) this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      organs: this.api.getOrganCatalog(),
      impairmentLevels: this.api.getOrganImpairmentLevelCatalog(),
      organFunctions: this.api.getOrganFunctions(),
    }).subscribe({
      next: ({ organs, impairmentLevels, organFunctions }) => {
        this.organs.set(organs);
        this.impairmentLevels.set(impairmentLevels);
        this.organFunctions.set(organFunctions);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load organ functions.'), 'error');
      },
    });
  }

  organsAvailableToAdd(): CatalogItem[] {
    const recordedIds = new Set(this.organFunctions().map((o) => o.organId));
    return this.organs().filter((o) => !recordedIds.has(o.id));
  }

  openAdd(): void {
    this.editingOrganId.set(null);
    this.selectedOrganId.set(this.organsAvailableToAdd()[0]?.id ?? '');
    this.selectedLevelId.set(this.impairmentLevels()[0]?.id ?? '');
    this.editorOpen.set(true);
  }

  openEdit(entry: CustomerOrganFunction): void {
    this.editingOrganId.set(entry.organId);
    this.selectedOrganId.set(entry.organId);
    this.selectedLevelId.set(entry.organImpairmentLevelId);
    this.editorOpen.set(true);
  }

  editingOrganLabel(): string {
    const entry = this.organFunctions().find((o) => o.organId === this.editingOrganId());
    if (!entry) return '';
    return this.i18n.localizedName({ nameEn: entry.organNameEn, nameAr: entry.organNameAr });
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  save(): void {
    if (this.saving() || !this.selectedOrganId() || !this.selectedLevelId()) return;
    this.saving.set(true);

    this.api
      .assignOrganFunction( {
        organId: this.selectedOrganId(),
        organImpairmentLevelId: this.selectedLevelId(),
      })
      .subscribe({
        next: (updated) => {
          this.organFunctions.update((list) => {
            const withoutThis = list.filter((o) => o.organId !== updated.organId);
            return [...withoutThis, updated];
          });
          this.saving.set(false);
          this.editorOpen.set(false);
          this.toast.show('Organ function updated.', 'success');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.show(getErrorMessage(err, 'Could not update organ function.'), 'error');
        },
      });
  }
}