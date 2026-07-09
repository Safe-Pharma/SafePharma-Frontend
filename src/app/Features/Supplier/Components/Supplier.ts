import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  Supplier,
  SupplierCreateDto,
  SupplierStats,
  SupplierStatus,
  SupplierUpdateDto,
} from '../Models/Supplier';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  RecordSupplierPaymentDto,
  SupplierPayment,
} from '../Models/Supplier-payment';
import { SuppliersService } from '../Services/Supplier';
import { SupplierPaymentsService } from '../Services/Supplier-Payment';
import { CountryWithCities } from '../../subscribe/Models/country-with-cities.model';
import { LocationService } from '../../subscribe/Services/location.service';


interface SupplierFormModel {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  countryId: string;
  status: SupplierStatus;
  outstanding: number;
}

const EMPTY_FORM: SupplierFormModel = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  taxNumber: '',
  address: '',
  countryId: '',
  status: 'Active',
  outstanding: 0,
};

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplier.html',
})
export class Suppliers implements OnInit, OnDestroy {
  // ---- Tabs ----
  activeTab = signal<'suppliers' | 'history'>('suppliers');

  search = signal('');
  private refreshTick = signal(0);

  loading = signal(false);
  errorMsg = signal<string | null>(null);

  private search$ = toObservable(this.search).pipe(
    debounceTime(300),
    distinctUntilChanged()
  );
  private refresh$ = toObservable(this.refreshTick);

  private suppliers$ = combineLatest([this.search$, this.refresh$]).pipe(
    tap(() => {
      this.loading.set(true);
      this.errorMsg.set(null);
    }),
    switchMap(([search]) =>
      this.suppliersService.getAll(search || undefined).pipe(
        tap(() => this.loading.set(false)),
        catchError(() => {
          this.loading.set(false);
          this.errorMsg.set('An error occurred while loading suppliers.');
          return of<Supplier[]>([]);
        })
      )
    )
  );
  suppliers = toSignal(this.suppliers$, { initialValue: [] as Supplier[] });

  private stats$ = this.refresh$.pipe(
    switchMap(() =>
      this.suppliersService.getStats().pipe(catchError(() => of(null as SupplierStats | null)))
    )
  );
  stats = toSignal(this.stats$, { initialValue: null as SupplierStats | null });

  countries = signal<CountryWithCities[]>([]);

  // ---- payment history: "listens" to refresh ticks too (record payment bumps it) ----
  private history$ = this.refresh$.pipe(
    switchMap(() =>
      this.paymentsService.getHistory().pipe(catchError(() => of([] as SupplierPayment[])))
    )
  );
  paymentHistory = toSignal(this.history$, { initialValue: [] as SupplierPayment[] });

  readonly paymentMethods = PAYMENT_METHODS;

  openMenuId = signal<string | null>(null);
  menuPosition = signal<{ top: number; left: number } | null>(null);
  menuSupplier = computed(() => this.suppliers().find((s) => s.id === this.openMenuId()) ?? null);

  private closeMenuOnScroll = () => this.closeMenu();

  constructor(
    private suppliersService: SuppliersService,
    private LocationService: LocationService,
    private paymentsService: SupplierPaymentsService
  ) {
    document.addEventListener('scroll', this.closeMenuOnScroll, true);
  }

  ngOnInit(): void {
    this.LocationService.getCountries().subscribe({
      next: (result) => {
        if (result.success && result.data) {
          this.countries.set(result.data);
        }
      },
      error: () => {
        this.errorMsg.set('An error occurred while loading countries.');
      },
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.closeMenuOnScroll, true);
  }

  showFormModal = signal(false);
  editingSupplier = signal<Supplier | null>(null);
  submitting = signal(false);
  formError = signal<string | null>(null);
  formModel: SupplierFormModel = { ...EMPTY_FORM };

  confirmDeleteSupplier = signal<Supplier | null>(null);
  deleting = signal(false);

  private refresh(): void {
    this.refreshTick.update((v) => v + 1);
  }

  onSearchInput(value: string): void {
    this.search.set(value);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const menuWidth = 176;
    const estimatedMenuHeight = 140;
    const gap = 4;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedMenuHeight;

    const top = openUpward
      ? Math.max(8, rect.top - estimatedMenuHeight - gap)
      : rect.bottom + gap;

    this.menuPosition.set({
      top,
      left: Math.max(8, rect.right - menuWidth),
    });
    this.openMenuId.set(id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    this.menuPosition.set(null);
  }

  openCreateModal(): void {
    this.editingSupplier.set(null);
    this.formModel = { ...EMPTY_FORM };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(supplier: Supplier): void {
    this.closeMenu();
    this.editingSupplier.set(supplier);

    const matchedCountry = this.countries().find(
      (c) => c.name === supplier.country
    );

    this.formModel = {
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      taxNumber: supplier.taxNumber,
      address: supplier.address,
      countryId: matchedCountry?.id ?? '',
      status: supplier.status,
      outstanding: supplier.outstanding,
    };
    this.formError.set(null);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  submitForm(): void {
    const name = this.formModel.name.trim();
    const contactPerson = this.formModel.contactPerson.trim();
    const phone = this.formModel.phone.trim();
    const email = this.formModel.email.trim();
    const address = this.formModel.address.trim();

    if (!name || !contactPerson || !phone || !email || !address || !this.formModel.countryId) {
      this.formError.set('Please fill in all required fields, including country.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const editing = this.editingSupplier();
    const dto: SupplierCreateDto | SupplierUpdateDto = {
      name,
      contactPerson,
      phone,
      email,
      taxNumber: this.formModel.taxNumber?.trim() || undefined,
      address,
      countryId: this.formModel.countryId,
      status: this.formModel.status,
      outstanding: Number(this.formModel.outstanding) || 0,
    };

    const request$ = editing
      ? this.suppliersService.update(editing.id, dto)
      : this.suppliersService.create(dto);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showFormModal.set(false);
        this.refresh();
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(
          err?.error?.message ??
            (err?.status === 409
              ? 'A supplier with this name already exists.'
              : 'An error occurred while saving. Please try again.')
        );
      },
    });
  }

  // ---- Activate / Deactivate ----
  toggleStatus(supplier: Supplier): void {
    this.closeMenu();
    this.suppliersService.toggleStatus(supplier.id).subscribe({
      next: () => this.refresh(),
      error: () => this.errorMsg.set('An error occurred while changing the supplier status.'),
    });
  }

  // ---- Delete ----
  askDelete(supplier: Supplier): void {
    this.closeMenu();
    this.confirmDeleteSupplier.set(supplier);
  }

  cancelDelete(): void {
    this.confirmDeleteSupplier.set(null);
  }

  confirmDelete(): void {
    const supplier = this.confirmDeleteSupplier();
    if (!supplier) return;

    this.deleting.set(true);
    this.suppliersService.delete(supplier.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmDeleteSupplier.set(null);
        this.refresh();
      },
      error: () => {
        this.deleting.set(false);
        this.errorMsg.set('An error occurred while deleting the supplier.');
      },
    });
  }

  // ---- Record payment modal ----
  recordPaymentSupplier = signal<Supplier | null>(null);
  recordingPayment = signal(false);
  recordPaymentError = signal<string | null>(null);
  paymentFormModel: {
    amount: number;
    paidAt: string;
    paymentMethod: PaymentMethod;
    note: string;
  } = {
    amount: 0,
    paidAt: this.today(),
    paymentMethod: 'Bank Transfer',
    note: '',
  };

  private today(): string {
    return new Date().toISOString().slice(0, 10); // yyyy-MM-dd for <input type="date">
  }

  openRecordPaymentModal(supplier: Supplier): void {
    this.closeMenu();
    this.recordPaymentSupplier.set(supplier);
    this.paymentFormModel = {
      amount: supplier.outstanding,
      paidAt: this.today(),
      paymentMethod: 'Bank Transfer',
      note: '',
    };
    this.recordPaymentError.set(null);
    this.showFormModal.set(false);
  }

  closeRecordPaymentModal(): void {
    this.recordPaymentSupplier.set(null);
  }

  submitRecordPayment(): void {
    const supplier = this.recordPaymentSupplier();
    if (!supplier) return;

    const amount = Number(this.paymentFormModel.amount);

    if (!amount || amount <= 0) {
      this.recordPaymentError.set('Enter a valid amount.');
      return;
    }

    if (amount > supplier.outstanding) {
      this.recordPaymentError.set(
        `Amount can't exceed the outstanding balance (${supplier.outstanding}).`
      );
      return;
    }

    this.recordingPayment.set(true);
    this.recordPaymentError.set(null);

    const dto: RecordSupplierPaymentDto = {
      supplierId: supplier.id,
      amount,
      paymentMethod: this.paymentFormModel.paymentMethod,
      note: this.paymentFormModel.note?.trim() || undefined,
      paidAt: this.paymentFormModel.paidAt,
    };

    this.paymentsService.record(dto).subscribe({
      next: () => {
        this.recordingPayment.set(false);
        this.recordPaymentSupplier.set(null);
        this.refresh();
      },
      error: (err) => {
        this.recordingPayment.set(false);
        this.recordPaymentError.set(
          err?.error?.message ?? 'An error occurred while recording the payment.'
        );
      },
    });
  }
}