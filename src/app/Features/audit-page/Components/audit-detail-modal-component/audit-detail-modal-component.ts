import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

interface AuditLog {
  date: string;
  action: string;
  entity: string;
  device: string;
  userFullName: string;
  recordId?: string;
  ip?: string;
  newValue?: any;
  oldValue?: any;
}
@Component({
  selector: 'app-audit-detail-modal-component',
  imports: [CommonModule],
  templateUrl: './audit-detail-modal-component.html',
  styleUrl: './audit-detail-modal-component.css',
})
export class AuditDetailModalComponent {
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  // Get time formatted
  getFormattedTime(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('en-US', {
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

  // Get new value as formatted JSON
  getFormattedNewValue(): string {
    const log = this.auditLog();
    if (!log) return '';

    // If newValue exists, use it; otherwise show empty
    if (log.newValue) {
      return JSON.stringify(log.newValue, null, 2);
    }
    return '{}';
  }

  // Get raw JSON of entire log
  getRawJSON(): string {
    const log = this.auditLog();
    if (!log) return '';
    return JSON.stringify(log, null, 2);
  }
}
