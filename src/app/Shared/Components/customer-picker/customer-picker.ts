import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CustomersApiService } from '../../../Features/Customer/Services/customers-api.service';
import { Customer } from '../../../Features/Customer/Models/customer.model';
import { Spinner } from '../spinner/spinner';

export interface CustomerPickResult {
  customerId: string;
  name: string;
}

@Component({
  selector: 'app-customer-picker',
  standalone: true,
  imports: [CommonModule, Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-picker.html',
})
export class CustomerPickerComponent {
  private readonly customersApi = inject(CustomersApiService);

  // A customer already linked, or the customer being viewed themselves, shouldn't
  // show up as a pickable result.
  readonly excludeIds = input<string[]>([]);

  selectionChange = output<CustomerPickResult | null>();

  protected readonly query = signal('');
  protected readonly showDropdown = signal(false);
  protected readonly searching = signal(false);
  protected readonly selected = signal<CustomerPickResult | null>(null);

  private readonly query$ = toObservable(this.query).pipe(debounceTime(300), distinctUntilChanged());

  private readonly results$ = this.query$.pipe(
    switchMap((q) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) return of<Customer[]>([]);

      this.searching.set(true);
      return this.customersApi.getAll(trimmed).pipe(
        tap(() => this.searching.set(false)),
        catchError(() => {
          this.searching.set(false);
          return of<Customer[]>([]);
        }),
      );
    }),
  );
  private readonly rawResults = toSignal(this.results$, { initialValue: [] as Customer[] });

  protected readonly results = computed(() => {
    const excluded = new Set(this.excludeIds());
    return this.rawResults().filter((c) => !excluded.has(c.id));
  });

  protected readonly showNoResults = computed(
    () => !this.searching() && this.query().trim().length >= 2 && this.results().length === 0,
  );

  onQueryInput(value: string): void {
    this.query.set(value);
    this.showDropdown.set(true);
  }

  onFocus(): void {
    this.showDropdown.set(true);
  }

  onBlur(): void {
    setTimeout(() => this.showDropdown.set(false), 150);
  }

  onSelect(customer: Customer): void {
    const selection: CustomerPickResult = { customerId: customer.id, name: customer.name };
    this.selected.set(selection);
    this.showDropdown.set(false);
    this.query.set('');
    this.selectionChange.emit(selection);
  }

  onClearSelection(): void {
    this.selected.set(null);
    this.selectionChange.emit(null);
  }
}
