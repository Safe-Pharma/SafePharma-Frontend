import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { I18nService } from '../../Core/Services/i18n.service';
interface PlanOption {
  tier: 'Starter' | 'Professional' | 'Enterprise';
  price: string;
  period: string;
  features: string[];
}

@Component({
  selector: 'app-subscribe',
  standalone: true,
  imports: [ReactiveFormsModule, SearchableSelectComponent],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.css',
})
export class Subscribe implements OnInit {
  protected readonly i18n = inject(I18nService);
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
    return this.countries().map((country) => ({ value: country.name, label: country.name, secondary: country.code }));
  }

  get cityOptions(): SearchableSelectOption[] {
    return this.cities().map((city) => ({ value: city.name, label: city.name }));
  }

  get languageOptions(): SearchableSelectOption[] {
    return [
      { value: 'English', label: this.i18n.text('language.english') },
      { value: 'Arabic', label: this.i18n.text('language.arabic') },
    ];
  }

  get timeZoneOptions(): SearchableSelectOption[] {
    return [
      { value: '(GMT+4) Gulf Standard Time', label: this.i18n.text('subscribe.gulfTime') },
      { value: '(GMT+3) Arabia Standard Time', label: this.i18n.text('subscribe.arabiaTime') },
      { value: '(GMT+2) Eastern European Time', label: this.i18n.text('subscribe.europeTime') },
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
        this.locationError.set(this.i18n.text('subscribe.locationsError'));
      }
      this.isLoadingLocations.set(false);
    },
    error: () => {
      this.isLoadingLocations.set(false);
      this.locationError.set(this.i18n.text('subscribe.locationsError'));
    },
  });

  this.planService.getActivePlans().subscribe({
    next: (plans) => {
      this.isLoadingPlans.set(false);
      this.plans.set(plans.sort((a, b) => a.sortOrder - b.sortOrder));
    },
    error: () => {
      this.isLoadingPlans.set(false);
      this.toast.show(this.i18n.text('subscribe.plansError'), 'error');
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
        this.locationError.set(this.i18n.text('subscribe.locationsError'));
      }
      this.isLoadingLocations.set(false);
    },
    error: () => {
      this.isLoadingLocations.set(false);
      this.locationError.set(this.i18n.text('subscribe.locationsError'));
    },
  });
}

onCountryChange(selectedCountryName = this.form.controls.pharmacy.controls.country.value): void {
  const country = this.countries().find((item) =>
    item.name === selectedCountryName || item.id === selectedCountryName,
  );
  const countryName = country?.name ?? selectedCountryName;

  this.form.controls.pharmacy.controls.country.setValue(countryName);

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
  return this.form.controls.billingCycle.value === 'yearly'
    ? this.i18n.text('subscribe.perYear')
    : this.i18n.text('subscribe.perMonth');
}

planName(plan: SubscriptionPlanRead): string {
  const key = plan.tier === 'Starter' ? 'landing.starter' : plan.tier === 'Professional' ? 'landing.professional' : 'landing.enterprise';
  return this.i18n.text(key);
}

planFeature(feature: string): string {
  const featureKeys: Record<string, string> = {
    '1 branch': 'landing.oneBranch', 'Up to 5 users': 'landing.upTo5Users', 'Inventory + POS': 'landing.inventoryPos', 'Email support': 'landing.emailSupport',
    'Up to 5 branches': 'landing.upTo5Branches', 'Unlimited users': 'landing.unlimitedUsers', 'Purchasing + Suppliers': 'landing.purchasingSuppliers', 'Advanced reports': 'landing.advancedReports', 'Priority support': 'landing.prioritySupport',
    'Unlimited branches': 'landing.unlimitedBranches', 'SSO + SAML': 'landing.ssoSaml', 'Custom integrations': 'landing.customIntegrations', 'Dedicated CSM': 'landing.dedicatedCsm', '99.95% SLA': 'landing.sla',
  };
  return featureKeys[feature] ? this.i18n.text(featureKeys[feature]) : feature;
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
  if (errors['required']) return this.i18n.text('subscribe.required');
  if (errors['email']) return this.i18n.text('subscribe.invalidEmail');
  if (errors['minlength']) return this.i18n.text('subscribe.minLength', { value: errors['minlength'].requiredLength });
  if (errors['maxlength']) return this.i18n.text('subscribe.maxLength', { value: errors['maxlength'].requiredLength });
  if (errors['min']) return this.i18n.text('subscribe.min', { value: errors['min'].min });
  if (errors['max']) return this.i18n.text('subscribe.max', { value: errors['max'].max });
  if (errors['invalidPhone']) return this.i18n.text('subscribe.invalidPhone');
  if (errors['invalidName']) return this.i18n.text('subscribe.invalidName');
  if (errors['invalidFormat']) return this.i18n.text('subscribe.invalidFormat');
  if (errors['missingUppercase']) return this.i18n.text('subscribe.missingUppercase');
  if (errors['missingLowercase']) return this.i18n.text('subscribe.missingLowercase');
  if (errors['missingDigit']) return this.i18n.text('subscribe.missingDigit');
  if (errors['missingSpecialChar']) return this.i18n.text('subscribe.missingSpecialChar');
  if (errors['pattern']) return this.i18n.text('subscribe.invalidFormatShort');
  return this.i18n.text('subscribe.invalidValue');
}

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set(this.i18n.text('subscribe.fixFields'));
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const formValue = this.form.getRawValue();
    const payload = {
      ...formValue,
      pharmacy: {
        ...formValue.pharmacy,
        numberOfBranches: 1,
      },
    } as unknown as CreateSubscriptionRequest;

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
          this.submitError.set(this.i18n.text('subscribe.genericError'));
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
        this.toast.show(result.message ?? this.i18n.text('subscribe.logoUploadFailed'), 'error');
      }
      input.value = '';
    },
    error: () => {
      this.isUploadingLogo.set(false);
      this.toast.show(this.i18n.text('subscribe.logoUploadRetry'), 'error');
      input.value = '';
    },
  });
}
}
