import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// Generic — knows nothing about allergies/conditions/anything medical.
// Each consumer maps its own catalog (e.g. CatalogItem[]) into { id, label } pairs.
export interface TagPickerItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-tag-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tag-picker.html',
})
export class TagPickerComponent {
  // Full list to search/filter through (client-side).
  readonly items = input.required<TagPickerItem[]>();
  // Ids already selected — chips are rendered from this, and these ids are excluded
  // from the dropdown so you can't pick the same thing twice.
  readonly selectedIds = input<string[]>([]);
  readonly placeholder = input('Search…');
  readonly emptyLabel = input('No results.');
  // How many suggestions to show at once — keeps the dropdown from becoming a huge list.
  readonly maxSuggestions = input(8);

  // Emits the full new selected-ids array on every add/remove — the consumer just
  // stores whatever comes out, same pattern as a plain form control.
  selectionChange = output<string[]>();

  protected readonly query = signal('');
  protected readonly showDropdown = signal(false);

  protected readonly selectedItems = computed(() => {
    const selected = new Set(this.selectedIds());
    return this.items().filter((i) => selected.has(i.id));
  });

  protected readonly filteredItems = computed(() => {
    const q = this.query().trim().toLowerCase();
    const selected = new Set(this.selectedIds());
    const pool = this.items().filter((i) => !selected.has(i.id));
    const matches = q ? pool.filter((i) => i.label.toLowerCase().includes(q)) : pool;
    return matches.slice(0, this.maxSuggestions());
  });

  onQueryInput(value: string): void {
    this.query.set(value);
    this.showDropdown.set(true);
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    // Small delay so a click/mousedown on a dropdown option registers before the
    // dropdown closes — otherwise blur fires first and the option never gets picked.
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onSelect(item: TagPickerItem): void {
    this.selectionChange.emit([...this.selectedIds(), item.id]);
    this.query.set('');
  }

  onRemove(id: string): void {
    this.selectionChange.emit(this.selectedIds().filter((x) => x !== id));
  }
}