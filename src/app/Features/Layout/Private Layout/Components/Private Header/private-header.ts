import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Breadcrumb {
  label: string;
  active?: boolean;
}

@Component({
  selector: 'app-Private-Header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './private-header.html',
})
export class PrivateHeader {
  @Input() pharmacyName = 'MediRx Pharmacy';
  @Input() breadcrumbs: Breadcrumb[] = [{ label: 'Dashboard', active: true }];
  @Input() lang: 'EN' | 'AR' = 'EN';
  @Input() hasUnreadNotifications = true;
  @Input() userName = 'eman refaat';
  @Input() userRole = 'Administrator';
  @Input() userInitials = 'SK';
  @Input() userMenuOpen = false;

  searchTerm = '';

  @Output() langToggle = new EventEmitter<void>();
  @Output() notificationsClick = new EventEmitter<void>();
  @Output() userMenuToggle = new EventEmitter<void>();
}
