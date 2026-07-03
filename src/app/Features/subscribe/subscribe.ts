import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SubscriptionService } from './Services/subscription.service';
import { CreateSubscriptionRequest } from './Models/create-subscription.model';

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
export class Subscribe {
  private fb = inject(FormBuilder);
  private subscriptionService = inject(SubscriptionService);
  private router = inject(Router);

  readonly plans: PlanOption[] = [
    { tier: 'Starter', price: '$49', period: '/mo', features: ['1 branch', '5 users', 'Inventory + POS'] },
    { tier: 'Professional', price: '$129', period: '/mo', features: ['5 branches', 'Unlimited users', 'All modules'] },
    { tier: 'Enterprise', price: 'Custom', period: '', features: ['Unlimited branches', 'SSO', 'Dedicated CSM'] },
  ];

  isSubmitting = signal(false);
  submitError = signal<string | null>(null);

  form = this.fb.group({
    planTier: this.fb.control<'Starter' | 'Professional' | 'Enterprise'>('Professional', { validators: Validators.required }),
    billingCycle: this.fb.control<'monthly' | 'yearly'>('monthly', { validators: Validators.required }),
    pharmacy: this.fb.group({
      name: ['', Validators.required],
      logoUrl: this.fb.control<string | null>(null),
      taxNumber: this.fb.control<string | null>(null),
      commercialRegistration: this.fb.control<string | null>(null),
      address: ['', Validators.required],
      country: ['United Arab Emirates', Validators.required],
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

  selectPlan(tier: PlanOption['tier']): void {
    this.form.controls.planTier.setValue(tier);
  }

  selectBilling(cycle: 'monthly' | 'yearly'): void {
    this.form.controls.billingCycle.setValue(cycle);
  }

  onSubmit(): void {
  console.log('form valid?', this.form.valid);
  console.log('form errors:', this.getFormValidationErrors());


    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
          this.submitError.set(result.message);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(err?.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }

  private getFormValidationErrors() {
  const errors: Record<string, any> = {};
  const collect = (group: any, prefix = '') => {
    Object.keys(group.controls).forEach((key) => {
      const control = group.get(key);
      if (control?.controls) {
        collect(control, `${prefix}${key}.`);
      } else if (control?.invalid) {
        errors[`${prefix}${key}`] = control.errors;
      }
    });
  };
  collect(this.form);
  return errors;
}
}