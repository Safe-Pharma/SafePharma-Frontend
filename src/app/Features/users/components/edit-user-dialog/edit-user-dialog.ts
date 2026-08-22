import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { ModalShellComponent } from '../modal-shell/modal-shell';
import { UserFormComponent } from '../user-form/user-form';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { UserFormValue } from '../../models/user-form.model';
import { extractErrors } from '../../../../Shared/utils/extract-errors.util';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  imports: [ModalShellComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-user-dialog.html',
  styleUrl: './edit-user-dialog.css',
})
export class EditUserDialogComponent {
  private readonly usersService = inject(UsersService);
  protected readonly i18n = inject(I18nService);
  private readonly userForm     = viewChild.required(UserFormComponent);

  user = input.required<User>();

  closed  = output<void>();
  updated = output<void>();

  readonly serverErrors = signal<string[]>([]);
  readonly isSubmitting = signal(false);

  protected readonly initialValue = computed<Partial<UserFormValue>>(() => {
    const u = this.user();
    const [firstName, ...rest] = u.name.split(' ');
    return {
      firstName,
      lastName: rest.join(' '),
      email:    u.email,
      phone:    u.phone  ?? '',
      role:     u.role,
      branch:   u.branch ?? '',
      status:   u.isActive ? 'Active' : 'Inactive',
    };
  });

  onCancel(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    this.serverErrors.set([]);

    const value = this.userForm().getValue();
    if (!value) return;

    this.isSubmitting.set(true);

    // UsersService.updateUser calls the API AND reloads the list on success
    this.usersService.updateUser(this.user().id, value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.updated.emit();        // closes the dialog
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.serverErrors.set(extractErrors(err));
      },
    });
  }
}
