import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { I18nService } from '../../../Core/Services/i18n.service';
import { Spinner } from '../../../Shared/Components/spinner/spinner';
import { PageHeaderComponent } from '../../../Shared/Components/page-header/page-header';
import { ReferenceCatalogService } from '../Service/reference-catalog.service';
import {
  ReferenceCatalogKey,
} from '../Models/reference-catalog.model';

interface ReferenceCatalogCard {
  key: ReferenceCatalogKey;
  title: string;
  description: string;
  icon: 'condition' | 'organ' | 'allergy';
}

@Component({
  selector: 'app-reference-data',
  standalone: true,
  imports: [ReactiveFormsModule, Spinner, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reference-data.html',
  styleUrl: './reference-data.css',
})
export class ReferenceDataPage {
  protected readonly i18n = inject(I18nService);

  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ReferenceCatalogService);

  readonly cards: ReferenceCatalogCard[] = [
    {
      key: 'chronicCondition',
      title: 'ownerReferenceData.chronicConditions',
      description: 'ownerReferenceData.chronicConditionsDescription',
      icon: 'condition',
    },
    {
      key: 'organ',
      title: 'ownerReferenceData.organs',
      description: 'ownerReferenceData.organsDescription',
      icon: 'organ',
    },
    {
      key: 'allergy',
      title: 'ownerReferenceData.allergies',
      description: 'ownerReferenceData.allergiesDescription',
      icon: 'allergy',
    },
  ];

  readonly forms = {
    chronicCondition: this.createForm(),
    organ: this.createForm(),
    allergy: this.createForm(),
  };

  readonly submitting = signal<ReferenceCatalogKey | null>(null);
  readonly successKey = signal<ReferenceCatalogKey | null>(null);
  readonly errors = signal<Partial<Record<ReferenceCatalogKey, string>>>({});

  formFor(key: ReferenceCatalogKey) {
    return this.forms[key];
  }

  isSubmitting(key: ReferenceCatalogKey): boolean {
    return this.submitting() === key;
  }

  fieldInvalid(key: ReferenceCatalogKey, field: 'nameEn' | 'nameAr'): boolean {
    const control = this.formFor(key).controls[field];
    return control.invalid && control.touched;
  }

  submit(key: ReferenceCatalogKey): void {
    const form = this.formFor(key);
    this.successKey.set(null);
    this.clearError(key);

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.submitting.set(key);
    this.service.create(key, form.getRawValue()).pipe(
      finalize(() => this.submitting.set(null)),
    ).subscribe({
      next: () => {
        form.reset();
        this.successKey.set(key);
      },
      error: (error) => {
        const message = error?.error?.message ?? error?.error?.title ?? error?.message;
        this.setError(key, message || this.i18n.text('ownerReferenceData.createError'));
      },
    });
  }

  private createForm() {
    return this.fb.group({
      nameEn: this.fb.control('', Validators.required),
      nameAr: this.fb.control('', Validators.required),
    });
  }

  private clearError(key: ReferenceCatalogKey): void {
    this.errors.update((errors) => {
      const next = { ...errors };
      delete next[key];
      return next;
    });
  }

  private setError(key: ReferenceCatalogKey, message: string): void {
    this.errors.update((errors) => ({ ...errors, [key]: message }));
  }
}
