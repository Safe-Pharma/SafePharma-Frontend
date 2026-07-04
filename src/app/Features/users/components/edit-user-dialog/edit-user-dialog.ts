import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild } from '@angular/core';
import { ModalShellComponent } from '../modal-shell/modal-shell';
import { UserFormComponent } from '../user-form/user-form';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { UserFormValue } from '../../models/user-form.model';

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
  private readonly userForm = viewChild.required(UserFormComponent);

  user = input.required<User>();

  closed  = output<void>();
  updated = output<void>();

  /** Splits the stored full name back into first/last to pre-fill the shared form. */
  protected readonly initialValue = computed<Partial<UserFormValue>>(() => {
    const u = this.user();
    const [firstName, ...rest] = u.name.split(' ');
    return {
      firstName,
      lastName: rest.join(' '),
      email:    u.email,
      phone:    u.phone   ?? '',       // null → empty string for the form
      role:     u.role,
      branch:   u.branch  ?? '',       // null → empty string for the form
      status:   u.isActive ? 'Active' : 'Inactive',  // bool → union
    };
  });

  onCancel(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const value = this.userForm().getValue();
    if (!value) return;

    // updateUser now returns void and reloads from the API
    this.usersService.updateUser(this.user().id, value);
    this.updated.emit();
  }
}