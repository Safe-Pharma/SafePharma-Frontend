import { ChangeDetectionStrategy, Component, inject, output, signal, viewChild } from '@angular/core';
import { ModalShellComponent } from '../modal-shell/modal-shell';
import { UserFormComponent } from '../user-form/user-form';
import { UsersService } from '../../services/users.service';
import { extractErrors } from '../../../../Shared/utils/extract-errors.util';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [ModalShellComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-user-dialog.html',
  styleUrl: './create-user-dialog.css',
})
export class CreateUserDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly userForm     = viewChild.required(UserFormComponent);

  closed  = output<void>();
  created = output<void>();

  readonly serverErrors = signal<string[]>([]);
  readonly isSubmitting = signal(false);

  onCancel(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    this.serverErrors.set([]);

    const value = this.userForm().getValue();
    if (!value) return;

    this.isSubmitting.set(true);

    // UsersService.createUser calls the API AND reloads the list on success
    this.usersService.createUser(value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.created.emit();        // closes the dialog
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.serverErrors.set(extractErrors(err));
      },
    });
  }
}