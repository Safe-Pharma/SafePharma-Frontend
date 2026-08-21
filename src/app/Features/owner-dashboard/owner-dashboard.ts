import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { I18nService } from '../../Core/Services/i18n.service';
import { Spinner } from '../../Shared/Components/spinner/spinner';
import { PageHeaderComponent } from '../../Shared/Components/page-header/page-header';
import { PharmacyReadDto } from './Models/pharmacy-read.dto';
import { PharmacyService } from './Service/pharmacy_service';

type PharmacyStatus = 'Active' | 'Inactive';

interface PharmacyRow extends PharmacyReadDto {
  readonly initials: string;
  readonly avatarColor: string;
  readonly status: PharmacyStatus;
}

interface StatCard {
  readonly label: string;
  readonly value: string;
  readonly icon: 'building' | 'active' | 'inactive';
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [FormsModule, Spinner, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './owner-dashboard.html',
  styleUrl: './owner-dashboard.css',
})
export class OwnerDashboard implements OnInit {
  protected readonly i18n = inject(I18nService);

  private readonly pharmacyService = inject(PharmacyService);
  private requestInFlight = false;

  readonly pharmacies = signal<PharmacyRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly updatingPharmacyId = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<'' | PharmacyStatus>('');

  readonly filteredPharmacies = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatus();

    return this.pharmacies().filter((pharmacy) => {
      const matchesQuery = !query || [pharmacy.name, pharmacy.businessEmail, pharmacy.city]
        .some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (!status || pharmacy.status === status);
    });
  });

  readonly stats = computed<StatCard[]>(() => {
    const rows = this.pharmacies();
    const active = rows.filter((pharmacy) => pharmacy.isActive).length;

    return [
      { label: 'ownerDashboard.totalPharmacies', value: String(rows.length), icon: 'building' },
      { label: 'ownerDashboard.activePharmacies', value: String(active), icon: 'active' },
      { label: 'ownerDashboard.inactive', value: String(rows.length - active), icon: 'inactive' },
    ];
  });

  ngOnInit(): void {
    this.loadPharmacies();
  }

  loadPharmacies(): void {
    if (this.requestInFlight) return;

    this.requestInFlight = true;
    this.loading.set(true);
    this.loadError.set(false);

    this.pharmacyService.getAllPharmacies().pipe(
      finalize(() => {
        this.requestInFlight = false;
        this.loading.set(false);
      }),
    ).subscribe({
      next: (pharmacies) => this.pharmacies.set(pharmacies.map((pharmacy, index) => this.toRow(pharmacy, index))),
      error: () => this.loadError.set(true),
    });
  }

  toggleActivation(pharmacy: PharmacyRow): void {
    if (this.updatingPharmacyId()) return;

    const nextIsActive = !pharmacy.isActive;
    this.updatingPharmacyId.set(pharmacy.id);
    this.pharmacyService.updateActiveState(pharmacy.id, nextIsActive).pipe(
      finalize(() => this.updatingPharmacyId.set(null)),
    ).subscribe({
      next: (isActive) => this.pharmacies.update((rows) => rows.map((row) => row.id === pharmacy.id
        ? { ...row, isActive, status: isActive ? 'Active' : 'Inactive' }
        : row)),
    });
  }

  statusLabel(status: PharmacyStatus): string {
    return this.i18n.text(status === 'Active' ? 'ownerDashboard.active' : 'ownerDashboard.inactiveStatus');
  }

  private toRow(pharmacy: PharmacyReadDto, index: number): PharmacyRow {
    const name = String(pharmacy.name ?? '');
    const isActive = Boolean(pharmacy.isActive);

    return {
      ...pharmacy,
      name,
      initials: name.slice(0, 2).toUpperCase() || '—',
      avatarColor: index % 2 === 0 ? 'var(--primary)' : 'var(--success)',
      status: isActive ? 'Active' : 'Inactive',
    };
  }
}
