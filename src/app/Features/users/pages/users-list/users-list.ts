import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UsersService } from '../../services/users.service';
import { User } from '../../models/user.model';
import { UsersFilterBarComponent } from '../../components/users-filter-bar/users-filter-bar';
import { UsersTableComponent } from '../../components/users-table/users-table';
import { PaginationComponent } from '../../components/pagination/pagination';
import { CreateUserDialogComponent } from '../../components/create-user-dialog/create-user-dialog';
import { EditUserDialogComponent } from '../../components/edit-user-dialog/edit-user-dialog';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../../../Shared/Components/page-header/page-header';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    UsersFilterBarComponent,
    UsersTableComponent,
    PaginationComponent,
    CreateUserDialogComponent,
    EditUserDialogComponent,
    PageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
})
export class UsersListComponent {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly usersService = inject(UsersService);

  protected readonly isCreateDialogOpen = signal(false);
  protected readonly editingUser = signal<User | null>(null);

  onCreateUser(): void {
    this.isCreateDialogOpen.set(true);
  }

  onCreateDialogClosed(): void {
    this.isCreateDialogOpen.set(false);
  }

  onView(user: User): void {
    this.router.navigate(['app/users', user.id]);
  }

  onEdit(user: User): void {
    this.editingUser.set(user);
  }

  onEditDialogClosed(): void {
    this.editingUser.set(null);
  }

  onDelete(user: User): void {
    this.usersService.deleteUser(user.id);
  }

  onToggleStatus(user: User): void {
    this.usersService.toggleUserStatus(user);
  }
}
