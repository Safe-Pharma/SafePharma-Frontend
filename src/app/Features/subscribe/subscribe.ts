import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from './Services/subscription.service';
import { LocationService } from './Services/location.service';
import { CreateSubscriptionRequest } from './Models/create-subscription.model';
import { CountryWithCities } from './Models/country-with-cities.model';
import { GeneralResult } from '../../Core/Models/general-result.model';

interface PlanOption {
  tier: 'Starter' | 'Professional' | 'Enterprise';
  price: string;
  period: string;
  features: string[];
}

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.css',
})
export class Subscribe implements OnInit {
  private fb = inject(FormBuilder);
  private subscriptionService = inject(SubscriptionService);
  private locationService = inject(LocationService);
  private router = inject(Router);

  readonly plans: PlanOption[] = [
    {
      tier: 'Starter',
      price: '$49',
      period: '/mo',
      features: ['1 branch', '5 users', 'Inventory + POS'],
    },
    {
      tier: 'Professional',
      price: '$129',
      period: '/mo',
      features: ['5 branches', 'Unlimited users', 'All modules'],
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      period: '',
      features: ['Unlimited branches', 'SSO', 'Dedicated CSM'],
    },
  ];

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  countries = signal<CountryWithCities[]>([]);

  form = this.fb.group({
    planTier: this.fb.control<'Starter' | 'Professional' | 'Enterprise'>('Professional', {
      validators: Validators.required,
    }),
    billingCycle: this.fb.control<'monthly' | 'yearly'>('monthly', {
      validators: Validators.required,
    }),
    pharmacy: this.fb.group({
      name: ['', Validators.required],
      logoUrl: this.fb.control<string | null>(null),
      taxNumber: this.fb.control<string | null>(null),
      commercialRegistration: this.fb.control<string | null>(null),
      address: ['', Validators.required],
      country: ['', Validators.required],
      city: ['', Validators.required],
      phone: ['', Validators.required],
      businessEmail: ['', [Validators.required, Validators.email]],
      numberOfBranches: [1, [Validators.required, Validators.min(1)]],
      preferredLanguage: ['English', Validators.required],
      timeZone: ['(GMT+4) Gulf Standard Time', Validators.required],
    }),
    primaryContact: this.fb.group({
      fullName: ['', Validators.required],
      mobile: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    }),
  });

  cities = computed(() => {
    const selectedCountryId = this.form.controls.pharmacy.controls.country.value;

    return this.countries().find((c) => c.id === selectedCountryId)?.cities ?? [];
  });

  ngOnInit(): void {
    this.locationService.getCountries().subscribe({
      next: (result) => {
        if (result.success && result.data) {
          this.countries.set(result.data);
        }
      },
      error: () => {
        console.error('Failed to load countries');
      },
    });
  }

  onCountryChange(): void {
    this.form.controls.pharmacy.controls.city.setValue('');
    console.log('Selected country:', this.form.controls.pharmacy.controls.country.value);

    console.log('Cities:', this.cities());
  }

  selectPlan(tier: PlanOption['tier']): void {
    this.form.controls.planTier.setValue(tier);
  }

  selectBilling(cycle: 'monthly' | 'yearly'): void {
    this.form.controls.billingCycle.setValue(cycle);
  }

  isInvalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(control: AbstractControl | null): string | null {
    if (!control || !control.errors || !(control.touched || control.dirty)) return null;

    const errors = control.errors;
    if (errors['server']) return errors['server'];
    if (errors['required']) return 'This field is required.';
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['minlength'])
      return `Must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength'])
      return `Must not exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['min']) return `Must be at least ${errors['min'].min}.`;
    if (errors['pattern']) return 'Invalid format.';
    return 'Invalid value.';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Please fix the highlighted fields before submitting.');
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload = this.form.getRawValue() as CreateSubscriptionRequest;

    this.subscriptionService.create(payload).subscribe({
      next: (result) => {
        this.isSubmitting.set(false);
        if (result.success) {
          this.router.navigate(['/']); // swap for a real confirmation route once you build one
        } else {
          this.applyResultErrors(result);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const result = err?.error as GeneralResult<unknown> | undefined;
        if (result) {
          this.applyResultErrors(result);
        } else {
          this.submitError.set('Something went wrong. Please try again.');
        }
      },
    });
  }

  private applyResultErrors(result: GeneralResult<unknown>): void {
    this.submitError.set(result.message);

    if (!result.errors) return;

    Object.entries(result.errors).forEach(([path, apiErrors]) => {
      const control = this.getControlByPath(path);
      if (control) {
        control.setErrors({ server: apiErrors.map((e) => e.errorMessage).join(' ') });
        control.markAsTouched();
      }
    });
  }

  private getControlByPath(path: string): AbstractControl | null {
    const segments = path.split('.').map((s) => s.charAt(0).toLowerCase() + s.slice(1));
    let control: AbstractControl | null = this.form;
    for (const seg of segments) {
      control = control?.get(seg) ?? null;
      if (!control) return null;
    }
    return control;
  }
}
