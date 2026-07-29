import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PortalApiService } from '../../../Services/portal-api.service';
import { Toast } from '../../../../../Shared/Toasts/toast';
import { getErrorMessage } from '../../../../../Shared/utils/get-error-message';
import { Customer } from '../../../../Customer/Models/customer.model';
import { PortalSkeleton } from '../../../Shared/skeleton';
import { PortalAuthService } from '../../../Services/portal-auth.service';
import { PortalEmptyStateComponent } from '../../../Shared/empty-state';
import {
  fadeSlideIn,
  staggerList,
  listItem,
  dialogOverlay,
  dialogPanel,
  successPulse,
} from '../../../Shared/portal-animations';
import { PortalSectionHeaderComponent } from '../../../Shared/portal-section-header.component';
import { PortalI18nService } from '../../../Services/portal-i18n.service';

interface EditableFields {
  name: string;
  email: string;
  address: string;
  dateOfBirth: string;
  notes: string;
}

@Component({
  selector: 'app-personal-info-section',
  standalone: true,
  imports: [FormsModule, PortalSkeleton, PortalEmptyStateComponent, PortalSectionHeaderComponent],
  templateUrl: './personal-info.html',
  animations: [fadeSlideIn, staggerList, listItem, dialogOverlay, dialogPanel, successPulse],
})
export class PersonalInfoSection implements OnChanges {
  private readonly api = inject(PortalApiService);
  private readonly toast = inject(Toast);
  protected readonly i18n = inject(PortalI18nService);

  @Input({ required: true }) customerId = '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly profile = signal<Customer | null>(null);
  readonly dirty = signal(false);

  form: EditableFields = { name: '', email: '', address: '', dateOfBirth: '', notes: '' };

  ngOnChanges(): void {
    if (this.customerId) this.load();
  }

  load(): void {
    this.loading.set(true);

    const profileRequest = this.customerId
      ? this.api.getDependentProfile(this.customerId)
      : this.api.getProfile(undefined);

    profileRequest.subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.form = {
          name: profile?.name ?? '',
          email: profile.email ?? '',
          address: profile.address ?? '',
          dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
          notes: profile.notes ?? '',
        };
        this.dirty.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.show(getErrorMessage(err, 'Could not load your profile.'), 'error');
      },
    });
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  save(): void {
    const current = this.profile();
    if (!current || this.saving()) return;

    this.saving.set(true);
    this.api
      .updateProfile(
        {
          name: this.form.name.trim(),
          email: this.form.email.trim() || null,
          address: this.form.address.trim() || null,
          dateOfBirth: this.form.dateOfBirth || null,
          notes: this.form.notes.trim() || null,
        },
        this.customerId || undefined,
      )
      .subscribe({
        next: (updated) => {
          let phone = current.phone;
          updated.phone = phone;
          this.profile.set(updated);

          this.saving.set(false);
          this.dirty.set(false);
          this.toast.show('Profile updated.', 'success');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.show(getErrorMessage(err, 'Could not save your changes.'), 'error');
        },
      });
  }
}
