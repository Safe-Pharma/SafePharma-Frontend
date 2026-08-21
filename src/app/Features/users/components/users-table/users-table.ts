import { AfterViewChecked, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnDestroy, output, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { User } from '../../models/user.model';
import { UserAvatarComponent } from '../user-avatar/user-avatar';
import { RoleBadgeComponent } from '../role-badge/role-badge';
import { StatusBadgeComponent } from '../status-badge/status-badge';
import { I18nService } from '../../../../Core/Services/i18n.service';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';

@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [DatePipe, UserAvatarComponent, RoleBadgeComponent, StatusBadgeComponent, ModalOverlayDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-table.html',
  styleUrl: './users-table.css',
})
export class UsersTableComponent implements AfterViewChecked, OnDestroy {
  protected readonly i18n = inject(I18nService);
  users = input.required<User[]>();
  loading = input(false);
 
  view         = output<User>();
  edit         = output<User>();
  delete       = output<User>();
  toggleStatus = output<User>();
 
  openMenuId  = signal<string | null>(null);
  menuPosition = signal<{ top: number; left: number } | null>(null);
  menuVisible = signal(false);
  menuUser = computed(() => {
    const id = this.openMenuId();
    return id ? this.users().find((user) => user.id === id) ?? null : null;
  });

  @ViewChild('menuEl') private menuEl?: ElementRef<HTMLDivElement>;
  private pendingButtonRect: DOMRect | null = null;
  private readonly closeMenuOnScroll = () => this.closeMenu();

  constructor() {
    document.addEventListener('scroll', this.closeMenuOnScroll, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.closeMenuOnScroll, true);
  }
 
  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
 
    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    this.pendingButtonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuVisible.set(false);
    this.menuPosition.set({
      top: this.pendingButtonRect.bottom + 4,
      left: Math.max(8, Math.min(this.pendingButtonRect.right - 176, window.innerWidth - 176 - 8)),
    });
    this.openMenuId.set(id);
  }

  ngAfterViewChecked(): void {
    if (!this.openMenuId() || this.menuVisible() || !this.menuEl || !this.pendingButtonRect) return;

    const menuHeight = this.menuEl.nativeElement.offsetHeight;
    const menuWidth = this.menuEl.nativeElement.offsetWidth;
    const gap = 4;
    const button = this.pendingButtonRect;
    const openUpward = window.innerHeight - button.bottom < menuHeight + gap;

    this.menuPosition.set({
      top: openUpward
        ? Math.max(8, button.top - menuHeight - gap)
        : Math.min(button.bottom + gap, window.innerHeight - menuHeight - 8),
      left: Math.max(8, Math.min(button.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    this.menuVisible.set(true);
  }
 
  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPosition.set(null);
    this.menuVisible.set(false);
    this.pendingButtonRect = null;
  }
}
