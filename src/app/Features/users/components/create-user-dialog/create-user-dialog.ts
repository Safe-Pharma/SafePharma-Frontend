import { ChangeDetectionStrategy, Component, inject, output, viewChild } from '@angular/core';
import { ModalShellComponent } from '../modal-shell/modal-shell';
import { UserFormComponent } from '../user-form/user-form';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [ModalShellComponent, UserFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-user-dialog.\html',
  styleUrl: './create-user-dialog.css',
})
export class CreateUserDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly userForm = viewChild.required(UserFormComponent);

  closed = output<void>();
  created = output<void>();

  onCancel(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    const value = this.userForm().getValue();
    if (!value) return; // invalid — errors are now shown inline

    this.usersService.createUser(value);
    this.created.emit();
  }
}