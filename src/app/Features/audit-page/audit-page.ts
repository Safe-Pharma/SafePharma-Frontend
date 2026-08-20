import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuditService } from './Service/audit_service';
import { AuditDetailModalComponent } from './Components/audit-detail-modal-component/audit-detail-modal-component';
import { Spinner } from '../../Shared/Components/spinner/spinner';

interface AuditLog {
  date: string; // ISO format like "2026-03-03T09:10:00"
  action: string; // "Create", "Update", "Delete", "Login", "Logout"
  entity: string; // "Category", "Product", "Order"
  device: string; // "Edge - Windows"
  userFullName: string; // "user", "admin"
  newValues?: unknown;
  oldValues?: unknown;
}
@Component({
  selector: 'app-audit-page',
  imports: [CommonModule, FormsModule, AuditDetailModalComponent, Spinner],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.css',
})
export class AuditPage implements OnInit {
  // Filter states
  searchQuery: string = '';
  selectedUser: string = '';
  selectedAction: string = '';
  selectedEntity: string = '';
  selectedDate: string = '';

  isModalOpen = signal(false);
  selectedLog = signal<AuditLog | null>(null);
  loading = signal(true);

  constructor(private auditService: AuditService) {}

  audits = signal([] as AuditLog[]);
  filteredLogs = signal([] as AuditLog[]);
  ngOnInit() {
    this.loading.set(true);
    this.auditService
      .getAllAudits()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.audits.set(data);
          this.filteredLogs.set(data);
        },
        error: (error) => console.error('Failed to load audit logs:', error),
      });
  }
  onFilterChange() {
    let res = [...this.audits()]; // Get current signal value

    const filtered = res.filter((log) => {
      const matchSearch =
        log.userFullName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        log.entity.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchUser = !this.selectedUser || log.userFullName === this.selectedUser;
      const matchAction = !this.selectedAction || log.action === this.selectedAction;
      const matchEntity = !this.selectedEntity || log.entity === this.selectedEntity;
      const matchDate = !this.selectedDate || log.date.slice(0, 10) === this.selectedDate;

      return matchSearch && matchUser && matchAction && matchEntity && matchDate;
    });

    this.filteredLogs.set(filtered);
  }

  // Open modal with selected log
  openModal(log: AuditLog) {
    this.selectedLog.set(log);
    this.isModalOpen.set(true);
  }

  // Close modal
  closeModal() {
    this.isModalOpen.set(false);
    this.selectedLog.set(null);
  }

  // Get action color
  getActionColor(action: string): string {
    const colors: { [key: string]: string } = {
      Create: 'text-green-700 bg-green-50 border-green-200',
      Update: 'text-blue-700 bg-blue-50 border-blue-200',
      Delete: 'text-red-700 bg-red-50 border-red-200',
      Login: 'text-purple-700 bg-purple-50 border-purple-200',
    };
    return colors[action] || 'text-gray-700 bg-gray-50 border-gray-200';
  }
  // Get unique actions
  getUniqueActions(): string[] {
    const actions = this.audits().map((log) => log.action);
    return [...new Set(actions)]; // Remove duplicates
  }

  // Get unique users
  getUniqueUsers(): string[] {
    const users = this.audits().map((log) => log.userFullName);
    return [...new Set(users)];
  }

  // Get unique entities
  getUniqueEntities(): string[] {
    const entities = this.audits().map((log) => log.entity);
    return [...new Set(entities)];
  }
  // Get action dot color
  getActionDotColor(action: string): string {
    const colors: { [key: string]: string } = {
      Create: 'bg-green-500',
      Update: 'bg-blue-500',
      Delete: 'bg-red-500',
      Login: 'bg-purple-500',
    };
    return colors[action] || 'bg-gray-500';
  }
}
