import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RelativesService } from '../../Services/relatives';
import { Spinner } from '../../../../../Shared/Components/spinner/spinner';
import { I18nService } from '../../../../../Core/Services/i18n.service';
import { POS_DICT } from '../../pos.i18n';
interface Relative {
  relativeId: string;
  relativeName: string;
}

@Component({
  selector: 'app-relative-drop-down',
  imports: [CommonModule, FormsModule, Spinner],
  templateUrl: './relative-drop-down.html',
  styleUrl: './relative-drop-down.css',
})
export class RelativeDropDown implements OnInit, OnChanges {
  private readonly i18n = inject(I18nService);
  // Input: customer id يتم تمريره من الـ parent component
  @Input() customerId: string = '';

  // Output: يبعت الـ relative المختار للـ parent
  @Output() relativeSelected = new EventEmitter<Relative>();
  @Output() relativesLoaded = new EventEmitter<{
    customerId: string;
    relatives: Relative[];
  }>();

  @Input() set parentRelatives(value: Relative[] | null | undefined) {
    this.relatives.set((value ?? []).filter((relative) => Boolean(relative.relativeId)));
  }

  relatives = signal<Relative[]>([]);
  selectedRelativeId = signal<string>('');
  menuOpen = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor(private relativesService: RelativesService) {}

  ngOnInit() {
    if (this.customerId) {
      this.loadRelatives();
    }
  }

  // لو الـ customerId اتغير من بره (مثلاً المستخدم غيّر العميل)
  ngOnChanges(changes: SimpleChanges) {
    if (changes['customerId'] && !changes['customerId'].firstChange) {
      this.loadRelatives();
    }
  }

  loadRelatives() {
    if (!this.customerId) {
      this.relatives.set([]);
      this.selectedRelativeId.set('');
      this.relativesLoaded.emit({ customerId: this.customerId, relatives: [] });
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.relativesService.getAllRelatives(this.customerId).subscribe({
      next: (data) => {
        const normalized = Array.isArray(data) ? data : [];
        console.log('✅ Relatives loaded:', normalized);
        this.relatives.set(normalized);
        this.selectedRelativeId.set('');
        this.relativesLoaded.emit({ customerId: this.customerId, relatives: normalized });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading relatives:', error);
        this.error.set(this.t('relative.loadFailed'));
        this.relatives.set([]);
        this.selectedRelativeId.set('');
        this.relativesLoaded.emit({ customerId: this.customerId, relatives: [] });
        this.isLoading.set(false);
      },
    });
  }

  onSelectionChange(relativeId: string) {
    this.selectedRelativeId.set(relativeId);
    const selected = this.relatives().find((r) => r.relativeId === relativeId);
    if (selected) {
      this.relativeSelected.emit(selected);
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  choose(relativeId: string): void {
    this.menuOpen.set(false);
    this.onSelectionChange(relativeId);
  }

  selectedRelativeName(): string {
    return this.relatives().find((relative) => relative.relativeId === this.selectedRelativeId())?.relativeName ?? this.t('relative.label');
  }

  t(key: string): string { return this.i18n.t(POS_DICT, key); }
}
