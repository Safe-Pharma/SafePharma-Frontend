import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../Core/Services/i18n.service';

export interface SearchableSelectOption {
  value: string;
  label: string;
  secondary?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.css',
})
export class SearchableSelectComponent {
  private readonly i18n = inject(I18nService);
  options = input<SearchableSelectOption[]>([]);
  value = input<string | null>('');
  placeholder = input('Select an option');
  searchPlaceholder = input('Search options…');
  disabled = input(false);
  loading = input(false);
  error = input<string | null>(null);

  valueChange = output<string>();
  retry = output<void>();

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly filteredOptions = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.options();
    return this.options().filter((option) =>
      `${option.label} ${option.secondary ?? ''}`.toLowerCase().includes(term),
    );
  });
  protected readonly selectedLabel = computed(() => {
    const selected = this.options().find((option) => option.value === this.value());
    return selected?.label || this.value() || this.placeholder();
  });
  text(key: string): string { return this.i18n.text(key); }

  toggle(): void {
    if (this.disabled() || this.loading()) return;
    this.open.update((isOpen) => !isOpen);
    if (this.open()) this.query.set('');
  }

  select(option: SearchableSelectOption): void {
    this.valueChange.emit(option.value);
    this.open.set(false);
    this.query.set('');
  }

  close(): void {
    this.open.set(false);
    this.query.set('');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
