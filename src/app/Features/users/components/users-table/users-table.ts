import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';
import { UserAvatarComponent } from '../user-avatar/user-avatar';
import { RoleBadgeComponent } from '../role-badge/role-badge';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { I18nService } from '../../../../Core/Services/i18n.service';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [DatePipe, UserAvatarComponent, RoleBadgeComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-table.html',
  styleUrl: './users-table.css',
})
export class UsersTableComponent {
  protected readonly i18n = inject(I18nService);
  users = input.required<User[]>();
  loading = input(false);
 
  view         = output<User>();
  edit         = output<User>();
  delete       = output<User>();
  toggleStatus = output<User>();
 
  openMenuId  = signal<string | null>(null);
  menuOpenUp  = signal(false);
 
  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
 
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
      return;
    }
 
    // Check if there's enough space below — if not, open upward
    const trigger = event.currentTarget as HTMLElement;
    const rect    = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    this.menuOpenUp.set(spaceBelow < 180); // 180px ≈ menu height
 
    this.openMenuId.set(id);
  }
 
  closeMenu(): void {
    this.openMenuId.set(null);
  }
}
