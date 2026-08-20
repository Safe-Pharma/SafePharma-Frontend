import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from './Services/subscription.service';
import { LocationService } from './Services/location.service';
import { CreateSubscriptionRequest } from './Models/create-subscription.model';
import { City, CountryWithCities } from './Models/country-with-cities.model';
import { GeneralResult } from '../../Core/Models/general-result.model';
import{ alphanumericHyphenValidator, fullNameValidator, passwordComplexityValidator, phoneValidator } from './Validators/custom-validators';  
import { Toast } from '../../Shared/Toasts/toast';
import { SubscriptionPlanService } from './Services/subscription-plan.service';
import { SubscriptionPlanRead } from './Models/subscription-plan.model';
import { SearchableSelectComponent, SearchableSelectOption } from '../../Shared/Components/searchable-select/searchable-select';
import { formatCurrency } from '../../Shared/utils/currency.util';
interface PlanOption {
  tier: 'Starter' | 'Professional' | 'Enterprise';
  price: string;
  period: string;
  features: string[];
}

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.css',
})
export class Subscribe implements OnInit {
  private fb = inject(FormBuilder);
  private subscriptionService = inject(SubscriptionService);
  private locationService = inject(LocationService);
  private router = inject(Router);
  private toast = inject(Toast);
  private planService = inject(SubscriptionPlanService);

  isLoadingPlans = signal(true);
  isLoadingLocations = signal(true);
  locationError = signal<string | null>(null);
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  countries = signal<CountryWithCities[]>([]);
  cities = signal<City[]>([]);
  isUploadingLogo = signal(false);
  logoFileName = signal<string | null>(null);
  plans = signal<SubscriptionPlanRead[]>([]);

  get countryOptions(): SearchableSelectOption[] {
    return this.countries().map((country) => ({ value: country.id, label: country.name, secondary: country.code }));
  }

  get cityOptions(): SearchableSelectOption[] {
    return this.cities().map((city) => ({ value: city.name, label: city.name }));
  }

  get languageOptions(): SearchableSelectOption[] {
    return [
      { value: 'English', label: 'English' },
      { value: 'Arabic', label: 'العربية' },
    ];
  }

  get timeZoneOptions(): SearchableSelectOption[] {
    return [
      { value: '(GMT+4) Gulf Standard Time', label: '(GMT+4) Gulf Standard Time' },
      { value: '(GMT+3) Arabia Standard Time', label: '(GMT+3) Arabia Standard Time' },
      { value: '(GMT+2) Eastern European Time', label: '(GMT+2) Eastern European Time' },
    ];
  }

form = this.fb.group({
  planTier: this.fb.control<'Starter' | 'Professional' | 'Enterprise'>('Professional', {
    validators: Validators.required,
  }),
  billingCycle: this.fb.control<'monthly' | 'yearly'>('monthly', {
    validators: Validators.required,
  }),
  pharmacy: this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    logoUrl: this.fb.control<string | null>(null),
    taxNumber: this.fb.control<string | null>(null, [alphanumericHyphenValidator]),
    commercialRegistration: this.fb.control<string | null>(null, [alphanumericHyphenValidator]),
    address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    country: ['', [Validators.required, Validators.maxLength(100)]],
    city: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.required, phoneValidator]],
    businessEmail: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    numberOfBranches: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
    preferredLanguage: ['English', Validators.required],
    timeZone: ['(GMT+4) Gulf Standard Time', Validators.required],
  }),
  primaryContact: this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), fullNameValidator]],
    mobile: ['', [Validators.required, phoneValidator]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(100), passwordComplexityValidator],
    ],
  }),
});

ngOnInit(): void {
  this.isLoadingLocations.set(true);
  this.locationError.set(null);
  this.locationService.getCountries().subscribe({
    next: (result) => {
      if (result.success && result.data) {
        this.countries.set(result.data);
      } else {
        this.locationError.set('Could not load locations.');
      }
      this.isLoadingLocations.set(false);
    },
    error: () => {
      this.isLoadingLocations.set(false);
      this.locationError.set('Could not load locations.');
    },
  });

  this.planService.getActivePlans().subscribe({
    next: (plans) => {
      this.isLoadingPlans.set(false);
      this.plans.set(plans.sort((a, b) => a.sortOrder - b.sortOrder));
    },
    error: () => {
      this.isLoadingPlans.set(false);
      this.toast.show('Could not load subscription plans.', 'error');
    },
  });
}

retryLocations(): void {
  this.isLoadingLocations.set(true);
  this.locationError.set(null);
  this.locationService.getCountries().subscribe({
    next: (result) => {
      if (result.success && result.data) {
        this.countries.set(result.data);
      } else {
        this.locationError.set('Could not load locations.');
      }
      this.isLoadingLocations.set(false);
    },
    error: () => {
      this.isLoadingLocations.set(false);
      this.locationError.set('Could not load locations.');
    },
  });
}

onCountryChange(selectedCountryId = this.form.controls.pharmacy.controls.country.value): void {
  this.form.controls.pharmacy.controls.country.setValue(selectedCountryId);

  const country = this.countries().find(c => c.id === selectedCountryId);

  this.cities.set(country?.cities ?? []);

  this.form.controls.pharmacy.controls.city.setValue('');
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
  planPrice(plan: SubscriptionPlanRead): string {
  const amount = this.form.controls.billingCycle.value === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  return formatCurrency(amount);
}

planPeriod(): string {
  return this.form.controls.billingCycle.value === 'yearly' ? '/yr' : '/mo';
}

yearlyDiscountLabel(): string | null {
  const plan = this.plans().find((p) => p.tier === this.form.controls.planTier.value);
  if (!plan || plan.monthlyPrice <= 0) return null;

  const yearlyEquivalentOfMonthly = plan.monthlyPrice * 12;
  if (yearlyEquivalentOfMonthly <= plan.yearlyPrice) return null; // no real savings, don't show a badge

  const discountPercent = Math.round((1 - plan.yearlyPrice / yearlyEquivalentOfMonthly) * 100);
  return `−${discountPercent}%`;
}

getErrorMessage(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;

  const errors = control.errors;
  if (errors['server']) return errors['server'];
  if (errors['required']) return 'This field is required.';
  if (errors['email']) return 'Please enter a valid email address.';
  if (errors['minlength']) return `Must be at least ${errors['minlength'].requiredLength} characters.`;
  if (errors['maxlength']) return `Must not exceed ${errors['maxlength'].requiredLength} characters.`;
  if (errors['min']) return `Must be at least ${errors['min'].min}.`;
  if (errors['max']) return `Must not exceed ${errors['max'].max}.`;
  if (errors['invalidPhone']) return 'Enter a valid international number (e.g. +971501234567).';
  if (errors['invalidName']) return 'Only letters, spaces, hyphens, or apostrophes are allowed.';
  if (errors['invalidFormat']) return 'Must be 5–20 characters: letters, numbers, or hyphens only.';
  if (errors['missingUppercase']) return 'Password must contain at least one uppercase letter.';
  if (errors['missingLowercase']) return 'Password must contain at least one lowercase letter.';
  if (errors['missingDigit']) return 'Password must contain at least one digit.';
  if (errors['missingSpecialChar']) return 'Password must contain at least one special character.';
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
          this.router.navigate(['/subscribe', result.data!.id, 'payment']);
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
  onLogoSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  this.isUploadingLogo.set(true);

  this.subscriptionService.uploadLogo(file).subscribe({
    next: (result) => {
      this.isUploadingLogo.set(false);
      if (result.success && result.data) {
        this.form.controls.pharmacy.controls.logoUrl.setValue(result.data);
        this.logoFileName.set(file.name);
      } else {
        this.toast.show(result.message ?? 'Logo upload failed.', 'error');
      }
      input.value = '';
    },
    error: () => {
      this.isUploadingLogo.set(false);
      this.toast.show('Logo upload failed. Please try again.', 'error');
      input.value = '';
    },
  });
}
}
