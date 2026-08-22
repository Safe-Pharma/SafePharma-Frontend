import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { ModalOverlayDirective } from '../../../../Shared/Components/modal-overlay/modal-overlay';
import { I18nService } from '../../../../Core/Services/i18n.service';

interface AuditLog {
  date: string;
  action: string;
  entity: string;
  device: string;
  userFullName: string;
  recordId?: string;
  ip?: string;
  newValues?: unknown;
  oldValues?: unknown;
}
@Component({
  selector: 'app-audit-detail-modal-component',
  imports: [CommonModule, ModalOverlayDirective],
  templateUrl: './audit-detail-modal-component.html',
  styleUrl: './audit-detail-modal-component.css',
})
export class AuditDetailModalComponent {
  protected readonly i18n = inject(I18nService);
  text(key: string): string { return this.i18n.text(key); }
  @Input() isOpen = signal(false);
  @Input() auditLog = signal<AuditLog | null>(null);
  @Output() close = new EventEmitter<void>();

  activeTab = signal<'summary' | 'raw'>('summary');

  onClose() {
    this.close.emit();
    this.isOpen.set(false);
  }

  setActiveTab(tab: 'summary' | 'raw') {
    this.activeTab.set(tab);
  }

  // Get date formatted
  getFormattedDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString(this.i18n.lang(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  // Get time formatted
  getFormattedTime(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleTimeString(this.i18n.lang(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Get action badge color
  getActionColor(action: string): string {
    const normalized = action.toUpperCase();
    const colors: { [key: string]: string } = {
      CREATE: 'text-green-700 bg-green-50 border-green-200',
      UPDATE: 'text-blue-700 bg-blue-50 border-blue-200',
      DELETE: 'text-red-700 bg-red-50 border-red-200',
      LOGIN: 'text-purple-700 bg-purple-50 border-purple-200',
      LOGOUT: 'text-orange-700 bg-orange-50 border-orange-200',
      EXPORT: 'text-amber-700 bg-amber-50 border-amber-200',
    };
    return colors[normalized] || 'text-gray-700 bg-gray-50 border-gray-200';
  }

  // Get action dot color
  getActionDotColor(action: string): string {
    const normalized = action.toUpperCase();
    const colors: { [key: string]: string } = {
      CREATE: 'bg-green-500',
      UPDATE: 'bg-blue-500',
      DELETE: 'bg-red-500',
      LOGIN: 'bg-purple-500',
      LOGOUT: 'bg-orange-500',
      EXPORT: 'bg-amber-500',
    };
    return colors[normalized] || 'bg-gray-500';
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

  getFormattedValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '{}';
    }

    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }

    return JSON.stringify(value, null, 2);
  }

  // Get new value as formatted JSON
  getFormattedNewValue(): string {
    return this.getFormattedValue(this.auditLog()?.newValues);
  }

  // Get old value as formatted JSON
  getFormattedOldValue(): string {
    return this.getFormattedValue(this.auditLog()?.oldValues);
  }

  // Get raw JSON of entire log
  getRawJSON(): string {
    const log = this.auditLog();
    if (!log) return '';
    return JSON.stringify(log, null, 2);
  }
}
