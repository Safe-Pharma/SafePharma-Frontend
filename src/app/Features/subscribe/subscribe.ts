import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from './Services/subscription.service';
import { LocationService } from './Services/location.service';
import { CreateSubscriptionRequest } from './Models/create-subscription.model';
import { City, CountryWithCities } from './Models/country-with-cities.model';
import { GeneralResult } from '../../Core/Models/general-result.model';
import{ alphanumericHyphenValidator, fullNameValidator, passwordComplexityValidator, phoneValidator } from './Validators/custom-validators';  

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
  cities = signal<City[]>([]);

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
this.locationService.getCountries().subscribe({
  next: (result) => {
    console.log(result);

    if (result.success && result.data) {
      this.countries.set(result.data);

      console.log('Countries signal:', this.countries());
      console.log('First country:', this.countries()[0]);
      console.log('Cities of first country:', this.countries()[0]?.cities);
    }
  }
});
  }

onCountryChange(): void {
  const selectedCountryId = this.form.controls.pharmacy.controls.country.value;

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
