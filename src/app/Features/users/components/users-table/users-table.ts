import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';
import { UserAvatarComponent } from '../user-avatar/user-avatar';
import { RoleBadgeComponent } from '../role-badge/role-badge';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [DatePipe, UserAvatarComponent, RoleBadgeComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-table.html',
  styleUrl: './users-table.css',
})
export class UsersTableComponent {
  users = input.required<User[]>();

  view         = output<User>();
  edit         = output<User>();
  delete       = output<User>();
  toggleStatus = output<User>();

  /** id of the row whose action menu is currently open, or null */
  openMenuId = signal<string | null>(null);

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }
}