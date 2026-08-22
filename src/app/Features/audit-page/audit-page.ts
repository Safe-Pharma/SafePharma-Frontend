import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuditService } from './Service/audit_service';
import { AuditDetailModalComponent } from './Components/audit-detail-modal-component/audit-detail-modal-component';
import { Spinner } from '../../Shared/Components/spinner/spinner';
import { I18nService } from '../../Core/Services/i18n.service';
import { PageHeaderComponent } from '../../Shared/Components/page-header/page-header';

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
  imports: [CommonModule, FormsModule, AuditDetailModalComponent, Spinner, PageHeaderComponent],
  templateUrl: './audit-page.html',
  styleUrl: './audit-page.css',
})
export class AuditPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }
  // Filter states
  searchQuery: string = '';
  selectedUser: string = '';
  selectedAction: string = '';
  selectedEntity: string = '';
  selectedDate: string = '';

  isModalOpen = signal(false);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  selectedLog = signal<AuditLog | null>(null);

  constructor(private auditService: AuditService) {}

  audits = signal([] as AuditLog[]);
  filteredLogs = signal([] as AuditLog[]);
  ngOnInit() {
    this.loading.set(true);
    this.auditService.getAllAudits().subscribe({
      next: (data) => {
        this.audits.set(data);
        this.filteredLogs.set(data);
        this.loading.set(false);
        console.log(this.audits());
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set(this.text('audit.error'));
      },
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
      const matchDate = !this.selectedDate || log.date.startsWith(this.selectedDate);

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

  actionLabel(action: string): string {
    const key = action.trim().toLowerCase().replace(/[^a-z]+/g, '');
    const labels: Record<string, string> = {
      create: 'audit.actionCreate', created: 'audit.actionCreate',
      update: 'audit.actionUpdate', updated: 'audit.actionUpdate',
      delete: 'audit.actionDelete', deleted: 'audit.actionDelete',
      login: 'audit.actionLogin', loggedin: 'audit.actionLogin',
      logout: 'audit.actionLogout', loggedout: 'audit.actionLogout',
    };
    return labels[key] ? this.text(labels[key]) : action;
  }

  entityLabel(entity: string): string {
    const key = entity.trim().toLowerCase().replace(/[^a-z]+/g, '');
    const labels: Record<string, string> = {
      tax: 'audit.entityTax', batch: 'audit.entityBatch', category: 'audit.entityCategory',
      product: 'audit.entityProduct', order: 'audit.entityOrder', medicine: 'audit.entityMedicine',
      user: 'audit.entityUser', customer: 'audit.entityCustomer', supplier: 'audit.entitySupplier',
    };
    return labels[key] ? this.text(labels[key]) : entity;
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

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedUser = '';
    this.selectedAction = '';
    this.selectedEntity = '';
    this.selectedDate = '';
    this.filteredLogs.set(this.audits());
  }
}
