import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ALL_BRANCHES, ALL_STATUSES } from '../../models/user.model';
import { UserFormValue } from '../../models/user-form.model';
import { passwordsMatchValidator } from '../../models/user-form.validator';
import { RolesStateService } from '../../services/roles-state.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserFormComponent implements OnInit {
  private readonly fb         = inject(NonNullableFormBuilder);
  private readonly rolesState = inject(RolesStateService);

  mode         = input<'create' | 'edit'>('create');
  initialValue = input<Partial<UserFormValue> | null>(null);

  /** Pass backend error strings here — displayed as a red list above the form fields. */
  serverErrors = input<string[]>([]);

  readonly roles        = this.rolesState.roles;
  readonly rolesLoading = this.rolesState.loading;
  readonly branches     = ALL_BRANCHES;
  readonly statuses     = ALL_STATUSES;

  readonly form = this.fb.group(
    {
      firstName:       this.fb.control('', Validators.required),
      lastName:        this.fb.control('', Validators.required),
      email:           this.fb.control('', [Validators.required, Validators.email]),
      phone:           this.fb.control('', Validators.required),
      password:        this.fb.control(''),
      confirmPassword: this.fb.control(''),
      role:            this.fb.control<string>('', Validators.required),
      branch:          this.fb.control<string>('Main Branch', Validators.required),
      status:          this.fb.control<'Active' | 'Inactive'>('Active', Validators.required),
    },
    { validators: passwordsMatchValidator },
  );

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (value) this.form.patchValue(value);
    });

    effect(() => {
      const roles = this.roles();
      if (roles.length > 0 && !this.form.controls.role.value) {
        this.form.controls.role.setValue(roles[0].name);
      }
    });

    effect(() => {
      const isCreate        = this.mode() === 'create';
      const password        = this.form.controls.password;
      const confirmPassword = this.form.controls.confirmPassword;

      if (isCreate) {
        password.setValidators([Validators.required, Validators.minLength(8)]);
        confirmPassword.setValidators([Validators.required]);
      } else {
        password.clearValidators();
        confirmPassword.clearValidators();
      }
      password.updateValueAndValidity({ emitEvent: false });
      confirmPassword.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.rolesState.load();
  }

  /** Returns field-level error message or null. */
  fieldError(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !control.touched) return null;

    if (control.hasError('required'))  return 'This field is required.';
    if (control.hasError('email'))     return 'Enter a valid email address.';
    if (control.hasError('minlength')) return `Minimum ${control.getError('minlength').requiredLength} characters.`;

    return 'Invalid value.';
  }

  getValue(): UserFormValue | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }
    return this.form.getRawValue();
  }
}